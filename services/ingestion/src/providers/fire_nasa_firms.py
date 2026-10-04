"""
Verified Satellite Fire Provider Connector: NASA FIRMS Active Fire API
Fetches sub-kilometer active fire hotspots (VIIRS 375m) across Punjab, Haryana, and NCR.
"""
import csv
import io
import os
import urllib.request
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from services.ingestion.src.providers.base import BaseProvider
from services.ingestion.src.validation.validator import DataValidator
from services.ingestion.src.normalization.normalizer import DataNormalizer
from database.models import FireEvent

class NasaFirmsFireProvider(BaseProvider):
    """Ingests near-real-time active fire / thermal anomalies from NASA FIRMS VIIRS 375m."""

    def __init__(self, base_url: str = "https://firms.modaps.eosdis.nasa.gov/api/area/csv", map_key: Optional[str] = None):
        super().__init__(name="NASA-FIRMS-VIIRS", base_url=base_url)
        self.map_key = map_key or os.getenv("NASA_FIRMS_MAP_KEY", "")

    def fetch(self, source: str = "VIIRS_SNPP_NRT", days: int = 1, bbox: str = "74.0,27.0,79.5,32.5") -> List[Dict[str, Any]]:
        """
        Fetches active fire CSV from NASA FIRMS API.
        If map_key is missing or placeholder, returns empty list safely.
        """
        if not self.map_key or "placeholder" in self.map_key.lower():
            return []

        url = f"{self.base_url}/{self.map_key}/{source}/{bbox}/{days}"
        req = urllib.request.Request(url, headers={"User-Agent": "ATMOSYNC-Ingest/1.0"})

        try:
            with urllib.request.urlopen(req, timeout=self.timeout_seconds) as response:
                if response.status == 200:
                    content = response.read().decode("utf-8")
                    reader = csv.DictReader(io.StringIO(content))
                    return list(reader)
        except Exception:
            return []

        return []

    def parse_csv_content(self, csv_text: str) -> List[Dict[str, Any]]:
        """Utility to parse raw CSV content from disk or network."""
        reader = csv.DictReader(io.StringIO(csv_text))
        return list(reader)

    def validate(self, raw_records: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Validates fire records for required fields, coordinates, and FRP bounds."""
        validated = []
        for r in raw_records:
            # Map standard FIRMS columns: latitude, longitude, bright_ti4, frp, acq_date, acq_time
            lat = r.get("latitude")
            lon = r.get("longitude")
            frp = r.get("frp") or r.get("frp_mw")
            
            # Construct acquisition datetime
            acq_date = r.get("acq_date", "")
            acq_time = r.get("acq_time", "0000").zfill(4)
            time_str = f"{acq_date}T{acq_time[:2]}:{acq_time[2:]}:00Z" if acq_date else None

            candidate = {
                "source": r.get("satellite", "VIIRS"),
                "latitude": lat,
                "longitude": lon,
                "frp_mw": frp,
                "brightness_temp_k": r.get("bright_ti4") or r.get("brightness"),
                "confidence": r.get("confidence", "nominal"),
                "daynight": r.get("daynight", "D"),
                "time": time_str
            }

            res = DataValidator.validate_fire_event(candidate)
            if res.is_valid:
                res.record["acq_time"] = time_str
                validated.append(res.record)

        return validated

    def normalize(self, validated_records: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Standardizes coordinates, timestamps, and classifies source state (Punjab / Haryana)."""
        normalized = []
        for r in validated_records:
            norm = dict(r)
            norm["latitude"], norm["longitude"] = DataNormalizer.normalize_coordinates(r["latitude"], r["longitude"])
            if r.get("acq_time"):
                norm["acq_time"] = DataNormalizer.normalize_timestamp(r["acq_time"])
            else:
                norm["acq_time"] = datetime.now(timezone.utc)

            # Geographic state classifier based on bounding box
            lat, lon = norm["latitude"], norm["longitude"]
            if 29.5 <= lat <= 32.5 and 74.0 <= lon <= 77.0:
                norm["state"] = "Punjab"
            elif 27.5 <= lat <= 30.5 and 76.0 <= lon <= 78.0:
                norm["state"] = "Haryana"
            else:
                norm["state"] = "NCR-Periphery"

            normalized.append(norm)
        return normalized

    def store(self, normalized_records: List[Dict[str, Any]], db: Session) -> int:
        """Commits active fire records to fire_events table."""
        count = 0
        for r in normalized_records:
            fire = FireEvent(
                source=r.get("source", "VIIRS_SNPP_NRT"),
                latitude=r["latitude"],
                longitude=r["longitude"],
                acq_time=r["acq_time"].replace(tzinfo=None) if hasattr(r["acq_time"], "tzinfo") else r["acq_time"],
                frp_mw=r["frp_mw"],
                brightness_temp_k=float(r["brightness_temp_k"]) if r.get("brightness_temp_k") else None,
                confidence=str(r.get("confidence")),
                daynight=str(r.get("daynight", "D")),
                state=r.get("state", "Punjab")
            )
            db.add(fire)
            count += 1
        db.commit()
        return count
