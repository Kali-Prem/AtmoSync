# Experiment Reproducibility Guide

**Document ID:** `DOC-ML-002`  
**Phase:** Phase 4 — Real Data Pipeline + Baseline Air-Quality Forecasting  
**System:** ATMOSYNC  
**Date:** October 2026  
**Status:** 100% Deterministically Reproducible  

---

## 1. Provenance & Artifact Identifiers

To guarantee complete scientific reproducibility, all versions, configurations, and environment parameters used in the Phase 4 baseline experiment are cataloged below:

| Dimension | Specification | Canonical Identifier |
| :--- | :--- | :--- |
| **Dataset Version** | Delhi NCR Winter 2023–2024 Benchmark | `v1.0.0-delhi-winter-2023-2024` |
| **Data Manifest** | SHA256 checksums of 10 raw JSON files | `data/metadata/historical_manifest.json` |
| **Feature Version** | 36 Time-Causal Features | `v1.0.0-tabular-features-36` |
| **Code Version** | Phase 4 Repository Release | Git commit / Tag `phase-4-baseline` |
| **Model Architectures** | Naive Persistence, Diurnal Statistical, LightGBM | `v1.0.0-baseline-suite` |
| **Random Seed** | Fixed seed for tree construction and sampling | `SEED = 42` |
| **Python Environment** | Python 3.10.x | `requirements.txt` / `.venv` |
| **Primary Dependency Versions** | `numpy==2.2.6`, `pandas==2.3.3`, `scikit-learn==1.7.2`, `lightgbm==4.7.0` |

---

## 2. Step-by-Step Reproduction Instructions

Any developer or evaluator can reproduce the exact numbers in `docs/ml/BASELINE-RESULTS.md` by executing three commands from the repository root:

### Step 1: Environment Activation
```bash
# Windows PowerShell:
.\.venv\Scripts\Activate.ps1
# Linux / macOS:
source .venv/bin/activate
```

### Step 2: Build Clean Interim & Processed Datasets
```bash
python ml/datasets/builder.py
```
*Expected Output:*
- Processes 5 station raw files (3,648 hours each).
- Validates physical bounds and mass ratios ($PM_{2.5} \le PM_{10} \times 1.05$).
- Normalizes wind speeds to m/s, $CO$ to $\text{mg/m}^3$.
- Computes lapse rate $\Gamma_{\text{low}}$, ITSI, and Ventilation Index.
- Output: `data/processed/delhi_ncr_winter_2023_2024.csv` ($18,240 \text{ rows} \times 35 \text{ columns}$).

### Step 3: Run Feature Engineering, Training & Benchmark Evaluation
```bash
python ml/training/trainer.py
```
*Expected Output:*
- Audits time-causal features for zero data leakage.
- Partitions data chronologically:
  - Train: Oct 1, 2023 – Jan 7, 2024 ($11,880$ rows)
  - Val: Jan 8, 2024 – Jan 31, 2024 ($2,880$ rows)
  - Test: Feb 1, 2024 – Feb 29, 2024 ($3,480$ rows)
- Fits Persistence, Diurnal Statistical, and LightGBM models across horizons $+1\text{h}$, $+3\text{h}$, $+6\text{h}$, $+12\text{h}$, $+24\text{h}$, $+48\text{h}$, $+72\text{h}$.
- Saves 7 model artifacts into `ml/models/artifacts/`.
- Generates 8 research figures into `reports/figures/`.
- Outputs full JSON metrics into `data/metadata/baseline_evaluation_metrics.json`.

---

## 3. Verification Hashes

| Artifact Path | Expected File Size | Description |
| :--- | :--- | :--- |
| `data/processed/delhi_ncr_winter_2023_2024.csv` | ~4.7 MB | Processed historical ground + weather records |
| `data/features/delhi_ncr_features.csv` | ~11.5 MB | Complete 36-feature engineered matrix |
| `data/metadata/baseline_evaluation_metrics.json` | ~10.9 KB | Machine-readable metrics dictionary |
| `reports/figures/forecast_horizon_performance.png` | ~83.4 KB | Lead-time error progression plot |
