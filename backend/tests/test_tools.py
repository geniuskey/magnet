"""도구 테스트"""

import pytest
from datetime import date, datetime, timedelta
from zoneinfo import ZoneInfo

from agent.tools.employee import SearchEmployeeTool
from agent.tools.calendar import GetCalendarTool, FindFreeSlotsTool
from agent.tools.room import SearchRoomsTool
from agent.tools.registry import ToolRegistry

KST = ZoneInfo("Asia/Seoul")


@pytest.fixture
def tool_registry():
    """ToolRegistry 인스턴스"""
    return ToolRegistry()


class TestSearchEmployeeTool:
    """SearchEmployeeTool 테스트"""

    @pytest.mark.asyncio
    async def test_search_single_employee(self):
        """단일 직원 검색"""
        tool = SearchEmployeeTool()
        result = await tool.execute(query="이영희")

        assert result.success
        assert result.data["count"] >= 1
        # 이영희가 결과에 있어야 함
        names = [e["name"] for e in result.data["employees"]]
        assert "이영희" in names

    @pytest.mark.asyncio
    async def test_search_duplicate_names(self):
        """동명이인 검색"""
        tool = SearchEmployeeTool()
        result = await tool.execute(query="김철수")

        assert result.success
        # 김철수는 2명 (개발팀, 기획팀)
        assert result.data["count"] >= 2
        assert result.data["has_duplicates"] is True

    @pytest.mark.asyncio
    async def test_search_with_department_filter(self):
        """부서 필터 검색"""
        tool = SearchEmployeeTool()
        result = await tool.execute(query="김철수", department="개발팀")

        assert result.success
        # 개발팀 김철수만 나와야 함
        for emp in result.data["employees"]:
            if emp["name"] == "김철수":
                assert "개발" in emp["department"]

    @pytest.mark.asyncio
    async def test_search_not_found(self):
        """검색 결과 없음"""
        tool = SearchEmployeeTool()
        result = await tool.execute(query="존재하지않는사람")

        assert result.success  # 에러는 아님
        assert result.data["count"] == 0


class TestGetCalendarTool:
    """GetCalendarTool 테스트"""

    @pytest.mark.asyncio
    async def test_get_calendar(self):
        """일정 조회"""
        tool = GetCalendarTool()
        tomorrow = (date.today() + timedelta(days=1)).isoformat()

        result = await tool.execute(
            employee_ids=["emp_001"],
            start_date=tomorrow,
            end_date=tomorrow,
        )

        assert result.success
        assert "schedules" in result.data

    @pytest.mark.asyncio
    async def test_get_calendar_multiple_employees(self):
        """여러 직원 일정 조회"""
        tool = GetCalendarTool()
        tomorrow = (date.today() + timedelta(days=1)).isoformat()

        result = await tool.execute(
            employee_ids=["emp_001", "emp_003"],
            start_date=tomorrow,
            end_date=tomorrow,
        )

        assert result.success
        assert len(result.data["schedules"]) == 2


class TestFindFreeSlotsTool:
    """FindFreeSlotsTool 테스트"""

    @pytest.mark.asyncio
    async def test_find_free_slots(self):
        """빈 시간대 찾기"""
        tool = FindFreeSlotsTool()

        # 다음 주 평일 찾기
        target = date.today() + timedelta(days=7)
        while target.weekday() >= 5:
            target += timedelta(days=1)

        result = await tool.execute(
            employee_ids=["emp_001"],
            start_date=target.isoformat(),
            end_date=target.isoformat(),
            duration_minutes=60,
        )

        assert result.success
        # 빈 시간이 있어야 함
        assert result.data["count"] > 0


class TestSearchRoomsTool:
    """SearchRoomsTool 테스트"""

    @pytest.mark.asyncio
    async def test_search_available_rooms(self):
        """회의실 검색"""
        tool = SearchRoomsTool()

        # 다음 주 평일 오전 10시
        target = date.today() + timedelta(days=7)
        while target.weekday() >= 5:
            target += timedelta(days=1)

        start_time = datetime.combine(
            target, datetime.min.time().replace(hour=10), tzinfo=KST
        ).isoformat()
        end_time = datetime.combine(
            target, datetime.min.time().replace(hour=11), tzinfo=KST
        ).isoformat()

        result = await tool.execute(
            start_time=start_time,
            end_time=end_time,
        )

        assert result.success

    @pytest.mark.asyncio
    async def test_search_rooms_with_capacity(self):
        """수용 인원 조건으로 회의실 검색"""
        tool = SearchRoomsTool()

        target = date.today() + timedelta(days=7)
        while target.weekday() >= 5:
            target += timedelta(days=1)

        start_time = datetime.combine(
            target, datetime.min.time().replace(hour=10), tzinfo=KST
        ).isoformat()
        end_time = datetime.combine(
            target, datetime.min.time().replace(hour=11), tzinfo=KST
        ).isoformat()

        result = await tool.execute(
            start_time=start_time,
            end_time=end_time,
            min_capacity=8,
        )

        assert result.success
        # 8명 이상 수용 가능한 회의실만
        for room in result.data.get("rooms", []):
            assert room["capacity"] >= 8


class TestToolRegistry:
    """ToolRegistry 테스트"""

    def test_registry_has_default_tools(self, tool_registry):
        """기본 도구들이 등록되어 있는지"""
        expected_tools = [
            "search_employee",
            "get_employee_calendar",
            "find_common_free_slots",
            "search_available_rooms",
            "create_meeting",
        ]

        for tool_name in expected_tools:
            assert tool_registry.get(tool_name) is not None

    def test_get_all_schemas(self, tool_registry):
        """모든 도구 스키마 가져오기"""
        schemas = tool_registry.get_all_schemas()
        assert len(schemas) > 0

        for schema in schemas:
            assert "name" in schema
            assert "description" in schema
            assert "parameters" in schema

    @pytest.mark.asyncio
    async def test_execute_unknown_tool(self, tool_registry):
        """존재하지 않는 도구 실행"""
        result = await tool_registry.execute("unknown_tool", {})
        assert result.success is False
        assert "알 수 없는 도구" in result.error
