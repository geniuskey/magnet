"""회의실 도구"""

from datetime import datetime
from typing import Optional

from .base import BaseTool, ToolResult
from services.room import RoomService
from utils.datetime_utils import format_datetime_korean
from utils.logger import get_logger

logger = get_logger(__name__)


class SearchRoomsTool(BaseTool):
    """회의실 검색 도구"""

    name = "search_available_rooms"
    description = """특정 시간대에 예약 가능한 회의실을 검색합니다.
인원수, 층, 시설(화상회의, 화이트보드 등) 조건으로 필터링할 수 있습니다."""

    parameters = {
        "type": "object",
        "properties": {
            "start_time": {
                "type": "string",
                "format": "date-time",
                "description": "시작 시간 (ISO 8601 형식)",
            },
            "end_time": {
                "type": "string",
                "format": "date-time",
                "description": "종료 시간 (ISO 8601 형식)",
            },
            "min_capacity": {
                "type": "integer",
                "description": "최소 수용 인원",
            },
            "facilities": {
                "type": "array",
                "items": {"type": "string"},
                "description": "필요 시설 목록 (예: ['화상회의', '화이트보드'])",
            },
        },
        "required": ["start_time", "end_time"],
    }

    def __init__(self):
        self.room_service = RoomService()

    async def execute(
        self,
        start_time: str,
        end_time: str,
        min_capacity: Optional[int] = None,
        facilities: Optional[list[str]] = None,
        **kwargs,
    ) -> ToolResult:
        """회의실 검색 실행"""
        try:
            # 시간 파싱
            start = datetime.fromisoformat(start_time.replace("Z", "+00:00"))
            end = datetime.fromisoformat(end_time.replace("Z", "+00:00"))

            # 회의실 검색
            result = await self.room_service.search_available_rooms(
                start, end, min_capacity, facilities
            )

            if not result.available_rooms:
                conditions = []
                if min_capacity:
                    conditions.append(f"{min_capacity}명 이상")
                if facilities:
                    conditions.append(f"{', '.join(facilities)} 시설")

                cond_str = ", ".join(conditions) if conditions else ""
                return ToolResult(
                    success=True,
                    data={"rooms": [], "count": 0},
                    message=f"{format_datetime_korean(start)} 시간에 "
                            f"{'조건(' + cond_str + ')에 맞는 ' if cond_str else ''}"
                            f"예약 가능한 회의실이 없습니다.",
                )

            rooms_data = [
                {
                    "id": avail.room.id,
                    "name": avail.room.name,
                    "floor": avail.room.floor,
                    "capacity": avail.room.capacity,
                    "facilities": avail.room.facilities,
                    "location": avail.room.location_description,
                }
                for avail in result.available_rooms
            ]

            # 메시지 생성
            message = f"{format_datetime_korean(start)} 시간에 예약 가능한 회의실:\n"
            for i, room in enumerate(rooms_data[:5], 1):
                facilities_str = ", ".join(room["facilities"]) if room["facilities"] else "없음"
                message += f"{i}. {room['name']} ({room['location']}, {room['capacity']}명, 시설: {facilities_str})\n"

            return ToolResult(
                success=True,
                data={
                    "rooms": rooms_data,
                    "count": len(rooms_data),
                    "start_time": start_time,
                    "end_time": end_time,
                },
                message=message,
            )

        except Exception as e:
            logger.error(f"Room search error: {str(e)}", exc_info=True)
            return ToolResult(
                success=False,
                error=f"회의실 검색 중 오류가 발생했습니다: {str(e)}",
            )


class ListRoomsTool(BaseTool):
    """회의실 목록 조회 도구"""

    name = "list_rooms"
    description = "조건에 맞는 회의실 목록을 조회합니다. (예약 가능 여부와 무관)"

    parameters = {
        "type": "object",
        "properties": {
            "floor": {
                "type": "integer",
                "description": "층 필터",
            },
            "min_capacity": {
                "type": "integer",
                "description": "최소 수용 인원",
            },
            "facilities": {
                "type": "array",
                "items": {"type": "string"},
                "description": "필요 시설 목록",
            },
        },
        "required": [],
    }

    def __init__(self):
        self.room_service = RoomService()

    async def execute(
        self,
        floor: Optional[int] = None,
        min_capacity: Optional[int] = None,
        facilities: Optional[list[str]] = None,
        **kwargs,
    ) -> ToolResult:
        """회의실 목록 조회 실행"""
        try:
            rooms = await self.room_service.list_rooms(floor, min_capacity, facilities)

            if not rooms:
                return ToolResult(
                    success=True,
                    data={"rooms": [], "count": 0},
                    message="조건에 맞는 회의실이 없습니다.",
                )

            rooms_data = [
                {
                    "id": room.id,
                    "name": room.name,
                    "floor": room.floor,
                    "capacity": room.capacity,
                    "facilities": room.facilities,
                }
                for room in rooms
            ]

            message = f"회의실 {len(rooms)}개를 찾았습니다."

            return ToolResult(
                success=True,
                data={"rooms": rooms_data, "count": len(rooms)},
                message=message,
            )

        except Exception as e:
            logger.error(f"List rooms error: {str(e)}", exc_info=True)
            return ToolResult(
                success=False,
                error=f"회의실 목록 조회 중 오류가 발생했습니다: {str(e)}",
            )
