"""
Planetary Boundary Layer (PBL) Pipeline & Volume Dynamics
Processes model-diagnosed boundary layer heights from numerical weather prediction
(ECMWF ERA5 / GFS bulk Richardson method).
Computes boundary layer volume contraction ratios, ventilation coefficients,
and flags sensor/model boundary layer anomalies.
"""
import math
from typing import Dict, Any, Optional, Tuple


class PBLDiagnostics:
    """
    Quality control, volume contraction, and ventilation calculations for PBL height.
    """

    MIN_PHYSICAL_PBL_M = 20.0
    MAX_PHYSICAL_PBL_M = 5000.0
    DAYTIME_REFERENCE_PBL_M = 1500.0  # Standard well-mixed convective boundary layer reference

    @classmethod
    def validate_pbl_height(cls, pblh_raw: Optional[float]) -> Tuple[Optional[float], str]:
        """
        Validates raw PBL height against physical bounds.
        Returns: (normalized_pbl_m, quality_flag)
        - VALID: 20m <= pblh <= 5000m
        - INVALID: pblh < 0m or pblh > 5000m
        - SUSPICIOUS: 0m <= pblh < 20m (sub-canopy anomaly)
        - MISSING: pblh is None or NaN
        """
        if pblh_raw is None:
            return None, "MISSING"
        try:
            val = float(pblh_raw)
            if math.isnan(val):
                return None, "MISSING"
            if val < 0.0 or val > cls.MAX_PHYSICAL_PBL_M:
                return None, "INVALID"
            if val < cls.MIN_PHYSICAL_PBL_M:
                return round(val, 1), "SUSPICIOUS"
            return round(val, 1), "VALID"
        except (ValueError, TypeError):
            return None, "INVALID"

    @classmethod
    def compute_volume_contraction_ratio(cls, pbl_height_m: Optional[float]) -> float:
        """
        Computes atmospheric volume contraction factor relative to standard
        daytime convective reference (1500m):
        Contraction Ratio = 1500.0 / max(20.0, pbl_height_m)
        
        Example: At night with PBLH = 100m, contraction ratio = 15.0x.
        """
        if pbl_height_m is None or math.isnan(pbl_height_m) or pbl_height_m <= 0:
            return float('nan')
        effective_pbl = max(cls.MIN_PHYSICAL_PBL_M, float(pbl_height_m))
        return round(cls.DAYTIME_REFERENCE_PBL_M / effective_pbl, 2)

    @classmethod
    def compute_dispersion_capacity(cls, pbl_height_m: Optional[float], wind_speed_10m: Optional[float]) -> Dict[str, Any]:
        """
        Calculates ventilation coefficient and classifies atmospheric dispersion capacity.
        Standard CPCB / IMD Environmental Classification:
        - Critical Stagnation: VI < 2,000 m2/s
        - Moderate Dispersion: 2,000 <= VI <= 6,000 m2/s
        - High Dispersion: VI > 6,000 m2/s
        """
        if pbl_height_m is None or wind_speed_10m is None:
            return {
                "ventilation_index_m2s": float('nan'),
                "dispersion_category": "UNKNOWN",
                "is_stagnant": False
            }
        try:
            pbl = float(pbl_height_m)
            ws = float(wind_speed_10m)
            if math.isnan(pbl) or math.isnan(ws):
                return {
                    "ventilation_index_m2s": float('nan'),
                    "dispersion_category": "UNKNOWN",
                    "is_stagnant": False
                }
            vi = pbl * max(0.5, 1.2 * ws)
            if vi < 2000.0:
                cat = "CRITICAL_STAGNATION"
            elif vi <= 6000.0:
                cat = "MODERATE_DISPERSION"
            else:
                cat = "HIGH_DISPERSION"

            return {
                "ventilation_index_m2s": round(vi, 1),
                "dispersion_category": cat,
                "is_stagnant": vi < 2000.0
            }
        except (ValueError, TypeError):
            return {
                "ventilation_index_m2s": float('nan'),
                "dispersion_category": "UNKNOWN",
                "is_stagnant": False
            }
