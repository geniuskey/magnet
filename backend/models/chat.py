"""채팅 모델"""

from datetime import datetime
from enum import Enum
from pydantic import BaseModel, Field
from typing import Optional, Any


class ResponseType(str, Enum):
    """응답 타입"""

    TEXT = "text"
    OPTIONS = "options"
    CONFIRMATION = "confirmation"
    ERROR = "error"


class ChatStatus(str, Enum):
    """채팅 상태"""

    PROCESSING = "processing"
    AWAITING_SELECTION = "awaiting_selection"
    AWAITING_CONFIRMATION = "awaiting_confirmation"
    COMPLETED = "completed"
    ERROR = "error"


class ChatRequest(BaseModel):
    """채팅 요청"""

    message: str = Field(..., description="사용자 메시지")
    conversation_id: Optional[str] = Field(None, description="대화 ID (새 대화면 생략)")


class ResponseContent(BaseModel):
    """응답 내용"""

    type: ResponseType = Field(..., description="응답 타입")
    content: str = Field(..., description="응답 텍스트")
    options: Optional[list[dict[str, Any]]] = Field(None, description="선택 옵션 목록")


class ChatResponse(BaseModel):
    """채팅 응답"""

    conversation_id: str = Field(..., description="대화 ID")
    response: ResponseContent = Field(..., description="응답 내용")
    status: ChatStatus = Field(..., description="대화 상태")
    timestamp: datetime = Field(default_factory=datetime.now, description="응답 시간")


class Message(BaseModel):
    """대화 메시지"""

    role: str = Field(..., description="역할 (user, assistant, system)")
    content: str = Field(..., description="메시지 내용")
    timestamp: datetime = Field(default_factory=datetime.now, description="메시지 시간")
    metadata: Optional[dict[str, Any]] = Field(None, description="추가 메타데이터")


class Conversation(BaseModel):
    """대화 세션"""

    id: str = Field(..., description="대화 ID")
    user_id: str = Field(..., description="사용자 ID")
    messages: list[Message] = Field(default_factory=list, description="메시지 목록")
    status: ChatStatus = Field(ChatStatus.PROCESSING, description="대화 상태")
    context: dict[str, Any] = Field(default_factory=dict, description="대화 컨텍스트")
    created_at: datetime = Field(default_factory=datetime.now, description="생성 시간")
    updated_at: datetime = Field(default_factory=datetime.now, description="수정 시간")

    def add_message(self, role: str, content: str, metadata: Optional[dict] = None) -> None:
        """메시지 추가"""
        self.messages.append(
            Message(role=role, content=content, metadata=metadata)
        )
        self.updated_at = datetime.now()

    def get_messages_for_llm(self) -> list[dict]:
        """LLM API 호출용 메시지 목록 반환"""
        return [
            {"role": msg.role, "content": msg.content}
            for msg in self.messages
            if msg.role in ("user", "assistant", "system")
        ]
