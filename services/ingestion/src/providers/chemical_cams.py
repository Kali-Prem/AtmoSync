"""
Verified Chemical Prior Provider Connector: Copernicus CAMS Global (via Open-Meteo Air Quality API)
Fetches hourly 0.4° regional chemical background fields (PM2.5, PM10, NO2, O3, SO2, CO, AOD).
"""
import json
import urllib.request
import urllib.parse
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from services.ingestion.src.providers.base import BaseProvider
from services.ingestion.src.validation.validator import DataValidator
from services.ingestion.src.normalization.normalizer import DataNormalizer

class CamsChemicalProvider(BaseProvider):
    """Ingests regional chemical priors from Copernicus CAMS Global model."""

    def __init__(self, base_url: str = "https://air-quality-api.open-meteo.com/v1/air-quality"):
        super().__init__(name="CAMS-GLOBAL", base_url=base_url)

    def fetch(self, latitude: float = 28.6139, longitude: float = 77.2090, forecast_days: int = 3) -> Dict[str, Any]:
        """Queries CAMS endpoint for coordinates."""
        params = {
            "latitude": str(latitude),
            "longitude": str(longitude),
            "hourly": "pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone,aerosol_optical_depth,dust",
            "forecast_days": str(forecast_days),
            "timezone": "UTC"
        }
        query_string = urllib.parse.urlencode(params)
        url = f"{self.base_url}?{query_string}"

        req = urllib.request.Request(url, headers={"User-Agent": "ATMOSYNC-Ingest/1.0"})
        with urllib.request.urlopen(req, timeout=self.timeout_seconds) as response:
            if response.status != 200:
                raise RuntimeError(f"CAMS API returned HTTP status {response.status}")
            data = json.loads(response.read().decode("utf-8"))
            data["_query_meta"] = {"latitude": latitude, "longitude": longitude}
            return data

    def validate(self, raw_data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Parses hourly CAMS arrays into individual records."""
        hourly = raw_data.get("hourly", {})
        times = hourly.get("time", [])
        if not times:
            return []

        lat = raw_data.get("_query_meta", {}).get("latitude", 28.6139)
        lon = raw_data.get("_query_meta", {}).get("longitude", 77.2090)

        records = []
        for i, t_str in enumerate(times):
            rec = {
                "time": t_str,
                "latitude": lat,
                "longitude": lon,
                "pm25": hourly.get("pm2_5", [None])[i],
                "pm10": hourly.get("pm10", [None])[i],
                "no2": hourly.get("nitrogen_dioxide", [None])[i],
                "o3": hourly.get("ozone", [None])[i],
                "so2": hourly.get("sulphur_dioxide", [None])[i],
                "co": hourly.get("carbon_monoxide", [None])[i],
                "aod550": hourly.get("aerosol_optical_depth", [None])[i],
                "dust": hourly.get("dust", [None])[i],
                "source": "CAMS-GLOBAL"
            }
            res = DataValidator.validate_air_quality_record(rec)
            if res.is_valid:
                records.append(res.record)

        return records

    def normalize(self, validated_records: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Normalizes timestamps and gas concentrations."""
        normalized = []
        for r in validated_records:
            norm = dict(r)
            norm["time"] = DataNormalizer.normalize_timestamp(r["time"])
            if "co" in norm and norm["co"] is not None:
                # CAMS CO is frequently in ug/m3, convert to canonical mg/m3
                norm["co"] = round(float(norm["co"]) / 1000.0, 3)
            normalized.append(norm)
        return normalized

    def store(self, normalized_records: List[Dict[str, Any]], db: Any) -> int:
        """CAMS priors are primarily used directly in memory for feature engineering."""
        return len(normalized_records)
