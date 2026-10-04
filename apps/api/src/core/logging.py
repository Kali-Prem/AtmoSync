"""
Structured Logging Configuration for ATMOSYNC
"""
import sys
import json
import logging
from datetime import datetime, timezone
from apps.api.src.core.config import settings

class JSONLogFormatter(logging.Formatter):
    """Formats log records as structured JSON without leaking secrets."""

    def format(self, record: logging.LogRecord) -> str:
        log_obj = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "service": settings.APP_NAME,
            "environment": settings.ENVIRONMENT,
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage()
        }

        if record.exc_info:
            log_obj["exception"] = self.formatException(record.exc_info)

        # Sanitize against accidental secret logging
        msg_str = json.dumps(log_obj)
        for secret_name in ["NASA_FIRMS_MAP_KEY", "OPENAQ_API_KEY", "PASSWORD"]:
            secret_val = getattr(settings, secret_name, None)
            if secret_val and len(secret_val) > 4 and secret_val in msg_str:
                msg_str = msg_str.replace(secret_val, "***REDACTED***")

        return msg_str

def setup_logging():
    """Initializes root logger with standard configuration."""
    root_logger = logging.getLogger()
    root_logger.setLevel(getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO))

    # Console handler
    handler = logging.StreamHandler(sys.stdout)
    if settings.ENVIRONMENT == "production":
        handler.setFormatter(JSONLogFormatter())
    else:
        # Development readable console format
        handler.setFormatter(logging.Formatter(
            "%(asctime)s [%(levelname)s] %(name)s: %(message)s"
        ))

    root_logger.handlers = [handler]
