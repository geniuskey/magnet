"""Mock 데이터"""

from datetime import datetime, date, time, timedelta
from zoneinfo import ZoneInfo

KST = ZoneInfo("Asia/Seoul")

# Mock 직원 데이터
MOCK_EMPLOYEES = [
    {
        "id": "emp_001",
        "name": "김철수",
        "department": "개발팀",
        "email": "kim.cs@company.com",
        "position": "선임 개발자",
        "team": "백엔드팀",
    },
    {
        "id": "emp_002",
        "name": "김철수",
        "department": "기획팀",
        "email": "kim.cs2@company.com",
        "position": "기획자",
        "team": "서비스기획팀",
    },
    {
        "id": "emp_003",
        "name": "이영희",
        "department": "개발팀",
        "email": "lee.yh@company.com",
        "position": "팀장",
        "team": "프론트엔드팀",
    },
    {
        "id": "emp_004",
        "name": "박민수",
        "department": "개발팀",
        "email": "park.ms@company.com",
        "position": "주니어 개발자",
        "team": "백엔드팀",
    },
    {
        "id": "emp_005",
        "name": "정수진",
        "department": "디자인팀",
        "email": "jung.sj@company.com",
        "position": "선임 디자이너",
        "team": "UX팀",
    },
    {
        "id": "emp_006",
        "name": "최동훈",
        "department": "개발팀",
        "email": "choi.dh@company.com",
        "position": "시니어 개발자",
        "team": "인프라팀",
    },
    {
        "id": "emp_007",
        "name": "홍길동",
        "department": "경영지원팀",
        "email": "hong.gd@company.com",
        "position": "팀장",
        "team": "총무팀",
    },
    {
        "id": "emp_008",
        "name": "윤서연",
        "department": "마케팅팀",
        "email": "yoon.sy@company.com",
        "position": "마케터",
        "team": "디지털마케팅팀",
    },
]

# Mock 회의실 데이터
MOCK_ROOMS = [
    {
        "id": "room_001",
        "name": "회의실 A",
        "floor": 4,
        "building": "본관",
        "capacity": 6,
        "facilities": ["화이트보드", "프로젝터"],
        "description": "소규모 회의용",
    },
    {
        "id": "room_002",
        "name": "회의실 B",
        "floor": 4,
        "building": "본관",
        "capacity": 10,
        "facilities": ["화이트보드", "프로젝터", "화상회의"],
        "description": "중규모 회의용, 화상회의 가능",
    },
    {
        "id": "room_003",
        "name": "대회의실",
        "floor": 5,
        "building": "본관",
        "capacity": 20,
        "facilities": ["화이트보드", "프로젝터", "화상회의", "마이크"],
        "description": "대규모 회의 및 발표용",
    },
    {
        "id": "room_004",
        "name": "스몰톡",
        "floor": 3,
        "building": "본관",
        "capacity": 4,
        "facilities": ["화이트보드"],
        "description": "소규모 미팅용",
    },
    {
        "id": "room_005",
        "name": "크리에이티브룸",
        "floor": 2,
        "building": "별관",
        "capacity": 8,
        "facilities": ["화이트보드", "프로젝터", "화상회의"],
        "description": "창의적 회의 및 브레인스토밍용",
    },
]


def generate_mock_schedule(employee_id: str, target_date: date) -> list[dict]:
    """
    Mock 일정 생성

    직원 ID의 해시값을 기반으로 일관된 가짜 일정 생성
    """
    # 주말은 일정 없음
    if target_date.weekday() >= 5:
        return []

    # 직원 ID를 기반으로 시드 생성 (일관된 결과를 위해)
    seed = hash(f"{employee_id}_{target_date.isoformat()}")

    schedules = []

    # 각 직원별로 다른 패턴의 일정 생성
    if seed % 5 == 0:
        # 오전 회의 있음
        schedules.append({
            "start": datetime.combine(target_date, time(10, 0), tzinfo=KST).isoformat(),
            "end": datetime.combine(target_date, time(11, 0), tzinfo=KST).isoformat(),
            "is_busy": True,
            "title": "팀 미팅",
        })
    elif seed % 5 == 1:
        # 오후 회의 있음
        schedules.append({
            "start": datetime.combine(target_date, time(14, 0), tzinfo=KST).isoformat(),
            "end": datetime.combine(target_date, time(15, 30), tzinfo=KST).isoformat(),
            "is_busy": True,
            "title": "프로젝트 회의",
        })
    elif seed % 5 == 2:
        # 오전/오후 둘 다 회의 있음
        schedules.extend([
            {
                "start": datetime.combine(target_date, time(9, 30), tzinfo=KST).isoformat(),
                "end": datetime.combine(target_date, time(10, 30), tzinfo=KST).isoformat(),
                "is_busy": True,
                "title": "스탠드업 미팅",
            },
            {
                "start": datetime.combine(target_date, time(15, 0), tzinfo=KST).isoformat(),
                "end": datetime.combine(target_date, time(16, 0), tzinfo=KST).isoformat(),
                "is_busy": True,
                "title": "코드 리뷰",
            },
        ])
    elif seed % 5 == 3:
        # 점심 직후 회의
        schedules.append({
            "start": datetime.combine(target_date, time(13, 0), tzinfo=KST).isoformat(),
            "end": datetime.combine(target_date, time(14, 0), tzinfo=KST).isoformat(),
            "is_busy": True,
            "title": "1:1 미팅",
        })
    # seed % 5 == 4: 일정 없음

    return schedules


def generate_mock_room_bookings(room_id: str, target_date: date) -> list[dict]:
    """
    Mock 회의실 예약 현황 생성
    """
    # 주말은 예약 없음
    if target_date.weekday() >= 5:
        return []

    seed = hash(f"{room_id}_{target_date.isoformat()}")
    bookings = []

    if seed % 4 == 0:
        bookings.append({
            "start": datetime.combine(target_date, time(10, 0), tzinfo=KST).isoformat(),
            "end": datetime.combine(target_date, time(11, 0), tzinfo=KST).isoformat(),
            "meeting_title": "기존 예약",
        })
    elif seed % 4 == 1:
        bookings.append({
            "start": datetime.combine(target_date, time(14, 0), tzinfo=KST).isoformat(),
            "end": datetime.combine(target_date, time(16, 0), tzinfo=KST).isoformat(),
            "meeting_title": "기존 예약",
        })
    elif seed % 4 == 2:
        bookings.extend([
            {
                "start": datetime.combine(target_date, time(9, 0), tzinfo=KST).isoformat(),
                "end": datetime.combine(target_date, time(10, 0), tzinfo=KST).isoformat(),
                "meeting_title": "기존 예약",
            },
            {
                "start": datetime.combine(target_date, time(15, 0), tzinfo=KST).isoformat(),
                "end": datetime.combine(target_date, time(17, 0), tzinfo=KST).isoformat(),
                "meeting_title": "기존 예약",
            },
        ])
    # seed % 4 == 3: 예약 없음

    return bookings
