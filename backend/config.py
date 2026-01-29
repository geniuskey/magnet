"""환경설정 모듈"""

from functools import lru_cache
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """애플리케이션 설정"""

    # LLM 설정
    llm_provider: str = "anthropic"  # anthropic, openai, gemini
    llm_api_url: str = ""  # OpenAI compatible API URL (optional)
    llm_api_key: str = ""
    llm_model: str = "claude-sonnet-4-20250514"  # 자동 설정됨

    # 사내 API
    org_api_url: str = "https://intranet.company.com/api/org"
    calendar_api_url: str = "https://intranet.company.com/api/calendar"
    room_api_url: str = "https://intranet.company.com/api/rooms"
    api_auth_token: str = ""

    # 서버 설정
    redis_url: str = "redis://localhost:6379"
    log_level: str = "INFO"

    # Mock API 사용 여부
    use_mock_api: bool = True

    # CORS 설정
    cors_origins: str = "http://localhost:5173,http://localhost:3000"

    # 인증 설정
    auth_bypass: bool = True
    sso_url: str = "https://sso.company.com"

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",")]

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache()
def get_settings() -> Settings:
    """설정 싱글톤 반환"""
    return Settings()
