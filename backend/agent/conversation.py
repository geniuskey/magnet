"""대화 관리"""

import json
from datetime import datetime
from typing import Any, Optional
import redis.asyncio as redis

from config import get_settings
from models.chat import Conversation, Message, ChatStatus
from utils.logger import get_logger

logger = get_logger(__name__)
settings = get_settings()


class ConversationManager:
    """대화 세션 관리자"""

    def __init__(self):
        self._local_store: dict[str, Conversation] = {}
        self._redis_client: Optional[redis.Redis] = None
        self._use_redis = False

    async def connect_redis(self):
        """Redis 연결"""
        try:
            self._redis_client = redis.from_url(
                settings.redis_url,
                encoding="utf-8",
                decode_responses=True,
            )
            await self._redis_client.ping()
            self._use_redis = True
            logger.info("Redis connected for conversation storage")
        except Exception as e:
            logger.warning(f"Redis connection failed, using local store: {e}")
            self._use_redis = False

    async def get(self, conversation_id: str) -> Optional[Conversation]:
        """대화 조회"""
        if self._use_redis and self._redis_client:
            data = await self._redis_client.get(f"conv:{conversation_id}")
            if data:
                return Conversation.model_validate_json(data)
        return self._local_store.get(conversation_id)

    async def save(self, conversation: Conversation):
        """대화 저장"""
        conversation.updated_at = datetime.now()

        if self._use_redis and self._redis_client:
            await self._redis_client.set(
                f"conv:{conversation.id}",
                conversation.model_dump_json(),
                ex=86400,  # 24시간 만료
            )
        else:
            self._local_store[conversation.id] = conversation

    async def delete(self, conversation_id: str):
        """대화 삭제"""
        if self._use_redis and self._redis_client:
            await self._redis_client.delete(f"conv:{conversation_id}")
        elif conversation_id in self._local_store:
            del self._local_store[conversation_id]

    async def update_context(self, conversation_id: str, key: str, value: Any):
        """대화 컨텍스트 업데이트"""
        conversation = await self.get(conversation_id)
        if conversation:
            conversation.context[key] = value
            await self.save(conversation)

    async def get_context(self, conversation_id: str, key: str) -> Optional[Any]:
        """대화 컨텍스트 조회"""
        conversation = await self.get(conversation_id)
        if conversation:
            return conversation.context.get(key)
        return None


class ConversationContext:
    """대화 컨텍스트 헬퍼"""

    def __init__(self, conversation: Conversation):
        self.conversation = conversation

    @property
    def selected_employees(self) -> list[dict]:
        """선택된 참석자 목록"""
        return self.conversation.context.get("selected_employees", [])

    @selected_employees.setter
    def selected_employees(self, value: list[dict]):
        self.conversation.context["selected_employees"] = value

    @property
    def employee_ids(self) -> list[str]:
        """참석자 ID 목록"""
        return [e["id"] for e in self.selected_employees]

    @property
    def pending_employees(self) -> list[dict]:
        """확인 대기 중인 직원 (동명이인 등)"""
        return self.conversation.context.get("pending_employees", [])

    @pending_employees.setter
    def pending_employees(self, value: list[dict]):
        self.conversation.context["pending_employees"] = value

    @property
    def selected_slot(self) -> Optional[dict]:
        """선택된 시간대"""
        return self.conversation.context.get("selected_slot")

    @selected_slot.setter
    def selected_slot(self, value: dict):
        self.conversation.context["selected_slot"] = value

    @property
    def available_slots(self) -> list[dict]:
        """가능한 시간대 목록"""
        return self.conversation.context.get("available_slots", [])

    @available_slots.setter
    def available_slots(self, value: list[dict]):
        self.conversation.context["available_slots"] = value

    @property
    def selected_room(self) -> Optional[dict]:
        """선택된 회의실"""
        return self.conversation.context.get("selected_room")

    @selected_room.setter
    def selected_room(self, value: dict):
        self.conversation.context["selected_room"] = value

    @property
    def available_rooms(self) -> list[dict]:
        """가능한 회의실 목록"""
        return self.conversation.context.get("available_rooms", [])

    @available_rooms.setter
    def available_rooms(self, value: list[dict]):
        self.conversation.context["available_rooms"] = value

    @property
    def duration_minutes(self) -> int:
        """회의 시간 (분)"""
        return self.conversation.context.get("duration_minutes", 60)

    @duration_minutes.setter
    def duration_minutes(self, value: int):
        self.conversation.context["duration_minutes"] = value

    @property
    def meeting_title(self) -> Optional[str]:
        """회의 제목"""
        return self.conversation.context.get("meeting_title")

    @meeting_title.setter
    def meeting_title(self, value: str):
        self.conversation.context["meeting_title"] = value

    @property
    def awaiting_confirmation(self) -> bool:
        """예약 확인 대기 중"""
        return self.conversation.context.get("awaiting_confirmation", False)

    @awaiting_confirmation.setter
    def awaiting_confirmation(self, value: bool):
        self.conversation.context["awaiting_confirmation"] = value

    def clear(self):
        """컨텍스트 초기화"""
        self.conversation.context.clear()
