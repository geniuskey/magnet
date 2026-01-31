# 직원 조회 API 연동

HR/조직도 시스템과 연동하여 직원 정보를 조회합니다.

## 개요

직원 조회 API는 다음 기능을 제공해야 합니다:

- 직원 검색 (이름, 이메일, 부서)
- 직원 상세 정보 조회
- 팀/부서 멤버 조회
- 조직도 조회

## 필요한 API 엔드포인트

### 1. 직원 검색

<span class="api-method get">GET</span> `/employees/search`

직원을 검색합니다.

**Query Parameters**

| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|------|------|
| `q` | string | O | 검색어 (이름, 이메일, 부서) |
| `limit` | integer | X | 결과 수 제한 (기본: 20) |
| `offset` | integer | X | 페이징 오프셋 |

**Response**

```json
{
  "total": 150,
  "employees": [
    {
      "id": "emp_001",
      "name": "김철수",
      "email": "chulsoo.kim@company.com",
      "department": {
        "id": "dept_dev",
        "name": "개발팀"
      },
      "position": "선임",
      "phone": "010-1234-5678",
      "profile_image": "https://..."
    }
  ]
}
```

---

### 2. 직원 상세 조회

<span class="api-method get">GET</span> `/employees/{employee_id}`

직원의 상세 정보를 조회합니다.

**Path Parameters**

| 파라미터 | 타입 | 설명 |
|---------|------|------|
| `employee_id` | string | 직원 ID |

**Response**

```json
{
  "id": "emp_001",
  "name": "김철수",
  "email": "chulsoo.kim@company.com",
  "department": {
    "id": "dept_dev",
    "name": "개발팀",
    "path": ["회사", "기술본부", "개발팀"]
  },
  "position": "선임",
  "phone": "010-1234-5678",
  "office_location": "본관 3층",
  "manager": {
    "id": "emp_000",
    "name": "박팀장"
  },
  "profile_image": "https://...",
  "joined_date": "2020-03-01"
}
```

---

### 3. 팀/부서 멤버 조회

<span class="api-method get">GET</span> `/departments/{department_id}/members`

특정 부서의 모든 멤버를 조회합니다.

**Path Parameters**

| 파라미터 | 타입 | 설명 |
|---------|------|------|
| `department_id` | string | 부서 ID |

**Query Parameters**

| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|------|------|
| `include_sub` | boolean | X | 하위 부서 포함 (기본: false) |

**Response**

```json
{
  "department": {
    "id": "dept_dev",
    "name": "개발팀"
  },
  "members": [
    {
      "id": "emp_001",
      "name": "김철수",
      "email": "chulsoo.kim@company.com",
      "position": "선임"
    }
  ],
  "total": 25
}
```

---

### 4. 조직도 조회

<span class="api-method get">GET</span> `/organization`

전체 조직도를 조회합니다.

**Response**

```json
{
  "departments": [
    {
      "id": "dept_dev",
      "name": "개발팀",
      "parent_id": "dept_tech",
      "member_count": 100,
      "manager": {
        "id": "emp_000",
        "name": "박팀장"
      }
    }
  ]
}
```

## Adapter 구현

### 인터페이스

```python title="backend/services/adapters/organization_adapter.py"
from abc import ABC, abstractmethod
from models.employee import Employee, Department

class OrganizationAdapter(ABC):
    """조직/직원 정보 조회 어댑터 인터페이스"""

    @abstractmethod
    async def search_employees(
        self,
        query: str,
        limit: int = 20,
        offset: int = 0
    ) -> tuple[list[Employee], int]:
        """
        직원 검색

        Args:
            query: 검색어
            limit: 결과 수 제한
            offset: 페이징 오프셋

        Returns:
            (직원 목록, 전체 수)
        """
        pass

    @abstractmethod
    async def get_employee(self, employee_id: str) -> Employee | None:
        """직원 상세 조회"""
        pass

    @abstractmethod
    async def get_team_members(
        self,
        department_id: str,
        include_sub: bool = False
    ) -> list[Employee]:
        """팀/부서 멤버 조회"""
        pass

    @abstractmethod
    async def get_departments(self) -> list[Department]:
        """전체 부서 목록 조회"""
        pass
```

### 구현 예시

```python title="backend/services/adapters/company_hr_adapter.py"
import httpx
from .organization_adapter import OrganizationAdapter
from models.employee import Employee, Department
from config import get_settings

settings = get_settings()

class CompanyHRAdapter(OrganizationAdapter):
    """회사 HR 시스템 연동 어댑터"""

    def __init__(self):
        self.base_url = settings.employee_api_url
        self.client = httpx.AsyncClient(
            base_url=self.base_url,
            timeout=30.0,
        )
        self._token = None

    async def _get_token(self) -> str:
        """OAuth 토큰 획득"""
        if self._token:
            return self._token

        response = await self.client.post(
            "/oauth/token",
            data={
                "grant_type": "client_credentials",
                "client_id": settings.employee_api_client_id,
                "client_secret": settings.employee_api_client_secret,
            }
        )
        response.raise_for_status()
        self._token = response.json()["access_token"]
        return self._token

    async def _request(self, method: str, path: str, **kwargs) -> dict:
        """인증된 API 요청"""
        token = await self._get_token()
        headers = {"Authorization": f"Bearer {token}"}

        response = await self.client.request(
            method, path, headers=headers, **kwargs
        )
        response.raise_for_status()
        return response.json()

    async def search_employees(
        self,
        query: str,
        limit: int = 20,
        offset: int = 0
    ) -> tuple[list[Employee], int]:
        """직원 검색"""
        data = await self._request(
            "GET",
            "/employees/search",
            params={"q": query, "limit": limit, "offset": offset}
        )

        employees = [
            Employee(
                id=emp["id"],
                name=emp["name"],
                email=emp["email"],
                department=emp["department"]["name"],
                team_id=emp["department"]["id"],
                position=emp["position"],
            )
            for emp in data["employees"]
        ]

        return employees, data["total"]

    async def get_employee(self, employee_id: str) -> Employee | None:
        """직원 상세 조회"""
        try:
            data = await self._request("GET", f"/employees/{employee_id}")
            return Employee(
                id=data["id"],
                name=data["name"],
                email=data["email"],
                department=data["department"]["name"],
                team_id=data["department"]["id"],
                position=data["position"],
            )
        except httpx.HTTPStatusError as e:
            if e.response.status_code == 404:
                return None
            raise

    async def get_team_members(
        self,
        department_id: str,
        include_sub: bool = False
    ) -> list[Employee]:
        """팀/부서 멤버 조회"""
        data = await self._request(
            "GET",
            f"/departments/{department_id}/members",
            params={"include_sub": include_sub}
        )

        return [
            Employee(
                id=emp["id"],
                name=emp["name"],
                email=emp["email"],
                department=data["department"]["name"],
                team_id=department_id,
                position=emp["position"],
            )
            for emp in data["members"]
        ]

    async def get_departments(self) -> list[Department]:
        """전체 부서 목록 조회"""
        data = await self._request("GET", "/organization")

        return [
            Department(
                id=dept["id"],
                name=dept["name"],
                parent_id=dept.get("parent_id"),
                member_count=dept["member_count"],
            )
            for dept in data["departments"]
        ]
```

## 설정

```bash title=".env"
# 직원 조회 API 설정
EMPLOYEE_API_URL=https://hr.company.com/api/v1
EMPLOYEE_API_AUTH_TYPE=oauth2_client
EMPLOYEE_API_CLIENT_ID=meeting-scheduler
EMPLOYEE_API_CLIENT_SECRET=your-secret-here

# 선택적 설정
EMPLOYEE_API_TIMEOUT=30
EMPLOYEE_API_CACHE_TTL=300  # 5분 캐시
```

## 테스트

```python title="tests/test_employee_adapter.py"
import pytest
from services.adapters.company_hr_adapter import CompanyHRAdapter

@pytest.fixture
async def adapter():
    return CompanyHRAdapter()

@pytest.mark.asyncio
async def test_search_employees(adapter):
    employees, total = await adapter.search_employees("김")
    assert len(employees) > 0
    assert all("김" in emp.name for emp in employees)

@pytest.mark.asyncio
async def test_get_team_members(adapter):
    members = await adapter.get_team_members("dept_dev")
    assert len(members) > 0
    assert all(m.team_id == "dept_dev" for m in members)
```

## 에러 처리

| 에러 코드 | 설명 | 대응 |
|----------|------|------|
| 401 | 인증 실패 | 토큰 갱신 후 재시도 |
| 403 | 권한 없음 | 관리자에게 권한 요청 |
| 404 | 리소스 없음 | None 반환 |
| 429 | 요청 한도 초과 | 지수 백오프로 재시도 |
| 500+ | 서버 오류 | 재시도 후 fallback |

## 다음 단계

- [일정 조회 API 연동](calendar-api.md)
- [회의실 API 연동](room-api.md)
