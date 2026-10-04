"""
Application Settings & Environment Configuration for ATMOSYNC API
"""
import os
import json
from typing import List, Union
from pydantic import AnyHttpUrl, field_validator
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    APP_NAME: str = "ATMOSYNC"
    APP_VERSION: str = "1.0.0-phase3"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    LOG_LEVEL: str = "INFO"
    API_V1_STR: str = "/api/v1"

    API_HOST: str = "0.0.0.0"
    API_PORT: int = 8000

    ALLOWED_CORS_ORIGINS: Union[List[str], str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000"
    ]

    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./data/vayudrishti.db")
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379/0")

    WEATHER_PROVIDER: str = "open-meteo"
    AIR_QUALITY_PROVIDER: str = "openaq"
    SATELLITE_FIRE_PROVIDER: str = "nasa-firms"

    @field_validator("ALLOWED_CORS_ORIGINS", mode="before")
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str):
            v_str = v.strip()
            if not v_str:
                return []
            if v_str.startswith("[") and v_str.endswith("]"):
                try:
                    parsed = json.loads(v_str)
                    if isinstance(parsed, list):
                        return [str(i).strip() for i in parsed if str(i).strip()]
                except Exception:
                    pass
            return [i.strip() for i in v_str.split(",") if i.strip()]
        elif isinstance(v, (list, tuple, set)):
            return [str(i).strip() for i in v if str(i).strip()]
        raise ValueError(f"Invalid CORS origins value: {v}")

    class Config:
        case_sensitive = True
        env_file = ".env"
        extra = "ignore"

settings = Settings()
