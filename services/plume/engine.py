"""
Plume Analysis & Regional Smoke Integration Engine
Connects active fire clusters, numerical weather wind fields, and the
PlumeTransportEngine to produce real-time and historical transport diagnostics.
"""
import logging
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from database.connection import SessionLocal
from database.models import FireEvent, WeatherObservation
from scientific.preprocessing.fire import FireEventProcessor
from services.plume.transport import PlumeTransportEngine

logger = logging.getLogger("vayudrishti.plume_engine")


class PlumeService:
    """
    High-level operational service orchestrating regional stubble plume advection,
    fire clustering, and Delhi NCR target exposure.
    """

    def __init__(self):
        self.transport_engine = PlumeTransportEngine()
        self.fire_processor = FireEventProcessor()

    def get_current_plume_risk(self, db: Optional[Session] = None) -> Dict[str, Any]:
        """
        Computes current plume transport risk using latest database fire events
        and meteorological forcing.
        """
        close_db = False
        if db is None:
            db = SessionLocal()
            close_db = True

        try:
            # Query recent fire events from database
            fire_records = db.query(FireEvent).order_by(FireEvent.acq_time.desc()).limit(200).all()
            
            # Query latest weather observation for Delhi NCR
            latest_weather = db.query(WeatherObservation).order_by(WeatherObservation.time.desc()).first()

            if not latest_weather:
                # Default baseline weather if DB empty
                wind_speed = 2.5
                wind_dir = 315.0  # Northwesterly
                pblh = 350.0
                inversion_strength = 1.2
            else:
                wind_speed = latest_weather.wind_speed_10m or 2.5
                wind_dir = latest_weather.wind_direction_10m or 315.0
                pblh = latest_weather.boundary_layer_height_m or 350.0
                inversion_strength = latest_weather.lapse_rate_low or 1.0

            raw_detections = []
            for f in fire_records:
                raw_detections.append({
                    "latitude": f.latitude,
                    "longitude": f.longitude,
                    "frp_mw": f.frp_mw,
                    "confidence": f.confidence,
                    "time": f.acq_time.isoformat() if f.acq_time else None,
                    "source": f.source
                })

            # Cluster raw pixels into regional source events
            clusters = self.fire_processor.cluster_fire_events(raw_detections)

            # Evaluate plume risk toward Delhi NCR
            risk_result = self.transport_engine.evaluate_plume_risk(
                fire_events=clusters,
                wind_speed_10m=wind_speed,
                wind_direction_10m=wind_dir,
                pblh_m=pblh,
                inversion_strength=inversion_strength
            )

            # Generate sample trajectories for top upwind clusters
            trajectories = []
            for c in clusters[:5]:
                traj = self.transport_engine.simulate_forward_trajectory(
                    source_lat=c["centroid_latitude"],
                    source_lon=c["centroid_longitude"],
                    start_time_iso=c["start_time"],
                    wind_speed_ms=wind_speed,
                    wind_direction_deg=wind_dir,
                    duration_hours=48,
                    time_step_hours=3
                )
                trajectories.append({
                    "event_id": c["event_id"],
                    "source_region": c["source_region"],
                    "total_frp_mw": c["total_frp_mw"],
                    "trajectory_steps": traj
                })

            risk_result["clusters_analyzed"] = len(clusters)
            risk_result["sample_trajectories"] = trajectories
            risk_result["ambient_meteorology"] = {
                "wind_speed_10m_ms": wind_speed,
                "wind_direction_10m_deg": wind_dir,
                "pbl_height_m": pblh,
                "inversion_strength_c_100m": inversion_strength
            }
            return risk_result
        finally:
            if close_db:
                db.close()


# Singleton service instance
plume_service = PlumeService()
