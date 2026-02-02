"""헬스체크 엔드포인트"""

from fastapi import APIRouter
from pydantic import BaseModel

from config import get_settings

router = APIRouter()
settings = get_settings()


class ServiceStatus(BaseModel):
    """서비스 상태"""
    llm: str = "unknown"
    org_api: str = "unknown"
    calendar_api: str = "unknown"
    room_api: str = "unknown"
    redis: str = "unknown"


class HealthResponse(BaseModel):
    """헬스체크 응답"""
    status: str
    version: str
    services: ServiceStatus
    mock_mode: bool


@router.get("/health", response_model=HealthResponse)
async def health_check() -> HealthResponse:
    """
    헬스체크 엔드포인트

    서버 상태 및 외부 서비스 연결 상태 확인
    """
    # Mock 모드에서는 모든 서비스를 connected로 표시
    if settings.use_mock_api:
        services = ServiceStatus(
            llm="connected" if settings.get_api_key() else "not_configured",
            org_api="mock",
            calendar_api="mock",
            room_api="mock",
            redis="connected",
        )
    else:
        # 실제 서비스 연결 상태 확인 (추후 구현)
        services = ServiceStatus(
            llm="connected" if settings.get_api_key() else "not_configured",
            org_api="unknown",
            calendar_api="unknown",
            room_api="unknown",
            redis="unknown",
        )

    return HealthResponse(
        status="healthy",
        version="1.0.0",
        services=services,
        mock_mode=settings.use_mock_api,
    )


@router.get("/health/live")
async def liveness_check() -> dict:
    """
    라이브니스 체크 (쿠버네티스용)

    서버가 실행 중인지만 확인
    """
    return {"status": "alive"}


@router.get("/health/ready")
async def readiness_check() -> dict:
    """
    레디니스 체크 (쿠버네티스용)

    서버가 요청을 처리할 준비가 되었는지 확인
    """
    # LLM API 키가 설정되어 있는지 확인
    if not settings.get_api_key() and not settings.use_mock_api:
        return {"status": "not_ready", "reason": "LLM API key not configured"}

    return {"status": "ready"}
