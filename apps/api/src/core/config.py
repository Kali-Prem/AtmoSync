"""
Application Settings & Environment Configuration for ATMOSYNC API
"""
import os
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

    ALLOWED_CORS_ORIGINS: List[str] = [
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
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",") if i.strip()]
        elif isinstance(v, (list, str)):
            return v
        raise ValueError(v)

    class Config:
        case_sensitive = True
        env_file = ".env"
        extra = "ignore"

settings = Settings()
