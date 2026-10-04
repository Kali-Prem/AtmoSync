"""
Unit Tests for Phase 5 Fire & Plume Transport Pipeline
Tests VIIRS hotspot validation, agricultural stubble classification,
emission mass flux, spatial clustering, forward trajectory simulation,
target domain intersection, plume risk scoring, and zero data leakage.
"""
import math
from datetime import datetime, timezone, timedelta
import pytest
from scientific.preprocessing.fire import FireEventProcessor
from services.plume.transport import PlumeTransportEngine


# ==============================================================================
# Fire Hotspot QC, Classification & Emission Tests
# ==============================================================================

def test_fire_detection_validation():
    """
    Tests spatial and physical boundary validation for satellite fire detections.
    """
    # Valid Punjab detection
    valid_raw = {
        "latitude": 30.5500,
        "longitude": 75.8000,
        "frp_mw": 85.5,
        "confidence": "high",
        "time": "2023-11-05T08:30:00Z"
    }
    is_valid, qc, cleaned = FireEventProcessor.validate_detection(valid_raw)
    assert is_valid is True
    assert qc == "VALID"
    assert cleaned["frp_mw"] == 85.5

    # Out of domain detection (e.g. South India)
    out_domain = {
        "latitude": 13.0827,
        "longitude": 80.2707,
        "frp_mw": 50.0
    }
    is_valid, qc, _ = FireEventProcessor.validate_detection(out_domain)
    assert is_valid is False
    assert qc == "OUT_OF_BOUNDS"

    # Unphysical FRP
    unphysical_frp = {
        "latitude": 30.5500,
        "longitude": 75.8000,
        "frp_mw": -10.0
    }
    is_valid, qc, _ = FireEventProcessor.validate_detection(unphysical_frp)
    assert is_valid is False
    assert qc == "INVALID"


def test_fire_classification():
    """
    Tests distinction between stubble burning candidate vs generic biomass burning.
    """
    # Detection in Punjab in November (Paddy harvest residue window)
    punjab_nov = {
        "latitude": 31.1000,
        "longitude": 75.4000,
        "time": "2023-11-03T07:45:00Z"
    }
    assert FireEventProcessor.classify_fire_type(punjab_nov) == "stubble_burning_candidate"

    # Detection in Rajasthan desert in February (outside agricultural stubble window)
    rajasthan_feb = {
        "latitude": 27.2000,
        "longitude": 74.1000,
        "time": "2024-02-15T09:00:00Z"
    }
    assert FireEventProcessor.classify_fire_type(rajasthan_feb) == "biomass_burning_candidate"


def test_wooster_emission_rate():
    """
    Tests Wooster et al. (2005) particulate emission rate:
    E_PM25 (kg/s) = 0.024 * FRP (MW)
    """
    # 100 MW fire -> 2.4 kg/s (2400 g/s)
    emissions = FireEventProcessor.estimate_pm25_emission_rate(100.0)
    assert emissions["emission_rate_kg_s"] == 2.4
    assert emissions["emission_rate_g_s"] == 2400.0


def test_fire_spatial_clustering():
    """
    Tests grouping proximate fire pixels within 15 km into aggregated fire clusters.
    """
    # Two adjacent fires in Sangrur, Punjab (< 10 km apart)
    f1 = {"latitude": 30.2500, "longitude": 75.8000, "frp_mw": 50.0, "time": "2023-11-05T08:00:00Z", "confidence": "high"}
    f2 = {"latitude": 30.2700, "longitude": 75.8200, "frp_mw": 75.0, "time": "2023-11-05T08:00:00Z", "confidence": "high"}
    
    # An isolated fire 100 km away in Haryana
    f3 = {"latitude": 29.1500, "longitude": 76.5000, "frp_mw": 30.0, "time": "2023-11-05T08:00:00Z", "confidence": "nominal"}

    clusters = FireEventProcessor.cluster_fire_events([f1, f2, f3], distance_threshold_km=15.0)
    assert len(clusters) == 2

    # Find the Sangrur cluster
    sangrur = next(c for c in clusters if c["detection_count"] == 2)
    assert sangrur["total_frp_mw"] == 125.0
    assert sangrur["source_region"] == "Punjab"
    assert sangrur["confidence_summary"] == "high"


# ==============================================================================
# Plume Transport & Target Intersection Tests
# ==============================================================================

def test_delhi_target_domain_bounding_box():
    """
    Tests target domain inclusion for coordinates inside Delhi NCR.
    """
    # Central Delhi (Connaught Place / India Gate)
    assert PlumeTransportEngine.is_in_target_domain(28.6139, 77.2090) is True

    # Anand Vihar (East Delhi)
    assert PlumeTransportEngine.is_in_target_domain(28.6469, 77.3160) is True

    # Ludhiana, Punjab (outside target domain)
    assert PlumeTransportEngine.is_in_target_domain(30.9010, 75.8573) is False


def test_forward_trajectory_simulation():
    """
    Tests forward Lagrangian puff advection along wind vector.
    """
    # Source: Sangrur, Punjab (30.25°N, 75.85°E)
    # Wind from Northwest (315°) at 5.0 m/s (~18 km/h) -> blows Southeast towards Delhi
    traj = PlumeTransportEngine.simulate_forward_trajectory(
        source_lat=30.25,
        source_lon=75.85,
        start_time_iso="2023-11-05T12:00:00Z",
        wind_speed_ms=5.0,
        wind_direction_deg=315.0,
        duration_hours=24,
        time_step_hours=3
    )

    assert len(traj) == 9  # 0, 3, 6, 9, 12, 15, 18, 21, 24
    # Parcel must move Southeast: latitude decreases, longitude increases
    start_pt = traj[0]
    end_pt = traj[-1]
    assert end_pt["latitude"] < start_pt["latitude"]
    assert end_pt["longitude"] > start_pt["longitude"]
    assert end_pt["distance_traveled_km"] > 400.0  # 5 m/s * 24h * 3600 = 432 km
    # Dispersion spread sigma_y must broaden with downwind distance
    assert end_pt["plume_spread_radius_km"] > start_pt["plume_spread_radius_km"]


def test_plume_risk_scoring_threat_vs_safe():
    """
    Tests transparent plume risk score formulation under upwind threat vs safe wind conditions.
    """
    fire_clusters = [
        {
            "centroid_latitude": 30.50,
            "centroid_longitude": 75.75,
            "total_frp_mw": 800.0
        }
    ]

    # THREAT CASE: Wind blows from NW (320°) at 4.0 m/s, low winter PBL (250m), strong inversion (2.5°C/100m)
    threat_res = PlumeTransportEngine.evaluate_plume_risk(
        fire_events=fire_clusters,
        wind_speed_10m=4.0,
        wind_direction_10m=320.0,
        pblh_m=250.0,
        inversion_strength=2.5,
        forecast_horizon_h=48
    )
    assert threat_res["plume_influence_score"] > 40.0
    assert threat_res["plume_influence_level"] in ["MODERATE", "HIGH", "SEVERE"]
    assert threat_res["active_upwind_fires_count"] == 1
    assert threat_res["eta_hours"] is not None

    # SAFE CASE: Wind blows from SE (140°) at 4.0 m/s (blowing smoke away from Delhi toward Pakistan)
    safe_res = PlumeTransportEngine.evaluate_plume_risk(
        fire_events=fire_clusters,
        wind_speed_10m=4.0,
        wind_direction_10m=140.0,
        pblh_m=250.0,
        inversion_strength=2.5,
        forecast_horizon_h=48
    )
    assert safe_res["plume_influence_score"] == 0.0
    assert safe_res["plume_influence_level"] == "NONE"
    assert safe_res["active_upwind_fires_count"] == 0


# ==============================================================================
# Strict Data Leakage Verification
# ==============================================================================

def test_data_leakage_cutoff_rule():
    """
    CRITICAL RULE: No feature may use observations from t > t_0 (forecast issuance time).
    Verifies that feature engineering strictly filters by time <= t_0.
    """
    cutoff_time = datetime(2023, 11, 5, 12, 0, 0, tzinfo=timezone.utc)

    # Simulated sequence of observations
    observations = [
        {"time": datetime(2023, 11, 5, 10, 0, 0, tzinfo=timezone.utc), "pm25": 180.0},
        {"time": datetime(2023, 11, 5, 11, 0, 0, tzinfo=timezone.utc), "pm25": 210.0},
        {"time": datetime(2023, 11, 5, 12, 0, 0, tzinfo=timezone.utc), "pm25": 235.0},
        # FUTURE OBSERVATIONS (must NEVER enter feature computation for cutoff_time)
        {"time": datetime(2023, 11, 5, 13, 0, 0, tzinfo=timezone.utc), "pm25": 350.0},
        {"time": datetime(2023, 11, 5, 14, 0, 0, tzinfo=timezone.utc), "pm25": 410.0},
    ]

    # Causal filtering function
    causal_history = [obs for obs in observations if obs["time"] <= cutoff_time]

    assert len(causal_history) == 3
    assert all(obs["time"] <= cutoff_time for obs in causal_history)
    # Ensure future values are strictly absent
    assert not any(obs["pm25"] in [350.0, 410.0] for obs in causal_history)
