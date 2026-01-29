"""직원 모델"""

from pydantic import BaseModel, Field
from typing import Optional


class Employee(BaseModel):
    """직원 정보 모델"""

    id: str = Field(..., description="직원 고유 ID")
    name: str = Field(..., description="직원 이름")
    department: str = Field(..., description="부서명")
    email: str = Field(..., description="이메일 주소")
    position: Optional[str] = Field(None, description="직급")
    team: Optional[str] = Field(None, description="팀명")
    phone: Optional[str] = Field(None, description="전화번호")

    @classmethod
    def from_api(cls, data: dict) -> "Employee":
        """API 응답 데이터로부터 Employee 객체 생성"""
        return cls(
            id=data.get("id", data.get("employee_id", "")),
            name=data.get("name", data.get("full_name", "")),
            department=data.get("department", data.get("dept", "")),
            email=data.get("email", ""),
            position=data.get("position", data.get("title")),
            team=data.get("team"),
            phone=data.get("phone", data.get("phone_number")),
        )


class EmployeeSearchResult(BaseModel):
    """직원 검색 결과"""

    employees: list[Employee] = Field(default_factory=list, description="검색된 직원 목록")
    total_count: int = Field(0, description="총 검색 결과 수")
    has_duplicates: bool = Field(False, description="동명이인 존재 여부")

    @property
    def is_single_match(self) -> bool:
        """단일 매칭 여부"""
        return len(self.employees) == 1

    @property
    def needs_clarification(self) -> bool:
        """명확화 필요 여부 (동명이인 등)"""
        return self.has_duplicates or len(self.employees) > 1
