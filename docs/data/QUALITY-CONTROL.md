# Data Quality Control Specification

**Document ID:** `DOC-DAT-003`  
**Phase:** Phase 4 — Real Data Pipeline + Baseline Air-Quality Forecasting  
**System:** ATMOSYNC  
**Date:** October 2026  
**Status:** Approved Specification  

---

## 1. Principles of Quality Control

The ATMOSYNC data quality pipeline ensures that raw observations from heterogeneous atmospheric and air quality sensors are rigorously screened prior to feature engineering and model training.

> **PRIMARY MANDATE:**  
> **Never silently delete suspicious observations.**  
> Every record entering the pipeline is evaluated deterministically and tagged with an explicit Quality Flag. Anomalies are flagged, logged, and isolated to preserve data provenance.

---

## 2. Quality Flags Taxonomy

Every observation record is assigned exactly one primary flag:

| Flag Code | Semantic Meaning | Action in Pipeline |
| :--- | :--- | :--- |
| `VALID` | Passes all schema, temporal, geographic, and physical bounds checks. | Passed directly to feature store and model training. |
| `SUSPICIOUS` | Within theoretical bounds but exhibits anomalies (e.g. sensor flatline, high rate of change). | Retained for auditing; masked out during loss calculation unless verified. |
| `INVALID` | Physically impossible (e.g., negative mass, $PM_{2.5} > 1500\ \mu\text{g/m}^3$, $PM_{2.5} > PM_{10} \times 1.05$). | Rejected from model training and evaluation. |
| `MISSING` | Value is null, NaN, or station was offline. | Excluded from target loss; imputed in features only where justified. |
| `IMPUTED` | Value was missing and replaced via conservative linear interpolation ($\le 2\text{ h}$). | Tracked separately; never imputed on target evaluation labels. |

---

## 3. Comprehensive Verification Checks

### 3.1 Schema & Structural Checks
- **Required Fields:** Record must contain `station_id`, `timestamp_utc`, and at least one meteorological or pollutant observation.
- **Data Types:** Numeric values cast strictly to IEEE 754 64-bit float (`float64`); timestamps parsed to UTC ISO-8601.
- **Station ID Validation:** Must match a verified station code in the database registry (e.g., `DL001` through `DL020`).

### 3.2 Temporal Checks
- **Timestamp Plausibility:** Timestamp must not be in the future ($\text{timestamp} \le \text{current\_time} + 10\text{ min}$).
- **Duplicate Detection:** Duplicate timestamps for the same station are resolved by keeping the latest ingestion payload with higher sensor precision.
- **Monotonicity:** Time series must be sorted in strictly ascending chronological order before lag calculation.
- **Missing Cadence:** Pipeline identifies time gaps ($> 1\text{ h}$) and injects explicit `MISSING` rows to maintain a regular hourly grid.

### 3.3 Geographic Checks
- **Spatial Bounding Box:** All stations must reside within the Delhi NCR bounding box:
  $$28.20^\circ\text{N} \le \text{Latitude} \le 28.95^\circ\text{N}$$
  $$76.80^\circ\text{E} \le \text{Longitude} \le 77.55^\circ\text{E}$$
- **Coordinate Consistency:** Station coordinates must match the authoritative survey metadata within $\pm 0.0001^\circ$ (~11 meters).

### 3.4 Physical Pollution Bound Checks
Based on Central Pollution Control Board (CPCB) monitoring instrument specifications and Delhi historical extremes:

| Pollutant | Canonical Unit | Valid Min | Valid Max | Spike Threshold ($\Delta / \text{hour}$) | Physical Violation Rule |
| :--- | :---: | :---: | :---: | :---: | :--- |
| $PM_{2.5}$ | $\mu\text{g/m}^3$ | $0.0$ | $1000.0$ | $> 250.0\ \mu\text{g/m}^3$ | Flag `INVALID` if $< 0$ or $> 1000$ |
| $PM_{10}$ | $\mu\text{g/m}^3$ | $0.0$ | $1500.0$ | $> 400.0\ \mu\text{g/m}^3$ | Flag `INVALID` if $< 0$ or $> 1500$ |
| $NO_2$ | $\mu\text{g/m}^3$ | $0.0$ | $500.0$ | $> 150.0\ \mu\text{g/m}^3$ | Flag `INVALID` if $< 0$ or $> 500$ |
| $SO_2$ | $\mu\text{g/m}^3$ | $0.0$ | $500.0$ | $> 100.0\ \mu\text{g/m}^3$ | Flag `INVALID` if $< 0$ or $> 500$ |
| $CO$ | $\text{mg/m}^3$ | $0.0$ | $50.0$ | $> 15.0\ \text{mg/m}^3$ | Flag `INVALID` if $< 0$ or $> 50$ |
| $O_3$ | $\mu\text{g/m}^3$ | $0.0$ | $400.0$ | $> 120.0\ \mu\text{g/m}^3$ | Flag `INVALID` if $< 0$ or $> 400$ |

- **Particulate Mass Ratio Constraint:**  
  Because $PM_{2.5}$ is a physical subset of $PM_{10}$, any observation where $PM_{2.5} > PM_{10} \times 1.05$ (allowing 5% instrument uncertainty) is flagged `INVALID`.

- **Sensor Flatline Check:**  
  If a station's sensor outputs the identical non-zero floating-point value for $\ge 6$ consecutive hours (zero variance), the sensor is flagged `SUSPICIOUS` (frozen sensor anomaly).

### 3.5 Physical Meteorological Checks

| Parameter | Unit | Physical Min | Physical Max | Validation Rule |
| :--- | :---: | :---: | :---: | :--- |
| Temperature ($T_{2\text{m}}$) | $^\circ\text{C}$ | $-10.0$ | $55.0$ | Delhi historical record: $1.1^\circ\text{C}$ to $49.9^\circ\text{C}$ |
| Relative Humidity ($RH$) | $\%$ | $1.0$ | $100.0$ | Cannot exceed $100\%$ |
| Surface Pressure ($P_{\text{sfc}}$) | $\text{hPa}$ | $940.0$ | $1040.0$ | Delhi elevation ~215m MSL |
| Wind Speed ($U_{10\text{m}}$) | $\text{m/s}$ | $0.0$ | $40.0$ | Gale force bounds |
| Wind Direction ($\theta$) | $\text{degrees}$ | $0.0$ | $360.0$ | Circular compass angle |
| Planetary Boundary Layer ($PBLH$) | $\text{m AGL}$ | $20.0$ | $5000.0$ | Minimum nocturnal boundary layer |
