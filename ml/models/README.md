# Model Artifacts & Architecture Directory

This directory contains trained model artifacts, baseline estimators, and benchmark evaluation specifications for **VayuDrishti NCR**.

---

## 1. Directory Structure

```
ml/models/
├── README.md               # Model artifacts catalog & hyperparameter documentation
├── interface.py            # ForecastRefinementModel abstract base class
├── baselines.py            # Naive Persistence, Diurnal Statistical, and LightGBM implementations
└── artifacts/              # Serialized model weights (.joblib)
    ├── lightgbm_h1.joblib  # Direct 1-hour ahead regressor (MAE: 6.69, R2: 0.895)
    ├── lightgbm_h3.joblib  # Direct 3-hour ahead regressor (MAE: 10.21, R2: 0.755)
    ├── lightgbm_h6.joblib  # Direct 6-hour ahead regressor (MAE: 15.37, R2: 0.486)
    ├── lightgbm_h12.joblib # Direct 12-hour ahead regressor (MAE: 17.36, R2: 0.331)
    ├── lightgbm_h24.joblib # Direct 24-hour ahead regressor (MAE: 21.15, R2: 0.112)
    ├── lightgbm_h48.joblib # Direct 48-hour ahead regressor (MAE: 28.44, R2: -0.413)
    └── lightgbm_h72.joblib # Direct 72-hour ahead regressor (MAE: 32.02, R2: -0.673)
```

---

## 2. Model Profiles & Hyperparameters

### 2.1 Baseline 1: Naive Persistence
- **Formulation:** $\hat{y}(t+h) = y(t)$
- **Parameters:** None (Zero-compute mathematical lower bound).
- **Purpose:** Establishes the absolute benchmark that any learned model must beat to claim forecasting skill.

### 2.2 Baseline 2: Statistical Diurnal + Rolling Mean
- **Formulation:** $\hat{y}(t+h) = \alpha \cdot \text{DiurnalMean}((\text{hour}+h)\%24) + (1-\alpha) \cdot \text{RollingMean}_{24}(t)$
- **Parameters:** $\alpha = 0.40$.
- **Training Set:** Oct 1, 2023 – Jan 7, 2024.

### 2.3 Baseline 3: LightGBM Direct Multi-Horizon Regressor
- **Architecture:** Independent gradient boosted decision tree (GBDT) per horizon.
- **Hyperparameters:**
  ```python
  {
      "objective": "regression",
      "metric": "mae",
      "boosting_type": "gbdt",
      "n_estimators": 150,
      "learning_rate": 0.05,
      "num_leaves": 31,
      "max_depth": 6,
      "min_child_samples": 20,
      "subsample": 0.8,
      "colsample_bytree": 0.8,
      "random_state": 42
  }
  ```
- **Serialization Format:** `joblib` binary payload.
- **Inference Latency:** $< 5\text{ ms}$ per station across all 7 horizons.
