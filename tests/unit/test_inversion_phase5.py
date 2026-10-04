"""
Unit Tests for Phase 5 Multi-Level Inversion Analysis
Tests vertical profile classification, surface-based vs elevated inversion,
lapse rate gradients, Inversion Trapping Severity Index (ITSI), and missing data handling.
"""
import math
import pytest
from scientific.preprocessing.inversion import InversionDiagnostics


def test_surface_based_inversion_detection():
    """
    Tests detection of surface-based radiation inversion where temperature increases
    immediately from 2m upward (T2m < T80m < T180m).
    """
    res = InversionDiagnostics.analyze_vertical_profile(
        t2m=12.0,
        t80m=14.5,
        t120m=15.2,
        t180m=16.0
    )
    assert res["inversion_present"] is True
    assert res["inversion_class"] == "SURFACE_BASED_INVERSION"
    assert res["inversion_base_height_m"] == 0.0
    assert res["inversion_top_height_m"] == 180.0
    assert res["inversion_detection_method"] == "vertical_temperature_profile"
    assert res["inversion_quality_flag"] == "VALID"
    assert res["lapse_rate_c_100m"] > 0.0
    assert res["temperature_difference_c"] == 4.0


def test_elevated_inversion_detection():
    """
    Tests detection of elevated inversion layer where ground layer cools with height,
    but a capping inversion exists aloft (T2m > T80m, but T80m < T120m).
    """
    res = InversionDiagnostics.analyze_vertical_profile(
        t2m=20.0,
        t80m=18.5,  # Cooling in surface layer (2m - 80m)
        t120m=21.0, # Warming in elevated layer (80m - 120m) -> Inversion aloft!
        t180m=20.5
    )
    assert res["inversion_present"] is True
    assert res["inversion_class"] == "ELEVATED_INVERSION"
    assert res["inversion_base_height_m"] == 80.0
    assert res["inversion_top_height_m"] == 120.0


def test_stable_layer_detection():
    """
    Tests detection of a weak stable layer where temperature decreases with height,
    but at a rate less than dry adiabatic lapse rate (-0.98 °C / 100m) or standard atmosphere (-0.65 °C / 100m).
    """
    # From 2m (20.0°C) to 180m (19.5°C): Lapse rate = -0.5°C / 178m * 100 = -0.28 °C / 100m (Stable layer)
    res = InversionDiagnostics.analyze_vertical_profile(
        t2m=20.0,
        t80m=19.8,
        t120m=19.6,
        t180m=19.5
    )
    assert res["inversion_present"] is False
    assert res["inversion_class"] == "STABLE_LAYER"
    assert res["inversion_base_height_m"] is None


def test_neutral_unstable_convective_layer():
    """
    Tests detection of convective neutral/unstable layer with strong lapse cooling.
    """
    # From 2m (25.0°C) to 180m (23.0°C): Lapse rate = -2.0 / 178 * 100 = -1.12 °C / 100m (Unstable)
    res = InversionDiagnostics.analyze_vertical_profile(
        t2m=25.0,
        t80m=24.1,
        t120m=23.6,
        t180m=23.0
    )
    assert res["inversion_present"] is False
    assert res["inversion_class"] == "NEUTRAL_UNSTABLE"
    assert res["inversion_strength"] == 0.0


def test_profile_missing_data_graceful_fallback():
    """
    Tests that missing vertical levels gracefully yield UNAVAILABLE status without throwing exceptions.
    """
    # Single level only (no profile gradient possible)
    res_single = InversionDiagnostics.analyze_vertical_profile(t2m=15.0)
    assert res_single["inversion_present"] is False
    assert res_single["inversion_class"] == "UNAVAILABLE"
    assert res_single["inversion_quality_flag"] == "MISSING"

    # All None
    res_none = InversionDiagnostics.analyze_vertical_profile(t2m=None)
    assert res_none["inversion_class"] == "UNAVAILABLE"
    assert res_none["inversion_quality_flag"] == "MISSING"


def test_itsi_extreme_trapping_vs_clearing():
    """
    Tests Inversion Trapping Severity Index under extreme winter smog vs convective clearing.
    """
    # Severe winter smog episode: strong lapse rate (3.5 °C/100m), low PBL (40m), calm wind (0.2 m/s)
    itsi_smog = InversionDiagnostics.compute_trapping_severity_index(
        lapse_rate=3.5,
        pblh_m=40.0,
        wind_speed_10m=0.2
    )
    assert itsi_smog == 100.0

    # Clean convective summer afternoon: negative lapse rate (-1.5 °C/100m), high PBL (2000m), windy (6.0 m/s)
    itsi_clean = InversionDiagnostics.compute_trapping_severity_index(
        lapse_rate=-1.5,
        pblh_m=2000.0,
        wind_speed_10m=6.0
    )
    assert itsi_clean == 0.0

    # Partial missing data handling
    itsi_partial = InversionDiagnostics.compute_trapping_severity_index(
        lapse_rate=1.5,
        pblh_m=None,
        wind_speed_10m=2.0
    )
    assert 0.0 <= itsi_partial <= 100.0
