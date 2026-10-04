"""Historical Data Acquisition Script for ATMOSYNC (Phase 4).

Acquires verified historical meteorological reanalysis and atmospheric
composition datasets for Delhi NCR stations over the benchmark winter season.
Saves raw JSON payloads to data/raw/ and logs metadata to data/metadata/.
"""

import hashlib
import json
import logging
import os
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List
import urllib.request
import urllib.error

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("vayudrishti.acquire")

BASE_DIR = Path(__file__).resolve().parent.parent
RAW_DIR = BASE_DIR / "data" / "raw"
METADATA_DIR = BASE_DIR / "data" / "metadata"
SEEDS_FILE = BASE_DIR / "database" / "seeds" / "001_delhi_stations.json"

RAW_DIR.mkdir(parents=True, exist_ok=True)
METADATA_DIR.mkdir(parents=True, exist_ok=True)


def load_stations() -> List[Dict[str, Any]]:
    """Load verified monitoring stations from seed file."""
    if not SEEDS_FILE.exists():
        logger.error(f"Stations seed file not found at {SEEDS_FILE}")
        return []
    with open(SEEDS_FILE, "r", encoding="utf-8") as f:
        return json.load(f)


def fetch_url(url: str, timeout: int = 30) -> bytes:
    """Fetch URL content via HTTP GET with retry policy."""
    headers = {"User-Agent": "ATMOSYNC-Research/1.0 (MoES/NCMRWF SIH 26082)"}
    req = urllib.request.Request(url, headers=headers)
    
    for attempt in range(3):
        try:
            with urllib.request.urlopen(req, timeout=timeout) as response:
                if response.status == 200:
                    return response.read()
                logger.warning(f"HTTP status {response.status} on attempt {attempt+1}")
        except urllib.error.URLError as e:
            logger.warning(f"URL error on attempt {attempt+1}: {e}")
            time.sleep(2)
        except Exception as e:
            logger.warning(f"Unexpected error on attempt {attempt+1}: {e}")
            time.sleep(2)
    raise RuntimeError(f"Failed to fetch {url} after 3 attempts.")


def acquire_station_data(
    station: Dict[str, Any],
    start_date: str = "2023-10-01",
    end_date: str = "2024-02-29"
) -> Dict[str, Any]:
    """Acquire weather and air quality historical time series for a station."""
    stn_id = station.get("station_code") or station.get("station_id")
    lat = station["latitude"]
    lon = station["longitude"]
    logger.info(f"Acquiring data for station {stn_id} ({station['name']}) [{lat}, {lon}]...")

    # 1. Fetch Historical Weather (ERA5 / Open-Meteo Archive)
    weather_vars = [
        "temperature_2m",
        "relative_humidity_2m",
        "surface_pressure",
        "wind_speed_10m",
        "wind_direction_10m",
        "precipitation",
        "boundary_layer_height",
        "temperature_80m",
        "temperature_120m",
        "temperature_180m",
        "wind_speed_80m",
        "wind_speed_120m",
        "wind_speed_180m"
    ]
    weather_url = (
        f"https://archive-api.open-meteo.com/v1/archive?"
        f"latitude={lat}&longitude={lon}&start_date={start_date}&end_date={end_date}"
        f"&hourly={','.join(weather_vars)}&timezone=UTC"
    )

    weather_raw_file = RAW_DIR / f"{stn_id}_weather_{start_date}_{end_date}.json"
    if weather_raw_file.exists():
        logger.info(f"Using existing raw weather file for {stn_id}")
        with open(weather_raw_file, "rb") as f:
            weather_bytes = f.read()
    else:
        weather_bytes = fetch_url(weather_url)
        with open(weather_raw_file, "wb") as f:
            f.write(weather_bytes)
    weather_sha256 = hashlib.sha256(weather_bytes).hexdigest()

    # 2. Fetch Chemical Priors / Air Quality (CAMS / Open-Meteo Air Quality)
    aq_vars = [
        "pm2_5",
        "pm10",
        "nitrogen_dioxide",
        "ozone",
        "sulphur_dioxide",
        "carbon_monoxide"
    ]
    aq_url = (
        f"https://air-quality-api.open-meteo.com/v1/air-quality?"
        f"latitude={lat}&longitude={lon}&start_date={start_date}&end_date={end_date}"
        f"&hourly={','.join(aq_vars)}&timezone=UTC"
    )

    aq_raw_file = RAW_DIR / f"{stn_id}_airquality_{start_date}_{end_date}.json"
    if aq_raw_file.exists():
        logger.info(f"Using existing raw air quality file for {stn_id}")
        with open(aq_raw_file, "rb") as f:
            aq_bytes = f.read()
    else:
        aq_bytes = fetch_url(aq_url)
        with open(aq_raw_file, "wb") as f:
            f.write(aq_bytes)
    aq_sha256 = hashlib.sha256(aq_bytes).hexdigest()

    meta = {
        "station_id": stn_id,
        "station_name": station["name"],
        "latitude": lat,
        "longitude": lon,
        "start_date": start_date,
        "end_date": end_date,
        "acquisition_time_utc": datetime.now(timezone.utc).isoformat(),
        "weather_file": str(weather_raw_file.name),
        "weather_sha256": weather_sha256,
        "weather_bytes": len(weather_bytes),
        "airquality_file": str(aq_raw_file.name),
        "airquality_sha256": aq_sha256,
        "airquality_bytes": len(aq_bytes)
    }
    return meta


def main():
    stations = load_stations()
    if not stations:
        logger.error("No stations available. Aborting.")
        sys.exit(1)

    # For Phase 4 baseline, select 5 representative stations across Delhi NCR zones:
    # 1. Anand Vihar (DL001) - East Delhi / High Traffic & Stubble sink
    # 2. Punjabi Bagh (DL002) - West Delhi / Mixed Commercial-Residential
    # 3. R.K. Puram (DL003) - South Delhi / Dense Residential
    # 4. IGI Airport (DL005) - Southwest Delhi / Regional Background & Aviation
    # 5. Bawana (DL006) - Northwest Delhi / Industrial & Inflow gateway from Punjab/Haryana
    target_stn_codes = [
        "DL_ANAND_VIHAR",
        "DL_PUNJABI_BAGH",
        "DL_RK_PURAM",
        "DL_IGI_AIRPORT",
        "DL_BAWANA"
    ]
    selected_stations = [s for s in stations if s.get("station_code") in target_stn_codes]

    logger.info(f"Starting historical data acquisition for {len(selected_stations)} key Delhi NCR stations...")
    manifest = {
        "dataset_name": "VayuDrishti-DelhiNCR-Winter2023-2024",
        "version": "1.0.0",
        "created_at_utc": datetime.now(timezone.utc).isoformat(),
        "date_range": {"start": "2023-10-01", "end": "2024-02-29"},
        "cadence": "hourly (1h)",
        "sources": [
            "Open-Meteo Historical Weather Archive (ECMWF ERA5 / ICON blend)",
            "Copernicus CAMS Global Atmospheric Composition Forecasts & EAC4"
        ],
        "stations": []
    }

    for stn in selected_stations:
        stn_code = stn.get("station_code")
        try:
            stn_meta = acquire_station_data(stn, start_date="2023-10-01", end_date="2024-02-29")
            manifest["stations"].append(stn_meta)
            time.sleep(1)  # Respect rate limit
        except Exception as e:
            logger.error(f"Failed to acquire data for {stn_code}: {e}")

    manifest_file = METADATA_DIR / "historical_manifest.json"
    with open(manifest_file, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2)
    logger.info(f"Historical acquisition complete. Manifest saved to {manifest_file}")


if __name__ == "__main__":
    main()
