"""
Health and System Observability Router
"""
from datetime import datetime, timezone
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from apps.api.src.core.config import settings
from apps.api.src.schemas.common import HealthResponse
from database.connection import get_db

router = APIRouter(tags=["Health & System Status"])

@router.get("/health", response_model=HealthResponse)
def get_system_health(db: Session = Depends(get_db)):
    """
    Returns system status, active database connectivity, and provider health.
    """
    db_status = "unhealthy"
    try:
        db.execute(text("SELECT 1"))
        db_status = "connected"
    except Exception as e:
        db_status = f"disconnected: {str(e)}"

    return HealthResponse(
        status="healthy" if db_status == "connected" else "degraded",
        timestamp=datetime.now(timezone.utc),
        app_name=settings.APP_NAME,
        version=settings.APP_VERSION,
        environment=settings.ENVIRONMENT,
        database={
            "status": db_status,
            "engine": "PostgreSQL/TimescaleDB" if "postgresql" in settings.DATABASE_URL else "SQLite"
        },
        active_providers={
            "weather": settings.WEATHER_PROVIDER,
            "air_quality": settings.AIR_QUALITY_PROVIDER,
            "satellite_fire": settings.SATELLITE_FIRE_PROVIDER
        }
    )
