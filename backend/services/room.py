"""회의실 API 서비스"""

from datetime import datetime, date
from typing import Optional
from zoneinfo import ZoneInfo

from config import get_settings
from models.room import Room, RoomAvailability, RoomSearchResult
from utils.logger import get_logger
from .base import BaseAPIClient
from .mock_data import MOCK_ROOMS, generate_mock_room_bookings

logger = get_logger(__name__)
settings = get_settings()
KST = ZoneInfo("Asia/Seoul")


class RoomService:
    """회의실 API 서비스"""

    def __init__(self, use_mock: bool = True):
        self.use_mock = use_mock or settings.use_mock_api
        if not self.use_mock:
            self.client = BaseAPIClient(
                settings.room_api_url,
                settings.api_auth_token,
            )
        self._room_bookings: dict[str, list[dict]] = {}

    async def list_rooms(
        self,
        floor: Optional[int] = None,
        min_capacity: Optional[int] = None,
        facilities: Optional[list[str]] = None,
    ) -> list[Room]:
        """
        회의실 목록 조회

        Args:
            floor: 층 필터
            min_capacity: 최소 수용 인원
            facilities: 필요 시설 목록

        Returns:
            회의실 목록
        """
        if self.use_mock:
            return self._filter_mock_rooms(floor, min_capacity, facilities)

        params = {}
        if floor:
            params["floor"] = floor
        if min_capacity:
            params["min_capacity"] = min_capacity
        if facilities:
            params["facilities"] = ",".join(facilities)

        data = await self.client.get("/rooms", params=params)
        return [Room.from_api(item) for item in data.get("rooms", [])]

    async def get_room_availability(
        self,
        room_id: str,
        start_time: datetime,
        end_time: datetime,
    ) -> RoomAvailability:
        """
        회의실 예약 가능 여부 확인

        Args:
            room_id: 회의실 ID
            start_time: 시작 시간
            end_time: 종료 시간

        Returns:
            예약 가능 여부
        """
        if self.use_mock:
            return self._check_mock_availability(room_id, start_time, end_time)

        data = await self.client.get(
            f"/rooms/{room_id}/availability",
            params={
                "start_time": start_time.isoformat(),
                "end_time": end_time.isoformat(),
            },
        )

        room_data = data.get("room", {})
        room = Room.from_api(room_data) if room_data else None

        return RoomAvailability(
            room=room,
            is_available=data.get("is_available", False),
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
        """
        예약 가능한 회의실 검색

        Args:
            start_time: 시작 시간
            end_time: 종료 시간
            min_capacity: 최소 수용 인원
            facilities: 필요 시설 목록

        Returns:
            검색 결과
        """
        if self.use_mock:
            return self._search_mock_available(
                start_time, end_time, min_capacity, facilities
            )

        params = {
            "start_time": start_time.isoformat(),
            "end_time": end_time.isoformat(),
        }
        if min_capacity:
            params["min_capacity"] = min_capacity
        if facilities:
            params["facilities"] = ",".join(facilities)

        data = await self.client.get("/rooms/available", params=params)

        rooms = [Room.from_api(item) for item in data.get("rooms", [])]
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
        title: str = "회의",
    ) -> bool:
        """
        회의실 예약

        Args:
            room_id: 회의실 ID
            start_time: 시작 시간
            end_time: 종료 시간
            meeting_id: 회의 ID
            title: 회의 제목

        Returns:
            예약 성공 여부
        """
        if self.use_mock:
            return self._book_mock_room(room_id, start_time, end_time, meeting_id, title)

        data = await self.client.post(
            f"/rooms/{room_id}/book",
            json_data={
                "start_time": start_time.isoformat(),
                "end_time": end_time.isoformat(),
                "meeting_id": meeting_id,
                "title": title,
            },
        )
        return data.get("success", False)

    def _filter_mock_rooms(
        self,
        floor: Optional[int],
        min_capacity: Optional[int],
        facilities: Optional[list[str]],
    ) -> list[Room]:
        """Mock 회의실 필터링"""
        results = []
        for room_data in MOCK_ROOMS:
            room = Room.from_api(room_data)

            if floor and room.floor != floor:
                continue
            if min_capacity and room.capacity < min_capacity:
                continue
            if facilities:
                room_facilities_lower = [f.lower() for f in room.facilities]
                if not all(f.lower() in room_facilities_lower for f in facilities):
                    continue

            results.append(room)

        return results

    def _check_mock_availability(
        self,
        room_id: str,
        start_time: datetime,
        end_time: datetime,
    ) -> RoomAvailability:
        """Mock 예약 가능 여부 확인"""
        # 회의실 찾기
        room = None
        for room_data in MOCK_ROOMS:
            if room_data["id"] == room_id:
                room = Room.from_api(room_data)
                break

        if not room:
            return RoomAvailability(
                room=Room(id=room_id, name="Unknown", floor=1, capacity=0),
                is_available=False,
                start_time=start_time,
                end_time=end_time,
                conflict_reason="회의실을 찾을 수 없습니다",
            )

        # 기존 예약 확인
        bookings = generate_mock_room_bookings(room_id, start_time.date())

        # 내부 예약 확인
        if room_id in self._room_bookings:
            bookings.extend(self._room_bookings[room_id])

        for booking in bookings:
            booking_start = datetime.fromisoformat(booking["start"])
            booking_end = datetime.fromisoformat(booking["end"])

            # 시간 충돌 확인
            if start_time < booking_end and end_time > booking_start:
                return RoomAvailability(
                    room=room,
                    is_available=False,
                    start_time=start_time,
                    end_time=end_time,
                    conflict_reason=f"이미 예약된 시간입니다 ({booking.get('meeting_title', '기존 예약')})",
                )

        return RoomAvailability(
            room=room,
            is_available=True,
            start_time=start_time,
            end_time=end_time,
        )

    def _search_mock_available(
        self,
        start_time: datetime,
        end_time: datetime,
        min_capacity: Optional[int],
        facilities: Optional[list[str]],
    ) -> RoomSearchResult:
        """Mock 예약 가능 회의실 검색"""
        # 조건에 맞는 회의실 필터링
        filtered_rooms = self._filter_mock_rooms(None, min_capacity, facilities)

        available = []
        for room in filtered_rooms:
            availability = self._check_mock_availability(room.id, start_time, end_time)
            if availability.is_available:
                available.append(availability)

        return RoomSearchResult(
            rooms=[a.room for a in available],
            available_rooms=available,
            total_count=len(available),
        )

    def _book_mock_room(
        self,
        room_id: str,
        start_time: datetime,
        end_time: datetime,
        meeting_id: str,
        title: str,
    ) -> bool:
        """Mock 회의실 예약"""
        # 예약 가능 여부 확인
        availability = self._check_mock_availability(room_id, start_time, end_time)
        if not availability.is_available:
            return False

        # 예약 추가
        if room_id not in self._room_bookings:
            self._room_bookings[room_id] = []

        self._room_bookings[room_id].append({
            "start": start_time.isoformat(),
            "end": end_time.isoformat(),
            "meeting_id": meeting_id,
            "meeting_title": title,
        })

        logger.info(f"Mock room booking: {room_id} for {meeting_id}")
        return True
