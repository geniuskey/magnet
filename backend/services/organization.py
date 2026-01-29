"""조직 API 서비스"""

from typing import Optional

from config import get_settings
from models.employee import Employee, EmployeeSearchResult
from utils.logger import get_logger
from .base import BaseAPIClient
from .mock_data import MOCK_EMPLOYEES

logger = get_logger(__name__)
settings = get_settings()


class OrganizationService:
    """조직 API 서비스"""

    def __init__(self, use_mock: bool = True):
        self.use_mock = use_mock or settings.use_mock_api
        if not self.use_mock:
            self.client = BaseAPIClient(
                settings.org_api_url,
                settings.api_auth_token,
            )

    async def search_employee(
        self,
        query: str,
        department: Optional[str] = None,
    ) -> EmployeeSearchResult:
        """
        직원 검색

        Args:
            query: 검색어 (이름, 이메일 등)
            department: 부서 필터 (선택)

        Returns:
            검색 결과
        """
        if self.use_mock:
            return self._search_mock(query, department)

        params = {"q": query}
        if department:
            params["department"] = department

        data = await self.client.get("/employees/search", params=params)
        employees = [Employee.from_api(item) for item in data.get("results", [])]

        # 동명이인 체크
        name_counts = {}
        for emp in employees:
            name_counts[emp.name] = name_counts.get(emp.name, 0) + 1
        has_duplicates = any(count > 1 for count in name_counts.values())

        return EmployeeSearchResult(
            employees=employees,
            total_count=len(employees),
            has_duplicates=has_duplicates,
        )

    async def get_employee_by_id(self, employee_id: str) -> Optional[Employee]:
        """
        ID로 직원 조회

        Args:
            employee_id: 직원 ID

        Returns:
            직원 정보 또는 None
        """
        if self.use_mock:
            for emp_data in MOCK_EMPLOYEES:
                if emp_data["id"] == employee_id:
                    return Employee.from_api(emp_data)
            return None

        data = await self.client.get(f"/employees/{employee_id}")
        if data:
            return Employee.from_api(data)
        return None

    async def get_team_members(self, department: str) -> list[Employee]:
        """
        부서/팀 구성원 조회

        Args:
            department: 부서명

        Returns:
            직원 목록
        """
        if self.use_mock:
            return [
                Employee.from_api(emp_data)
                for emp_data in MOCK_EMPLOYEES
                if department.lower() in emp_data["department"].lower()
                or department.lower() in emp_data.get("team", "").lower()
            ]

        data = await self.client.get("/employees", params={"department": department})
        return [Employee.from_api(item) for item in data.get("results", [])]

    def _search_mock(
        self,
        query: str,
        department: Optional[str],
    ) -> EmployeeSearchResult:
        """Mock 데이터에서 검색"""
        query_lower = query.lower()
        results = []

        for emp_data in MOCK_EMPLOYEES:
            # 이름, 이메일, 부서에서 검색
            if (
                query_lower in emp_data["name"].lower()
                or query_lower in emp_data["email"].lower()
                or query_lower in emp_data["department"].lower()
            ):
                # 부서 필터 적용
                if department:
                    if department.lower() not in emp_data["department"].lower():
                        continue
                results.append(Employee.from_api(emp_data))

        # 동명이인 체크
        name_counts = {}
        for emp in results:
            name_counts[emp.name] = name_counts.get(emp.name, 0) + 1
        has_duplicates = any(count > 1 for count in name_counts.values())

        return EmployeeSearchResult(
            employees=results,
            total_count=len(results),
            has_duplicates=has_duplicates,
        )
