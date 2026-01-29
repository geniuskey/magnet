"""날짜/시간 유틸리티 모듈"""

import re
from datetime import datetime, date, time, timedelta
from typing import Optional
from zoneinfo import ZoneInfo

# 한국 시간대
KST = ZoneInfo("Asia/Seoul")

# 기본 업무 시간
DEFAULT_WORK_START = time(9, 0)
DEFAULT_WORK_END = time(18, 0)
LUNCH_START = time(12, 0)
LUNCH_END = time(13, 0)


def get_current_datetime() -> datetime:
    """현재 시간 반환 (KST)"""
    return datetime.now(KST)


def get_today() -> date:
    """오늘 날짜 반환"""
    return get_current_datetime().date()


def parse_relative_date(text: str, reference_date: Optional[date] = None) -> Optional[date]:
    """
    상대적 날짜 표현 파싱

    Args:
        text: "내일", "다음 주", "이번 주 금요일" 등
        reference_date: 기준 날짜 (기본값: 오늘)

    Returns:
        파싱된 날짜 또는 None
    """
    if reference_date is None:
        reference_date = get_today()

    text = text.strip().lower()

    # 오늘
    if text in ["오늘", "today"]:
        return reference_date

    # 내일
    if text in ["내일", "tomorrow"]:
        return reference_date + timedelta(days=1)

    # 모레
    if text in ["모레", "day after tomorrow"]:
        return reference_date + timedelta(days=2)

    # 다음 주
    if "다음 주" in text or "next week" in text:
        # 다음 주 월요일
        days_until_monday = (7 - reference_date.weekday()) % 7
        if days_until_monday == 0:
            days_until_monday = 7
        return reference_date + timedelta(days=days_until_monday)

    # 이번 주 특정 요일
    weekday_map = {
        "월": 0, "월요일": 0, "monday": 0,
        "화": 1, "화요일": 1, "tuesday": 1,
        "수": 2, "수요일": 2, "wednesday": 2,
        "목": 3, "목요일": 3, "thursday": 3,
        "금": 4, "금요일": 4, "friday": 4,
        "토": 5, "토요일": 5, "saturday": 5,
        "일": 6, "일요일": 6, "sunday": 6,
    }

    for day_name, weekday in weekday_map.items():
        if day_name in text:
            current_weekday = reference_date.weekday()
            days_ahead = weekday - current_weekday
            if "다음" in text:
                days_ahead += 7
            elif days_ahead <= 0:
                days_ahead += 7
            return reference_date + timedelta(days=days_ahead)

    # YYYY-MM-DD 형식
    date_pattern = r"(\d{4})-(\d{2})-(\d{2})"
    match = re.search(date_pattern, text)
    if match:
        try:
            return date(int(match.group(1)), int(match.group(2)), int(match.group(3)))
        except ValueError:
            pass

    # MM/DD 형식
    short_date_pattern = r"(\d{1,2})/(\d{1,2})"
    match = re.search(short_date_pattern, text)
    if match:
        try:
            month = int(match.group(1))
            day = int(match.group(2))
            year = reference_date.year
            result = date(year, month, day)
            if result < reference_date:
                result = date(year + 1, month, day)
            return result
        except ValueError:
            pass

    return None


def get_date_range(start_text: str, end_text: Optional[str] = None) -> tuple[date, date]:
    """
    날짜 범위 파싱

    Args:
        start_text: 시작 날짜 텍스트
        end_text: 종료 날짜 텍스트 (없으면 시작일과 동일)

    Returns:
        (시작일, 종료일) 튜플
    """
    start_date = parse_relative_date(start_text) or get_today()

    if end_text:
        end_date = parse_relative_date(end_text, start_date) or start_date
    else:
        # "다음 주"면 금요일까지
        if "다음 주" in start_text:
            end_date = start_date + timedelta(days=4)
        else:
            end_date = start_date

    return start_date, end_date


def get_work_hours(
    target_date: date,
    work_start: time = DEFAULT_WORK_START,
    work_end: time = DEFAULT_WORK_END,
) -> tuple[datetime, datetime]:
    """
    특정 날짜의 업무 시간 반환

    Args:
        target_date: 대상 날짜
        work_start: 업무 시작 시간
        work_end: 업무 종료 시간

    Returns:
        (시작 datetime, 종료 datetime) 튜플
    """
    start_dt = datetime.combine(target_date, work_start, tzinfo=KST)
    end_dt = datetime.combine(target_date, work_end, tzinfo=KST)
    return start_dt, end_dt


def is_lunch_time(dt: datetime) -> bool:
    """
    점심시간인지 확인

    Args:
        dt: 확인할 시간

    Returns:
        점심시간 여부
    """
    t = dt.time()
    return LUNCH_START <= t < LUNCH_END


def is_work_hour(dt: datetime) -> bool:
    """
    업무 시간인지 확인

    Args:
        dt: 확인할 시간

    Returns:
        업무 시간 여부
    """
    t = dt.time()
    return DEFAULT_WORK_START <= t < DEFAULT_WORK_END


def is_weekday(d: date) -> bool:
    """
    평일인지 확인

    Args:
        d: 확인할 날짜

    Returns:
        평일 여부
    """
    return d.weekday() < 5


def format_datetime_korean(dt: datetime) -> str:
    """
    datetime을 한국어 형식으로 포맷

    Args:
        dt: 포맷할 datetime

    Returns:
        "1월 15일 (월) 오후 2시" 형식의 문자열
    """
    weekday_names = ["월", "화", "수", "목", "금", "토", "일"]
    weekday = weekday_names[dt.weekday()]

    hour = dt.hour
    if hour < 12:
        period = "오전"
        display_hour = hour if hour > 0 else 12
    else:
        period = "오후"
        display_hour = hour - 12 if hour > 12 else 12

    minute_str = f" {dt.minute}분" if dt.minute > 0 else ""

    return f"{dt.month}월 {dt.day}일 ({weekday}) {period} {display_hour}시{minute_str}"


def format_time_korean(dt: datetime) -> str:
    """
    시간만 한국어 형식으로 포맷

    Args:
        dt: 포맷할 datetime

    Returns:
        "오후 2시 30분" 형식의 문자열
    """
    hour = dt.hour
    if hour < 12:
        period = "오전"
        display_hour = hour if hour > 0 else 12
    else:
        period = "오후"
        display_hour = hour - 12 if hour > 12 else 12

    minute_str = f" {dt.minute}분" if dt.minute > 0 else ""

    return f"{period} {display_hour}시{minute_str}"
