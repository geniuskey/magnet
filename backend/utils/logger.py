"""로깅 설정 모듈"""

import logging
import sys
import json
from datetime import datetime
from typing import Any


class JSONFormatter(logging.Formatter):
    """JSON 형식 로그 포매터"""

    def format(self, record: logging.LogRecord) -> str:
        log_data = {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "level": record.levelname,
            "service": "meeting-scheduler",
            "message": record.getMessage(),
            "module": record.module,
            "function": record.funcName,
            "line": record.lineno,
        }

        # 추가 필드가 있으면 포함
        if hasattr(record, "user_id"):
            log_data["user_id"] = record.user_id
        if hasattr(record, "conversation_id"):
            log_data["conversation_id"] = record.conversation_id
        if hasattr(record, "action"):
            log_data["action"] = record.action
        if hasattr(record, "duration_ms"):
            log_data["duration_ms"] = record.duration_ms

        # 예외 정보가 있으면 포함
        if record.exc_info:
            log_data["exception"] = self.formatException(record.exc_info)

        return json.dumps(log_data, ensure_ascii=False)


def setup_logger(level: str = "INFO") -> None:
    """로거 초기 설정"""
    root_logger = logging.getLogger()
    root_logger.setLevel(getattr(logging, level.upper()))

    # 기존 핸들러 제거
    root_logger.handlers.clear()

    # 콘솔 핸들러 (개발용)
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setFormatter(
        logging.Formatter(
            "%(asctime)s - %(name)s - %(levelname)s - %(message)s",
            datefmt="%Y-%m-%d %H:%M:%S",
        )
    )
    root_logger.addHandler(console_handler)


def get_logger(name: str) -> logging.Logger:
    """이름으로 로거 가져오기"""
    return logging.getLogger(name)


class LoggerAdapter(logging.LoggerAdapter):
    """컨텍스트 정보를 포함하는 로거 어댑터"""

    def process(self, msg: str, kwargs: dict[str, Any]) -> tuple[str, dict[str, Any]]:
        extra = kwargs.get("extra", {})
        extra.update(self.extra)
        kwargs["extra"] = extra
        return msg, kwargs
