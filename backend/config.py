"""환경설정 모듈"""

from functools import lru_cache
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """애플리케이션 설정"""

    # LLM 설정
    llm_provider: str = "gemini"  # anthropic, openai, gemini, custom

    # 각 provider별 API 키
    anthropic_api_key: str = ""
    openai_api_key: str = ""
    gemini_api_key: str = ""

    # 각 provider별 모델명
    anthropic_model: str = "claude-sonnet-4-20250514"
    openai_model: str = "gpt-5-mini"
    gemini_model: str = "gemini-3-flash-preview"

    # 각 provider별 Base URL (optional)
    anthropic_api_url: str = ""  # 기본: https://api.anthropic.com
    openai_api_url: str = ""  # 기본: https://api.openai.com/v1
    gemini_api_url: str = ""  # 기본: https://generativelanguage.googleapis.com

    # Custom LLM 설정 (OpenAI 호환 API)
    custom_api_key: str = ""
    custom_api_url: str = ""  # 예: http://localhost:11434/v1, https://your-server.com/v1
    custom_model: str = ""  # 예: llama3, mistral, etc.

    def get_api_key(self, provider: str = None) -> str:
        """현재 provider에 맞는 API 키 반환"""
        p = provider or self.llm_provider
        if p == "anthropic":
            return self.anthropic_api_key
        elif p == "openai":
            return self.openai_api_key
        elif p == "gemini":
            return self.gemini_api_key
        elif p == "custom":
            return self.custom_api_key
        return ""

    def get_model(self, provider: str = None) -> str:
        """현재 provider에 맞는 모델명 반환"""
        p = provider or self.llm_provider
        if p == "anthropic":
            return self.anthropic_model
        elif p == "openai":
            return self.openai_model
        elif p == "gemini":
            return self.gemini_model
        elif p == "custom":
            return self.custom_model
        return ""

    def get_api_url(self, provider: str = None) -> str:
        """현재 provider에 맞는 API URL 반환"""
        p = provider or self.llm_provider
        if p == "anthropic":
            return self.anthropic_api_url or "https://api.anthropic.com"
        elif p == "openai":
            return self.openai_api_url or "https://api.openai.com/v1"
        elif p == "gemini":
            return self.gemini_api_url or "https://generativelanguage.googleapis.com"
        elif p == "custom":
            return self.custom_api_url
        return ""

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
