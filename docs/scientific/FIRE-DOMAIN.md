# Regional Fire Domain & Target Geography Specification

**Document ID:** `DOC-SCI-006`  
**Phase:** Phase 5 — Atmospheric Variables + Inversion + Regional Fire/Plume Pipeline  
**System:** ATMOSYNC  
**Date:** October 2026  
**Status:** Approved Scientific Specification  

---

## 1. Northwest India Regional Source Domain

Rather than assuming arbitrary or unverified administrative boundaries, ATMOSYNC establishes an explicitly defined, configurable geographic bounding box covering the entire agricultural smoke transport corridor:

```
[Latitude: 26.50°N to 33.00°N]  ×  [Longitude: 73.50°E to 79.50°E]
```

This domain spans approximately $720\text{ km} \times 580\text{ km}$ and encapsulates all significant upwind agricultural regions contributing to transboundary air pollution across the National Capital Region.

### Regional Sub-Domains

| Region Identifier | Geographic Extent | Typical Seasonality | Primary Crop Residue |
|---|---|---|---|
| **Punjab Agrarian Basin** | $30.00^\circ\text{N} - 32.50^\circ\text{N}$, $74.00^\circ\text{E} - 76.50^\circ\text{E}$ | Oct 15 – Nov 25 | Non-basmati Rice (Paddy Stubble) |
| **Haryana Agrarian Belt** | $28.50^\circ\text{N} - 30.20^\circ\text{N}$, $75.50^\circ\text{E} - 77.50^\circ\text{E}$ | Oct 20 – Nov 30 | Basmati & Non-basmati Rice Stubble |
| **Western Uttar Pradesh** | $27.50^\circ\text{N} - 30.00^\circ\text{N}$, $77.50^\circ\text{E} - 79.50^\circ\text{E}$ | Nov 01 – Dec 15 | Sugarcane Trash & Paddy Stubble |
| **Rajasthan Border Belt** | $26.50^\circ\text{N} - 29.00^\circ\text{N}$, $73.50^\circ\text{E} - 76.00^\circ\text{E}$ | April – May | Wheat Straw & Rangeland Fires |

---

## 2. Delhi NCR Target Forecast Domain

The receptor domain where downwind plume impacts and air-quality forecasts are evaluated is defined by the rectangular bounding box enclosing the National Capital Region:

- **Minimum Latitude:** $28.20^\circ\text{N}$
- **Maximum Latitude:** $28.95^\circ\text{N}$
- **Minimum Longitude:** $76.80^\circ\text{E}$
- **Maximum Longitude:** $77.55^\circ\text{E}$
- **Domain Centroid:** $28.6139^\circ\text{N}, 77.2090^\circ\text{E}$ (Central Delhi / Connaught Place)
- **Anchor Monitoring Stations:** 20 Continuous Ambient Air Quality Monitoring Stations (CAAQMS) operated by CPCB / DPCC.

---

## 3. Configuration & Modularity

The domain coordinates are configuration-driven in `services/plume/transport.py` and `scientific/preprocessing/fire.py`:

```python
# Bounding box configuration
DOMAIN_MIN_LAT = 26.5
DOMAIN_MAX_LAT = 33.0
DOMAIN_MIN_LON = 73.5
DOMAIN_MAX_LON = 79.5

TARGET_MIN_LAT = 28.20
TARGET_MAX_LAT = 28.95
TARGET_MIN_LON = 76.80
TARGET_MAX_LON = 77.55
```

Custom polygonal boundaries (GeoJSON) can be attached for sub-district agricultural tracking without recompiling the underlying advection code.
