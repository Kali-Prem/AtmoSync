"""
Atmospheric Inversion & Boundary Layer Stability Diagnostics
Conforms to WMO and AMS (American Meteorological Society) boundary layer standards.
Computes low-level environmental lapse rates, multi-layer vertical temperature
gradient classification, Inversion Trapping Severity Index (ITSI), and Ventilation Index.
"""
import math
from typing import Dict, Any, Tuple, Optional, List


class InversionDiagnostics:
    """
    Computes atmospheric vertical temperature gradients, stability categories,
    inversion boundaries, and pollutant trapping indicators.
    """

    @staticmethod
    def compute_low_level_lapse_rate(t2m: Optional[float], t180m: Optional[float], dz_m: float = 178.0) -> float:
        """
        Calculates near-surface environmental temperature lapse rate:
        Gamma_low = ((T_upper - T_2m) / dz) * 100  (°C / 100m)
        Positive values indicate an atmospheric thermal inversion (temperature increasing with height).
        Standard dry adiabatic lapse rate is -0.98 °C / 100m.
        """
        if t2m is None or t180m is None:
            return float('nan')
        try:
            val_t2 = float(t2m)
            val_tupper = float(t180m)
            if math.isnan(val_t2) or math.isnan(val_tupper) or dz_m <= 0:
                return float('nan')
            delta_t = val_tupper - val_t2
            return round((delta_t / dz_m) * 100.0, 3)
        except (ValueError, TypeError):
            return float('nan')

    @classmethod
    def analyze_vertical_profile(
        cls,
        t2m: Optional[float],
        t80m: Optional[float] = None,
        t120m: Optional[float] = None,
        t180m: Optional[float] = None
    ) -> Dict[str, Any]:
        """
        Analyzes multi-level vertical temperature profile to identify inversion existence,
        vertical structure (surface-based vs. elevated), and base/top boundaries.
        
        Profile levels: 2m, 80m, 120m, 180m above ground level (AGL).
        """
        if t2m is None or math.isnan(t2m):
            return {
                "inversion_present": False,
                "inversion_class": "UNAVAILABLE",
                "inversion_strength": float('nan'),
                "inversion_base_height_m": None,
                "inversion_top_height_m": None,
                "inversion_detection_method": "unavailable",
                "inversion_quality_flag": "MISSING",
                "lapse_rate_c_100m": float('nan'),
                "temperature_difference_c": float('nan')
            }

        # Gather available levels
        levels = [(2.0, t2m)]
        if t80m is not None and not math.isnan(t80m):
            levels.append((80.0, t80m))
        if t120m is not None and not math.isnan(t120m):
            levels.append((120.0, t120m))
        if t180m is not None and not math.isnan(t180m):
            levels.append((180.0, t180m))

        if len(levels) < 2:
            return {
                "inversion_present": False,
                "inversion_class": "UNAVAILABLE",
                "inversion_strength": float('nan'),
                "inversion_base_height_m": None,
                "inversion_top_height_m": None,
                "inversion_detection_method": "unavailable",
                "inversion_quality_flag": "MISSING",
                "lapse_rate_c_100m": float('nan'),
                "temperature_difference_c": float('nan')
            }

        # Compute layer gradients
        gradients = []
        for i in range(len(levels) - 1):
            z1, t1 = levels[i]
            z2, t2 = levels[i + 1]
            dz = z2 - z1
            grad = ((t2 - t1) / dz) * 100.0  # °C / 100m
            gradients.append({
                "base_z": z1,
                "top_z": z2,
                "t_base": t1,
                "t_top": t2,
                "gradient": grad,
                "is_inversion": grad > 0.0
            })

        # Overall bulk gradient across maximum available depth
        z_min, t_min = levels[0]
        z_max, t_max = levels[-1]
        bulk_lapse = round(((t_max - t_min) / (z_max - z_min)) * 100.0, 3)
        temp_diff = round(t_max - t_min, 2)

        # Detect classification
        first_layer_inversion = gradients[0]["is_inversion"]
        any_inversion = any(g["is_inversion"] for g in gradients)

        if first_layer_inversion:
            inversion_class = "SURFACE_BASED_INVERSION"
            base_h = 0.0
            # Find top where gradient ceases to be positive
            top_h = z_max
            for g in gradients:
                if not g["is_inversion"]:
                    top_h = g["base_z"]
                    break
        elif any_inversion:
            inversion_class = "ELEVATED_INVERSION"
            # Base of first inverted layer aloft
            first_inv = next(g for g in gradients if g["is_inversion"])
            base_h = first_inv["base_z"]
            top_h = first_inv["top_z"]
        elif bulk_lapse > -0.65:
            # Lapse rate is negative (cooling with height) but less steep than standard 0.65°C/100m
            inversion_class = "STABLE_LAYER"
            base_h = None
            top_h = None
        else:
            inversion_class = "NEUTRAL_UNSTABLE"
            base_h = None
            top_h = None

        return {
            "inversion_present": any_inversion,
            "inversion_class": inversion_class,
            "inversion_strength": max(0.0, bulk_lapse),  # Positive strength only
            "inversion_base_height_m": base_h,
            "inversion_top_height_m": top_h,
            "inversion_detection_method": "vertical_temperature_profile",
            "inversion_quality_flag": "VALID",
            "lapse_rate_c_100m": bulk_lapse,
            "temperature_difference_c": temp_diff
        }

    @staticmethod
    def classify_inversion(lapse_rate: Optional[float]) -> str:
        """Classifies inversion strength based on near-surface lapse rate."""
        if lapse_rate is None or math.isnan(lapse_rate):
            return "UNKNOWN"
        if lapse_rate <= 0.0:
            return "NO_INVERSION"
        elif lapse_rate <= 1.0:
            return "WEAK_INVERSION"
        elif lapse_rate <= 2.5:
            return "MODERATE_INVERSION"
        else:
            return "SEVERE_INVERSION"

    @classmethod
    def compute_trapping_severity_index(
        cls,
        lapse_rate: Optional[float],
        pblh_m: Optional[float],
        wind_speed_10m: Optional[float]
    ) -> float:
        """
        Computes the Inversion Trapping Severity Index (ITSI: 0 - 100).
        Scientifically calibrated index combining:
        1. Thermal lapse rate factor (45% weight): Lapse rate >= 3.0 °C/100m indicates severe inversion.
        2. PBL contraction factor (35% weight): PBLH <= 50m indicates total nocturnal compression.
        3. Calm wind stagnation factor (20% weight): Wind speed <= 0.5 m/s eliminates mechanical shear.
        """
        active_weights = 0.0
        weighted_sum = 0.0

        if lapse_rate is not None and not math.isnan(lapse_rate):
            f_gamma = max(0.0, min(1.0, float(lapse_rate) / 3.0))
            weighted_sum += 0.45 * f_gamma
            active_weights += 0.45

        if pblh_m is not None and not math.isnan(pblh_m):
            f_pbl = max(0.0, min(1.0, (800.0 - float(pblh_m)) / (800.0 - 50.0)))
            weighted_sum += 0.35 * f_pbl
            active_weights += 0.35

        if wind_speed_10m is not None and not math.isnan(wind_speed_10m):
            f_wind = max(0.0, min(1.0, (4.0 - float(wind_speed_10m)) / (4.0 - 0.5)))
            weighted_sum += 0.20 * f_wind
            active_weights += 0.20

        if active_weights == 0.0:
            return float('nan')

        normalized_score = 100.0 * (weighted_sum / active_weights)
        return round(max(0.0, min(100.0, normalized_score)), 1)

    @staticmethod
    def compute_ventilation_index(pblh_m: Optional[float], wind_speed_10m: Optional[float]) -> float:
        """
        Computes Ventilation Index (m2/s):
        VI = PBLH * U_mean
        Standard Indian Met Department (IMD) ventilation thresholds:
        - VI < 2,000 m2/s: Critical Stagnation / Poor Dispersion
        - 2,000 <= VI <= 6,000 m2/s: Moderate Ventilation
        - VI > 6,000 m2/s: Good Ventilation / High Dispersion
        """
        if pblh_m is None or wind_speed_10m is None:
            return float('nan')
        try:
            val_pbl = float(pblh_m)
            val_ws = float(wind_speed_10m)
            if math.isnan(val_pbl) or math.isnan(val_ws):
                return float('nan')
            u_mean = max(0.5, 1.2 * val_ws)
            return round(val_pbl * u_mean, 1)
        except (ValueError, TypeError):
            return float('nan')

    @classmethod
    def compute_stagnation_indicator(
        cls,
        pblh_m: Optional[float],
        wind_speed_10m: Optional[float],
        lapse_rate: Optional[float]
    ) -> float:
        """
        Computes continuous atmospheric stagnation indicator (0.0 to 1.0).
        Combines low boundary layer, low wind, and thermal stability.
        1.0 = Complete stagnant trap; 0.0 = High dispersion / deep convective cleansing.
        """
        tsi = cls.compute_trapping_severity_index(lapse_rate, pblh_m, wind_speed_10m)
        if math.isnan(tsi):
            return float('nan')
        return round(tsi / 100.0, 3)
