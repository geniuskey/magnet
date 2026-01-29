"""빈 시간대 계산 로직"""

from datetime import datetime, date, timedelta
from typing import Optional
from zoneinfo import ZoneInfo

from models.calendar import TimeSlot, FreeSlot, ScheduleResponse
from models.room import Room, RoomAvailability
from models.meeting import MeetingOption
from models.employee import Employee
from utils.datetime_utils import get_work_hours, is_lunch_time, is_weekday, KST
from utils.logger import get_logger

logger = get_logger(__name__)


class SlotFinder:
    """빈 시간대 찾기 서비스"""

    def __init__(
        self,
        work_start_hour: int = 9,
        work_end_hour: int = 18,
        exclude_lunch: bool = True,
        lunch_start_hour: int = 12,
        lunch_end_hour: int = 13,
    ):
        self.work_start_hour = work_start_hour
        self.work_end_hour = work_end_hour
        self.exclude_lunch = exclude_lunch
        self.lunch_start_hour = lunch_start_hour
        self.lunch_end_hour = lunch_end_hour

    def find_common_free_slots(
        self,
        schedules: list[ScheduleResponse],
        start_date: date,
        end_date: date,
        duration_minutes: int,
        preferred_time: Optional[str] = None,  # "morning", "afternoon", "any"
    ) -> list[FreeSlot]:
        """
        여러 참석자의 공통 빈 시간대 찾기

        Args:
            schedules: 참석자 일정 목록
            start_date: 시작일
            end_date: 종료일
            duration_minutes: 필요한 회의 시간 (분)
            preferred_time: 선호 시간대

        Returns:
            공통 빈 시간대 목록
        """
        if not schedules:
            return []

        common_free_slots = []
        current_date = start_date

        while current_date <= end_date:
            # 주말 제외
            if not is_weekday(current_date):
                current_date += timedelta(days=1)
                continue

            # 해당 날짜의 공통 빈 시간대 찾기
            day_free_slots = self._find_common_free_slots_for_day(
                schedules, current_date, duration_minutes
            )

            # 선호 시간대 필터링
            if preferred_time and preferred_time != "any":
                day_free_slots = self._filter_by_preference(day_free_slots, preferred_time)

            common_free_slots.extend(day_free_slots)
            current_date += timedelta(days=1)

        # 추천 점수 기반 정렬
        return self._rank_slots(common_free_slots, preferred_time)

    def _find_common_free_slots_for_day(
        self,
        schedules: list[ScheduleResponse],
        target_date: date,
        duration_minutes: int,
    ) -> list[FreeSlot]:
        """하루의 공통 빈 시간대 찾기"""
        # 업무 시간 설정
        work_start = datetime.combine(
            target_date,
            datetime.min.time().replace(hour=self.work_start_hour),
            tzinfo=KST,
        )
        work_end = datetime.combine(
            target_date,
            datetime.min.time().replace(hour=self.work_end_hour),
            tzinfo=KST,
        )

        # 모든 참석자의 바쁜 시간대 수집
        all_busy_slots = []
        for schedule in schedules:
            for day_schedule in schedule.schedules:
                if day_schedule.schedule_date == target_date:
                    all_busy_slots.extend(day_schedule.busy_slots)

        # 점심시간 추가
        if self.exclude_lunch:
            lunch_start = datetime.combine(
                target_date,
                datetime.min.time().replace(hour=self.lunch_start_hour),
                tzinfo=KST,
            )
            lunch_end = datetime.combine(
                target_date,
                datetime.min.time().replace(hour=self.lunch_end_hour),
                tzinfo=KST,
            )
            all_busy_slots.append(TimeSlot(start=lunch_start, end=lunch_end, is_busy=True))

        # 바쁜 시간대 병합 (겹치는 구간 통합)
        merged_busy = self._merge_busy_slots(all_busy_slots)

        # 빈 시간대 계산
        free_slots = self._calculate_free_from_busy(merged_busy, work_start, work_end)

        # duration에 맞는 슬롯만 필터링
        return [slot for slot in free_slots if slot.duration_minutes >= duration_minutes]

    def _merge_busy_slots(self, busy_slots: list[TimeSlot]) -> list[TimeSlot]:
        """바쁜 시간대 병합"""
        if not busy_slots:
            return []

        # 시작 시간 기준 정렬
        sorted_slots = sorted(busy_slots, key=lambda x: x.start)
        merged = [sorted_slots[0]]

        for current in sorted_slots[1:]:
            last = merged[-1]
            if current.start <= last.end:
                # 겹치는 경우 병합
                merged[-1] = TimeSlot(
                    start=last.start,
                    end=max(last.end, current.end),
                    is_busy=True,
                )
            else:
                merged.append(current)

        return merged

    def _calculate_free_from_busy(
        self,
        busy_slots: list[TimeSlot],
        work_start: datetime,
        work_end: datetime,
    ) -> list[FreeSlot]:
        """바쁜 시간대에서 빈 시간대 계산"""
        if not busy_slots:
            return [FreeSlot.from_times(work_start, work_end)]

        free_slots = []
        current_time = work_start

        for busy in busy_slots:
            # 업무 시간 범위 내로 제한
            busy_start = max(busy.start, work_start)
            busy_end = min(busy.end, work_end)

            if busy_start > work_end or busy_end < work_start:
                continue

            if busy_start > current_time:
                free_slots.append(FreeSlot.from_times(current_time, busy_start))

            current_time = max(current_time, busy_end)

        # 마지막 빈 시간대
        if current_time < work_end:
            free_slots.append(FreeSlot.from_times(current_time, work_end))

        return free_slots

    def _filter_by_preference(
        self,
        slots: list[FreeSlot],
        preference: str,
    ) -> list[FreeSlot]:
        """선호 시간대로 필터링"""
        filtered = []
        for slot in slots:
            hour = slot.start.hour
            if preference == "morning" and hour < 12:
                filtered.append(slot)
            elif preference == "afternoon" and hour >= 13:
                filtered.append(slot)
            elif preference == "any":
                filtered.append(slot)

        return filtered if filtered else slots  # 결과가 없으면 전체 반환

    def _rank_slots(
        self,
        slots: list[FreeSlot],
        preferred_time: Optional[str] = None,
    ) -> list[FreeSlot]:
        """빈 시간대 추천 순서 정렬"""
        def score(slot: FreeSlot) -> float:
            s = 0.0
            hour = slot.start.hour

            # 선호 시간대 가점
            if preferred_time == "morning" and 9 <= hour < 12:
                s += 10
            elif preferred_time == "afternoon" and 13 <= hour < 18:
                s += 10

            # 일반적으로 선호되는 시간대 가점
            if 10 <= hour <= 11:
                s += 5
            elif 14 <= hour <= 16:
                s += 5

            # 이른 날짜 가점
            days_from_now = (slot.start.date() - date.today()).days
            s -= days_from_now * 0.5

            return s

        return sorted(slots, key=score, reverse=True)

    def create_meeting_options(
        self,
        free_slots: list[FreeSlot],
        available_rooms: list[RoomAvailability],
        attendees: list[Employee],
        duration_minutes: int,
        max_options: int = 5,
    ) -> list[MeetingOption]:
        """
        회의 옵션 생성

        Args:
            free_slots: 공통 빈 시간대 목록
            available_rooms: 예약 가능한 회의실 목록
            attendees: 참석자 목록
            duration_minutes: 회의 시간
            max_options: 최대 옵션 수

        Returns:
            회의 옵션 목록
        """
        options = []
        option_id = 1

        for slot in free_slots:
            if option_id > max_options:
                break

            # 이 시간대에 예약 가능한 회의실 찾기
            for room_avail in available_rooms:
                if option_id > max_options:
                    break

                # 회의실 시간이 슬롯과 맞는지 확인
                if (
                    room_avail.start_time <= slot.start
                    and room_avail.end_time >= slot.start + timedelta(minutes=duration_minutes)
                    and room_avail.is_available
                ):
                    end_time = slot.start + timedelta(minutes=duration_minutes)

                    options.append(MeetingOption.create(
                        option_id=option_id,
                        start_time=slot.start,
                        end_time=end_time,
                        room=room_avail.room,
                        attendees=attendees,
                        score=self._calculate_option_score(slot, room_avail.room),
                    ))
                    option_id += 1
                    break  # 각 시간대당 하나의 회의실만

        return options

    def _calculate_option_score(self, slot: FreeSlot, room: Room) -> float:
        """옵션 추천 점수 계산"""
        score = 50.0

        # 시간대 점수
        hour = slot.start.hour
        if 10 <= hour <= 11 or 14 <= hour <= 16:
            score += 10

        # 회의실 용량 적절성 (너무 크면 감점)
        # 실제로는 참석자 수와 비교해야 함
        if room.capacity <= 6:
            score += 5
        elif room.capacity <= 10:
            score += 3

        # 시설 점수
        if "화상회의" in room.facilities:
            score += 2
        if "화이트보드" in room.facilities:
            score += 1

        return score
