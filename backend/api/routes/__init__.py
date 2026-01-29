"""API 라우터 모듈"""

from fastapi import APIRouter

from .health import router as health_router
from .chat import router as chat_router

api_router = APIRouter()

api_router.include_router(health_router, tags=["health"])
api_router.include_router(chat_router, prefix="/chat", tags=["chat"])
