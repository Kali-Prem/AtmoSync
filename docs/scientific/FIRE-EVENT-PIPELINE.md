# Regional Fire & Biomass-Burning Event Pipeline

**Document ID:** `DOC-SCI-005`  
**Phase:** Phase 5 — Atmospheric Variables + Inversion + Regional Fire/Plume Pipeline  
**System:** ATMOSYNC  
**Date:** October 2026  
**Status:** Approved Scientific Specification  

---

## 1. Satellite Observation Data Source

Regional active fire hotspots across Northwest India are detected via spaceborne radiometers:
- **Primary Operational Sensor:** NASA FIRMS VIIRS (Visible Infrared Imaging Radiometer Suite) aboard Suomi-NPP and NOAA-20 / NOAA-21 satellites.
- **Instrument Band:** $I_4$ ($3.74\text{ }\mu\text{m}$) middle infrared (MIR) and $I_5$ ($11.45\text{ }\mu\text{m}$) thermal infrared (TIR).
- **Spatial Resolution:** $375\text{ m}$ at nadir (superior sub-pixel sensitivity compared to legacy MODIS $1000\text{ m}$ pixels).
- **Temporal Frequency:** 2–4 overpasses per 24 hours (daytime ~13:30 local solar time, nighttime ~01:30 local solar time).
- **Key Measured Quantities:**
  - Latitude, Longitude (WGS-84)
  - Fire Radiative Power (FRP, Megawatts)
  - Brightness Temperature ($K$)
  - Detection Confidence (`low`, `nominal`, `high`)

---

## 2. Quality Control & Screening Architecture

Implemented in `scientific/preprocessing/fire.py`:

```
Raw Satellite Ingestion (VIIRS 375m)
                 ↓
[Geographic Bounding Box Check (26.5°N - 33.0°N, 73.5°E - 79.5°E)]
                 ↓
[Physical FRP Bounds Check (0.1 MW <= FRP <= 5000.0 MW)]
                 ↓
[Duplicate Elimination (Time & Coordinate matching within 0.005°)]
                 ↓
[Agricultural & Spatiotemporal Classification]
                 ↓
[Spatial Event Clustering (DBSCAN / Radius <= 15 km)]
                 ↓
[Mass Emission Flux Calculation (Wooster et al., 2005)]
                 ↓
Database Storage (`fire_events`) & Plume Advection Engine
```

### QC Flag Rules
- `VALID`: Valid geographic bounds, FRP within $[0.1, 5000.0]\text{ MW}$, confidence `nominal` or `high`.
- `SUSPICIOUS`: Confidence `low` or brightness temperature anomaly near gas flares/industrial plants.
- `OUT_OF_BOUNDS`: Coordinates outside the Northwest India regional domain.
- `INVALID`: Missing coordinates, negative FRP, or malformed timestamps.

---

## 3. Scientific Event Classification

A satellite thermal hotspot does not automatically equal agricultural residue burning. ATMOSYNC classifies detections into three scientific categories based on empirical agricultural calendar windows:

1. **`stubble_burning_candidate`:**
   - **Criteria:** Hotspot located within agrarian Punjab or Haryana ($29.0^\circ\text{N} \le \text{lat} \le 32.5^\circ\text{N}, 74.0^\circ\text{E} \le \text{lon} \le 77.5^\circ\text{E}$) during post-monsoon paddy harvest (October 15 – November 30) or pre-monsoon wheat harvest (April – May).
   - **Certainty:** High agricultural attribution.
2. **`biomass_burning_candidate`:**
   - **Criteria:** Hotspot located in rural/forested regions of Rajasthan or Western Uttar Pradesh, or outside the primary harvest calendar windows.
   - **Certainty:** Forest fire, rangeland burning, or municipal open waste burning.
3. **`fire_detection`:**
   - **Criteria:** Industrial or urban thermal anomaly where fuel type cannot be determined.

---

## 4. Particulate Emission Mass Flux Estimation

To link satellite radiometry to mass emission rates ($kg/s$), ATMOSYNC implements the peer-reviewed Fire Radiative Energy (FRE) formulation of **Wooster et al. (2005)**:

$$E_{\text{PM2.5}} (kg/s) = C_e \times \text{FRP} (MW)$$

Where:
- $\text{FRP}$: Instantaneous Fire Radiative Power in Megawatts ($MW$).
- $C_e$: Particulate smoke emission coefficient for agricultural crop residue burning $= 0.024\text{ kg PM}_{2.5} / \text{MJ}$ (equivalently $kg/s$ per $MW$).
- *Example:* An aggregated regional cluster of $500\text{ MW}$ FRP releases:
  $$E_{\text{PM2.5}} = 0.024 \times 500 = 12.0\text{ kg/s} \quad (43.2\text{ tonnes/hour})$$

---

## 5. Spatial Aggregation & Clustering

To avoid treating contiguous fire fronts as disconnected mathematical points, proximate hotspots occurring during the same observation window are clustered using an agglomerative radius method ($\le 15.0\text{ km}$):

- `event_id`: Unique cluster identifier (e.g. `FIRE_EVT_0042`)
- `start_time`: Acquisition timestamp of initial detection
- `centroid_lat`, `centroid_lon`: Center of mass weighted by FRP
- `detection_count`: Number of individual satellite pixels in cluster
- `total_frp_mw`: Cumulative Fire Radiative Power
- `estimated_pm25_flux_kg_s`: Cumulative PM2.5 mass emission rate
- `source_region`: Identified state (Punjab, Haryana, Western UP, Rajasthan)
