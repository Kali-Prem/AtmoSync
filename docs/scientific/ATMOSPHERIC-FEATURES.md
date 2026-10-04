# Atmospheric Feature Engineering Specification

**Document ID:** `DOC-SCI-001`  
**Phase:** Phase 5 — Atmospheric Variables + Inversion + Regional Fire/Plume Pipeline  
**System:** ATMOSYNC  
**Date:** October 2026  
**Status:** Approved Scientific Specification  

---

## 1. Scientific Overview & Rationale

Air pollution concentrations in Delhi NCR are governed by a non-linear coupling between surface emissions, boundary-layer dynamics, and regional advection. Traditional regression or naïve machine-learning models frequently fail because they treat circular wind direction as a linear variable or neglect the volume contraction of the planetary boundary layer.

This specification documents the rigorous, physically grounded transformations implemented in `scientific/preprocessing/wind.py`, `scientific/preprocessing/pbl.py`, and `ml/features/pipeline.py`.

---

## 2. Wind Feature Transformations

### 2.1 Cartesian Velocity Components ($u, v$)
- **Scientific Rationale:** Meteorological wind compass direction has an artificial numeric discontinuity between 360° and 0° North. Decomposing wind into Cartesian velocity components ($u, v$) maps wind into a smooth, continuous 2D Euclidean vector space.
- **Reference:** WMO-No. 8, *Guide to Meteorological Instruments and Methods of Observation* (Chapter 5: Measurement of Surface Wind).
- **Formulas:**
  $$\text{rad} = \text{radians}(\theta_{\text{met}})$$
  $$u = -U \cdot \sin(\text{rad}) \quad (\text{Zonal velocity: positive Eastward, m/s})$$
  $$v = -U \cdot \cos(\text{rad}) \quad (\text{Meridional velocity: positive Northward, m/s})$$
  Where $U$ is wind speed ($m/s$) and $\theta_{\text{met}}$ is meteorological wind direction (degrees FROM North, 0–360°).
- **Reconstruction Algorithm:**
  $$U = \sqrt{u^2 + v^2}$$
  $$\theta_{\text{met}} = (270^\circ - \text{atan2}(v, u) \cdot \frac{180^\circ}{\pi}) \pmod{360^\circ}$$
- **Assumptions:** Horizontal velocity vector is non-divergent across the local station radius (~5 km).
- **Limitations:** Does not account for microscale urban canyon vortex circulations without building geometry CFD.

### 2.2 Cyclical Trigonometric Direction
- **Scientific Rationale:** For tree-based models (LightGBM) that do not natively perform Euclidean vector arithmetic, decomposing direction into unit circle projections prevents split-point artifacts at the North boundary:
  $$\text{wind\_dir\_sin} = \sin(\text{rad})$$
  $$\text{wind\_dir\_cos} = \cos(\text{rad})$$
- **Units:** Dimensionless $[-1.0, +1.0]$.

### 2.3 Regional Transport Alignment Toward Delhi NCR
- **Scientific Rationale:** A plume emitted from an upstream source (e.g. agricultural fire in Sangrur, Punjab) only threatens Delhi NCR if the wind blows towards Delhi.
- **Reference:** Stull, R. B. (1988), *An Introduction to Boundary Layer Meteorology*, Kluwer Academic Publishers.
- **Mathematical Formulation:**
  $$\theta_{\text{blows\_toward}} = (\theta_{\text{met}} + 180^\circ) \pmod{360^\circ}$$
  $$\beta_{\text{target}} = \text{Bearing}_{\text{GreatCircle}}(\text{lat}_{\text{src}}, \text{lon}_{\text{src}}, \text{lat}_{\text{target}}, \text{lon}_{\text{target}})$$
  $$\text{Alignment} = \cos(\theta_{\text{blows\_toward}} - \beta_{\text{target}})$$
- **Interpretation:**
  - $+1.0$: Wind blows directly down the transport corridor to Delhi NCR (maximum advection risk).
  - $0.0$: Cross-gradient / perpendicular wind (zero advection along corridor).
  - $-1.0$: Wind blows directly away from Delhi NCR (plume transported elsewhere).

---

## 3. Boundary Layer Volume Contraction

### 3.1 Contraction Ratio ($R_{\text{pbl}}$)
- **Scientific Rationale:** Assuming constant ground emissions $Q$ ($g/s$), pollutant concentration in a uniformly mixed boundary layer scales inversely with boundary layer height $h$ ($C \propto Q / h$). As the boundary layer collapses from afternoon convective depths (~1500 m) to nocturnal inversion depths (~100 m), the effective atmospheric mixing volume contracts by a factor of 15.
- **Formula:**
  $$R_{\text{pbl}} = \frac{h_{\text{ref}}}{\max(h_{\text{min}}, h_{\text{pbl}})}$$
  Where $h_{\text{ref}} = 1500.0\text{ m}$ (standard well-mixed convective boundary layer) and $h_{\text{min}} = 20.0\text{ m}$.
- **Units:** Dimensionless expansion factor ($1.0\times$ to $75.0\times$).

---

## 4. Atmospheric Ventilation & Stagnation

### 4.1 Ventilation Index ($VI$)
- **Scientific Rationale:** Quantifies the atmospheric volume clearing rate per unit horizontal width.
- **Reference:** CPCB / IMD Environmental Meteorology Guidelines; EPA-454/R-99-005.
- **Formula:**
  $$VI = h_{\text{pbl}} \cdot \bar{U} = h_{\text{pbl}} \cdot \max(0.5, 1.2 \cdot U_{10m}) \quad (m^2/s)$$
  Where $1.2 \cdot U_{10m}$ approximates the mean boundary layer transport speed via power-law wind profile.
- **Standard Thresholds (CPCB / IMD):**
  - $VI < 2000\text{ }m^2/s$: **Critical Stagnation** (Pollutant accumulation guaranteed)
  - $2000 \le VI \le 6000\text{ }m^2/s$: **Moderate Ventilation**
  - $VI > 6000\text{ }m^2/s$: **High Dispersion** (Rapid pollutant clearing)

---

## 5. Summary Feature Dictionary

| Feature Name | Derived From | Formula / Method | Physical Meaning |
|---|---|---|---|
| `wind_u` | `wind_speed`, `wind_dir` | $-U \sin(\theta)$ | Zonal transport velocity ($m/s$) |
| `wind_v` | `wind_speed`, `wind_dir` | $-U \cos(\theta)$ | Meridional transport velocity ($m/s$) |
| `wind_dir_sin` | `wind_dir` | $\sin(\theta)$ | Cyclical east-west component |
| `wind_dir_cos` | `wind_dir` | $\cos(\theta)$ | Cyclical north-south component |
| `wind_transport_alignment` | `wind_dir`, source, target | $\cos(\theta_{\text{toward}} - \beta)$ | Smoke transport threat factor |
| `pbl_contraction_ratio` | `pbl_height` | $1500 / \max(20, h)$ | Atmospheric compression multiplier |
| `ventilation_index` | `pbl_height`, `wind_speed`| $h \cdot (1.2 \cdot U)$ | Dispersion capacity ($m^2/s$) |
| `stagnation_indicator` | ITSI composite | $\text{ITSI} / 100.0$ | Trapping severity index ($[0, 1]$) |
