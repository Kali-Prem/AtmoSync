# Forecast Targets Specification

**Document ID:** `DOC-DAT-002`  
**Phase:** Phase 4 — Real Data Pipeline + Baseline Air-Quality Forecasting  
**System:** ATMOSYNC  
**Date:** October 2026  
**Status:** Approved Specification  

---

## 1. Primary Target Definition

The primary forecast target for the Phase 4 baseline modeling pipeline is:

$$\mathbf{PM_{2.5} \text{ Concentration}}$$

- **Variable Code:** `pm25`
- **Measurement Unit:** Micrograms per cubic meter ($\mu\text{g/m}^3$)
- **Physical Definition:** Fine particulate matter with aerodynamic diameter $\le 2.5\ \mu\text{m}$.
- **Measurement Standard:** Beta-Attenuation Monitor (BAM-1020) or Tapered Element Oscillating Microbalance (TEOM) operated by CPCB / DPCC CAAQMS stations conforming to US-EPA / CPCB equivalence.

> **CRITICAL SCIENTIFIC RULE:**  
> The machine learning model is trained directly to forecast continuous physical mass concentration ($PM_{2.5}$ in $\mu\text{g/m}^3$).  
> **We DO NOT train models to directly predict unitless AQI numbers.**  
> AQI is a non-linear, piecewise regulatory index derived deterministically from physical pollutant concentrations via the official CPCB / IIT Kanpur standard ([INDIA-AQI-METHODOLOGY.md](../research/INDIA-AQI-METHODOLOGY.md)).

---

## 2. Secondary Targets (Queued for Phase 5+)

- **$PM_{10}$ Concentration ($\mu\text{g/m}^3$):** Inhalable particulate matter $\le 10\ \mu\text{m}$. Evaluated secondary target to preserve the physical hierarchy:
  $$PM_{2.5} \le PM_{10} \times 1.05$$
- **Ground-Level Ozone ($O_3$ in $\mu\text{g/m}^3$):** Photochemical oxidant with pronounced diurnal solar cycle (peak in mid-afternoon, titrated nocturnally by $NO$).

---

## 3. Forecast Horizons & Cadence

Baseline models must produce discrete single-station forecasts across multiple temporal horizons:

| Horizon Name | Step Offset ($h$) | Target Timestamp | Operational Decision Purpose |
| :--- | :---: | :--- | :--- |
| **Nowcast / Short-range** | $+1\text{ h}$ | $T + 1\text{ h}$ | Real-time traffic diversion, emergency hospital alert |
| **Near-term** | $+3\text{ h}$ | $T + 3\text{ h}$ | Public advisory, school recess planning |
| **Intraday** | $+6\text{ h}$ | $T + 6\text{ h}$ | Construction stoppage, shift work scheduling |
| **Half-day** | $+12\text{ h}$ | $T + 12\text{ h}$ | Nighttime inversion trapping warning |
| **Day-Ahead** | $+24\text{ h}$ | $T + 24\text{ h}$ | **Primary Regulatory Decision Window** (GRAP Stage I–IV) |
| **Medium-range (48h)** | $+48\text{ h}$ | $T + 48\text{ h}$ | Pre-emptive industrial restriction planning |
| **Extended-range (72h)** | $+72\text{ h}$ | $T + 72\text{ h}$ | Stubble burning trajectory and synoptic weather shift |

> **PERFORMANCE MANDATE:**  
> A model outputting 72 values is not automatically reliable at 72 hours. Error grows monotonically with horizon. Performance must be rigorously measured and reported independently for every horizon.

---

## 4. Spatio-Temporal Resolution

- **Temporal Resolution:** Hourly ($1\text{ h}$) discrete time steps, referenced to UTC internally and displayed in IST ($\text{UTC} + 5:30$).
- **Geographic Resolution:** Monitoring-station-level ($3\text{ m} - 10\text{ m}$ ground sampling height) for 20 designated Delhi NCR CAAQMS stations.
- **Spatial Alignment:** Station-centric tabular features (local meteorology downscaled to exact station coordinates $Lat, Lon$).

---

## 5. Missing Data Treatment & Imputation Rules

In real-world monitoring networks, sensor downtime, calibration drift, and communication outages create missing values:

1. **Station Target Missingness ($y_{t+h}$ is NaN):**
   - Observation rows where ground truth target $y_{t+h}$ is missing are **strictly excluded from loss calculation and evaluation**.
   - **DO NOT** impute synthetic target labels for evaluation.
2. **Feature Missingness ($x_t$ is NaN):**
   - *Short gaps ($\le 2$ consecutive hours):* Linear interpolation allowed for continuous meteorological variables.
   - *Long gaps ($> 2$ hours):* Flagged as missing; gradient boosting algorithms (LightGBM) natively handle missing values along optimal decision tree split paths.
   - *Zero-variance / flatline detection:* Sensors repeating identical non-zero values for $> 6$ consecutive hours are flagged `SUSPICIOUS` and treated as missing.

---

## 6. Evaluation Strategy & Metrics

Baseline performance is evaluated against held-out chronological test sets using four standard metrics:

### 6.1 Mean Absolute Error (MAE)
$$\text{MAE} = \frac{1}{N} \sum_{i=1}^N |y_i - \hat{y}_i| \quad (\mu\text{g/m}^3)$$

### 6.2 Root Mean Squared Error (RMSE)
$$\text{RMSE} = \sqrt{\frac{1}{N} \sum_{i=1}^N (y_i - \hat{y}_i)^2} \quad (\mu\text{g/m}^3)$$

### 6.3 Coefficient of Determination ($R^2$)
$$R^2 = 1 - \frac{\sum_{i=1}^N (y_i - \hat{y}_i)^2}{\sum_{i=1}^N (y_i - \bar{y})^2}$$

### 6.4 Mean Bias Error (MBE)
$$\text{MBE} = \frac{1}{N} \sum_{i=1}^N (\hat{y}_i - y_i) \quad (\mu\text{g/m}^3)$$
- $\text{MBE} > 0$: Systematic overprediction.
- $\text{MBE} < 0$: Systematic underprediction (critical safety failure during severe smog).

### 6.5 Segmented Evaluation by Pollution Severity
To avoid masking extreme smog failures behind benign summer averages, metrics must be evaluated across CPCB concentration bins:
1. **Moderate / Acceptable:** $PM_{2.5} \le 60\ \mu\text{g/m}^3$
2. **Poor / Unhealthy:** $60 < PM_{2.5} \le 120\ \mu\text{g/m}^3$
3. **Very Poor:** $120 < PM_{2.5} \le 250\ \mu\text{g/m}^3$
4. **Severe / Emergency:** $PM_{2.5} > 250\ \mu\text{g/m}^3$ (Peak Delhi winter episodes)
