"""캘린더/일정 모델"""

from datetime import datetime
from datetime import date as date_type
from pydantic import BaseModel, Field
from typing import Optional


class TimeSlot(BaseModel):
    """시간 구간 모델"""

    start: datetime = Field(..., description="시작 시간")
    end: datetime = Field(..., description="종료 시간")
    is_busy: bool = Field(True, description="바쁨 여부")
    title: Optional[str] = Field(None, description="일정 제목 (본인 일정인 경우)")

    @property
    def duration_minutes(self) -> int:
        """구간 길이 (분)"""
        return int((self.end - self.start).total_seconds() / 60)


class FreeSlot(BaseModel):
    """빈 시간대 모델"""

    start: datetime = Field(..., description="시작 시간")
    end: datetime = Field(..., description="종료 시간")
    duration_minutes: int = Field(..., description="구간 길이 (분)")

    @classmethod
    def from_times(cls, start: datetime, end: datetime) -> "FreeSlot":
        """시작/종료 시간으로부터 FreeSlot 생성"""
        duration = int((end - start).total_seconds() / 60)
        return cls(start=start, end=end, duration_minutes=duration)


class DaySchedule(BaseModel):
    """일별 일정 모델"""

    schedule_date: date_type = Field(..., description="날짜", alias="date")
    employee_id: str = Field(..., description="직원 ID")
    busy_slots: list[TimeSlot] = Field(default_factory=list, description="바쁜 시간대 목록")
    free_slots: list[FreeSlot] = Field(default_factory=list, description="빈 시간대 목록")

    model_config = {"populate_by_name": True}


class ScheduleResponse(BaseModel):
    """일정 조회 응답"""

    employee_id: str = Field(..., description="직원 ID")
    employee_name: str = Field(..., description="직원 이름")
    start_date: date_type = Field(..., description="조회 시작일")
    end_date: date_type = Field(..., description="조회 종료일")
    schedules: list[DaySchedule] = Field(default_factory=list, description="일별 일정 목록")

    @property
    def all_busy_slots(self) -> list[TimeSlot]:
        """전체 기간의 바쁜 시간대"""
        slots = []
        for schedule in self.schedules:
            slots.extend(schedule.busy_slots)
        return slots
