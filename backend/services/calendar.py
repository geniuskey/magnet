"""캘린더 API 서비스"""

from datetime import date, datetime, timedelta
from typing import Optional
from zoneinfo import ZoneInfo

from config import get_settings
from models.calendar import TimeSlot, DaySchedule, ScheduleResponse, FreeSlot
from models.meeting import Meeting, MeetingRequest
from utils.logger import get_logger
from utils.datetime_utils import get_work_hours, is_lunch_time, KST
from .base import BaseAPIClient
from .mock_data import generate_mock_schedule, MOCK_EMPLOYEES

logger = get_logger(__name__)
settings = get_settings()


class CalendarService:
    """캘린더 API 서비스"""

    def __init__(self, use_mock: bool = True):
        self.use_mock = use_mock or settings.use_mock_api
        if not self.use_mock:
            self.client = BaseAPIClient(
                settings.calendar_api_url,
                settings.api_auth_token,
            )
        self._created_meetings: dict[str, Meeting] = {}

    async def get_schedule(
        self,
        employee_id: str,
        start_date: date,
        end_date: date,
    ) -> ScheduleResponse:
        """
        직원 일정 조회

        Args:
            employee_id: 직원 ID
            start_date: 시작일
            end_date: 종료일

        Returns:
            일정 응답
        """
        if self.use_mock:
            return self._get_mock_schedule(employee_id, start_date, end_date)

        data = await self.client.get(
            f"/calendars/{employee_id}",
            params={
                "start_date": start_date.isoformat(),
                "end_date": end_date.isoformat(),
            },
        )

        schedules = []
        for day_data in data.get("schedules", []):
            day_date = date.fromisoformat(day_data["date"])
            busy_slots = [
                TimeSlot(
                    start=datetime.fromisoformat(slot["start"]),
                    end=datetime.fromisoformat(slot["end"]),
                    is_busy=True,
                )
                for slot in day_data.get("busy_slots", [])
            ]
            schedules.append(DaySchedule(
                schedule_date=day_date,
                employee_id=employee_id,
                busy_slots=busy_slots,
            ))

        return ScheduleResponse(
            employee_id=employee_id,
            employee_name=data.get("employee_name", ""),
            start_date=start_date,
            end_date=end_date,
            schedules=schedules,
        )

    async def get_schedules(
        self,
        employee_ids: list[str],
        start_date: date,
        end_date: date,
    ) -> list[ScheduleResponse]:
        """
        여러 직원 일정 조회

        Args:
            employee_ids: 직원 ID 목록
            start_date: 시작일
            end_date: 종료일

        Returns:
            일정 응답 목록
        """
        results = []
        for emp_id in employee_ids:
            schedule = await self.get_schedule(emp_id, start_date, end_date)
            results.append(schedule)
        return results

    async def create_event(self, meeting: MeetingRequest) -> Meeting:
        """
        회의 일정 생성

        Args:
            meeting: 회의 요청 정보

        Returns:
            생성된 회의 정보
        """
        if self.use_mock:
            return self._create_mock_event(meeting)

        data = await self.client.post(
            "/events",
            json_data={
                "title": meeting.title,
                "attendee_ids": meeting.attendee_ids,
                "room_id": meeting.room_id,
                "start_time": meeting.start_time.isoformat(),
                "end_time": meeting.end_time.isoformat(),
                "description": meeting.description,
            },
        )

        return Meeting(
            id=data["id"],
            title=meeting.title,
            organizer_id=meeting.organizer_id or "",
            attendee_ids=meeting.attendee_ids,
            room_id=meeting.room_id,
            start_time=meeting.start_time,
            end_time=meeting.end_time,
            description=meeting.description,
        )

    def _get_mock_schedule(
        self,
        employee_id: str,
        start_date: date,
        end_date: date,
    ) -> ScheduleResponse:
        """Mock 일정 생성"""
        # 직원 이름 찾기
        employee_name = "Unknown"
        for emp in MOCK_EMPLOYEES:
            if emp["id"] == employee_id:
                employee_name = emp["name"]
                break

        schedules = []
        current_date = start_date

        while current_date <= end_date:
            mock_slots = generate_mock_schedule(employee_id, current_date)
            busy_slots = []

            for slot_data in mock_slots:
                busy_slots.append(TimeSlot(
                    start=datetime.fromisoformat(slot_data["start"]),
                    end=datetime.fromisoformat(slot_data["end"]),
                    is_busy=True,
                    title=slot_data.get("title"),
                ))

            # 빈 시간대 계산
            work_start, work_end = get_work_hours(current_date)
            free_slots = self._calculate_free_slots(busy_slots, work_start, work_end)

            schedules.append(DaySchedule(
                schedule_date=current_date,
                employee_id=employee_id,
                busy_slots=busy_slots,
                free_slots=free_slots,
            ))

            current_date += timedelta(days=1)

        return ScheduleResponse(
            employee_id=employee_id,
            employee_name=employee_name,
            start_date=start_date,
            end_date=end_date,
            schedules=schedules,
        )

    def _calculate_free_slots(
        self,
        busy_slots: list[TimeSlot],
        work_start: datetime,
        work_end: datetime,
    ) -> list[FreeSlot]:
        """바쁜 시간대를 제외한 빈 시간대 계산"""
        if not busy_slots:
            return [FreeSlot.from_times(work_start, work_end)]

        # 바쁜 시간대를 시작 시간 기준 정렬
        sorted_busy = sorted(busy_slots, key=lambda x: x.start)
        free_slots = []

        current_time = work_start
        for busy in sorted_busy:
            if busy.start > current_time:
                # 빈 시간대 발견
                free_slots.append(FreeSlot.from_times(current_time, busy.start))
            current_time = max(current_time, busy.end)

        # 마지막 빈 시간대
        if current_time < work_end:
            free_slots.append(FreeSlot.from_times(current_time, work_end))

        return free_slots

    def _create_mock_event(self, meeting: MeetingRequest) -> Meeting:
        """Mock 회의 생성"""
        import uuid

        meeting_id = f"mtg_{uuid.uuid4().hex[:8]}"

        # 참석자 이름 조회
        attendee_names = []
        for emp_id in meeting.attendee_ids:
            for emp in MOCK_EMPLOYEES:
                if emp["id"] == emp_id:
                    attendee_names.append(emp["name"])
                    break

        created = Meeting(
            id=meeting_id,
            title=meeting.title,
            organizer_id=meeting.organizer_id or "",
            attendee_ids=meeting.attendee_ids,
            attendee_names=attendee_names,
            room_id=meeting.room_id,
            start_time=meeting.start_time,
            end_time=meeting.end_time,
            description=meeting.description,
        )

        self._created_meetings[meeting_id] = created
        logger.info(f"Mock meeting created: {meeting_id}")

        return created
