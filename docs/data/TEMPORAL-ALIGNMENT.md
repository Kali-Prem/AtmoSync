# Temporal Alignment & Resampling Specification

**Document ID:** `DOC-DAT-005`  
**Phase:** Phase 4 — Real Data Pipeline + Baseline Air-Quality Forecasting  
**System:** ATMOSYNC  
**Date:** October 2026  
**Status:** Approved Specification  

---

## 1. Grid Selection & Scientific Justification

Data sources ingest at differing cadences:
- **CPCB / OpenAQ CAAQMS Sensors:** Sample continuously; published at 15-minute raw intervals and 1-hour rolling averages.
- **Open-Meteo / ERA5 Numerical Weather:** Published on regular hourly ($1\text{ h}$) discrete time grids.
- **CAMS Global Chemical Forecasts:** Output at 3-hourly intervals out to 120 hours.
- **NASA FIRMS Active Fires:** Asynchronous satellite overpasses (2 to 4 observations daily).

### Standard Grid Decision: Hourly ($1\text{ h}$) UTC Grid
The canonical temporal resolution for **ATMOSYNC** is locked at **hourly ($\Delta t = 1\text{ h}$)** for the following scientific reasons:
1. Hourly resolution captures the rapid boundary layer collapse and nocturnal inversion onset between 17:00 and 21:00 IST.
2. Official regulatory actions (GRAP monitoring) and public warning systems operate on hourly updates.
3. Sub-hourly (15-min) data introduces excessive sensor noise without providing additional predictive value for 24- to 72-hour forecast horizons.

---

## 2. Alignment & Resampling Rules

### 2.1 CAAQMS Sensor Aggregation (Sub-Hourly $\rightarrow$ Hourly)
When raw 15-minute CPCB sensor data is ingested:
- **Aggregation Operator:** Arithmetic Mean over the preceding 60-minute window $[T - 60\text{ min}, T]$.
- **Data Completeness Threshold:** At least 3 of 4 valid 15-minute readings ($75\%$ data availability) must be present in the hour to produce a valid hourly mean. If $< 3$ readings exist, the hourly slot is flagged `MISSING`.
- **Timestamp Stamping:** The aggregated hourly timestamp is stamped at the top of the hour in UTC (e.g., observations between 05:01 and 06:00 UTC are stamped `06:00:00Z`).

### 2.2 Numerical Weather Prediction Alignment
- Open-Meteo / ERA5 values natively reference top-of-the-hour instantaneous states ($T_{2\text{m}}$, $P_{\text{sfc}}$, Wind) or hourly accumulated totals ($\text{Precipitation}$).
- NWP forecast cycles are mapped directly to corresponding station observation timestamps via exact UTC timestamp equality matching.

### 2.3 Lower-Frequency Chemical Data Alignment ($3\text{ h} \rightarrow 1\text{ h}$)
- For CAMS 3-hourly priors, values between time steps $T$ and $T+3\text{ h}$ are interpolated using monotonic cubic Hermite splines (`PCHIP`) or linear interpolation to preserve non-negativity and avoid artificial oscillations.

### 2.4 Asynchronous Satellite Fire Point Aggregation
- NASA FIRMS active fire pixels are aggregated into rolling 24-hour and 72-hour spatial sums:
  $$\text{FRP}_{\text{upwind}}(T) = \sum_{i \in \text{Upwind Domain}} \text{FRP}_i \quad \text{for fires detected in } [T-24\text{ h}, T]$$

---

## 3. Missing Time-Step Detection & Regularization

Real-world monitoring streams frequently have missing hours. The pipeline executes:

1. **Grid Generation:** A complete, gapless hourly datetime index is generated for each station from start to end date:
   $$\mathcal{T} = \{T_{\text{start}} + k \cdot 1\text{ h} \mid k = 0, 1, \dots, N\}$$
2. **Reindexing:** Raw observations are reindexed against $\mathcal{T}$.
3. **Explicit Missing Marking:** Missing hours are explicitly instantiated with `NaN` and flagged `MISSING`.
4. **Consecutive Gap Analysis:** The length of consecutive missing streaks is tracked. Features with short gaps ($\le 2\text{ h}$) are linearly interpolated for meteorological drivers, while gaps $> 2\text{ h}$ are preserved as missing for gradient boosting handling.
