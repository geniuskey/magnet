"""회의 생성 도구"""

from datetime import datetime
from typing import Optional

from .base import BaseTool, ToolResult
from services.calendar import CalendarService
from services.room import RoomService
from services.organization import OrganizationService
from models.meeting import MeetingRequest
from utils.datetime_utils import format_datetime_korean
from utils.logger import get_logger

logger = get_logger(__name__)


class CreateMeetingTool(BaseTool):
    """회의 생성 도구"""

    name = "create_meeting"
    description = """회의를 생성하고 회의실을 예약합니다.
반드시 사용자 확인 후에만 호출하세요.
회의 생성 전 참석자와 회의실 정보가 확정되어 있어야 합니다."""

    parameters = {
        "type": "object",
        "properties": {
            "title": {
                "type": "string",
                "description": "회의 제목",
            },
            "attendee_ids": {
                "type": "array",
                "items": {"type": "string"},
                "description": "참석자 ID 목록",
            },
            "room_id": {
                "type": "string",
                "description": "회의실 ID",
            },
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
            "description": {
                "type": "string",
                "description": "회의 설명 (선택)",
            },
        },
        "required": ["title", "attendee_ids", "room_id", "start_time", "end_time"],
    }

    def __init__(self):
        self.calendar_service = CalendarService()
        self.room_service = RoomService()
        self.org_service = OrganizationService()

    async def execute(
        self,
        title: str,
        attendee_ids: list[str],
        room_id: str,
        start_time: str,
        end_time: str,
        description: Optional[str] = None,
        **kwargs,
    ) -> ToolResult:
        """회의 생성 실행"""
        try:
            # 시간 파싱
            start = datetime.fromisoformat(start_time.replace("Z", "+00:00"))
            end = datetime.fromisoformat(end_time.replace("Z", "+00:00"))

            # 회의실 예약 가능 여부 재확인
            availability = await self.room_service.get_room_availability(
                room_id, start, end
            )

            if not availability.is_available:
                return ToolResult(
                    success=False,
                    error=f"회의실을 예약할 수 없습니다: {availability.conflict_reason}",
                )

            # 회의 생성 요청
            meeting_request = MeetingRequest(
                title=title,
                attendee_ids=attendee_ids,
                room_id=room_id,
                start_time=start,
                end_time=end,
                description=description,
            )

            # 캘린더에 회의 생성
            meeting = await self.calendar_service.create_event(meeting_request)

            # 회의실 예약
            book_success = await self.room_service.book_room(
                room_id, start, end, meeting.id, title
            )

            if not book_success:
                return ToolResult(
                    success=False,
                    error="회의실 예약에 실패했습니다. 다른 회의실을 선택해주세요.",
                )

            # 참석자 이름 조회
            attendee_names = []
            for emp_id in attendee_ids:
                emp = await self.org_service.get_employee_by_id(emp_id)
                if emp:
                    attendee_names.append(emp.name)

            # 성공 메시지 생성
            message = f"""회의가 예약되었습니다!

📅 {title}
🕐 {format_datetime_korean(start)} ~ {format_datetime_korean(end).split(') ')[1]}
📍 {availability.room.name} ({availability.room.location_description})
👥 참석자: {', '.join(attendee_names)}

참석자들에게 초대가 발송되었습니다."""

            return ToolResult(
                success=True,
                data={
                    "meeting_id": meeting.id,
                    "title": title,
                    "start_time": start_time,
                    "end_time": end_time,
                    "room": {
                        "id": room_id,
                        "name": availability.room.name,
                    },
                    "attendees": attendee_names,
                },
                message=message,
            )

        except Exception as e:
            logger.error(f"Create meeting error: {str(e)}", exc_info=True)
            return ToolResult(
                success=False,
                error=f"회의 생성 중 오류가 발생했습니다: {str(e)}",
            )


class ConfirmMeetingTool(BaseTool):
    """회의 예약 확인 도구 (사용자 확인용)"""

    name = "confirm_meeting_details"
    description = """회의 예약 전 사용자에게 상세 내용을 확인받습니다.
실제 예약을 하지 않고, 사용자 확인만 요청합니다."""

    parameters = {
        "type": "object",
        "properties": {
            "title": {
                "type": "string",
                "description": "회의 제목",
            },
            "attendee_names": {
                "type": "array",
                "items": {"type": "string"},
                "description": "참석자 이름 목록",
            },
            "room_name": {
                "type": "string",
                "description": "회의실 이름",
            },
            "start_time": {
                "type": "string",
                "description": "시작 시간 (표시용)",
            },
            "duration_minutes": {
                "type": "integer",
                "description": "회의 시간 (분)",
            },
        },
        "required": ["title", "attendee_names", "room_name", "start_time", "duration_minutes"],
    }

    async def execute(
        self,
        title: str,
        attendee_names: list[str],
        room_name: str,
        start_time: str,
        duration_minutes: int,
        **kwargs,
    ) -> ToolResult:
        """회의 상세 확인"""
        message = f"""다음 내용으로 회의를 예약할까요?

📅 {title}
🕐 {start_time} ({duration_minutes}분)
📍 {room_name}
👥 참석자: {', '.join(attendee_names)}

예약을 진행하려면 '네' 또는 '예약해줘'라고 말씀해주세요."""

        return ToolResult(
            success=True,
            data={
                "awaiting_confirmation": True,
                "title": title,
                "attendee_names": attendee_names,
                "room_name": room_name,
                "start_time": start_time,
                "duration_minutes": duration_minutes,
            },
            message=message,
        )
