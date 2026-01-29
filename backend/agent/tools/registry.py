"""도구 레지스트리"""

from typing import Optional

from .base import BaseTool, ToolResult
from .employee import SearchEmployeeTool, GetTeamMembersTool
from .calendar import GetCalendarTool, FindFreeSlotsTool
from .room import SearchRoomsTool, ListRoomsTool
from .meeting import CreateMeetingTool, ConfirmMeetingTool
from utils.logger import get_logger

logger = get_logger(__name__)


class ToolRegistry:
    """도구 레지스트리 - 모든 도구 관리"""

    def __init__(self):
        self._tools: dict[str, BaseTool] = {}
        self._register_default_tools()

    def _register_default_tools(self):
        """기본 도구들 등록"""
        default_tools = [
            SearchEmployeeTool(),
            GetTeamMembersTool(),
            GetCalendarTool(),
            FindFreeSlotsTool(),
            SearchRoomsTool(),
            ListRoomsTool(),
            CreateMeetingTool(),
            ConfirmMeetingTool(),
        ]

        for tool in default_tools:
            self.register(tool)

    def register(self, tool: BaseTool):
        """도구 등록"""
        self._tools[tool.name] = tool
        logger.debug(f"Tool registered: {tool.name}")

    def get(self, name: str) -> Optional[BaseTool]:
        """이름으로 도구 조회"""
        return self._tools.get(name)

    def get_all_schemas(self) -> list[dict]:
        """모든 도구 스키마 반환 (LLM용)"""
        return [tool.get_schema() for tool in self._tools.values()]

    async def execute(self, name: str, arguments: dict) -> ToolResult:
        """
        도구 실행

        Args:
            name: 도구 이름
            arguments: 실행 인자

        Returns:
            실행 결과
        """
        tool = self.get(name)
        if not tool:
            logger.warning(f"Unknown tool: {name}")
            return ToolResult(
                success=False,
                error=f"알 수 없는 도구입니다: {name}",
            )

        # 파라미터 유효성 검사
        is_valid, error_msg = tool.validate_params(arguments)
        if not is_valid:
            return ToolResult(
                success=False,
                error=error_msg,
            )

        try:
            logger.info(f"Executing tool: {name}", extra={"arguments": arguments})
            result = await tool.execute(**arguments)
            logger.info(f"Tool {name} completed", extra={"success": result.success})
            return result

        except Exception as e:
            logger.error(f"Tool execution error: {name}", exc_info=True)
            return ToolResult(
                success=False,
                error=f"도구 실행 중 오류가 발생했습니다: {str(e)}",
            )

    @property
    def tool_names(self) -> list[str]:
        """등록된 모든 도구 이름"""
        return list(self._tools.keys())
