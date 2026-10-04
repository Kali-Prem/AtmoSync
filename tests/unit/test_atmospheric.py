"""
Unit Tests for Atmospheric Diagnostics (Phase 5)
Tests WMO wind coordinate transformations, cyclical decomposition,
Great-Circle transport geometry, PBL validation, volume contraction, and ventilation index.
"""
import math
import pytest
from scientific.preprocessing.wind import WindDiagnostics
from scientific.preprocessing.pbl import PBLDiagnostics


# ==============================================================================
# Wind Engineering & Transport Geometry Tests
# ==============================================================================

def test_wind_met_to_uv():
    """
    Tests WMO conversion from meteorological wind (speed, direction) to (u, v).
    WMO convention: Wind from North (0° / 360°) blows South -> u = 0, v = -speed.
    Wind from West (270°) blows East -> u = +speed, v = 0.
    Wind from East (90°) blows West -> u = -speed, v = 0.
    Wind from South (180°) blows North -> u = 0, v = +speed.
    """
    # North wind 10 m/s
    u, v = WindDiagnostics.met_to_uv(10.0, 0.0)
    assert u == 0.0
    assert v == -10.0

    # West wind 10 m/s
    u, v = WindDiagnostics.met_to_uv(10.0, 270.0)
    assert u == 10.0
    assert v == 0.0

    # East wind 10 m/s
    u, v = WindDiagnostics.met_to_uv(10.0, 90.0)
    assert u == -10.0
    assert v == 0.0

    # South wind 10 m/s
    u, v = WindDiagnostics.met_to_uv(10.0, 180.0)
    assert u == 0.0
    assert v == 10.0

    # Northwest wind (315°) 10 m/s -> blows SE: u > 0, v < 0
    u, v = WindDiagnostics.met_to_uv(10.0, 315.0)
    assert u > 0.0
    assert v < 0.0
    assert round(math.sqrt(u * u + v * v), 1) == 10.0


def test_wind_uv_to_met_roundtrip():
    """
    Tests bidirectional round-trip consistency between (speed, dir) and (u, v).
    """
    test_cases = [
        (5.0, 45.0),
        (8.5, 135.0),
        (12.0, 225.0),
        (3.5, 315.0),
        (6.0, 0.0),
        (7.0, 180.0)
    ]
    for speed_in, dir_in in test_cases:
        u, v = WindDiagnostics.met_to_uv(speed_in, dir_in)
        speed_out, dir_out = WindDiagnostics.uv_to_met(u, v)
        assert abs(speed_out - speed_in) < 0.05
        assert abs(dir_out - (dir_in % 360.0)) < 0.5


def test_wind_cyclical_decomposition():
    """
    Tests continuous cyclical sine/cosine representation of wind compass direction.
    """
    # 0 deg (North): sin(0) = 0, cos(0) = 1
    s, c = WindDiagnostics.cyclical_decomposition(0.0)
    assert s == 0.0
    assert c == 1.0

    # 90 deg (East): sin(90) = 1, cos(90) = 0
    s, c = WindDiagnostics.cyclical_decomposition(90.0)
    assert s == 1.0
    assert c == 0.0

    # 180 deg (South): sin(180) = 0, cos(180) = -1
    s, c = WindDiagnostics.cyclical_decomposition(180.0)
    assert s == 0.0
    assert c == -1.0

    # 270 deg (West): sin(270) = -1, cos(270) = 0
    s, c = WindDiagnostics.cyclical_decomposition(270.0)
    assert s == -1.0
    assert c == 0.0


def test_great_circle_bearing_and_distance():
    """
    Tests Haversine distance and initial bearing calculation between
    Ludhiana (Punjab: 30.9010 N, 75.8573 E) and Delhi NCR Center (28.6139 N, 77.2090 E).
    """
    ludhiana_lat, ludhiana_lon = 30.9010, 75.8573
    delhi_lat, delhi_lon = 28.6139, 77.2090

    dist_km = WindDiagnostics.calculate_distance_km(ludhiana_lat, ludhiana_lon, delhi_lat, delhi_lon)
    bearing = WindDiagnostics.calculate_bearing(ludhiana_lat, ludhiana_lon, delhi_lat, delhi_lon)

    # Ludhiana is ~280-320 km Northwest of Delhi
    assert 280.0 <= dist_km <= 330.0
    # Bearing from Ludhiana to Delhi is approximately Southeast (~145° - 155°)
    assert 140.0 <= bearing <= 160.0


def test_wind_transport_alignment():
    """
    Tests directional transport alignment of wind blowing toward Delhi.
    If source is NW of Delhi (bearing ~150°), a wind blowing FROM ~330° blows TOWARD ~150°,
    yielding maximum positive alignment (+1.0).
    A wind blowing FROM ~150° blows TOWARD ~330° (away from Delhi), yielding -1.0.
    """
    ludhiana_lat, ludhiana_lon = 30.9010, 75.8573

    # Wind blowing from NW (330°) -> blows toward SE (150°) -> aligns with corridor to Delhi
    align_direct = WindDiagnostics.calculate_transport_alignment(
        wind_direction_deg=330.0,
        source_lat=ludhiana_lat,
        source_lon=ludhiana_lon
    )
    assert align_direct > 0.90

    # Wind blowing from SE (150°) -> blows toward NW (330°) -> away from Delhi
    align_opposing = WindDiagnostics.calculate_transport_alignment(
        wind_direction_deg=150.0,
        source_lat=ludhiana_lat,
        source_lon=ludhiana_lon
    )
    assert align_opposing < -0.90


# ==============================================================================
# Planetary Boundary Layer (PBL) Tests
# ==============================================================================

def test_pbl_validation_qc():
    """
    Tests physical boundary validation and quality flagging for PBL height.
    """
    # Standard realistic daytime PBL
    h, qc = PBLDiagnostics.validate_pbl_height(1250.0)
    assert h == 1250.0
    assert qc == "VALID"

    # Deep convective summer boundary layer
    h, qc = PBLDiagnostics.validate_pbl_height(3500.0)
    assert h == 3500.0
    assert qc == "VALID"

    # Shallow sub-canopy layer (suspicious)
    h, qc = PBLDiagnostics.validate_pbl_height(12.0)
    assert h == 12.0
    assert qc == "SUSPICIOUS"

    # Unphysical negative or extreme value
    h, qc = PBLDiagnostics.validate_pbl_height(-50.0)
    assert h is None
    assert qc == "INVALID"

    h, qc = PBLDiagnostics.validate_pbl_height(8000.0)
    assert h is None
    assert qc == "INVALID"

    # Missing value
    h, qc = PBLDiagnostics.validate_pbl_height(None)
    assert h is None
    assert qc == "MISSING"


def test_pbl_volume_contraction_ratio():
    """
    Tests atmospheric volume contraction ratio relative to 1500m daytime reference.
    """
    # Collapsed nocturnal inversion layer: 100m -> 15.0x volume contraction
    ratio_night = PBLDiagnostics.compute_volume_contraction_ratio(100.0)
    assert ratio_night == 15.0

    # Deep convective boundary layer: 1500m -> 1.0x (uncompressed)
    ratio_day = PBLDiagnostics.compute_volume_contraction_ratio(1500.0)
    assert ratio_day == 1.0

    # Handling NaN / None
    assert math.isnan(PBLDiagnostics.compute_volume_contraction_ratio(None))


def test_pbl_dispersion_capacity():
    """
    Tests CPCB/IMD ventilation coefficient and dispersion capacity categorization.
    """
    # Critical Stagnation: shallow PBL (100m) and calm wind (1.0 m/s) -> VI = 120 m2/s < 2000
    res_stag = PBLDiagnostics.compute_dispersion_capacity(100.0, 1.0)
    assert res_stag["dispersion_category"] == "CRITICAL_STAGNATION"
    assert res_stag["is_stagnant"] is True
    assert res_stag["ventilation_index_m2s"] < 2000.0

    # Moderate Dispersion: 800m PBL, 3.0 m/s wind -> VI = 800 * 3.6 = 2880 m2/s
    res_mod = PBLDiagnostics.compute_dispersion_capacity(800.0, 3.0)
    assert res_mod["dispersion_category"] == "MODERATE_DISPERSION"
    assert res_mod["is_stagnant"] is False

    # High Dispersion: 1800m PBL, 5.0 m/s wind -> VI = 1800 * 6.0 = 10800 m2/s > 6000
    res_high = PBLDiagnostics.compute_dispersion_capacity(1800.0, 5.0)
    assert res_high["dispersion_category"] == "HIGH_DISPERSION"
    assert res_high["is_stagnant"] is False
