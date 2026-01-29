"""조직 API 어댑터

실제 사내 조직 API 연동 시 이 파일을 수정합니다.
"""

from abc import ABC, abstractmethod
from typing import Optional
from models.employee import Employee, EmployeeSearchResult


class BaseOrganizationAdapter(ABC):
    """조직 API 어댑터 인터페이스"""

    @abstractmethod
    async def search_employee(
        self,
        query: str,
        department: Optional[str] = None,
    ) -> EmployeeSearchResult:
        """직원 검색"""
        pass

    @abstractmethod
    async def get_employee_by_id(self, employee_id: str) -> Optional[Employee]:
        """ID로 직원 조회"""
        pass

    @abstractmethod
    async def get_team_members(self, department: str) -> list[Employee]:
        """팀 구성원 조회"""
        pass


class OrganizationAPIAdapter(BaseOrganizationAdapter):
    """
    실제 조직 API 어댑터

    TODO: 사내 API 스펙에 맞게 구현 필요

    예상 API 스펙:
    - GET /api/employees/search?q={query}&dept={department}
    - GET /api/employees/{id}
    - GET /api/departments/{dept}/members
    """

    def __init__(self, base_url: str, auth_token: str):
        self.base_url = base_url.rstrip("/")
        self.auth_token = auth_token
        # httpx 클라이언트 설정
        import httpx
        self.client = httpx.AsyncClient(
            base_url=self.base_url,
            headers={"Authorization": f"Bearer {auth_token}"},
            timeout=30.0,
        )

    async def search_employee(
        self,
        query: str,
        department: Optional[str] = None,
    ) -> EmployeeSearchResult:
        """
        직원 검색

        실제 API 응답 형식 예시:
        {
            "results": [
                {
                    "employee_id": "E12345",
                    "full_name": "김철수",
                    "department_name": "개발본부",
                    "email": "kim.cs@company.com",
                    "title": "선임 개발자"
                }
            ],
            "total": 1
        }
        """
        params = {"q": query}
        if department:
            params["dept"] = department

        response = await self.client.get("/employees/search", params=params)
        response.raise_for_status()
        data = response.json()

        # API 응답을 내부 모델로 변환
        employees = []
        for item in data.get("results", []):
            employees.append(Employee(
                id=item.get("employee_id", item.get("id")),
                name=item.get("full_name", item.get("name")),
                department=item.get("department_name", item.get("department")),
                email=item.get("email", ""),
                position=item.get("title", item.get("position")),
                team=item.get("team_name", item.get("team")),
            ))

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
        """ID로 직원 조회"""
        try:
            response = await self.client.get(f"/employees/{employee_id}")
            response.raise_for_status()
            data = response.json()

            return Employee(
                id=data.get("employee_id", data.get("id")),
                name=data.get("full_name", data.get("name")),
                department=data.get("department_name", data.get("department")),
                email=data.get("email", ""),
                position=data.get("title", data.get("position")),
            )
        except Exception:
            return None

    async def get_team_members(self, department: str) -> list[Employee]:
        """팀 구성원 조회"""
        response = await self.client.get(f"/departments/{department}/members")
        response.raise_for_status()
        data = response.json()

        return [
            Employee(
                id=item.get("employee_id", item.get("id")),
                name=item.get("full_name", item.get("name")),
                department=item.get("department_name", department),
                email=item.get("email", ""),
                position=item.get("title", item.get("position")),
            )
            for item in data.get("members", data.get("results", []))
        ]
