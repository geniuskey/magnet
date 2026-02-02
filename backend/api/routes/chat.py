"""채팅 엔드포인트"""

import uuid
import json
from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import StreamingResponse
from typing import Optional, AsyncGenerator

from models.chat import (
    ChatRequest,
    ChatResponse,
    ResponseContent,
    ResponseType,
    ChatStatus,
    Conversation,
)
from agent.agent import MeetingAgent
from utils.logger import get_logger

router = APIRouter()
logger = get_logger(__name__)

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
