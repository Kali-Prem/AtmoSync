"""
Main FastAPI Application Entrypoint for ATMOSYNC
"""
import sys
from pathlib import Path

# Ensure repo root is on sys.path
REPO_ROOT = Path(__file__).resolve().parent.parent.parent.parent
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from apps.api.src.core.config import settings
from apps.api.src.core.logging import setup_logging
from apps.api.src.routers import (
    health, locations, observations, forecasts, fires, inversion, plume, alerts, atmosphere
)
from database.connection import init_database

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Setup logging and ensure database tables exist
    setup_logging()
    init_database()
    yield
    # Shutdown logic if needed

app = FastAPI(
    title="ATMOSYNC API",
    version=settings.APP_VERSION,
    description=(
        "ATMOSYNC: Air Pollution–Weather Coupled Forecasting System for Delhi NCR (SIH 2026 PS 26082). "
        "Provides 72-hour multi-pollutant predictions, planetary boundary layer diagnostics, "
        "atmospheric inversion tracking, and regional stubble plume advection."
    ),
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json"
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global root health check (Standard container readiness probe)
app.include_router(health.router)

# Versioned API Routes (/api/v1)
api_v1 = FastAPI(title="ATMOSYNC API v1")
api_v1.include_router(health.router)
api_v1.include_router(locations.router)
api_v1.include_router(observations.router)
api_v1.include_router(atmosphere.router)
api_v1.include_router(inversion.router)
api_v1.include_router(fires.router)
api_v1.include_router(plume.router)
api_v1.include_router(forecasts.router)
api_v1.include_router(alerts.router)

app.mount(settings.API_V1_STR, api_v1)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("apps.api.src.main:app", host=settings.API_HOST, port=settings.API_PORT, reload=settings.DEBUG)
