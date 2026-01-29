"""직원 검색 도구"""

from typing import Optional

from .base import BaseTool, ToolResult
from services.organization import OrganizationService
from utils.logger import get_logger

logger = get_logger(__name__)


class SearchEmployeeTool(BaseTool):
    """직원 검색 도구"""

    name = "search_employee"
    description = """직원을 이름, 부서, 직급으로 검색합니다.
동명이인이 있을 수 있으므로 결과에 부서 정보를 포함합니다.
검색 결과가 여러 명인 경우 사용자에게 명확히 확인을 받아야 합니다."""

    parameters = {
        "type": "object",
        "properties": {
            "query": {
                "type": "string",
                "description": "검색어 (이름, 부서명, 직급 등)",
            },
            "department": {
                "type": "string",
                "description": "부서 필터 (선택)",
            },
        },
        "required": ["query"],
    }

    def __init__(self):
        self.org_service = OrganizationService()

    async def execute(
        self,
        query: str,
        department: Optional[str] = None,
        **kwargs,
    ) -> ToolResult:
        """직원 검색 실행"""
        try:
            result = await self.org_service.search_employee(query, department)

            if not result.employees:
                return ToolResult(
                    success=True,
                    data={"employees": [], "count": 0},
                    message=f"'{query}'에 해당하는 직원을 찾지 못했습니다.",
                )

            employees_data = [
                {
                    "id": emp.id,
                    "name": emp.name,
                    "department": emp.department,
                    "position": emp.position,
                    "email": emp.email,
                }
                for emp in result.employees
            ]

            if result.has_duplicates:
                message = f"'{query}'(으)로 검색한 결과 동명이인이 있습니다:\n"
                for i, emp in enumerate(result.employees, 1):
                    message += f"{i}. {emp.name} - {emp.department} {emp.position or ''}\n"
                message += "\n어느 분을 말씀하시는 건가요?"
            else:
                emp = result.employees[0]
                if len(result.employees) == 1:
                    message = f"{emp.name}님({emp.department})을 찾았습니다."
                else:
                    message = f"검색 결과 {len(result.employees)}명을 찾았습니다."

            return ToolResult(
                success=True,
                data={
                    "employees": employees_data,
                    "count": len(result.employees),
                    "has_duplicates": result.has_duplicates,
                },
                message=message,
            )

        except Exception as e:
            logger.error(f"Employee search error: {str(e)}", exc_info=True)
            return ToolResult(
                success=False,
                error=f"직원 검색 중 오류가 발생했습니다: {str(e)}",
            )


class GetTeamMembersTool(BaseTool):
    """팀/부서 구성원 조회 도구"""

    name = "get_team_members"
    description = "특정 팀 또는 부서의 전체 구성원을 조회합니다."

    parameters = {
        "type": "object",
        "properties": {
            "department": {
                "type": "string",
                "description": "부서명 또는 팀명",
            },
        },
        "required": ["department"],
    }

    def __init__(self):
        self.org_service = OrganizationService()

    async def execute(self, department: str, **kwargs) -> ToolResult:
        """팀 구성원 조회 실행"""
        try:
            members = await self.org_service.get_team_members(department)

            if not members:
                return ToolResult(
                    success=True,
                    data={"members": [], "count": 0},
                    message=f"'{department}' 부서를 찾지 못했거나 구성원이 없습니다.",
                )

            members_data = [
                {
                    "id": emp.id,
                    "name": emp.name,
                    "position": emp.position,
                }
                for emp in members
            ]

            member_names = ", ".join([m.name for m in members])
            message = f"{department} 구성원 ({len(members)}명): {member_names}"

            return ToolResult(
                success=True,
                data={
                    "members": members_data,
                    "count": len(members),
                    "department": department,
                },
                message=message,
            )

        except Exception as e:
            logger.error(f"Team members error: {str(e)}", exc_info=True)
            return ToolResult(
                success=False,
                error=f"팀 구성원 조회 중 오류가 발생했습니다: {str(e)}",
            )
