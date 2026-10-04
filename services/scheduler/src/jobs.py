"""
Scheduled Job Definitions for ATMOSYNC
Defines cadences, timeouts, retry policies, and handlers.
"""
from typing import Dict, Any, Callable
from dataclasses import dataclass, field
import logging

logger = logging.getLogger("vayudrishti.scheduler")

@dataclass
class ScheduledJob:
    name: str
    schedule_description: str
    cron_expression: str
    timeout_seconds: int
    max_retries: int
    handler_name: str
    is_placeholder: bool = False
    metadata: Dict[str, Any] = field(default_factory=dict)

# Master Registry of System Scheduled Jobs
SCHEDULED_JOBS = [
    ScheduledJob(
        name="job_weather_ingestion",
        schedule_description="Hourly meteorological forecast ingestion from Open-Meteo",
        cron_expression="0 * * * *", # Every hour on the hour
        timeout_seconds=45,
        max_retries=3,
        handler_name="execute_weather_ingestion"
    ),
    ScheduledJob(
        name="job_air_quality_ingestion",
        schedule_description="Hourly CPCB / OpenAQ station observations ingestion",
        cron_expression="15 * * * *", # At :15 past every hour
        timeout_seconds=60,
        max_retries=3,
        handler_name="execute_air_quality_ingestion"
    ),
    ScheduledJob(
        name="job_satellite_fire_ingestion",
        schedule_description="Synchronized NASA FIRMS VIIRS active fire fetch",
        cron_expression="45 0,10,13,15 * * *", # Synchronized with afternoon LEO passes
        timeout_seconds=90,
        max_retries=2,
        handler_name="execute_fire_ingestion"
    ),
    ScheduledJob(
        name="job_data_quality_audit",
        schedule_description="Periodic sensor anomaly & flatline audit",
        cron_expression="30 * * * *", # Every hour at :30
        timeout_seconds=30,
        max_retries=1,
        handler_name="execute_data_quality_audit"
    ),
    ScheduledJob(
        name="job_forecast_generation_placeholder",
        schedule_description="Coupled 72-hour forecast batch execution (Phase 4 Placeholder)",
        cron_expression="0 0,6,12,18 * * *", # 4x daily upon NWP release
        timeout_seconds=180,
        max_retries=2,
        handler_name="execute_forecast_generation",
        is_placeholder=True,
        metadata={"note": "Forecasting placeholder — will be implemented in Phase 4"}
    ),
    ScheduledJob(
        name="job_database_retention_cleanup",
        schedule_description="Prune old raw observation scratch logs older than 90 days",
        cron_expression="0 2 * * 0", # Weekly on Sunday at 02:00 UTC
        timeout_seconds=120,
        max_retries=1,
        handler_name="execute_retention_cleanup"
    )
]
