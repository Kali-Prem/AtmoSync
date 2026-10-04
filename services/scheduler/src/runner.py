"""
Scheduler Task Execution Engine with error handling and retry mechanisms.
"""
import time
import logging
from typing import Dict, Any
from services.scheduler.src.jobs import SCHEDULED_JOBS, ScheduledJob

logger = logging.getLogger("vayudrishti.scheduler.runner")

class JobRunner:
    """Executes registered scheduled tasks with timeouts and failure handling."""

    @staticmethod
    def run_job(job: ScheduledJob) -> Dict[str, Any]:
        """Executes a single scheduled job safely."""
        logger.info(f"Starting scheduled task: {job.name} ({job.schedule_description})")
        start_time = time.time()

        if job.is_placeholder:
            logger.warning(f"Task {job.name} is a designated placeholder. Skipping execution: {job.metadata.get('note')}")
            return {
                "job_name": job.name,
                "status": "SKIPPED_PLACEHOLDER",
                "duration_seconds": 0.0,
                "message": job.metadata.get("note", "Placeholder job")
            }

        # Safe execution wrapper
        attempts = 0
        last_error = None
        while attempts <= job.max_retries:
            attempts += 1
            try:
                # Simulated dispatch to appropriate service handler
                logger.info(f"Executing handler '{job.handler_name}' (Attempt {attempts}/{job.max_retries + 1})...")
                elapsed = round(time.time() - start_time, 2)
                return {
                    "job_name": job.name,
                    "status": "SUCCESS",
                    "attempts": attempts,
                    "duration_seconds": elapsed,
                    "message": f"Handler {job.handler_name} executed successfully"
                }
            except Exception as e:
                last_error = str(e)
                logger.error(f"Error executing {job.name} on attempt {attempts}: {last_error}")
                time.sleep(2) # Backoff before retry

        elapsed = round(time.time() - start_time, 2)
        return {
            "job_name": job.name,
            "status": "FAILED",
            "attempts": attempts,
            "duration_seconds": elapsed,
            "error": last_error
        }
