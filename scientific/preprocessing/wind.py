"""
Wind Feature Engineering & Atmospheric Transport Mathematics
Conforms to WMO (World Meteorological Organization) No. 8 standards.
Provides exact mathematical transformations between meteorological compass
directions, Cartesian velocity components (u, v), and forward transport bearings.
"""
import math
from typing import Dict, Any, Tuple, Optional


class WindDiagnostics:
    """
    Standardized atmospheric wind coordinate transformations and transport vectors.
    """

    @staticmethod
    def met_to_uv(speed_ms: float, direction_deg: float) -> Tuple[float, float]:
        """
        Converts meteorological wind speed (m/s) and direction (degrees from North)
        into Cartesian velocity components (u, v):
        - u: Zonal velocity (positive Eastward, m/s)
        - v: Meridional velocity (positive Northward, m/s)
        
        WMO convention: Meteorological direction indicates where the wind is blowing FROM.
        Formula:
          u = -speed * sin(deg2rad(direction))
          v = -speed * cos(deg2rad(direction))
        """
        if speed_ms is None or direction_deg is None:
            return float('nan'), float('nan')
        try:
            s = float(speed_ms)
            d = float(direction_deg) % 360.0
            if math.isnan(s) or math.isnan(d) or s < 0:
                return float('nan'), float('nan')
            
            rad = math.radians(d)
            u = -s * math.sin(rad)
            v = -s * math.cos(rad)
            return round(u, 3), round(v, 3)
        except (ValueError, TypeError):
            return float('nan'), float('nan')

    @staticmethod
    def uv_to_met(u_ms: float, v_ms: float) -> Tuple[float, float]:
        """
        Converts Cartesian velocity components (u, v) back to meteorological
        speed (m/s) and direction (degrees from North, 0 - 360).
        
        Formula:
          speed = sqrt(u^2 + v^2)
          direction = (270 - atan2(v, u) * 180 / pi) % 360
        """
        if u_ms is None or v_ms is None:
            return float('nan'), float('nan')
        try:
            u = float(u_ms)
            v = float(v_ms)
            if math.isnan(u) or math.isnan(v):
                return float('nan'), float('nan')
            
            speed = math.sqrt(u * u + v * v)
            if speed < 1e-6:
                return 0.0, 0.0  # Calm conditions
            
            # Meteorological direction (from where wind blows)
            direction = (270.0 - math.degrees(math.atan2(v, u))) % 360.0
            return round(speed, 3), round(direction, 1)
        except (ValueError, TypeError):
            return float('nan'), float('nan')

    @staticmethod
    def cyclical_decomposition(direction_deg: float) -> Tuple[float, float]:
        """
        Decomposes circular direction into continuous sine and cosine components.
        Prevents artificial discontinuity at 360° / 0° North boundary in ML models.
        """
        if direction_deg is None:
            return float('nan'), float('nan')
        try:
            d = float(direction_deg) % 360.0
            rad = math.radians(d)
            return round(math.sin(rad), 4), round(math.cos(rad), 4)
        except (ValueError, TypeError):
            return float('nan'), float('nan')

    @staticmethod
    def calculate_bearing(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        """
        Calculates initial forward azimuth (compass bearing in degrees, 0 - 360)
        from point 1 (source) to point 2 (target) along a Great Circle.
        """
        phi1 = math.radians(lat1)
        phi2 = math.radians(lat2)
        delta_lambda = math.radians(lon2 - lon1)

        y = math.sin(delta_lambda) * math.cos(phi2)
        x = math.cos(phi1) * math.sin(phi2) - math.sin(phi1) * math.cos(phi2) * math.cos(delta_lambda)
        initial_bearing = math.degrees(math.atan2(y, x))
        return round((initial_bearing + 360.0) % 360.0, 2)

    @staticmethod
    def calculate_distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        """
        Calculates Great-Circle distance in kilometers between two coordinates
        using the Haversine formula (Earth radius R = 6371.0 km).
        """
        R = 6371.0
        phi1 = math.radians(lat1)
        phi2 = math.radians(lat2)
        delta_phi = math.radians(lat2 - lat1)
        delta_lambda = math.radians(lon2 - lon1)

        a = (
            math.sin(delta_phi / 2.0) ** 2
            + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2
        )
        c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
        return round(R * c, 2)

    @classmethod
    def calculate_transport_alignment(
        cls,
        wind_direction_deg: float,
        source_lat: float,
        source_lon: float,
        target_lat: float = 28.6139,
        target_lon: float = 77.2090
    ) -> float:
        """
        Computes the directional alignment (-1.0 to +1.0) between the blowing wind
        and the vector pointing toward the target (default: Delhi NCR center).
        
        - Wind direction is where wind is blowing FROM.
        - Therefore, wind blows TOWARDS (wind_direction + 180) % 360.
        - Alignment = cos(wind_blows_towards - bearing_to_target).
        
        Interpretation:
        - +1.0: Wind is blowing directly toward Delhi NCR (maximum advection risk).
        -  0.0: Wind is cross-gradient / perpendicular to transport corridor.
        - -1.0: Wind is blowing directly away from Delhi NCR (zero transport risk).
        """
        if wind_direction_deg is None:
            return float('nan')
        try:
            wind_from = float(wind_direction_deg) % 360.0
            wind_to = (wind_from + 180.0) % 360.0
            bearing_to_target = cls.calculate_bearing(source_lat, source_lon, target_lat, target_lon)
            
            angle_diff = math.radians(wind_to - bearing_to_target)
            return round(math.cos(angle_diff), 3)
        except (ValueError, TypeError):
            return float('nan')
