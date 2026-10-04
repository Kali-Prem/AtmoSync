# Baseline Forecasting Models & Benchmark Strategy

**Document ID:** `DOC-RES-007`  
**Phase:** Research & Data Foundation  
**System:** ATMOSYNC  
**Date:** October 2026  
**Status:** Implementation-Ready & Mathematically Formalized  

---

## 1. Rationale for Multi-Tiered Baselines

In operational air quality modeling, machine-learning claims are meaningless without rigorous comparison against established statistical and physical baselines. Complex deep learning models frequently achieve lower validation loss on average days simply by memorizing diurnal cycles, yet completely fail during abrupt severe smog episodes or sudden synoptic wind shifts.

To scientifically prove the superiority of ATMOSYNC's coupled physics-ML engine, we establish three formal benchmark tiers:
1. **Tier 1: Persistence Baselines** (The fundamental benchmark for short lead times).
2. **Tier 2: Statistical & Autoregressive Baselines** (Classical atmospheric time-series regressions).
3. **Tier 3: Standard Machine Learning Baselines** (Off-the-shelf tabular and deep learning architectures without coupled physics).

---

## 2. Mathematical Definition of Baselines

```
+---------------------------------------------------------------------------------------------------------+
|                                    BASELINE BENCHMARK TAXONOMY                                          |
+=========================================================================================================+
| BASELINE MODEL             | MATHEMATICAL FORMULATION                      | PRIMARY WEAKNESS           |
+----------------------------+-----------------------------------------------+----------------------------+
| 1. Naive Persistence       | C_hat(t+h) = C(t)                             | Rapidly degrades for h > 3h|
+----------------------------+-----------------------------------------------+----------------------------+
| 2. Diurnal (24h) Persist.  | C_hat(t+h) = C(t + h - 24)                    | Blind to weather shifts &  |
|                            |                                               | stubble burning arrivals   |
+----------------------------+-----------------------------------------------+----------------------------+
| 3. Autoregressive (ARIMAX) | C_hat(t+h) = sum(a_i*C(t-i)) + sum(b_j*X(t+h))| Linear; cannot model non-  |
|                            |                                               | linear chemical kinetics   |
+----------------------------+-----------------------------------------------+----------------------------+
| 4. Standard XGBoost/LightGBM| C_hat(t+h) = f_trees(Lags, NWP_sfc)          | Lacks vertical stability   |
|    (Uncoupled Features)    |                                               | & transboundary plume aware|
+----------------------------+-----------------------------------------------+----------------------------+
| 5. Standard LSTM / GRU     | h_t = sigma(W*x_t + U*h_{t-1}); y_t = W_o*h_t | Overfits on small records; |
|                            |                                               | high inference latency     |
+---------------------------------------------------------------------------------------------------------+
```

### 2.1 Baseline Tier 1: Persistence Forecasters

#### Baseline 1A: Naive Persistence (Last Known Observation)
$$\hat{C}(t+h) = C(t) \quad \forall \, h \in [1, 72]$$
- *Interpretation:* The pollutant concentration at lead time $h$ will remain identical to the concentration observed at time $t$.
- *Behavior:* Strong baseline for ultra-short horizons ($h \le 2\text{ hours}$), but exhibits severe error amplification beyond $h=6\text{ hours}$ as the diurnal boundary layer changes.

#### Baseline 1B: Diurnal 24-Hour Cyclic Persistence
$$\hat{C}(t+h) = C(t + h - 24 \cdot k)$$
where $k = \lfloor \frac{h-1}{24} \rfloor + 1$.
- *Interpretation:* Tomorrow's concentration at 08:00 IST will equal yesterday's concentration at 08:00 IST.
- *Behavior:* Captures basic morning/evening traffic spikes, but fails completely when a synoptic cold front or agricultural plume changes regional concentrations by $300\%$.

#### Baseline 1C: Climatological Dampened Persistence
$$\hat{C}(t+h) = e^{-h/\tau} C(t) + (1 - e^{-h/\tau}) \bar{C}_{\text{seasonal}}(h_{\text{tod}})$$
- *Interpretation:* Smoothly relaxes from the current observation toward the long-term historical mean for that specific hour of day ($\bar{C}_{\text{seasonal}}$), with decorrelation timescale $\tau \approx 12\text{ hours}$.

---

### 2.2 Baseline Tier 2: Statistical Autoregressive Models (ARIMAX / MLR)

#### Multiple Linear Regression with Exogenous Meteorology (MLR-Lag)
$$\hat{C}(t+h) = \beta_0 + \sum_{i \in \{0, 1, 2, 24\}} \alpha_i C(t-i) + \sum_{k=1}^K \gamma_k X_k^{\text{NWP}}(t+h) + \epsilon$$
where exogenous variables $X_k^{\text{NWP}}$ include forecasted 2m temperature ($T$), relative humidity ($RH$), wind speed ($WS$), and wind direction components ($U, V$).
- *Estimation:* Ordinary Least Squares (OLS) with Ridge $L_2$ regularization penalty.
- *Limitation:* Assumes strictly linear relationships. For example, wind speed dilution is fundamentally non-linear ($\propto 1/U$), and photochemical ozone formation is non-monotonic with respect to $NO_x$ and solar flux.

---

### 2.3 Baseline Tier 3: Standard Machine Learning Models (Uncoupled)

#### Model 3A: Standard Random Forest Regressor
- Ensemble of 100 de-correlated CART regression trees.
- Features: Station historical lags + standard surface NWP variables ($T, RH, WS, WD$).
- Limitation: High memory footprint, slow tree traversal, unable to extrapolate beyond training target extrema.

#### Model 3B: Uncoupled Gradient Boosted Decision Trees (XGBoost / LightGBM)
- Fast histogram-based gradient boosting.
- Features: Same surface features without boundary layer height, without Bulk Richardson inversion indices, and without satellite fire plume transport.
- Role: Serves as the direct control baseline to prove the value of our physical diagnostic and plume modules.

#### Model 3C: Standard Sequence-to-Sequence LSTM
- 2-layer LSTM (hidden size 64) with recurrent dropout and dense linear projection head.
- Input sequence: Past 24 hours of station observations $\rightarrow$ Output sequence: Future 72 hours.
- Limitation: Struggles with sudden regime shifts; acts as a smoother rather than capturing extreme peaks.

---

## 3. Evaluation Metrics & Statistical Target Criteria

To evaluate all models under both average conditions and critical episodic emergencies, we adopt five standard scientific metrics:

```
+---------------------------------------------------------------------------------------------------------+
|                                    FORMAL EVALUATION METRICS SUITE                                      |
+=========================================================================================================+
| METRIC                       | MATHEMATICAL FORMULA                             | PURPOSE               |
+------------------------------+--------------------------------------------------+-----------------------+
| Root Mean Squared Error      | RMSE = sqrt( (1/N) * sum( (y_i - y_hat_i)^2 ) )  | Penalizes large       |
| (RMSE)                       |                                                  | outlier errors        |
+------------------------------+--------------------------------------------------+-----------------------+
| Mean Absolute Error          | MAE = (1/N) * sum( |y_i - y_hat_i| )             | Robust linear error   |
| (MAE)                        |                                                  | magnitude indicator   |
+------------------------------+--------------------------------------------------+-----------------------+
| Coefficient of Determination | R^2 = 1 - ( sum( (y_i - y_hat_i)^2 ) /           | Variance explained    |
| (R²)                         |             sum( (y_i - y_mean)^2 ) )            | by the model          |
+------------------------------+--------------------------------------------------+-----------------------+
| Index of Agreement           | d = 1 - [ sum( (y_i - y_hat_i)^2 ) /             | Standard atmospheric  |
| (Willmott Index, d)          |   sum( (|y_hat_i - y_m| + |y_i - y_m|)^2 ) ]     | validation metric     |
+------------------------------+--------------------------------------------------+-----------------------+
| Critical Success Index (CSI) | CSI = Hits / (Hits + Misses + FalseAlarms)       | Evaluates emergency   |
| for Severe AQI (PM2.5 > 250) |                                                  | GRAP alert accuracy   |
+---------------------------------------------------------------------------------------------------------+
```

---

## 4. Benchmark Performance Target Matrix

To claim scientific advancement in Problem Statement 26082, ATMOSYNC's coupled system must demonstrate statistically significant improvements over each baseline across the 72-hour forecast horizon:

```
+---------------------------------------------------------------------------------------------------------+
|                           QUANTITATIVE PERFORMANCE TARGETS (PM2.5 FORECAST)                             |
+=========================================================================================================+
| FORECAST HORIZON | NAIVE PERSISTENCE | UNCOUPLED LIGHTGBM | ATMOSYNC COUPLED HYBRID    | MINIMUM TARGET |
|                  | (RMSE in ug/m3)   | (RMSE in ug/m3)    | (TARGET RMSE in ug/m3)     | IMPROVEMENT    |
+------------------+-------------------+--------------------+----------------------------+----------------+
| T + 1 to T + 6h  | ~22.5 ug/m3       | ~18.0 ug/m3        | <= 14.5 ug/m3              | > 19% vs ML    |
| T + 7 to T + 24h | ~58.0 ug/m3       | ~38.5 ug/m3        | <= 26.0 ug/m3              | > 32% vs ML    |
| T + 25 to T + 48h| ~82.0 ug/m3       | ~54.0 ug/m3        | <= 35.0 ug/m3              | > 35% vs ML    |
| T + 49 to T + 72h| ~105.0 ug/m3      | ~69.0 ug/m3        | <= 44.0 ug/m3              | > 36% vs ML    |
+------------------+-------------------+--------------------+----------------------------+----------------+
| Severe Peak CSI  | 0.28              | 0.52               | >= 0.74                    | +42% Recall    |
| (PM2.5 > 250)    |                   |                    |                            |                |
+---------------------------------------------------------------------------------------------------------+
```

### Why ATMOSYNC's Coupled Features Beat the Baselines:
1. **At T+6 to T+24h:** Baselines predict smooth diurnal curves and miss nocturnal boundary layer collapse. ATMOSYNC's diagnosed $PBLH$ directly forces pollutant concentration to increase when the mixing volume contracts.
2. **At T+24 to T+72h:** Uncoupled ML models have zero awareness of stubble burning plumes entering from Punjab. ATMOSYNC's Lagrangian smoke advection engine injects upstream mass loading $\Delta PM_{2.5}^{plume}$, capturing sudden multi-day spikes days before they arrive.
