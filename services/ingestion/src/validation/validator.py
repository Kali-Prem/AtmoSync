"""
Reusable Data Quality & Validation Engine for ATMOSYNC
"""
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional, Tuple
from services.ingestion.src.validation.rules import (
    PHYSICAL_BOUNDS, DELHI_NCR_BOUNDS, QC_VALID, QC_SUSPICIOUS, QC_REJECTED
)

class ValidationResult:
    def __init__(self, is_valid: bool, record: Dict[str, Any], qc_flag: int = QC_VALID, warnings: Optional[List[str]] = None, errors: Optional[List[str]] = None):
        self.is_valid = is_valid
        self.record = record
        self.qc_flag = qc_flag
        self.warnings = warnings or []
        self.errors = errors or []

    def to_dict(self) -> Dict[str, Any]:
        return {
            "is_valid": self.is_valid,
            "qc_flag": self.qc_flag,
            "warnings": self.warnings,
            "errors": self.errors,
            "record": self.record
        }


class DataValidator:
    """Validates raw incoming data records against scientific and physical constraints."""

    @staticmethod
    def validate_timestamp(ts: Any) -> Tuple[bool, Optional[datetime], Optional[str]]:
        """Ensures timestamp is parseable UTC datetime and not absurdly in past/future."""
        if isinstance(ts, str):
            try:
                # Handle ISO formats
                cleaned = ts.replace("Z", "+00:00")
                parsed = datetime.fromisoformat(cleaned)
            except Exception as e:
                return False, None, f"Failed to parse timestamp string '{ts}': {str(e)}"
        elif isinstance(ts, datetime):
            parsed = ts
        else:
            return False, None, f"Unsupported timestamp type: {type(ts)}"

        if parsed.tzinfo is None:
            parsed = parsed.replace(tzinfo=timezone.utc)

        # Sanity check: must be between year 2000 and now + 10 days (for forecasts)
        now = datetime.now(timezone.utc)
        if parsed.year < 2000:
            return False, None, f"Timestamp {parsed} is too far in the past (<2000)"
        if (parsed - now).total_seconds() > 14 * 86400: # max 14 days in future
            return False, None, f"Timestamp {parsed} is unrealistically far in future (>14 days)"

        return True, parsed, None

    @staticmethod
    def validate_coordinates(lat: float, lon: float, bounding_box: Optional[Dict[str, float]] = None) -> Tuple[bool, Optional[str]]:
        """Checks if latitude and longitude are within domain."""
        bbox = bounding_box or DELHI_NCR_BOUNDS
        if not (-90.0 <= lat <= 90.0 and -180.0 <= lon <= 180.0):
            return False, f"Coordinates ({lat}, {lon}) out of spherical bounds"
        if not (bbox["min_lat"] <= lat <= bbox["max_lat"] and bbox["min_lon"] <= lon <= bbox["max_lon"]):
            return False, f"Coordinates ({lat}, {lon}) outside domain [{bbox['min_lat']},{bbox['max_lat']}, {bbox['min_lon']},{bbox['max_lon']}]"
        return True, None

    @classmethod
    def validate_air_quality_record(cls, record: Dict[str, Any]) -> ValidationResult:
        """Validates a single air quality observation record."""
        errors: List[str] = []
        warnings: List[str] = []
        qc_flag = QC_VALID
        sanitized = dict(record)

        # 1. Timestamp validation
        if "time" not in record:
            return ValidationResult(False, record, QC_REJECTED, errors=["Missing 'time' field"])
        valid_ts, parsed_time, err = cls.validate_timestamp(record["time"])
        if not valid_ts:
            return ValidationResult(False, record, QC_REJECTED, errors=[err or "Invalid timestamp"])
        sanitized["time"] = parsed_time

        # 2. Check pollutant variables
        pollutants = ["pm25", "pm10", "no2", "o3", "so2", "co", "nh3"]
        non_null_count = 0

        for p in pollutants:
            val = record.get(p)
            if val is not None:
                try:
                    f_val = float(val)
                    low, high = PHYSICAL_BOUNDS[p]
                    if f_val < low or f_val > high:
                        warnings.append(f"Pollutant '{p}' value {f_val} out of physical bounds [{low}, {high}]. Nullified.")
                        sanitized[p] = None
                        qc_flag = QC_SUSPICIOUS
                    else:
                        sanitized[p] = f_val
                        non_null_count += 1
                except (ValueError, TypeError):
                    warnings.append(f"Pollutant '{p}' value '{val}' could not be converted to float.")
                    sanitized[p] = None

        if non_null_count == 0:
            return ValidationResult(False, sanitized, QC_REJECTED, errors=["Record contains zero valid pollutant readings"])

        # 3. Check Particulate Hierarchy: PM2.5 <= PM10 (allowing 5% measurement tolerance)
        pm25 = sanitized.get("pm25")
        pm10 = sanitized.get("pm10")
        if pm25 is not None and pm10 is not None:
            if pm25 > pm10 * 1.05:
                warnings.append(f"Incoherent particulate ratio: PM2.5 ({pm25}) > PM10 ({pm10})")
                qc_flag = QC_SUSPICIOUS

        sanitized["qc_flag"] = qc_flag
        return ValidationResult(True, sanitized, qc_flag, warnings=warnings)

    @classmethod
    def validate_weather_record(cls, record: Dict[str, Any]) -> ValidationResult:
        """Validates a single meteorological observation / forecast record."""
        errors: List[str] = []
        warnings: List[str] = []
        qc_flag = QC_VALID
        sanitized = dict(record)

        # 1. Timestamp
        if "time" not in record:
            return ValidationResult(False, record, QC_REJECTED, errors=["Missing 'time' field"])
        valid_ts, parsed_time, err = cls.validate_timestamp(record["time"])
        if not valid_ts:
            return ValidationResult(False, record, QC_REJECTED, errors=[err or "Invalid timestamp"])
        sanitized["time"] = parsed_time

        # 2. Check coordinates if present
        if "latitude" in record and "longitude" in record:
            valid_geo, geo_err = cls.validate_coordinates(float(record["latitude"]), float(record["longitude"]))
            if not valid_geo:
                warnings.append(geo_err or "Coordinates outside modeling domain")
                qc_flag = QC_SUSPICIOUS

        # 3. Numeric bounds
        met_vars = [
            ("temperature_2m", PHYSICAL_BOUNDS["temperature_2m"]),
            ("relative_humidity_2m", PHYSICAL_BOUNDS["relative_humidity_2m"]),
            ("surface_pressure_hpa", PHYSICAL_BOUNDS["surface_pressure_hpa"]),
            ("wind_speed_10m", PHYSICAL_BOUNDS["wind_speed_10m"]),
            ("wind_direction_10m", PHYSICAL_BOUNDS["wind_direction_10m"]),
            ("boundary_layer_height_m", PHYSICAL_BOUNDS["boundary_layer_height_m"]),
        ]

        for var_name, (low, high) in met_vars:
            val = record.get(var_name)
            if val is not None:
                try:
                    f_val = float(val)
                    if f_val < low or f_val > high:
                        warnings.append(f"Met var '{var_name}' value {f_val} out of bounds [{low}, {high}].")
                        sanitized[var_name] = max(low, min(high, f_val)) # Clip or nullify
                        qc_flag = QC_SUSPICIOUS
                    else:
                        sanitized[var_name] = f_val
                except (ValueError, TypeError):
                    sanitized[var_name] = None

        sanitized["qc_flag"] = qc_flag
        return ValidationResult(True, sanitized, qc_flag, warnings=warnings)

    @classmethod
    def validate_fire_event(cls, record: Dict[str, Any]) -> ValidationResult:
        """Validates a satellite active fire record from NASA FIRMS."""
        errors: List[str] = []
        warnings: List[str] = []
        qc_flag = QC_VALID
        sanitized = dict(record)

        # 1. Coordinates
        lat = record.get("latitude")
        lon = record.get("longitude")
        if lat is None or lon is None:
            return ValidationResult(False, record, QC_REJECTED, errors=["Missing latitude/longitude"])

        valid_geo, geo_err = cls.validate_coordinates(float(lat), float(lon))
        if not valid_geo:
            return ValidationResult(False, record, QC_REJECTED, errors=[geo_err or "Fire point out of domain"])

        # 2. FRP Validation
        frp = record.get("frp_mw")
        if frp is None or float(frp) <= 0.0:
            return ValidationResult(False, record, QC_REJECTED, errors=["Invalid or zero Fire Radiative Power (FRP)"])

        f_frp = float(frp)
        low, high = PHYSICAL_BOUNDS["frp_mw"]
        if f_frp > high:
            warnings.append(f"FRP value {f_frp} MW exceeds realistic threshold ({high} MW)")
            qc_flag = QC_SUSPICIOUS

        sanitized["latitude"] = float(lat)
        sanitized["longitude"] = float(lon)
        sanitized["frp_mw"] = f_frp
        return ValidationResult(True, sanitized, qc_flag, warnings=warnings)
