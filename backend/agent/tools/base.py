"""도구 베이스 클래스"""

from abc import ABC, abstractmethod
from typing import Any, Optional
from pydantic import BaseModel


class ToolResult(BaseModel):
    """도구 실행 결과"""

    success: bool
    data: Optional[Any] = None
    error: Optional[str] = None
    message: Optional[str] = None

    def to_string(self) -> str:
        """문자열로 변환 (LLM에게 전달용)"""
        if not self.success:
            return f"오류: {self.error or '알 수 없는 오류가 발생했습니다'}"

        if self.message:
            return self.message

        if self.data:
            if isinstance(self.data, str):
                return self.data
            import json
            return json.dumps(self.data, ensure_ascii=False, indent=2)

        return "작업이 완료되었습니다."


class BaseTool(ABC):
    """도구 베이스 클래스"""

    name: str
    description: str
    parameters: dict

    @abstractmethod
    async def execute(self, **kwargs) -> ToolResult:
        """
        도구 실행

        Args:
            **kwargs: 도구 파라미터

        Returns:
            실행 결과
        """
        pass

    def get_schema(self) -> dict:
        """도구 스키마 반환 (LLM용)"""
        return {
            "name": self.name,
            "description": self.description,
            "parameters": self.parameters,
        }

    def validate_params(self, params: dict) -> tuple[bool, Optional[str]]:
        """파라미터 유효성 검사"""
        required = self.parameters.get("required", [])
        properties = self.parameters.get("properties", {})

        for req in required:
            if req not in params:
                return False, f"필수 파라미터 '{req}'가 누락되었습니다"

        for key, value in params.items():
            if key in properties:
                prop_type = properties[key].get("type")
                if prop_type == "string" and not isinstance(value, str):
                    return False, f"파라미터 '{key}'는 문자열이어야 합니다"
                if prop_type == "integer" and not isinstance(value, int):
                    return False, f"파라미터 '{key}'는 정수여야 합니다"
                if prop_type == "array" and not isinstance(value, list):
                    return False, f"파라미터 '{key}'는 배열이어야 합니다"

        return True, None
