"""캘린더 도구"""

from datetime import date, timedelta
from typing import Optional

from .base import BaseTool, ToolResult
from services.calendar import CalendarService
from services.slot_finder import SlotFinder
from utils.datetime_utils import parse_relative_date, get_today, format_datetime_korean
from utils.logger import get_logger

logger = get_logger(__name__)


class GetCalendarTool(BaseTool):
    """일정 조회 도구"""

    name = "get_employee_calendar"
    description = """특정 직원(들)의 일정을 조회합니다.
일정 상세 내용은 비공개이며, 바쁨/가능 여부만 반환됩니다.
여러 명의 일정을 동시에 조회할 수 있습니다."""

    parameters = {
        "type": "object",
        "properties": {
            "employee_ids": {
                "type": "array",
                "items": {"type": "string"},
                "description": "조회할 직원 ID 목록",
            },
            "start_date": {
                "type": "string",
                "description": "조회 시작일 (YYYY-MM-DD 또는 '내일', '다음 주' 등)",
            },
            "end_date": {
                "type": "string",
                "description": "조회 종료일 (YYYY-MM-DD 또는 '내일', '다음 주 금요일' 등)",
            },
        },
        "required": ["employee_ids", "start_date", "end_date"],
    }

    def __init__(self):
        self.calendar_service = CalendarService()

    async def execute(
        self,
        employee_ids: list[str],
        start_date: str,
        end_date: str,
        **kwargs,
    ) -> ToolResult:
        """일정 조회 실행"""
        try:
            # 날짜 파싱
            start = parse_relative_date(start_date) or get_today()
            end = parse_relative_date(end_date, start) or start

            # 여러 직원 일정 조회
            schedules = await self.calendar_service.get_schedules(
                employee_ids, start, end
            )

            result_data = []
            for schedule in schedules:
                employee_schedule = {
                    "employee_id": schedule.employee_id,
                    "employee_name": schedule.employee_name,
                    "busy_slots": [],
                }

                for day in schedule.schedules:
                    for slot in day.busy_slots:
                        employee_schedule["busy_slots"].append({
                            "date": day.schedule_date.isoformat(),
                            "start": slot.start.isoformat(),
                            "end": slot.end.isoformat(),
                        })

                result_data.append(employee_schedule)

            # 메시지 생성
            names = [s.employee_name for s in schedules]
            if len(names) == 1:
                message = f"{names[0]}님의 {start.month}월 {start.day}일"
                if start != end:
                    message += f" ~ {end.month}월 {end.day}일"
                message += " 일정을 확인했습니다."
            else:
                message = f"{', '.join(names)}의 일정을 확인했습니다."

            return ToolResult(
                success=True,
                data={
                    "schedules": result_data,
                    "start_date": start.isoformat(),
                    "end_date": end.isoformat(),
                },
                message=message,
            )

        except Exception as e:
            logger.error(f"Calendar error: {str(e)}", exc_info=True)
            return ToolResult(
                success=False,
                error=f"일정 조회 중 오류가 발생했습니다: {str(e)}",
            )


class FindFreeSlotsTool(BaseTool):
    """공통 빈 시간대 찾기 도구"""

    name = "find_common_free_slots"
    description = """여러 참석자의 공통 빈 시간대를 찾습니다.
업무 시간(09:00-18:00) 내에서 모든 참석자가 가능한 시간을 찾습니다.
점심시간(12:00-13:00)은 기본적으로 제외됩니다."""

    parameters = {
        "type": "object",
        "properties": {
            "employee_ids": {
                "type": "array",
                "items": {"type": "string"},
                "description": "참석자 ID 목록",
            },
            "start_date": {
                "type": "string",
                "description": "시작일 (YYYY-MM-DD 또는 '내일', '다음 주' 등)",
            },
            "end_date": {
                "type": "string",
                "description": "종료일 (YYYY-MM-DD 또는 '다음 주 금요일' 등)",
            },
            "duration_minutes": {
                "type": "integer",
                "description": "필요한 회의 시간 (분)",
            },
            "preferred_time": {
                "type": "string",
                "enum": ["morning", "afternoon", "any"],
                "description": "선호 시간대 (morning: 오전, afternoon: 오후, any: 상관없음)",
            },
        },
        "required": ["employee_ids", "start_date", "end_date", "duration_minutes"],
    }

    def __init__(self):
        self.calendar_service = CalendarService()
        self.slot_finder = SlotFinder()

    async def execute(
        self,
        employee_ids: list[str],
        start_date: str,
        end_date: str,
        duration_minutes: int,
        preferred_time: Optional[str] = "any",
        **kwargs,
    ) -> ToolResult:
        """공통 빈 시간대 찾기 실행"""
        try:
            # 날짜 파싱
            start = parse_relative_date(start_date) or get_today()
            end = parse_relative_date(end_date, start) or start

            # 일정 조회
            schedules = await self.calendar_service.get_schedules(
                employee_ids, start, end
            )

            # 공통 빈 시간대 찾기
            free_slots = self.slot_finder.find_common_free_slots(
                schedules, start, end, duration_minutes, preferred_time
            )

            if not free_slots:
                return ToolResult(
                    success=True,
                    data={"free_slots": [], "count": 0},
                    message=f"해당 기간({start.month}월 {start.day}일 ~ {end.month}월 {end.day}일)에 "
                            f"모든 참석자가 {duration_minutes}분 이상 가능한 시간이 없습니다. "
                            f"다른 기간을 확인해 볼까요?",
                )

            # 상위 10개만 반환
            top_slots = free_slots[:10]

            slots_data = [
                {
                    "start": slot.start.isoformat(),
                    "end": slot.end.isoformat(),
                    "duration_minutes": slot.duration_minutes,
                    "display": format_datetime_korean(slot.start),
                }
                for slot in top_slots
            ]

            # 메시지 생성
            if len(free_slots) == 1:
                message = f"가능한 시간이 1개 있습니다:\n"
            else:
                message = f"가능한 시간이 {len(free_slots)}개 있습니다. 상위 {len(top_slots)}개:\n"

            for i, slot in enumerate(top_slots[:5], 1):
                message += f"{i}. {format_datetime_korean(slot.start)}\n"

            return ToolResult(
                success=True,
                data={
                    "free_slots": slots_data,
                    "count": len(free_slots),
                    "duration_minutes": duration_minutes,
                },
                message=message,
            )

        except Exception as e:
            logger.error(f"Find free slots error: {str(e)}", exc_info=True)
            return ToolResult(
                success=False,
                error=f"빈 시간대 검색 중 오류가 발생했습니다: {str(e)}",
            )
