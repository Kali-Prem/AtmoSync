# Atmospheric Inversion Detection & Trapping Pipeline Specification

**Document ID:** `DOC-SCI-003`  
**Phase:** Phase 5 — Atmospheric Variables + Inversion + Regional Fire/Plume Pipeline  
**System:** ATMOSYNC  
**Date:** October 2026  
**Status:** Approved Scientific Specification  

---

## 1. Physical Definition & Thermodynamics

An atmospheric temperature inversion occurs when air temperature increases with altitude ($\frac{\partial T}{\partial z} > 0$), in direct contradiction to standard tropospheric lapse cooling (standard dry adiabatic lapse rate $\Gamma_d = -0.98\text{ }^\circ\text{C}/100\text{m}$). 

In the thermodynamic equation:
$$\frac{\partial \theta}{\partial z} > 0$$
The positive vertical potential temperature gradient generates strong static stability (Brunt-Väisälä frequency $N^2 = \frac{g}{\theta}\frac{\partial \theta}{\partial z} > 0$). Buoyancy acts as a restoring force, completely suppressing vertical convective mixing and turbulent eddies. As a result, particulate emissions emitted near the surface cannot disperse upward and remain trapped in a thin ground layer.

---

## 2. Multi-Level Vertical Profile Detection Engine

Implemented in `scientific/preprocessing/inversion.py`, the engine processes vertical temperature soundings across standardized levels:
- **Surface Level:** $2\text{ m}$ AGL ($T_{2m}$)
- **Tower / Lower Boundary:** $80\text{ m}$ AGL ($T_{80m}$)
- **Mid Boundary Layer:** $120\text{ m}$ AGL ($T_{120m}$)
- **Boundary Layer Top:** $180\text{ m}$ AGL ($T_{180m}$)

### Classification Taxonomy
1. `SURFACE_BASED_INVERSION`: Temperature gradient is positive in the lowest measured layer ($\frac{T_{80m} - T_{2m}}{78} > 0$). Thermal inversion touches the ground surface.
2. `ELEVATED_INVERSION`: Lowest layer exhibits normal cooling, but an inverted layer ($\frac{\partial T}{\partial z} > 0$) exists aloft (e.g. between 80 m and 180 m), acting as an impenetrable lid.
3. `STABLE_LAYER`: Temperature decreases with height, but at a rate weaker than the standard environmental lapse rate ($\frac{\partial T}{\partial z} > -0.65\text{ }^\circ\text{C}/100\text{m}$), suppressing turbulence without thermal reversal.
4. `NEUTRAL_UNSTABLE`: Vigorous convective mixing with steep negative lapse rate ($\frac{\partial T}{\partial z} \le -0.65\text{ }^\circ\text{C}/100\text{m}$).
5. `UNAVAILABLE`: Fewer than two vertical levels are present; no physical gradient can be computed.

---

## 3. Mathematical Formulation of Continuous Inversion Strength

Rather than relying on arbitrary categorical cutoffs, ATMOSYNC computes the continuous physical lapse rate gradient across the lower boundary layer:

$$\Gamma_{\text{low}} = \left( \frac{T_{\text{upper}} - T_{2\text{m}}}{\Delta z} \right) \times 100 \quad (^\circ\text{C} / 100\text{m})$$

- $\Gamma_{\text{low}} > 0$: Thermal inversion ($\Gamma_{\text{low}}$ measures positive inversion strength).
- $\Gamma_{\text{low}} = 0$: Isothermal layer.
- $\Gamma_{\text{low}} = -0.98$: Neutral dry adiabatic layer.
- $\Gamma_{\text{low}} < -1.0$: Strongly unstable superadiabatic convective layer.

Continuous inversion strength is reported as:
$$\text{inversion\_strength} = \max(0.0, \Gamma_{\text{low}})$$

---

## 4. Inversion Trapping Severity Index (ITSI)

To translate thermodynamic stability into a continuous operational index for non-specialist stakeholders and machine learning models, ATMOSYNC defines the **Inversion Trapping Severity Index (ITSI: 0 – 100)**:

$$\text{ITSI} = 100 \times \left( w_1 f_\gamma + w_2 f_{\text{pbl}} + w_3 f_{\text{wind}} \right)$$

Where:
1. **Lapse Rate Factor ($w_1 = 0.45$):**
   $$f_\gamma = \min\left(1.0, \max\left(0.0, \frac{\Gamma_{\text{low}}}{3.0}\right)\right)$$
   ($\ge 3.0\text{ }^\circ\text{C}/100\text{m}$ represents severe radiative trapping documented in Delhi winter studies).
2. **PBL Contraction Factor ($w_2 = 0.35$):**
   $$f_{\text{pbl}} = \min\left(1.0, \max\left(0.0, \frac{800.0 - h_{\text{pbl}}}{800.0 - 50.0}\right)\right)$$
3. **Calm Stagnation Factor ($w_3 = 0.20$):**
   $$f_{\text{wind}} = \min\left(1.0, \max\left(0.0, \frac{4.0 - U_{10\text{m}}}{4.0 - 0.5}\right)\right)$$

### Validation & Interpretation
- **$\text{ITSI} \ge 75$ (Severe Trapping):** Nocturnal boundary layer $< 100\text{ m}$, surface inversion $> 2.0\text{ }^\circ\text{C}/100\text{m}$, wind $< 1.0\text{ m/s}$. Pollutant accumulation is rapid and extreme.
- **$\text{ITSI} \le 25$ (Clearing):** Unstable or convective boundary layer $> 800\text{ m}$, brisk mechanical shear $> 3.5\text{ m/s}$. Trapping risk is negligible.

---

## 5. Graceful Missing-Data Behavior

If vertical profile levels are missing from NWP streams:
- `inversion_detection_method` is explicitly set to `"unavailable"`.
- `inversion_present` is set to `False`.
- `inversion_strength` is set to `null` (`NaN`).
- `inversion_quality_flag` is set to `"MISSING"`.
Values are never fabricated.
