"""채팅 엔드포인트"""

import uuid
import json
from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import StreamingResponse
from typing import Optional, AsyncGenerator
from pydantic import BaseModel

from models.chat import (
    ChatRequest,
    ChatResponse,
    ResponseContent,
    ResponseType,
    ChatStatus,
    Conversation,
)
from agent.agent import MeetingAgent
from agent.llm_client import LLMClient
from config import get_settings
from utils.logger import get_logger

router = APIRouter()
logger = get_logger(__name__)
settings = get_settings()


# Intent 파싱용 함수 정의 (프론트엔드와 동일)
FUNCTION_DEFINITIONS = [
    {
        "name": "createQuickReservation",
        "description": "회의실을 예약합니다. 회의실을 지정하지 않으면 참여 인원에 맞는 최적 회의실을 자동 선택합니다.",
        "parameters": {
            "type": "object",
            "properties": {
                "title": {"type": "string", "description": "회의 제목"},
                "organizerName": {"type": "string", "description": "주관자 이름"},
                "requiredNames": {"type": "array", "items": {"type": "string"}, "description": "필수 참석자 이름 목록"},
                "optionalNames": {"type": "array", "items": {"type": "string"}, "description": "선택 참석자 이름 목록"},
                "roomName": {"type": "string", "description": "회의실 이름 (미지정시 자동 선택)"},
                "date": {"type": "string", "description": "날짜 (오늘, 내일, 2024-01-15 등)"},
                "startTime": {"type": "string", "description": "시작 시간 (HH:MM)"},
                "endTime": {"type": "string", "description": "종료 시간 (HH:MM)"},
            },
            "required": ["title", "date", "startTime", "endTime"],
        },
    },
    {
        "name": "setParticipantsByNames",
        "description": "참석자를 이름 목록으로 추가합니다",
        "parameters": {
            "type": "object",
            "properties": {
                "names": {"type": "array", "items": {"type": "string"}, "description": "참석자 이름 목록"},
                "type": {"type": "string", "enum": ["REQUIRED", "OPTIONAL"], "description": "참석자 유형"},
            },
            "required": ["names"],
        },
    },
    {
        "name": "setTimeByRange",
        "description": "회의 시간 범위를 선택합니다",
        "parameters": {
            "type": "object",
            "properties": {
                "startTime": {"type": "string", "description": "시작 시간 (HH:MM)"},
                "endTime": {"type": "string", "description": "종료 시간 (HH:MM)"},
            },
            "required": ["startTime", "endTime"],
        },
    },
    {
        "name": "setDateByString",
        "description": "날짜를 설정합니다 (자연어 지원: 오늘, 내일, 다음 주 월요일 등)",
        "parameters": {
            "type": "object",
            "properties": {
                "dateStr": {"type": "string", "description": "날짜 (예: 내일, 2024-01-15)"},
            },
            "required": ["dateStr"],
        },
    },
    {
        "name": "setRoomByName",
        "description": "회의실을 이름으로 선택합니다",
        "parameters": {
            "type": "object",
            "properties": {
                "roomName": {"type": "string", "description": "회의실 이름"},
            },
            "required": ["roomName"],
        },
    },
    {
        "name": "getAvailableRooms",
        "description": "특정 시간대에 예약 가능한 회의실 목록을 조회합니다",
        "parameters": {
            "type": "object",
            "properties": {
                "startTime": {"type": "string", "description": "시작 시간 (HH:MM)"},
                "endTime": {"type": "string", "description": "종료 시간 (HH:MM)"},
            },
            "required": ["startTime", "endTime"],
        },
    },
    {
        "name": "findOptimalTimes",
        "description": "선택된 참석자들이 모두 참석 가능한 최적 시간을 찾습니다",
        "parameters": {
            "type": "object",
            "properties": {
                "durationMinutes": {"type": "number", "description": "회의 시간 (분)"},
            },
        },
    },
    {
        "name": "getMyReservationList",
        "description": "내 예약 목록을 조회합니다",
        "parameters": {
            "type": "object",
            "properties": {
                "date": {"type": "string", "description": "특정 날짜 필터 (선택)"},
            },
        },
    },
    {
        "name": "cancelReservationByTime",
        "description": "회의실 이름과 시간으로 예약을 취소합니다",
        "parameters": {
            "type": "object",
            "properties": {
                "roomName": {"type": "string", "description": "회의실 이름"},
                "startTime": {"type": "string", "description": "시작 시간"},
            },
            "required": ["roomName", "startTime"],
        },
    },
]


class ParseIntentRequest(BaseModel):
    """Intent 파싱 요청"""
    message: str
    context: Optional[dict] = None  # 현재 UI 상태 (참석자, 선택 시간 등)


class ParseIntentResponse(BaseModel):
    """Intent 파싱 응답"""
    function_calls: list
    message: Optional[str] = None  # LLM이 생성한 추가 메시지

# 대화 저장소 (실제로는 Redis 사용)
conversations: dict[str, Conversation] = {}

# Agent 인스턴스
agent: Optional[MeetingAgent] = None


def get_agent() -> MeetingAgent:
    """Agent 인스턴스 반환"""
    global agent
    if agent is None:
        agent = MeetingAgent()
    return agent


def get_or_create_conversation(
    conversation_id: Optional[str],
    user_id: str = "user_001",
) -> Conversation:
    """대화 조회 또는 생성"""
    if conversation_id and conversation_id in conversations:
        return conversations[conversation_id]

    # 새 대화 생성
    new_id = f"conv_{uuid.uuid4().hex[:12]}"
    conversation = Conversation(
        id=new_id,
        user_id=user_id,
    )
    conversations[new_id] = conversation
    return conversation


@router.post("", response_model=ChatResponse)
async def chat(
    request: ChatRequest,
    meeting_agent: MeetingAgent = Depends(get_agent),
) -> ChatResponse:
    """
    채팅 메시지 처리

    사용자 메시지를 받아 AI 응답 반환
    """
    try:
        # 대화 조회 또는 생성
        conversation = get_or_create_conversation(request.conversation_id)

        # 사용자 메시지 추가
        conversation.add_message("user", request.message)

        # Agent 처리
        response = await meeting_agent.process(request.message, conversation)

        # 응답 메시지 추가
        conversation.add_message("assistant", response.response.content)

        return response

    except Exception as e:
        logger.error(f"Chat error: {str(e)}", exc_info=True)

        # 에러 응답
        error_conversation_id = request.conversation_id or f"conv_{uuid.uuid4().hex[:12]}"
        return ChatResponse(
            conversation_id=error_conversation_id,
            response=ResponseContent(
                type=ResponseType.ERROR,
                content="죄송합니다, 요청을 처리하는 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
            ),
            status=ChatStatus.ERROR,
        )


@router.post("/parse-intent", response_model=ParseIntentResponse)
async def parse_intent(request: ParseIntentRequest) -> ParseIntentResponse:
    """
    LLM을 사용하여 사용자 메시지에서 의도와 함수 호출 추출

    규칙 기반 파싱이 실패했을 때 폴백으로 사용
    """
    try:
        # API 키 체크
        if not settings.get_api_key():
            logger.warning("No API key configured, returning empty function calls")
            return ParseIntentResponse(
                function_calls=[],
                message="API 키가 설정되지 않았습니다."
            )

        llm = LLMClient()

        # 컨텍스트 정보 구성
        context_info = ""
        if request.context:
            ctx = request.context
            parts = []
            if ctx.get("participants"):
                parts.append(f"현재 선택된 참석자: {', '.join(ctx['participants'])}")
            if ctx.get("selectedTimeRange"):
                tr = ctx["selectedTimeRange"]
                parts.append(f"현재 선택된 시간: {tr.get('startTime')} ~ {tr.get('endTime')}")
            if ctx.get("selectedRoom"):
                parts.append(f"현재 선택된 회의실: {ctx['selectedRoom']}")
            if ctx.get("selectedDate"):
                parts.append(f"현재 선택된 날짜: {ctx['selectedDate']}")
            if parts:
                context_info = "\n현재 UI 상태:\n" + "\n".join(f"- {p}" for p in parts)

        system_prompt = f"""당신은 회의실 예약 시스템의 의도 파싱 도우미입니다.
사용자의 메시지를 분석하여 적절한 함수를 호출해주세요.

{context_info}

중요 규칙:
1. 사용자가 예약, 잡아줘, 만들어 등의 의도를 표현하면 createQuickReservation을 호출하세요.
2. 시간이 언급되지 않았지만 UI에 선택된 시간이 있으면 그것을 사용하세요.
3. 회의실이 언급되지 않으면 roomName을 비워두세요 (자동 선택됩니다).
4. 날짜가 언급되지 않으면 '오늘'로 설정하세요.
5. 참석자 이름이 언급되면 requiredNames에 포함하세요.
6. 시간은 HH:MM 형식으로 변환하세요 (예: 오후 2시 -> 14:00)
7. "1시간 회의"와 같이 시작 시간만 있으면 endTime을 계산하세요.
"""

        messages = [{"role": "user", "content": request.message}]

        response = await llm.chat(
            messages=messages,
            tools=FUNCTION_DEFINITIONS,
            tool_choice={"type": "auto"},
            system_prompt=system_prompt,
            max_tokens=1024,
        )

        function_calls = []
        for tc in response.get("tool_calls", []):
            function_calls.append({
                "name": tc["name"],
                "arguments": tc["arguments"],
            })

        return ParseIntentResponse(
            function_calls=function_calls,
            message=response.get("content"),
        )

    except Exception as e:
        logger.error(f"Parse intent error: {str(e)}", exc_info=True)
        return ParseIntentResponse(
            function_calls=[],
            message=f"의도 파싱 중 오류가 발생했습니다: {str(e)}"
        )


@router.post("/stream")
async def chat_stream(
    request: ChatRequest,
    meeting_agent: MeetingAgent = Depends(get_agent),
):
    """
    스트리밍 채팅 메시지 처리 (SSE)
    """
    async def generate() -> AsyncGenerator[str, None]:
        try:
            # 대화 조회 또는 생성
            conversation = get_or_create_conversation(request.conversation_id)

            # 사용자 메시지 추가
            conversation.add_message("user", request.message)

            # conversation_id 먼저 전송
            yield f"data: {json.dumps({'type': 'start', 'conversation_id': conversation.id})}\n\n"

            # Agent 스트리밍 처리
            full_content = ""
            async for chunk in meeting_agent.process_stream(request.message, conversation):
                if chunk.get("type") == "content":
                    full_content += chunk.get("text", "")
                    yield f"data: {json.dumps({'type': 'content', 'text': chunk.get('text', '')})}\n\n"
                elif chunk.get("type") == "tool_call":
                    yield f"data: {json.dumps({'type': 'tool_call', 'name': chunk.get('name'), 'status': chunk.get('status')})}\n\n"

            # 응답 메시지 추가
            if full_content:
                conversation.add_message("assistant", full_content)

            # 완료 이벤트
            yield f"data: {json.dumps({'type': 'done', 'conversation_id': conversation.id})}\n\n"

        except Exception as e:
            logger.error(f"Chat stream error: {str(e)}", exc_info=True)
            yield f"data: {json.dumps({'type': 'error', 'message': '죄송합니다, 요청을 처리하는 중 오류가 발생했습니다.'})}\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        }
    )


@router.get("/conversation/{conversation_id}")
async def get_conversation(conversation_id: str) -> dict:
    """
    대화 내역 조회
    """
    if conversation_id not in conversations:
        raise HTTPException(status_code=404, detail="대화를 찾을 수 없습니다")

    conversation = conversations[conversation_id]
    return {
        "conversation_id": conversation.id,
        "messages": [
            {
                "role": msg.role,
                "content": msg.content,
                "timestamp": msg.timestamp.isoformat(),
            }
            for msg in conversation.messages
        ],
        "status": conversation.status.value,
    }


@router.delete("/conversation/{conversation_id}")
async def delete_conversation(conversation_id: str) -> dict:
    """
    대화 삭제 (새 대화 시작)
    """
    if conversation_id in conversations:
        del conversations[conversation_id]
        return {"message": "대화가 삭제되었습니다"}

    raise HTTPException(status_code=404, detail="대화를 찾을 수 없습니다")
