"""pytest 설정 및 fixtures"""

import pytest
from datetime import date, datetime, timedelta
from zoneinfo import ZoneInfo

KST = ZoneInfo("Asia/Seoul")


@pytest.fixture
def sample_employees():
    """테스트용 직원 데이터"""
    return [
        {
            "id": "emp_001",
            "name": "김철수",
            "department": "개발팀",
            "email": "kim.cs@company.com",
            "position": "선임 개발자",
        },
        {
            "id": "emp_002",
            "name": "이영희",
            "department": "개발팀",
            "email": "lee.yh@company.com",
            "position": "팀장",
        },
        {
            "id": "emp_003",
            "name": "박민수",
            "department": "기획팀",
            "email": "park.ms@company.com",
            "position": "기획자",
        },
    ]


@pytest.fixture
def sample_busy_slots():
    """테스트용 바쁜 시간대 데이터"""
    today = date.today()
    return [
        {
            "start": datetime.combine(today, datetime.min.time().replace(hour=10), tzinfo=KST),
            "end": datetime.combine(today, datetime.min.time().replace(hour=11), tzinfo=KST),
        },
        {
            "start": datetime.combine(today, datetime.min.time().replace(hour=14), tzinfo=KST),
            "end": datetime.combine(today, datetime.min.time().replace(hour=15, minute=30), tzinfo=KST),
        },
    ]


@pytest.fixture
def sample_rooms():
    """테스트용 회의실 데이터"""
    return [
        {
            "id": "room_001",
            "name": "회의실 A",
            "floor": 4,
            "capacity": 6,
            "facilities": ["화이트보드", "프로젝터"],
        },
        {
            "id": "room_002",
            "name": "회의실 B",
            "floor": 4,
            "capacity": 10,
            "facilities": ["화이트보드", "프로젝터", "화상회의"],
        },
    ]


@pytest.fixture
def tomorrow():
    """내일 날짜"""
    return date.today() + timedelta(days=1)


@pytest.fixture
def next_week_monday():
    """다음 주 월요일"""
    today = date.today()
    days_until_monday = (7 - today.weekday()) % 7
    if days_until_monday == 0:
        days_until_monday = 7
    return today + timedelta(days=days_until_monday)
