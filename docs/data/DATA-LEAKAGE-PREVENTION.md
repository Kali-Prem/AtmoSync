# Data Leakage Prevention Specification

**Document ID:** `DOC-DAT-007`  
**Phase:** Phase 4 — Real Data Pipeline + Baseline Air-Quality Forecasting  
**System:** ATMOSYNC  
**Date:** October 2026  
**Status:** Approved Specification  

---

## 1. The Fundamental Principle of Time-Causal Forecasting

In time-series air quality forecasting, data leakage is the fatal failure mode where information from future time steps ($> T$) inadvertently contaminates feature preparation for a forecast initialized at time $T$.

> **INVIOLABLE CAUSALITY MANDATE:**  
> For any forecast generated at forecast initialization timestamp $T$:  
> **Only observational and diagnostic data available at or strictly before $T$ may enter the model's feature vector.**  
> $$\mathbf{x}_T = f(\{y_t, \mathbf{m}_t \mid t \le T\})$$  
> Under no circumstances may $y_{T + \delta}$ (where $\delta > 0$) be accessible during feature transformation.

---

## 2. Leakage Vulnerabilities & Defensive Engineering

### 2.1 Rolling-Window Leakage (Center-Aligned Windows)
- **Vulnerability:** Standard rolling statistics (e.g. `df['pm25'].rolling(24).mean()`) can default to centered windows if improperly configured, incorporating 12 hours of future observations into the current feature.
- **Defensive Rule:** All rolling windows must explicitly specify `closed='left'` or use right-aligned backward-looking windows strictly over past observations:
  $$\text{RollingMean}_{24}(T) = \frac{1}{24} \sum_{k=0}^{23} y_{T - k}$$

### 2.2 Target Lag Leakage in Multi-Step Forecasting
- **Vulnerability:** When predicting $y_{T+h}$ ($h \in \{1, 3, 6, 12, 24, 48, 72\}$), an autoregressive formulation must not feed observed values between $T+1$ and $T+h-1$ as inputs to the model.
- **Defensive Rule:** For a direct multi-horizon model forecasting horizon $+h$:
  - The feature vector $\mathbf{x}_T$ consists only of lags observed up to $T$ (e.g., $y_T, y_{T-1}, y_{T-3}, \dots$).
  - Target label is strictly aligned as:
    $$\text{Target}_h(T) = y_{T+h}$$

### 2.3 Global Scaler / Normalizer Leakage
- **Vulnerability:** Fitting scalers (e.g., `StandardScaler`, `MinMaxScaler`) over the entire dataset before train/test splitting leaks test set distributions (mean and variance) into the training set.
- **Defensive Rule:** Scalers, normalizers, and encoders are fit **strictly and exclusively on the training partition**, and applied unchanged to validation and test partitions:
  ```python
  scaler = StandardScaler()
  X_train_scaled = scaler.fit_transform(X_train)
  X_val_scaled = scaler.transform(X_val)
  X_test_scaled = scaler.transform(X_test)
  ```

### 2.4 Random Shuffling Contamination
- **Vulnerability:** Standard K-Fold cross-validation or random train-test splitting shuffles adjacent time steps across train and test partitions. Due to high autocorrelation in air quality ($PM_{2.5}(t) \approx PM_{2.5}(t-1)$), a model merely interpolates between train samples rather than forecasting, yielding artificially perfect $R^2 > 0.99$ that collapses in production.
- **Defensive Rule:** **Random shuffling is strictly forbidden.** All splits are strictly chronological forward splits.

---

## 3. Automated Leakage Validation Checks

The pipeline implements an automated `DataLeakageValidator` executed prior to any training session:

1. **Future Timestamp Check:** Asserts that for every row in feature matrix $\mathbf{X}$, no timestamp exceeds the forecast initialization timestamp $T$.
2. **Feature-Target Correlation Audit:** Audits correlation between each feature and target $y_{T+h}$. Any feature exhibiting suspicious near-perfect correlation ($r > 0.98$ for $h \ge 6$) triggers an automated warning and inspection flag.
3. **Temporal Monotonicity Assertion:** Asserts that $\max(T_{\text{train}}) < \min(T_{\text{val}}) < \min(T_{\text{test}})$. Zero temporal overlap is enforced.
4. **Target Variable Absence:** Asserts that the target column $y_{T+h}$ and unlagged target $y$ are completely removed from the training feature set $\mathbf{X}$.
