"""캘린더 API 어댑터

실제 사내 캘린더 API 연동 시 이 파일을 수정합니다.
"""

from abc import ABC, abstractmethod
from datetime import date, datetime
from typing import Optional
from models.calendar import ScheduleResponse, DaySchedule, TimeSlot
from models.meeting import Meeting, MeetingRequest


class BaseCalendarAdapter(ABC):
    """캘린더 API 어댑터 인터페이스"""

    @abstractmethod
    async def get_schedule(
        self,
        employee_id: str,
        start_date: date,
        end_date: date,
    ) -> ScheduleResponse:
        """직원 일정 조회"""
        pass

    @abstractmethod
    async def create_event(self, meeting: MeetingRequest) -> Meeting:
        """회의 일정 생성"""
        pass


class CalendarAPIAdapter(BaseCalendarAdapter):
    """
    실제 캘린더 API 어댑터

    TODO: 사내 API 스펙에 맞게 구현 필요

    예상 API 스펙:
    - GET /api/calendars/{employee_id}?start={date}&end={date}
    - POST /api/calendars/events
    """

    def __init__(self, base_url: str, auth_token: str):
        self.base_url = base_url.rstrip("/")
        self.auth_token = auth_token
        import httpx
        self.client = httpx.AsyncClient(
            base_url=self.base_url,
            headers={"Authorization": f"Bearer {auth_token}"},
            timeout=30.0,
        )

    async def get_schedule(
        self,
        employee_id: str,
        start_date: date,
        end_date: date,
    ) -> ScheduleResponse:
        """
        직원 일정 조회

        실제 API 응답 형식 예시:
        {
            "employee_id": "E12345",
            "employee_name": "김철수",
            "schedules": [
                {
                    "date": "2024-01-15",
                    "events": [
                        {
                            "start_time": "2024-01-15T10:00:00+09:00",
                            "end_time": "2024-01-15T11:00:00+09:00",
                            "is_private": true
                        }
                    ]
                }
            ]
        }
        """
        response = await self.client.get(
            f"/calendars/{employee_id}",
            params={
                "start": start_date.isoformat(),
                "end": end_date.isoformat(),
            },
        )
        response.raise_for_status()
        data = response.json()

        schedules = []
        for day_data in data.get("schedules", []):
            day_date = date.fromisoformat(day_data["date"])
            busy_slots = []

            for event in day_data.get("events", []):
                busy_slots.append(TimeSlot(
                    start=datetime.fromisoformat(event["start_time"]),
                    end=datetime.fromisoformat(event["end_time"]),
                    is_busy=True,
                    # 비공개 일정은 제목 표시 안함
                    title=None if event.get("is_private", True) else event.get("title"),
                ))

            schedules.append(DaySchedule(
                date=day_date,
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

    async def create_event(self, meeting: MeetingRequest) -> Meeting:
        """
        회의 일정 생성

        실제 API 요청 형식 예시:
        {
            "title": "프로젝트 회의",
            "attendees": ["E12345", "E67890"],
            "location": {"room_id": "R001"},
            "start_time": "2024-01-15T14:00:00+09:00",
            "end_time": "2024-01-15T15:00:00+09:00",
            "description": "프로젝트 진행 상황 공유"
        }
        """
        response = await self.client.post(
            "/calendars/events",
            json={
                "title": meeting.title,
                "attendees": meeting.attendee_ids,
                "location": {"room_id": meeting.room_id},
                "start_time": meeting.start_time.isoformat(),
                "end_time": meeting.end_time.isoformat(),
                "description": meeting.description,
            },
        )
        response.raise_for_status()
        data = response.json()

        return Meeting(
            id=data.get("event_id", data.get("id")),
            title=meeting.title,
            organizer_id=meeting.organizer_id or "",
            attendee_ids=meeting.attendee_ids,
            room_id=meeting.room_id,
            start_time=meeting.start_time,
            end_time=meeting.end_time,
            description=meeting.description,
        )
