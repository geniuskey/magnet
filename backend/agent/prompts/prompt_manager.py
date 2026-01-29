"""프롬프트 관리자"""

from datetime import datetime, timedelta
from pathlib import Path
from jinja2 import Environment, FileSystemLoader

from utils.datetime_utils import get_today, get_current_datetime, KST


class PromptManager:
    """프롬프트 템플릿 관리"""

    def __init__(self):
        template_dir = Path(__file__).parent
        self.env = Environment(
            loader=FileSystemLoader(template_dir),
            autoescape=False,
        )

    def get_system_prompt(self) -> str:
        """시스템 프롬프트 생성"""
        template = self.env.get_template("system.jinja2")

        today = get_today()
        now = get_current_datetime()
        tomorrow = today + timedelta(days=1)

        # 다음 주 월요일 계산
        days_until_monday = (7 - today.weekday()) % 7
        if days_until_monday == 0:
            days_until_monday = 7
        next_week_start = today + timedelta(days=days_until_monday)
        next_week_end = next_week_start + timedelta(days=4)  # 금요일

        context = {
            "current_date": today.strftime("%Y년 %m월 %d일 (%a)"),
            "current_time": now.strftime("%H시 %M분"),
            "tomorrow_date": tomorrow.strftime("%Y년 %m월 %d일 (%a)"),
            "next_week_start": next_week_start.strftime("%Y년 %m월 %d일 (%a)"),
            "next_week_end": next_week_end.strftime("%Y년 %m월 %d일 (%a)"),
        }

        return template.render(**context)

    def get_context_summary(self, context: dict) -> str:
        """대화 컨텍스트 요약 생성"""
        summary_parts = []

        if "selected_employees" in context:
            employees = context["selected_employees"]
            if employees:
                names = [e.get("name", "Unknown") for e in employees]
                summary_parts.append(f"참석자: {', '.join(names)}")

        if "selected_date_range" in context:
            date_range = context["selected_date_range"]
            summary_parts.append(f"기간: {date_range}")

        if "duration_minutes" in context:
            duration = context["duration_minutes"]
            summary_parts.append(f"회의 시간: {duration}분")

        if "selected_slot" in context:
            slot = context["selected_slot"]
            summary_parts.append(f"선택한 시간: {slot}")

        if "selected_room" in context:
            room = context["selected_room"]
            summary_parts.append(f"회의실: {room}")

        if summary_parts:
            return "\n현재 진행 상황:\n- " + "\n- ".join(summary_parts)

        return ""
