"""회의실 모델"""

from datetime import datetime
from pydantic import BaseModel, Field
from typing import Optional


class Room(BaseModel):
    """회의실 정보 모델"""

    id: str = Field(..., description="회의실 고유 ID")
    name: str = Field(..., description="회의실 이름")
    floor: int = Field(..., description="층")
    building: Optional[str] = Field(None, description="건물명")
    capacity: int = Field(..., description="수용 인원")
    facilities: list[str] = Field(default_factory=list, description="시설 목록")
    description: Optional[str] = Field(None, description="설명")

    @classmethod
    def from_api(cls, data: dict) -> "Room":
        """API 응답 데이터로부터 Room 객체 생성"""
        return cls(
            id=data.get("id", data.get("room_id", "")),
            name=data.get("name", data.get("room_name", "")),
            floor=data.get("floor", 1),
            building=data.get("building"),
            capacity=data.get("capacity", data.get("max_capacity", 0)),
            facilities=data.get("facilities", data.get("equipments", [])),
            description=data.get("description"),
        )

    @property
    def location_description(self) -> str:
        """위치 설명 문자열"""
        if self.building:
            return f"{self.building} {self.floor}층"
        return f"{self.floor}층"


class RoomAvailability(BaseModel):
    """회의실 예약 가능 여부"""

    room: Room = Field(..., description="회의실 정보")
    is_available: bool = Field(..., description="예약 가능 여부")
    start_time: datetime = Field(..., description="조회 시작 시간")
    end_time: datetime = Field(..., description="조회 종료 시간")
    conflict_reason: Optional[str] = Field(None, description="충돌 사유")


class RoomSearchResult(BaseModel):
    """회의실 검색 결과"""

    rooms: list[Room] = Field(default_factory=list, description="검색된 회의실 목록")
    available_rooms: list[RoomAvailability] = Field(
        default_factory=list, description="예약 가능한 회의실 목록"
    )
    total_count: int = Field(0, description="총 검색 결과 수")
