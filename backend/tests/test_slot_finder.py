"""slot_finder 테스트"""

import pytest
from datetime import date, datetime, timedelta
from zoneinfo import ZoneInfo

from services.slot_finder import SlotFinder
from models.calendar import TimeSlot, DaySchedule, ScheduleResponse, FreeSlot

KST = ZoneInfo("Asia/Seoul")


@pytest.fixture
def slot_finder():
    """SlotFinder 인스턴스"""
    return SlotFinder()


@pytest.fixture
def empty_schedule():
    """빈 일정"""
    today = date.today()
    # 평일 찾기
    while today.weekday() >= 5:
        today += timedelta(days=1)

    return ScheduleResponse(
        employee_id="emp_001",
        employee_name="테스트 사용자",
        start_date=today,
        end_date=today,
        schedules=[
            DaySchedule(
                schedule_date=today,
                employee_id="emp_001",
                busy_slots=[],
            )
        ],
    )


@pytest.fixture
def busy_schedule():
    """바쁜 일정"""
    today = date.today()
    while today.weekday() >= 5:
        today += timedelta(days=1)

    return ScheduleResponse(
        employee_id="emp_002",
        employee_name="바쁜 사용자",
        start_date=today,
        end_date=today,
        schedules=[
            DaySchedule(
                schedule_date=today,
                employee_id="emp_002",
                busy_slots=[
                    TimeSlot(
                        start=datetime.combine(today, datetime.min.time().replace(hour=10), tzinfo=KST),
                        end=datetime.combine(today, datetime.min.time().replace(hour=11), tzinfo=KST),
                        is_busy=True,
                    ),
                    TimeSlot(
                        start=datetime.combine(today, datetime.min.time().replace(hour=14), tzinfo=KST),
                        end=datetime.combine(today, datetime.min.time().replace(hour=16), tzinfo=KST),
                        is_busy=True,
                    ),
                ],
            )
        ],
    )


class TestSlotFinder:
    """SlotFinder 테스트"""

    def test_find_free_slots_empty_schedule(self, slot_finder, empty_schedule):
        """빈 일정에서 빈 시간대 찾기"""
        today = empty_schedule.start_date
        free_slots = slot_finder.find_common_free_slots(
            [empty_schedule],
            today,
            today,
            60,  # 60분
        )
        # 점심시간 제외하고 빈 시간 있어야 함
        assert len(free_slots) > 0

    def test_find_free_slots_busy_schedule(self, slot_finder, busy_schedule):
        """바쁜 일정에서 빈 시간대 찾기"""
        today = busy_schedule.start_date
        free_slots = slot_finder.find_common_free_slots(
            [busy_schedule],
            today,
            today,
            60,
        )
        # 10-11시, 14-16시 제외하고 빈 시간 있어야 함
        assert len(free_slots) > 0

        # 바쁜 시간과 겹치지 않아야 함
        for slot in free_slots:
            # 10-11시와 겹치지 않음
            assert not (slot.start.hour == 10)
            # 14-16시와 겹치지 않음
            assert not (14 <= slot.start.hour < 16)

    def test_find_common_free_slots_multiple_people(
        self, slot_finder, empty_schedule, busy_schedule
    ):
        """여러 사람의 공통 빈 시간대 찾기"""
        # 같은 날짜로 맞추기
        today = empty_schedule.start_date
        busy_schedule.start_date = today
        busy_schedule.end_date = today
        busy_schedule.schedules[0].schedule_date = today

        free_slots = slot_finder.find_common_free_slots(
            [empty_schedule, busy_schedule],
            today,
            today,
            60,
        )

        # 공통 빈 시간이 있어야 함 (바쁜 사람 기준)
        assert len(free_slots) > 0

    def test_no_free_slots_for_long_meeting(self, slot_finder, busy_schedule):
        """긴 회의를 위한 빈 시간이 없는 경우"""
        today = busy_schedule.start_date
        free_slots = slot_finder.find_common_free_slots(
            [busy_schedule],
            today,
            today,
            480,  # 8시간 - 불가능
        )
        # 8시간 연속 빈 시간은 없어야 함
        assert len(free_slots) == 0

    def test_preferred_time_morning(self, slot_finder, empty_schedule):
        """오전 선호 시 오전 시간대 우선"""
        today = empty_schedule.start_date
        free_slots = slot_finder.find_common_free_slots(
            [empty_schedule],
            today,
            today,
            60,
            preferred_time="morning",
        )

        if free_slots:
            # 첫 번째 추천이 오전이어야 함
            first_slot = free_slots[0]
            assert first_slot.start.hour < 12

    def test_preferred_time_afternoon(self, slot_finder, empty_schedule):
        """오후 선호 시 오후 시간대 우선"""
        today = empty_schedule.start_date
        free_slots = slot_finder.find_common_free_slots(
            [empty_schedule],
            today,
            today,
            60,
            preferred_time="afternoon",
        )

        if free_slots:
            # 첫 번째 추천이 오후여야 함
            first_slot = free_slots[0]
            assert first_slot.start.hour >= 13


class TestMergeBusySlots:
    """바쁜 시간대 병합 테스트"""

    def test_merge_overlapping_slots(self, slot_finder):
        """겹치는 시간대 병합"""
        today = date.today()
        slots = [
            TimeSlot(
                start=datetime.combine(today, datetime.min.time().replace(hour=10), tzinfo=KST),
                end=datetime.combine(today, datetime.min.time().replace(hour=11), tzinfo=KST),
                is_busy=True,
            ),
            TimeSlot(
                start=datetime.combine(today, datetime.min.time().replace(hour=10, minute=30), tzinfo=KST),
                end=datetime.combine(today, datetime.min.time().replace(hour=12), tzinfo=KST),
                is_busy=True,
            ),
        ]

        merged = slot_finder._merge_busy_slots(slots)
        assert len(merged) == 1
        assert merged[0].start.hour == 10
        assert merged[0].end.hour == 12

    def test_merge_non_overlapping_slots(self, slot_finder):
        """겹치지 않는 시간대는 그대로"""
        today = date.today()
        slots = [
            TimeSlot(
                start=datetime.combine(today, datetime.min.time().replace(hour=10), tzinfo=KST),
                end=datetime.combine(today, datetime.min.time().replace(hour=11), tzinfo=KST),
                is_busy=True,
            ),
            TimeSlot(
                start=datetime.combine(today, datetime.min.time().replace(hour=14), tzinfo=KST),
                end=datetime.combine(today, datetime.min.time().replace(hour=15), tzinfo=KST),
                is_busy=True,
            ),
        ]

        merged = slot_finder._merge_busy_slots(slots)
        assert len(merged) == 2
