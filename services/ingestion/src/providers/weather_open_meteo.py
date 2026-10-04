"""
Verified Weather Provider Connector: Open-Meteo Weather API
Fetches hourly ECMWF/GFS meteorological parameters including PBL height and multi-level temps.
"""
import json
import urllib.request
import urllib.parse
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from services.ingestion.src.providers.base import BaseProvider
from services.ingestion.src.validation.validator import DataValidator
from services.ingestion.src.normalization.normalizer import DataNormalizer
from database.models import WeatherObservation

class OpenMeteoWeatherProvider(BaseProvider):
    """Ingests verified meteorological forecast & historical observations from Open-Meteo."""

    def __init__(self, base_url: str = "https://api.open-meteo.com/v1/forecast", timeout_seconds: int = 20):
        super().__init__(name="OPEN-METEO", base_url=base_url, timeout_seconds=timeout_seconds)

    def fetch(self, latitude: float = 28.6139, longitude: float = 77.2090, forecast_days: int = 3) -> Dict[str, Any]:
        """Queries Open-Meteo REST endpoint for coordinates."""
        params = {
            "latitude": str(latitude),
            "longitude": str(longitude),
            "hourly": "temperature_2m,relative_humidity_2m,surface_pressure,wind_speed_10m,wind_direction_10m,precipitation,direct_radiation,boundary_layer_height,temperature_80m,temperature_180m",
            "forecast_days": str(forecast_days),
            "timezone": "UTC"
        }
        query_string = urllib.parse.urlencode(params)
        url = f"{self.base_url}?{query_string}"

        req = urllib.request.Request(
            url,
            headers={"User-Agent": "ATMOSYNC-Ingest/1.0"}
        )

        with urllib.request.urlopen(req, timeout=self.timeout_seconds) as response:
            if response.status != 200:
                raise RuntimeError(f"Open-Meteo API returned HTTP status {response.status}")
            data = json.loads(response.read().decode("utf-8"))
            data["_query_meta"] = {"latitude": latitude, "longitude": longitude}
            return data

    def validate(self, raw_data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Parses Open-Meteo tabular columns into individual hourly records and validates each."""
        hourly = raw_data.get("hourly", {})
        times = hourly.get("time", [])
        if not times:
            return []

        lat = raw_data.get("_query_meta", {}).get("latitude", raw_data.get("latitude", 28.6139))
        lon = raw_data.get("_query_meta", {}).get("longitude", raw_data.get("longitude", 77.2090))

        validated_records = []
        for i, t_str in enumerate(times):
            # Compute lapse rate in lowest 80m: Gamma_low = (T_80m - T_2m) / 78m * 100 (°C/100m)
            t2 = hourly.get("temperature_2m", [None])[i]
            t80 = hourly.get("temperature_80m", [None])[i]
            lapse_rate_low = None
            if t2 is not None and t80 is not None:
                lapse_rate_low = round(((float(t80) - float(t2)) / 78.0) * 100.0, 3)

            rec = {
                "time": t_str,
                "latitude": lat,
                "longitude": lon,
                "temperature_2m": t2,
                "relative_humidity_2m": hourly.get("relative_humidity_2m", [None])[i],
                "surface_pressure_hpa": hourly.get("surface_pressure", [None])[i],
                "wind_speed_10m": hourly.get("wind_speed_10m", [None])[i],
                "wind_direction_10m": hourly.get("wind_direction_10m", [None])[i],
                "precipitation_mm": hourly.get("precipitation", [0.0])[i],
                "direct_radiation_wm2": hourly.get("direct_radiation", [None])[i],
                "boundary_layer_height_m": hourly.get("boundary_layer_height", [None])[i],
                "lapse_rate_low": lapse_rate_low,
                "source": "OPEN-METEO"
            }

            res = DataValidator.validate_weather_record(rec)
            if res.is_valid:
                validated_records.append(res.record)

        return validated_records

    def normalize(self, validated_records: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Ensures all units and timestamps are strictly normalized."""
        normalized = []
        for r in validated_records:
            norm_rec = dict(r)
            norm_rec["time"] = DataNormalizer.normalize_timestamp(r["time"])
            norm_rec["latitude"], norm_rec["longitude"] = DataNormalizer.normalize_coordinates(r["latitude"], r["longitude"])
            normalized.append(norm_rec)
        return normalized

    def store(self, normalized_records: List[Dict[str, Any]], db: Session, location_id: Optional[str] = None) -> int:
        """Saves records into weather_observations table."""
        count = 0
        for r in normalized_records:
            obs = WeatherObservation(
                time=r["time"].replace(tzinfo=None) if hasattr(r["time"], "tzinfo") else r["time"],
                location_id=location_id or r.get("location_id"),
                latitude=r["latitude"],
                longitude=r["longitude"],
                temperature_2m=r.get("temperature_2m"),
                relative_humidity_2m=r.get("relative_humidity_2m"),
                surface_pressure_hpa=r.get("surface_pressure_hpa"),
                wind_speed_10m=r.get("wind_speed_10m"),
                wind_direction_10m=r.get("wind_direction_10m"),
                precipitation_mm=r.get("precipitation_mm", 0.0),
                direct_radiation_wm2=r.get("direct_radiation_wm2"),
                boundary_layer_height_m=r.get("boundary_layer_height_m"),
                lapse_rate_low=r.get("lapse_rate_low"),
                source=r.get("source", "OPEN-METEO"),
                qc_flag=r.get("qc_flag", 0)
            )
            db.add(obs)
            count += 1
        db.commit()
        return count
