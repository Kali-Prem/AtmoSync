"""
Physical bounds, geographic extents, and quality control rules.
"""
from typing import Dict, Any, Tuple

# Domain Boundaries (WGS84 EPSG:4326)
DELHI_NCR_BOUNDS = {
    "min_lat": 27.0,
    "max_lat": 32.5,
    "min_lon": 74.0,
    "max_lon": 79.5
}

DELHI_NCT_BOUNDS = {
    "min_lat": 28.40,
    "max_lat": 28.90,
    "min_lon": 76.80,
    "max_lon": 77.40
}

# Physical Plausibility Ranges
PHYSICAL_BOUNDS: Dict[str, Tuple[float, float]] = {
    "pm25": (0.0, 1500.0),       # ug/m3
    "pm10": (0.0, 2500.0),       # ug/m3
    "no2": (0.0, 1000.0),        # ug/m3
    "o3": (0.0, 800.0),          # ug/m3
    "so2": (0.0, 2000.0),        # ug/m3
    "co": (0.0, 60.0),           # mg/m3
    "nh3": (0.0, 2000.0),        # ug/m3
    "temperature_2m": (-5.0, 55.0), # °C
    "relative_humidity_2m": (0.0, 100.0), # %
    "surface_pressure_hpa": (850.0, 1080.0), # hPa
    "wind_speed_10m": (0.0, 60.0), # m/s
    "wind_direction_10m": (0.0, 360.0), # degrees
    "boundary_layer_height_m": (20.0, 4500.0), # m AGL
    "frp_mw": (0.1, 5000.0),     # Megawatts
}

# Quality Control Flags
QC_VALID = 0
QC_IMPUTED = 1
QC_SUSPICIOUS = 2
QC_REJECTED = 3
