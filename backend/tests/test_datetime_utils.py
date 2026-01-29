"""datetime_utils 테스트"""

import pytest
from datetime import date, datetime, timedelta

from utils.datetime_utils import (
    parse_relative_date,
    get_date_range,
    get_work_hours,
    is_lunch_time,
    is_weekday,
    format_datetime_korean,
)


class TestParseRelativeDate:
    """parse_relative_date 테스트"""

    def test_today(self):
        result = parse_relative_date("오늘")
        assert result == date.today()

    def test_tomorrow(self):
        result = parse_relative_date("내일")
        assert result == date.today() + timedelta(days=1)

    def test_day_after_tomorrow(self):
        result = parse_relative_date("모레")
        assert result == date.today() + timedelta(days=2)

    def test_next_week(self):
        result = parse_relative_date("다음 주")
        assert result is not None
        assert result > date.today()
        assert result.weekday() == 0  # 월요일

    def test_specific_weekday(self):
        result = parse_relative_date("금요일")
        assert result is not None
        assert result.weekday() == 4

    def test_iso_format(self):
        result = parse_relative_date("2024-01-15")
        assert result == date(2024, 1, 15)

    def test_invalid_input(self):
        result = parse_relative_date("이상한 텍스트")
        assert result is None


class TestGetDateRange:
    """get_date_range 테스트"""

    def test_single_day(self):
        start, end = get_date_range("내일")
        assert start == end

    def test_next_week_range(self):
        start, end = get_date_range("다음 주")
        assert end > start
        assert (end - start).days == 4  # 월~금


class TestGetWorkHours:
    """get_work_hours 테스트"""

    def test_default_hours(self):
        today = date.today()
        start, end = get_work_hours(today)
        assert start.hour == 9
        assert end.hour == 18


class TestIsLunchTime:
    """is_lunch_time 테스트"""

    def test_lunch_time(self):
        today = date.today()
        lunch = datetime.combine(today, datetime.min.time().replace(hour=12, minute=30))
        assert is_lunch_time(lunch) is True

    def test_not_lunch_time(self):
        today = date.today()
        morning = datetime.combine(today, datetime.min.time().replace(hour=10))
        assert is_lunch_time(morning) is False


class TestIsWeekday:
    """is_weekday 테스트"""

    def test_weekday(self):
        # 월요일 찾기
        today = date.today()
        while today.weekday() != 0:
            today += timedelta(days=1)
        assert is_weekday(today) is True

    def test_weekend(self):
        # 토요일 찾기
        today = date.today()
        while today.weekday() != 5:
            today += timedelta(days=1)
        assert is_weekday(today) is False


class TestFormatDatetimeKorean:
    """format_datetime_korean 테스트"""

    def test_format_afternoon(self):
        dt = datetime(2024, 1, 15, 14, 30)
        result = format_datetime_korean(dt)
        assert "1월 15일" in result
        assert "오후" in result
        assert "2시" in result

    def test_format_morning(self):
        dt = datetime(2024, 1, 15, 10, 0)
        result = format_datetime_korean(dt)
        assert "오전" in result
        assert "10시" in result
