"""
Data Normalization Module for ATMOSYNC
Maps heterogeneous external formats to standard internal scientific units and schemas.
"""
from datetime import datetime, timezone
from typing import Dict, Any, Optional

class DataNormalizer:
    """Normalizes raw input units, timestamps, and coordinates to canonical system formats."""

    @staticmethod
    def normalize_timestamp(dt: Any) -> datetime:
        """Converts any date/timestamp into a UTC-aware datetime."""
        if isinstance(dt, str):
            dt = dt.replace("Z", "+00:00")
            parsed = datetime.fromisoformat(dt)
        elif isinstance(dt, datetime):
            parsed = dt
        else:
            raise ValueError(f"Cannot normalize timestamp of type {type(dt)}")

        if parsed.tzinfo is None:
            return parsed.replace(tzinfo=timezone.utc)
        return parsed.astimezone(timezone.utc)

    @staticmethod
    def normalize_coordinates(lat: float, lon: float, precision: int = 4) -> tuple[float, float]:
        """Rounds coordinates to standard precision (4 decimal places gives ~11m resolution)."""
        return round(float(lat), precision), round(float(lon), precision)

    @staticmethod
    def convert_gas_concentration(value: Optional[float], pollutant: str, input_unit: str = "ug/m3") -> Optional[float]:
        """
        Converts trace gas concentrations to canonical units:
        - CO in mg/m3
        - NO2, O3, SO2, NH3 in ug/m3
        Conversion factors at standard temperature and pressure (25°C, 1013.25 hPa).
        """
        if value is None:
            return None

        val = float(value)
        unit = input_unit.lower().strip()
        p = pollutant.lower().strip()

        if p == "co":
            # Target is mg/m3
            if unit in ["ppm", "parts per million"]:
                return round(val * 1.145, 3)
            elif unit in ["ug/m3", "µg/m3"]:
                return round(val / 1000.0, 3)
            elif unit in ["mg/m3", "mg/m³"]:
                return round(val, 3)
        elif p == "no2":
            # Target is ug/m3
            if unit in ["ppb", "parts per billion"]:
                return round(val * 1.88, 2)
            elif unit in ["ppm"]:
                return round(val * 1880.0, 2)
            elif unit in ["ug/m3", "µg/m3"]:
                return round(val, 2)
        elif p == "o3":
            # Target is ug/m3
            if unit in ["ppb"]:
                return round(val * 1.96, 2)
            elif unit in ["ppm"]:
                return round(val * 1960.0, 2)
            elif unit in ["ug/m3", "µg/m3"]:
                return round(val, 2)
        elif p == "so2":
            # Target is ug/m3
            if unit in ["ppb"]:
                return round(val * 2.62, 2)
            elif unit in ["ppm"]:
                return round(val * 2620.0, 2)
            elif unit in ["ug/m3", "µg/m3"]:
                return round(val, 2)

        return round(val, 2)

    @staticmethod
    def convert_temperature(val: Optional[float], unit: str = "celsius") -> Optional[float]:
        """Normalizes temperature to Celsius (°C)."""
        if val is None:
            return None
        u = unit.lower().strip()
        if u in ["k", "kelvin"]:
            return round(val - 273.15, 2)
        elif u in ["f", "fahrenheit"]:
            return round((val - 32.0) * 5.0 / 9.0, 2)
        return round(val, 2)

    @staticmethod
    def convert_wind_speed(val: Optional[float], unit: str = "m/s") -> Optional[float]:
        """Normalizes wind speed to m/s."""
        if val is None:
            return None
        u = unit.lower().strip()
        if u in ["km/h", "kph"]:
            return round(val / 3.6, 2)
        elif u in ["knots", "knot"]:
            return round(val * 0.514444, 2)
        return round(val, 2)
