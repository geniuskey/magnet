"""회의실 API 어댑터

실제 사내 회의실 예약 API 연동 시 이 파일을 수정합니다.
"""

from abc import ABC, abstractmethod
from datetime import datetime
from typing import Optional
from models.room import Room, RoomAvailability, RoomSearchResult


class BaseRoomAdapter(ABC):
    """회의실 API 어댑터 인터페이스"""

    @abstractmethod
    async def list_rooms(
        self,
        floor: Optional[int] = None,
        min_capacity: Optional[int] = None,
        facilities: Optional[list[str]] = None,
    ) -> list[Room]:
        """회의실 목록 조회"""
        pass

    @abstractmethod
    async def get_room_availability(
        self,
        room_id: str,
        start_time: datetime,
        end_time: datetime,
    ) -> RoomAvailability:
        """회의실 예약 가능 여부 확인"""
        pass

    @abstractmethod
    async def search_available_rooms(
        self,
        start_time: datetime,
        end_time: datetime,
        min_capacity: Optional[int] = None,
        facilities: Optional[list[str]] = None,
    ) -> RoomSearchResult:
        """예약 가능한 회의실 검색"""
        pass

    @abstractmethod
    async def book_room(
        self,
        room_id: str,
        start_time: datetime,
        end_time: datetime,
        meeting_id: str,
        title: str,
    ) -> bool:
        """회의실 예약"""
        pass


class RoomAPIAdapter(BaseRoomAdapter):
    """
    실제 회의실 API 어댑터

    TODO: 사내 API 스펙에 맞게 구현 필요

    예상 API 스펙:
    - GET /api/rooms?floor={floor}&capacity={min}&facilities={list}
    - GET /api/rooms/{id}/availability?start={time}&end={time}
    - GET /api/rooms/available?start={time}&end={time}
    - POST /api/rooms/{id}/book
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

    async def list_rooms(
        self,
        floor: Optional[int] = None,
        min_capacity: Optional[int] = None,
        facilities: Optional[list[str]] = None,
    ) -> list[Room]:
        """회의실 목록 조회"""
        params = {}
        if floor:
            params["floor"] = floor
        if min_capacity:
            params["min_capacity"] = min_capacity
        if facilities:
            params["facilities"] = ",".join(facilities)

        response = await self.client.get("/rooms", params=params)
        response.raise_for_status()
        data = response.json()

        return [
            Room(
                id=item.get("room_id", item.get("id")),
                name=item.get("room_name", item.get("name")),
                floor=item.get("floor", 1),
                building=item.get("building"),
                capacity=item.get("max_capacity", item.get("capacity", 0)),
                facilities=item.get("equipments", item.get("facilities", [])),
                description=item.get("description"),
            )
            for item in data.get("rooms", data.get("results", []))
        ]

    async def get_room_availability(
        self,
        room_id: str,
        start_time: datetime,
        end_time: datetime,
    ) -> RoomAvailability:
        """회의실 예약 가능 여부 확인"""
        response = await self.client.get(
            f"/rooms/{room_id}/availability",
            params={
                "start": start_time.isoformat(),
                "end": end_time.isoformat(),
            },
        )
        response.raise_for_status()
        data = response.json()

        room_data = data.get("room", {})
        room = Room(
            id=room_data.get("room_id", room_id),
            name=room_data.get("room_name", room_data.get("name", "")),
            floor=room_data.get("floor", 1),
            capacity=room_data.get("max_capacity", room_data.get("capacity", 0)),
            facilities=room_data.get("equipments", room_data.get("facilities", [])),
        )

        return RoomAvailability(
            room=room,
            is_available=data.get("available", data.get("is_available", False)),
            start_time=start_time,
            end_time=end_time,
            conflict_reason=data.get("conflict_reason"),
        )

    async def search_available_rooms(
        self,
        start_time: datetime,
        end_time: datetime,
        min_capacity: Optional[int] = None,
        facilities: Optional[list[str]] = None,
    ) -> RoomSearchResult:
        """예약 가능한 회의실 검색"""
        params = {
            "start": start_time.isoformat(),
            "end": end_time.isoformat(),
        }
        if min_capacity:
            params["min_capacity"] = min_capacity
        if facilities:
            params["facilities"] = ",".join(facilities)

        response = await self.client.get("/rooms/available", params=params)
        response.raise_for_status()
        data = response.json()

        rooms = [
            Room(
                id=item.get("room_id", item.get("id")),
                name=item.get("room_name", item.get("name")),
                floor=item.get("floor", 1),
                building=item.get("building"),
                capacity=item.get("max_capacity", item.get("capacity", 0)),
                facilities=item.get("equipments", item.get("facilities", [])),
            )
            for item in data.get("rooms", data.get("results", []))
        ]

        available = [
            RoomAvailability(
                room=room,
                is_available=True,
                start_time=start_time,
                end_time=end_time,
            )
            for room in rooms
        ]

        return RoomSearchResult(
            rooms=rooms,
            available_rooms=available,
            total_count=len(rooms),
        )

    async def book_room(
        self,
        room_id: str,
        start_time: datetime,
        end_time: datetime,
        meeting_id: str,
        title: str,
    ) -> bool:
        """회의실 예약"""
        response = await self.client.post(
            f"/rooms/{room_id}/book",
            json={
                "start_time": start_time.isoformat(),
                "end_time": end_time.isoformat(),
                "meeting_id": meeting_id,
                "title": title,
            },
        )

        if response.status_code == 200:
            return True
        elif response.status_code == 409:
            # Conflict - 이미 예약됨
            return False
        else:
            response.raise_for_status()
            return False
