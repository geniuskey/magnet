"""인증 미들웨어"""

from fastapi import Request, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from starlette.middleware.base import BaseHTTPMiddleware
from typing import Optional

from config import get_settings
from utils.logger import get_logger

logger = get_logger(__name__)
settings = get_settings()

security = HTTPBearer(auto_error=False)


class User:
    """사용자 정보"""

    def __init__(
        self,
        id: str,
        name: str,
        email: str,
        department: str,
    ):
        self.id = id
        self.name = name
        self.email = email
        self.department = department


# 개발용 기본 사용자
DEFAULT_USER = User(
    id="user_001",
    name="테스트 사용자",
    email="test@company.com",
    department="개발팀",
)


class AuthMiddleware(BaseHTTPMiddleware):
    """인증 미들웨어"""

    async def dispatch(self, request: Request, call_next):
        # 헬스체크는 인증 제외
        if request.url.path.startswith("/api/health"):
            return await call_next(request)

        # 개발 모드에서 인증 우회
        if settings.auth_bypass:
            request.state.user = DEFAULT_USER
            return await call_next(request)

        # Authorization 헤더 확인
        auth_header = request.headers.get("Authorization")
        if not auth_header:
            # 인증 헤더 없으면 기본 사용자 사용 (개발 편의)
            request.state.user = DEFAULT_USER
            return await call_next(request)

        try:
            # Bearer 토큰 추출
            scheme, token = auth_header.split()
            if scheme.lower() != "bearer":
                raise ValueError("Invalid auth scheme")

            # 토큰 검증 (실제로는 SSO 서버에 검증 요청)
            user = await verify_token(token)
            request.state.user = user

        except Exception as e:
            logger.warning(f"Auth failed: {str(e)}")
            # 인증 실패 시에도 기본 사용자로 처리 (개발 모드)
            if settings.auth_bypass:
                request.state.user = DEFAULT_USER
            else:
                raise HTTPException(status_code=401, detail="인증에 실패했습니다")

        return await call_next(request)


async def verify_token(token: str) -> User:
    """
    토큰 검증

    실제 구현에서는 SSO 서버에 토큰 검증 요청
    """
    # TODO: 실제 SSO 연동 구현
    # response = await httpx.get(
    #     f"{settings.sso_url}/verify",
    #     headers={"Authorization": f"Bearer {token}"}
    # )

    # 개발용 더미 검증
    if token == "test_token":
        return DEFAULT_USER

    raise ValueError("Invalid token")


async def get_current_user(request: Request) -> User:
    """
    현재 사용자 가져오기 (Dependency)
    """
    user = getattr(request.state, "user", None)
    if not user:
        if settings.auth_bypass:
            return DEFAULT_USER
        raise HTTPException(status_code=401, detail="인증이 필요합니다")
    return user


async def verify_permissions(user: User, employee_ids: list[str]) -> bool:
    """
    타인 일정 조회 권한 확인

    Args:
        user: 현재 사용자
        employee_ids: 조회 대상 직원 ID 목록

    Returns:
        권한 있음 여부
    """
    for emp_id in employee_ids:
        if emp_id == user.id:
            continue

        # TODO: 실제 권한 확인 로직 구현
        # - 같은 팀원인지 확인
        # - 공개 설정 확인
        pass

    return True
