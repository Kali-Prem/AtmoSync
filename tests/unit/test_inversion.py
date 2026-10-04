"""
Unit Tests for InversionDiagnostics
Tests lapse rate calculation, inversion classification, and trapping severity index.
"""
import pytest
from scientific.preprocessing.inversion import InversionDiagnostics

def test_compute_low_level_lapse_rate():
    # If T2m = 20.0°C and T80m = 22.0°C, temperature increases with height (Inversion!)
    # Gamma_low = (22 - 20) / 78 * 100 = 2.564 °C / 100m
    gamma = InversionDiagnostics.compute_low_level_lapse_rate(20.0, 22.0, dz_m=78.0)
    assert gamma > 0
    assert gamma == 2.564

def test_classify_inversion_classes():
    assert InversionDiagnostics.classify_inversion(-0.5) == "NO_INVERSION"
    assert InversionDiagnostics.classify_inversion(0.8) == "WEAK_INVERSION"
    assert InversionDiagnostics.classify_inversion(1.8) == "MODERATE_INVERSION"
    assert InversionDiagnostics.classify_inversion(3.2) == "SEVERE_INVERSION"

def test_compute_trapping_severity_index_severe():
    # Strong inversion (3.0°C/100m), collapsed boundary layer (50m), calm wind (0.5 m/s)
    tsi = InversionDiagnostics.compute_trapping_severity_index(
        lapse_rate=3.0,
        pblh_m=50.0,
        wind_speed_10m=0.5
    )
    assert tsi == 100.0

def test_compute_trapping_severity_index_clearing():
    # No inversion (0.0), high daytime convective boundary layer (1200m), strong wind (5.0 m/s)
    tsi = InversionDiagnostics.compute_trapping_severity_index(
        lapse_rate=0.0,
        pblh_m=1200.0,
        wind_speed_10m=5.0
    )
    assert tsi == 0.0

def test_compute_ventilation_index():
    vi = InversionDiagnostics.compute_ventilation_index(pblh_m=500.0, wind_speed_10m=3.0)
    # u_mean = 1.2 * 3.0 = 3.6 m/s -> VI = 500 * 3.6 = 1800.0 m2/s
    assert vi == 1800.0
