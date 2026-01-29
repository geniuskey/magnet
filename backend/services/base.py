"""API 클라이언트 베이스 클래스"""

from abc import ABC
from typing import Any, Optional
import httpx

from utils.logger import get_logger

logger = get_logger(__name__)


class BaseAPIClient(ABC):
    """API 클라이언트 베이스 클래스"""

    def __init__(
        self,
        base_url: str,
        auth_token: Optional[str] = None,
        timeout: float = 30.0,
    ):
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout
        headers = {"Content-Type": "application/json"}
        if auth_token:
            headers["Authorization"] = f"Bearer {auth_token}"

        self.client = httpx.AsyncClient(
            base_url=self.base_url,
            headers=headers,
            timeout=timeout,
        )

    async def close(self) -> None:
        """클라이언트 종료"""
        await self.client.aclose()

    async def _request(
        self,
        method: str,
        path: str,
        params: Optional[dict] = None,
        json_data: Optional[dict] = None,
        **kwargs: Any,
    ) -> dict:
        """HTTP 요청 실행"""
        try:
            response = await self.client.request(
                method,
                path,
                params=params,
                json=json_data,
                **kwargs,
            )
            response.raise_for_status()
            return response.json()
        except httpx.HTTPStatusError as e:
            logger.error(
                f"HTTP error {e.response.status_code}: {e.response.text}",
                extra={"path": path, "method": method},
            )
            raise
        except httpx.RequestError as e:
            logger.error(
                f"Request error: {str(e)}",
                extra={"path": path, "method": method},
            )
            raise

    async def get(self, path: str, params: Optional[dict] = None) -> dict:
        """GET 요청"""
        return await self._request("GET", path, params=params)

    async def post(self, path: str, json_data: Optional[dict] = None) -> dict:
        """POST 요청"""
        return await self._request("POST", path, json_data=json_data)

    async def put(self, path: str, json_data: Optional[dict] = None) -> dict:
        """PUT 요청"""
        return await self._request("PUT", path, json_data=json_data)

    async def delete(self, path: str) -> dict:
        """DELETE 요청"""
        return await self._request("DELETE", path)
