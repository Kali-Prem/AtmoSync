# Baseline Models Evaluation Report: Delhi NCR Air Quality

**Document ID:** `DOC-ML-001`  
**Phase:** Phase 4 — Real Data Pipeline + Baseline Air-Quality Forecasting  
**System:** ATMOSYNC  
**Date:** October 2026  
**Status:** Empirically Evaluated on Real Historical Data  

---

# Dataset

- **Benchmark Dataset:** `VayuDrishti-DelhiNCR-Winter2023-2024` (v1.0.0)
- **Time Period:** October 1, 2023 to February 29, 2024 (152 consecutive days, 3,648 hours/station)
- **Stations (5 Anchors):**
  1. `DL_ANAND_VIHAR` (East Delhi / Interstate traffic hotspot)
  2. `DL_PUNJABI_BAGH` (West Delhi / Commercial-residential ring road)
  3. `DL_RK_PURAM` (South Delhi / Dense residential basin)
  4. `DL_IGI_AIRPORT` (Southwest Delhi / Regional background & airport)
  5. `DL_BAWANA` (Northwest Delhi / Industrial & stubble inflow gateway)
- **Total Valid Observations:** 18,240 station-hour records across 35 physical variables.

---

# Forecast Target

- **Primary Target:** Ground-level continuous mass concentration of fine particulate matter:
  $$\mathbf{PM_{2.5}}\ (\mu\text{g/m}^3)$$
- **Target Offsets ($h$):** $+1\text{h}$, $+3\text{h}$, $+6\text{h}$, $+12\text{h}$, $+24\text{h}$, $+48\text{h}$, $+72\text{h}$.
- **Regulatory Standard:** Direct concentration forecasting; AQI is derived deterministically using the official CPCB / IIT Kanpur piecewise sub-index formula.

---

# Feature Set

The tabular feature matrix $\mathbf{X}_t$ consists of 36 time-causal features strictly available at or before forecast initialization timestamp $t$:
1. **Historical Pollution Lags:** $PM_{2.5}(t-1), PM_{2.5}(t-3), PM_{2.5}(t-6), PM_{2.5}(t-12), PM_{2.5}(t-24)$, $PM_{10}(t-1), PM_{10}(t-24)$, $NO_2(t-1)$, $CO(t-1)$.
2. **Backward-Looking Rolling Statistics:** 6h Rolling Mean, 6h Max, 6h StdDev; 24h Rolling Mean, 24h Max, 24h Min; Rate of Change ($\Delta_{1-3\text{h}}$).
3. **Surface & Boundary Layer Meteorology:** $T_{2\text{m}}$, $RH_{2\text{m}}$, $P_{\text{sfc}}$, Wind Speed ($U_{10\text{m}}$), Wind vector components ($u, v$), Precipitation, Boundary Layer Height ($PBLH$).
4. **Atmospheric Physics Diagnostics:** Near-surface lapse rate ($\Gamma_{\text{low}}$), Inversion Trapping Severity Index (ITSI), Ventilation Index ($VI = PBLH \times U_{10\text{m}}$), Stagnation Factor.
5. **Temporal Cyclical Embeddings:** $\sin/\cos$ hour-of-day, $\sin/\cos$ day-of-week, month.
6. **Station Metadata:** Latitude, Longitude, Elevation.

---

# Models

Three distinct baseline architectures were trained and evaluated:
1. **BASELINE 1 — Naive Persistence:**
   $$\hat{y}(t+h) = y(t-1)$$
   Projects the latest observed concentration unchanged across all lead horizons.
2. **BASELINE 2 — Statistical Diurnal + Rolling Mean:**
   $$\hat{y}(t+h) = 0.4 \cdot \text{DiurnalMean}_{\text{station}}((\text{hour}+h)\%24) + 0.6 \cdot \text{RollingMean}_{24}(t)$$
   Combines localized diurnal hourly profiles with the trailing 24-hour baseline.
3. **BASELINE 3 — Machine Learning (LightGBM Direct Multi-Horizon):**
   A dedicated LightGBM gradient boosted decision tree (150 estimators, learning rate 0.05, max depth 6) trained independently for each horizon $h \in \{1, 3, 6, 12, 24, 48, 72\}$.

---

# Training Strategy

- **Strict Chronological Forward Split (No Shuffling):**
  - **Training Partition:** October 1, 2023 to January 7, 2024 (11,880 rows / 65% — captures post-monsoon, stubble burning, and early winter stagnation).
  - **Validation Partition:** January 8, 2024 to January 31, 2024 (2,880 rows / 16% — captures extreme January cold wave, dense radiation fog, and severe smog). Used for early stopping.
  - **Test Partition (Temporal Holdout):** February 1, 2024 to February 29, 2024 (3,480 rows / 19% — completely unseen historical month evaluating transition and dispersion).
- **Leakage Prevention:** Monitored and validated via `DataLeakageAuditor`. Zero target columns in feature matrix; zero temporal overlap between partitions.

---

# Evaluation Strategy

Performance is evaluated on the held-out February 2024 test partition using:
- Mean Absolute Error (MAE in $\mu\text{g/m}^3$)
- Root Mean Squared Error (RMSE in $\mu\text{g/m}^3$)
- Coefficient of Determination ($R^2$)
- Mean Bias Error (MBE in $\mu\text{g/m}^3$)
- Segmented metrics across CPCB air quality severity tiers: Normal ($\le 60$), High ($60-120$), Severe ($> 120$).

---

# Results: Baseline Comparison Table

Empirically measured performance across all 7 forecast lead horizons on the held-out test partition:

| Model | +1h MAE | +3h MAE | +6h MAE | +12h MAE | +24h MAE | +48h MAE | +72h MAE |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Baseline 1: Naive Persistence** | 9.26 | 15.81 | 20.19 | 20.65 | **18.67** | **21.27** | **22.17** |
| **Baseline 2: Diurnal Statistical** | 17.89 | 18.40 | 19.06 | 20.21 | 21.53 | 22.88 | 24.86 |
| **Baseline 3: LightGBM Regressor** | **6.69** | **10.21** | **15.37** | **17.36** | 21.15 | 28.44 | 32.02 |

### Detailed Metric Matrix by Horizon

| Horizon | Metric | Naive Persistence | Diurnal Statistical | LightGBM Regressor |
| :---: | :--- | :---: | :---: | :---: |
| **+1 Hour** | MAE ($\mu\text{g/m}^3$) | 9.26 | 17.89 | **6.69** (-27.8%) |
| | RMSE ($\mu\text{g/m}^3$) | 12.77 | 21.25 | **8.92** (-30.1%) |
| | $R^2$ Score | 0.784 | 0.402 | **0.895** |
| | Bias MBE | +0.02 | +10.69 | +1.30 |
| **+3 Hours** | MAE ($\mu\text{g/m}^3$) | 15.81 | 18.40 | **10.21** (-35.4%) |
| | RMSE ($\mu\text{g/m}^3$) | 21.17 | 21.90 | **13.63** (-35.6%) |
| | $R^2$ Score | 0.408 | 0.367 | **0.755** |
| | Bias MBE | -0.02 | +10.71 | +2.18 |
| **+6 Hours** | MAE ($\mu\text{g/m}^3$) | 20.19 | 19.06 | **15.37** (-23.9%) |
| | RMSE ($\mu\text{g/m}^3$) | 27.20 | 22.70 | **19.78** (-27.3%) |
| | $R^2$ Score | 0.027 | 0.323 | **0.486** |
| | Bias MBE | -0.09 | +10.78 | +8.99 |
| **+12 Hours** | MAE ($\mu\text{g/m}^3$) | 20.65 | 20.21 | **17.36** (-15.9%) |
| | RMSE ($\mu\text{g/m}^3$) | 27.98 | 24.15 | **22.62** (-19.2%) |
| | $R^2$ Score | -0.023 | 0.238 | **0.331** |
| | Bias MBE | +0.12 | +11.09 | +7.55 |
| **+24 Hours** | MAE ($\mu\text{g/m}^3$) | **18.67** | 21.53 | 21.15 |
| | RMSE ($\mu\text{g/m}^3$) | **25.72** | 25.56 | 26.28 |
| | $R^2$ Score | **0.150** | 0.160 | 0.112 |
| | Bias MBE | **+0.56** | +11.25 | +12.15 |
| **+48 Hours** | MAE ($\mu\text{g/m}^3$) | **21.27** | 22.88 | 28.44 |
| | RMSE ($\mu\text{g/m}^3$) | **28.82** | **27.23** | 33.58 |
| | $R^2$ Score | -0.041 | **0.071** | -0.413 |
| **+72 Hours** | MAE ($\mu\text{g/m}^3$) | **22.17** | 24.86 | 32.02 |
| | RMSE ($\mu\text{g/m}^3$) | 29.67 | **29.11** | 36.11 |
| | $R^2$ Score | -0.130 | -0.087 | -0.673 |

---

# Horizon-wise Performance Analysis

The empirical results reveal two distinct operational regimes:
1. **Short-to-Medium Range ($+1\text{h}$ to $+12\text{h}$): Machine Learning Dominates.**
   - At $+1\text{h}$, LightGBM achieves an impressive **$\text{MAE} = 6.69\ \mu\text{g/m}^3$ and $R^2 = 0.895$**, outperforming Persistence by $27.8\%$.
   - At $+3\text{h}$, LightGBM maintains high skill with **$\text{MAE} = 10.21\ \mu\text{g/m}^3$ ($R^2 = 0.755$)**, beating Persistence by $35.4\%$.
   - At $+6\text{h}$ and $+12\text{h}$, LightGBM continues to lead with $\text{MAE} = 15.37$ and $17.36\ \mu\text{g/m}^3$.
2. **Day-Ahead & Extended Range ($+24\text{h}$ to $+72\text{h}$): Pure Tabular ML Degrades.**
   - Beyond 24 hours, the autocorrelation signal from local station lags decays towards zero.
   - At $+24\text{h}$, 24-hour diurnal persistence ($\text{MAE} = 18.67\ \mu\text{g/m}^3$) outperforms pure autoregressive LightGBM ($\text{MAE} = 21.15\ \mu\text{g/m}^3$).
   - At $+48\text{h}$ and $+72\text{h}$, pure tabular LightGBM exhibits severe drift ($\text{MAE} = 32.02\ \mu\text{g/m}^3$, $R^2 < 0$), while Persistence and Climatological Mean remain bounded around $22-24\ \mu\text{g/m}^3$.

---

# Station-wise Performance Breakdown (+24h Day-Ahead Horizon)

| Station ID | Station Name | Persistence MAE | Diurnal Stat MAE | LightGBM MAE | LightGBM $R^2$ | Best Model |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: |
| `DL_ANAND_VIHAR` | Anand Vihar - DPCC | **18.79** | 20.89 | 20.97 | 0.126 | Persistence |
| `DL_BAWANA` | Bawana - DPCC | **18.74** | 20.87 | 20.98 | 0.124 | Persistence |
| `DL_IGI_AIRPORT` | IGI Airport - IMD | **18.23** | 22.28 | 21.43 | 0.084 | Persistence |
| `DL_PUNJABI_BAGH` | Punjabi Bagh - DPCC | **18.17** | 20.51 | 21.25 | -0.038 | Persistence |
| `DL_RK_PURAM` | R.K. Puram - DPCC | **19.41** | 23.07 | 21.02 | **0.238** | LightGBM ($R^2$) |

---

# Event Performance (Smog Episode Tracking)

Inspection of the mid-February pollution episode in `reports/figures/pollution_event_analysis.png`:
- When PM2.5 surged from $45\ \mu\text{g/m}^3$ to $180\ \mu\text{g/m}^3$ due to a nocturnal inversion event, LightGBM successfully predicted the rising limb 3 hours in advance, whereas Persistence lagged behind by the forecast interval.
- However, during the peak stagnation hours, LightGBM slightly under-predicted the extreme spike peak, reflecting regression-to-the-mean shrinkage.

---

# Failure Cases & Scientific Interpretation

1. **Why Pure ML Degrades at 48h–72h:**
   A purely data-driven model conditioned only on historical lags cannot predict future synoptic weather fronts that have not yet arrived. Without coupling to forward numerical weather prediction (NWP) wind fields and upstream stubble plume transport, autoregressive feature trees lose predictive leverage.
2. **The "Persistence Paradox" at 24h:**
   Because Delhi air pollution follows a pronounced 24-hour diurnal cycle (nocturnal peak due to boundary layer collapse, mid-afternoon drop due to solar convective mixing), predicting $y(t+24) \approx y(t)$ is mathematically equivalent to predicting the exact same hour on the previous day. This creates a formidable baseline that purely tabular models struggle to beat without physical advection inputs.

---

# Limitations of the Baseline

1. **No Spatial Transport:** The baseline models treat each station independently and do not account for upwind smoke advection from Punjab/Haryana.
2. **Static Station Meteorology:** Uses single-column downscaled weather rather than a 3D atmospheric grid.
3. **No Dynamic Chemistry:** Photochemical reactions (e.g. $O_3$ titration, secondary organic aerosol formation) are absent.

---

# Next Improvement: Transition to Phase 5 & Feature Store Extension

The empirical baseline results provided definitive proof of the roadmap's thesis:
To break through the 24-hour barrier and achieve accurate 72-hour forecasts, we proceeded to:
**PHASE 5 — ATMOSPHERIC VARIABLES + INVERSION + REGIONAL FIRE/PLUME PIPELINE** (Now Completed):
- Integrated dynamic forward wind trajectories from Open-Meteo IFS/GFS via Forward Lagrangian Segmented Puff modeling.
- Incorporated NASA FIRMS VIIRS 375m upwind Fire Radiative Power (FRP) advection and Wooster et al. (2005) smoke emission flux.
- Added continuous low-level temperature lapse rate ($\Gamma_{\text{low}}$), Inversion Trapping Severity Index (ITSI), and boundary layer volume contraction ratio ($R_{\text{pbl}}$).
- Expanded canonical tabular feature store (`data/features/delhi_ncr_features.csv`) from 36 to **42 strictly time-causal features**, with zero future data leakage.

