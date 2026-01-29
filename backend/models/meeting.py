"""회의 모델"""

from datetime import datetime
from pydantic import BaseModel, Field
from typing import Optional

from .room import Room
from .employee import Employee


class MeetingRequest(BaseModel):
    """회의 생성 요청"""

    title: str = Field(..., description="회의 제목")
    attendee_ids: list[str] = Field(..., description="참석자 ID 목록")
    room_id: str = Field(..., description="회의실 ID")
    start_time: datetime = Field(..., description="시작 시간")
    end_time: datetime = Field(..., description="종료 시간")
    description: Optional[str] = Field(None, description="회의 설명")
    organizer_id: Optional[str] = Field(None, description="주최자 ID")

    @property
    def duration_minutes(self) -> int:
        """회의 시간 (분)"""
        return int((self.end_time - self.start_time).total_seconds() / 60)


class Meeting(BaseModel):
    """회의 정보 모델"""

    id: str = Field(..., description="회의 고유 ID")
    title: str = Field(..., description="회의 제목")
    organizer_id: str = Field(..., description="주최자 ID")
    organizer_name: Optional[str] = Field(None, description="주최자 이름")
    attendee_ids: list[str] = Field(default_factory=list, description="참석자 ID 목록")
    attendee_names: list[str] = Field(default_factory=list, description="참석자 이름 목록")
    room_id: str = Field(..., description="회의실 ID")
    room_name: Optional[str] = Field(None, description="회의실 이름")
    start_time: datetime = Field(..., description="시작 시간")
    end_time: datetime = Field(..., description="종료 시간")
    description: Optional[str] = Field(None, description="회의 설명")
    created_at: datetime = Field(default_factory=datetime.now, description="생성 시간")
    status: str = Field("confirmed", description="상태 (confirmed, cancelled)")

    @property
    def duration_minutes(self) -> int:
        """회의 시간 (분)"""
        return int((self.end_time - self.start_time).total_seconds() / 60)


class MeetingOption(BaseModel):
    """회의 옵션 (사용자에게 제안할 선택지)"""

    id: int = Field(..., description="옵션 번호")
    start_time: datetime = Field(..., description="시작 시간")
    end_time: datetime = Field(..., description="종료 시간")
    duration_minutes: int = Field(..., description="회의 시간 (분)")
    room: Room = Field(..., description="회의실 정보")
    attendees: list[Employee] = Field(default_factory=list, description="참석자 목록")
    score: float = Field(0.0, description="추천 점수 (높을수록 좋음)")
    note: Optional[str] = Field(None, description="특이사항")

    @classmethod
    def create(
        cls,
        option_id: int,
        start_time: datetime,
        end_time: datetime,
        room: Room,
        attendees: list[Employee],
        score: float = 0.0,
        note: Optional[str] = None,
    ) -> "MeetingOption":
        """MeetingOption 생성 헬퍼"""
        return cls(
            id=option_id,
            start_time=start_time,
            end_time=end_time,
            duration_minutes=int((end_time - start_time).total_seconds() / 60),
            room=room,
            attendees=attendees,
            score=score,
            note=note,
        )
