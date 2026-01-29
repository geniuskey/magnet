"""FastAPI 앱 엔트리포인트"""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import get_settings
from api.routes import api_router
from api.middleware.auth import AuthMiddleware
from utils.logger import setup_logger, get_logger

settings = get_settings()
logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """앱 라이프사이클 관리"""
    # 시작 시
    setup_logger(settings.log_level)
    logger.info("Meeting Scheduler AI starting...")
    logger.info(f"Mock mode: {settings.use_mock_api}")

    yield

    # 종료 시
    logger.info("Meeting Scheduler AI shutting down...")


app = FastAPI(
    title="Meeting Scheduler AI",
    description="자연어 기반 회의 일정 조율 및 예약 자동화 시스템",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 인증 미들웨어
app.add_middleware(AuthMiddleware)

# 라우터 등록
app.include_router(api_router, prefix="/api")


@app.get("/")
async def root():
    """루트 엔드포인트"""
    return {
        "name": "Meeting Scheduler AI",
        "version": "1.0.0",
        "status": "running",
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
    )
