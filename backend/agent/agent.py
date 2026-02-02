"""Meeting Agent 오케스트레이터"""

import json
from typing import Optional

from .llm_client import LLMClient, MockLLMClient
from .tools.registry import ToolRegistry
from .prompts.prompt_manager import PromptManager
from .conversation import ConversationContext
from models.chat import (
    ChatResponse,
    ResponseContent,
    ResponseType,
    ChatStatus,
    Conversation,
)
from config import get_settings
from utils.logger import get_logger

logger = get_logger(__name__)
settings = get_settings()


class MeetingAgent:
    """회의 일정 조율 Agent"""

    def __init__(self, use_mock_llm: bool = False):
        # LLM 클라이언트
        if use_mock_llm or not settings.get_api_key():
            logger.warning("Using Mock LLM client")
            self.llm = MockLLMClient()
        else:
            self.llm = LLMClient()

        # 도구 레지스트리
        self.tools = ToolRegistry()

        # 프롬프트 관리자
        self.prompt_manager = PromptManager()

        # 최대 도구 호출 반복 횟수
        self.max_tool_iterations = 10

    async def process(
        self,
        user_message: str,
        conversation: Conversation,
    ) -> ChatResponse:
        """
        사용자 메시지 처리

        Args:
            user_message: 사용자 입력
            conversation: 대화 세션

        Returns:
            AI 응답
        """
        try:
            # 시스템 프롬프트 생성
            system_prompt = self.prompt_manager.get_system_prompt()

            # 컨텍스트 요약 추가
            ctx = ConversationContext(conversation)
            context_summary = self.prompt_manager.get_context_summary(conversation.context)
            if context_summary:
                system_prompt += f"\n\n{context_summary}"

            # 대화 이력 구성
            messages = conversation.get_messages_for_llm()

            # 도구 스키마
            tools = self.tools.get_all_schemas()

            # LLM 호출 및 도구 실행 루프
            iteration = 0
            while iteration < self.max_tool_iterations:
                iteration += 1

                # LLM 호출
                response = await self.llm.chat(
                    messages=messages,
                    tools=tools,
                    system_prompt=system_prompt,
                )

                # 도구 호출이 없으면 최종 응답
                if not response.get("tool_calls"):
                    return self._create_response(
                        conversation.id,
                        response.get("content", ""),
                        conversation,
                    )

                # 도구 실행
                tool_calls = response["tool_calls"]
                logger.info(f"Tool calls: {[tc['name'] for tc in tool_calls]}")

                # assistant 메시지 추가 (tool_use 포함)
                assistant_content = []
                if response.get("content"):
                    assistant_content.append({
                        "type": "text",
                        "text": response["content"],
                    })
                for tc in tool_calls:
                    assistant_content.append({
                        "type": "tool_use",
                        "id": tc["id"],
                        "name": tc["name"],
                        "input": tc["arguments"],
                    })

                messages.append({
                    "role": "assistant",
                    "content": assistant_content,
                })

                # 각 도구 실행 및 결과 수집
                tool_results = []
                for tc in tool_calls:
                    result = await self.tools.execute(tc["name"], tc["arguments"])

                    # 컨텍스트 업데이트
                    self._update_context_from_result(ctx, tc["name"], result.data)

                    tool_results.append({
                        "type": "tool_result",
                        "tool_use_id": tc["id"],
                        "content": result.to_string(),
                    })

                # 도구 결과를 user 메시지로 추가
                messages.append({
                    "role": "user",
                    "content": tool_results,
                })

            # 최대 반복 도달
            logger.warning("Max tool iterations reached")
            return self._create_response(
                conversation.id,
                "처리 중 문제가 발생했습니다. 다시 시도해 주세요.",
                conversation,
                is_error=True,
            )

        except Exception as e:
            logger.error(f"Agent processing error: {str(e)}", exc_info=True)
            return self._create_response(
                conversation.id,
                "죄송합니다, 요청을 처리하는 중 오류가 발생했습니다.",
                conversation,
                is_error=True,
            )

    def _create_response(
        self,
        conversation_id: str,
        content: str,
        conversation: Conversation,
        is_error: bool = False,
    ) -> ChatResponse:
        """응답 객체 생성"""
        ctx = ConversationContext(conversation)

        # 상태 결정
        if is_error:
            status = ChatStatus.ERROR
            response_type = ResponseType.ERROR
        elif ctx.awaiting_confirmation:
            status = ChatStatus.AWAITING_CONFIRMATION
            response_type = ResponseType.CONFIRMATION
        elif ctx.available_slots or ctx.available_rooms:
            status = ChatStatus.AWAITING_SELECTION
            response_type = ResponseType.OPTIONS
        else:
            status = ChatStatus.PROCESSING
            response_type = ResponseType.TEXT

        # 옵션 데이터 구성
        options = None
        if ctx.available_slots and status == ChatStatus.AWAITING_SELECTION:
            options = ctx.available_slots[:5]
        elif ctx.available_rooms and status == ChatStatus.AWAITING_SELECTION:
            options = ctx.available_rooms[:5]

        return ChatResponse(
            conversation_id=conversation_id,
            response=ResponseContent(
                type=response_type,
                content=content,
                options=options,
            ),
            status=status,
        )

    async def process_stream(
        self,
        user_message: str,
        conversation: Conversation,
    ):
        """
        스트리밍 사용자 메시지 처리

        Yields:
            dict: 스트리밍 청크 (type: content/tool_call)
        """
        try:
            # 시스템 프롬프트 생성
            system_prompt = self.prompt_manager.get_system_prompt()

            # 컨텍스트 요약 추가
            ctx = ConversationContext(conversation)
            context_summary = self.prompt_manager.get_context_summary(conversation.context)
            if context_summary:
                system_prompt += f"\n\n{context_summary}"

            # 대화 이력 구성
            messages = conversation.get_messages_for_llm()

            # 도구 스키마
            tools = self.tools.get_all_schemas()

            # 첫 응답: 진짜 스트리밍 시도
            # 도구 호출 없는 단순 대화는 바로 스트리밍
            async for chunk in self.llm.chat_stream(
                messages=messages,
                tools=tools,
                system_prompt=system_prompt,
            ):
                yield {"type": "content", "text": chunk}

        except Exception as e:
            logger.error(f"Agent streaming error: {str(e)}", exc_info=True)
            yield {"type": "content", "text": "죄송합니다, 요청을 처리하는 중 오류가 발생했습니다."}

    def _update_context_from_result(
        self,
        ctx: ConversationContext,
        tool_name: str,
        result_data: Optional[dict],
    ):
        """도구 결과로 컨텍스트 업데이트"""
        if not result_data:
            return

        if tool_name == "search_employee":
            employees = result_data.get("employees", [])
            if len(employees) == 1:
                # 단일 매칭 - 선택된 직원에 추가
                current = ctx.selected_employees
                if employees[0] not in current:
                    current.append(employees[0])
                    ctx.selected_employees = current
            elif len(employees) > 1:
                # 다중 매칭 - 확인 대기
                ctx.pending_employees = employees

        elif tool_name == "get_team_members":
            members = result_data.get("members", [])
            ctx.selected_employees = members

        elif tool_name == "find_common_free_slots":
            slots = result_data.get("free_slots", [])
            ctx.available_slots = slots
            if result_data.get("duration_minutes"):
                ctx.duration_minutes = result_data["duration_minutes"]

        elif tool_name == "search_available_rooms":
            rooms = result_data.get("rooms", [])
            ctx.available_rooms = rooms

        elif tool_name == "confirm_meeting_details":
            ctx.awaiting_confirmation = result_data.get("awaiting_confirmation", False)

        elif tool_name == "create_meeting":
            # 회의 생성 완료 - 컨텍스트 정리
            ctx.awaiting_confirmation = False
            ctx.available_slots = []
            ctx.available_rooms = []
