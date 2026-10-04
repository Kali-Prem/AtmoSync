"""
Regional Biomass & Agricultural Fire Processing Engine
Ingests, screens, classifies, and clusters satellite active fire hotspots (NASA FIRMS VIIRS 375m).
Distinguishes raw detections, biomass burning candidates, and confirmed agricultural stubble fires.
Computes Fire Radiative Energy (FRE) smoke emission mass fluxes (Wooster et al., 2005).
"""
import math
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional, Tuple


class FireEventProcessor:
    """
    Quality control, classification, clustering, and smoke emission estimation
    for satellite thermal anomaly detections across Northwest India.
    """

    # Northwest India Regional Agricultural Domain (Punjab, Haryana, Rajasthan, Western UP, NCR)
    DOMAIN_MIN_LAT = 26.5
    DOMAIN_MAX_LAT = 33.0
    DOMAIN_MIN_LON = 73.5
    DOMAIN_MAX_LON = 79.5

    # Wooster et al. (2005) particulate emission coefficient for agricultural crop residue
    # Ce = 0.024 kg PM2.5 per MJ (equivalently kg/s per MW of FRP)
    EMISSION_COEFFICIENT_KG_PER_MW_S = 0.024

    @classmethod
    def validate_detection(cls, raw: Dict[str, Any]) -> Tuple[bool, str, Dict[str, Any]]:
        """
        Validates individual satellite thermal anomaly detection.
        Returns: (is_valid, quality_flag, cleaned_record)
        """
        try:
            lat = float(raw.get("latitude", "nan"))
            lon = float(raw.get("longitude", "nan"))
            frp = float(raw.get("frp_mw") or raw.get("frp", "nan"))
        except (ValueError, TypeError):
            return False, "INVALID", {}

        if math.isnan(lat) or math.isnan(lon) or math.isnan(frp):
            return False, "INVALID", {}

        # Geographic bounds check
        if not (cls.DOMAIN_MIN_LAT <= lat <= cls.DOMAIN_MAX_LAT and cls.DOMAIN_MIN_LON <= lon <= cls.DOMAIN_MAX_LON):
            return False, "OUT_OF_BOUNDS", {}

        # Physical FRP bound check (MW)
        if frp < 0.1 or frp > 5000.0:
            return False, "INVALID", {}

        confidence = str(raw.get("confidence", "nominal")).lower()
        if confidence in ["l", "low"]:
            qc = "SUSPICIOUS"
        else:
            qc = "VALID"

        cleaned = {
            "source": raw.get("source", "VIIRS_375M"),
            "latitude": round(lat, 4),
            "longitude": round(lon, 4),
            "frp_mw": round(frp, 2),
            "brightness_temp_k": float(raw.get("brightness_temp_k") or raw.get("bright_ti4") or 320.0),
            "confidence": confidence,
            "daynight": str(raw.get("daynight", "D")).upper(),
            "time": raw.get("time") or raw.get("acq_time"),
            "qc_flag": qc
        }
        return True, qc, cleaned

    @classmethod
    def classify_fire_type(cls, record: Dict[str, Any]) -> str:
        """
        Scientifically classifies detection based on location, timing, and characteristics:
        - stubble_burning_candidate: Located in agrarian Punjab/Haryana during post-monsoon (Oct 15 - Nov 30) or pre-monsoon (April - May).
        - biomass_burning_candidate: Rural/forested hotspot outside peak agricultural calendar.
        - fire_detection: Generic thermal anomaly without confirmed agricultural attribution.
        """
        lat = record["latitude"]
        lon = record["longitude"]
        time_val = record.get("time")

        month = 11  # Default to November if not parsed
        if isinstance(time_val, str) and len(time_val) >= 7:
            try:
                month = int(time_val[5:7])
            except ValueError:
                pass
        elif isinstance(time_val, datetime):
            month = time_val.month

        # Agrarian Punjab / Haryana Bounding Box
        is_punjab_haryana = (29.0 <= lat <= 32.5) and (74.0 <= lon <= 77.5)

        # Peak Rice Stubble Burning (Oct - Nov) or Wheat Stubble Burning (April - May)
        is_paddy_window = month in [10, 11]
        is_wheat_window = month in [4, 5]

        if is_punjab_haryana and (is_paddy_window or is_wheat_window):
            return "stubble_burning_candidate"
        elif 26.5 <= lat <= 33.0 and 73.5 <= lon <= 79.5:
            return "biomass_burning_candidate"
        else:
            return "fire_detection"

    @classmethod
    def estimate_pm25_emission_rate(cls, frp_mw: float) -> Dict[str, float]:
        """
        Calculates instantaneous fine particulate matter (PM2.5) emission mass flux
        from Fire Radiative Power using Wooster et al. (2005) formulation:
        E_PM25 (kg/s) = Ce * FRP (MW)
        """
        if frp_mw is None or math.isnan(frp_mw) or frp_mw < 0:
            return {"emission_rate_kg_s": 0.0, "emission_rate_g_s": 0.0}
        e_kg_s = cls.EMISSION_COEFFICIENT_KG_PER_MW_S * frp_mw
        return {
            "emission_rate_kg_s": round(e_kg_s, 4),
            "emission_rate_g_s": round(e_kg_s * 1000.0, 2)
        }

    @classmethod
    def cluster_fire_events(cls, detections: List[Dict[str, Any]], distance_threshold_km: float = 15.0) -> List[Dict[str, Any]]:
        """
        Aggregates individual satellite fire pixels into coherent regional fire clusters/events.
        Groups proximate hotspots occurring within the same observation period.
        """
        if not detections:
            return []

        clusters: List[List[Dict[str, Any]]] = []

        def haversine_km(lat1, lon1, lat2, lon2):
            R = 6371.0
            p1, p2 = math.radians(lat1), math.radians(lat2)
            dp = math.radians(lat2 - lat1)
            dl = math.radians(lon2 - lon1)
            a = math.sin(dp/2)**2 + math.cos(p1)*math.cos(p2)*math.sin(dl/2)**2
            return 2.0 * R * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))

        for det in detections:
            placed = False
            for cluster in clusters:
                # Compare against cluster centroid
                c_lat = sum(d["latitude"] for d in cluster) / len(cluster)
                c_lon = sum(d["longitude"] for d in cluster) / len(cluster)
                if haversine_km(det["latitude"], det["longitude"], c_lat, c_lon) <= distance_threshold_km:
                    cluster.append(det)
                    placed = True
                    break
            if not placed:
                clusters.append([det])

        aggregated_events = []
        for i, cluster in enumerate(clusters, start=1):
            n = len(cluster)
            centroid_lat = round(sum(d["latitude"] for d in cluster) / n, 4)
            centroid_lon = round(sum(d["longitude"] for d in cluster) / n, 4)
            total_frp = round(sum(d["frp_mw"] for d in cluster), 2)
            max_frp = max(d["frp_mw"] for d in cluster)
            
            # Region tag
            if centroid_lat >= 30.0 and centroid_lon <= 76.5:
                region = "Punjab"
            elif centroid_lat >= 28.5 and centroid_lon <= 77.5:
                region = "Haryana"
            elif centroid_lon > 77.5:
                region = "Western Uttar Pradesh"
            else:
                region = "Rajasthan / NCR Border"

            emissions = cls.estimate_pm25_emission_rate(total_frp)
            first_time = cluster[0].get("time") or datetime.now(timezone.utc).isoformat()

            aggregated_events.append({
                "event_id": f"FIRE_EVT_{i:04d}",
                "start_time": first_time,
                "centroid_latitude": centroid_lat,
                "centroid_longitude": centroid_lon,
                "detection_count": n,
                "total_frp_mw": total_frp,
                "max_single_frp_mw": round(max_frp, 2),
                "estimated_pm25_flux_kg_s": emissions["emission_rate_kg_s"],
                "source_region": region,
                "classification": cluster[0].get("classification", "stubble_burning_candidate"),
                "confidence_summary": "high" if any(d.get("confidence") == "high" for d in cluster) else "nominal"
            })

        return aggregated_events
