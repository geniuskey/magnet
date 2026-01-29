"""API 어댑터 모듈

실제 사내 API 연동 시 이 어댑터들을 구현합니다.
"""

from .organization_adapter import OrganizationAPIAdapter
from .calendar_adapter import CalendarAPIAdapter
from .room_adapter import RoomAPIAdapter

__all__ = [
    "OrganizationAPIAdapter",
    "CalendarAPIAdapter",
    "RoomAPIAdapter",
]
