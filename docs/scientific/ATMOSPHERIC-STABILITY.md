# Atmospheric Stability & Pollution Trapping Framework

**Document ID:** `DOC-SCI-004`  
**Phase:** Phase 5 — Atmospheric Variables + Inversion + Regional Fire/Plume Pipeline  
**System:** ATMOSYNC  
**Date:** October 2026  
**Status:** Approved Scientific Specification  

---

## 1. Scientific Context: Stagnation vs. Exact Stability

In boundary-layer micrometeorology, full atmospheric static and dynamic stability is characterized by:
- Monin-Obukhov similarity theory ($\zeta = z / L$)
- Gradient Richardson number ($Ri_g$)
- Turbulence Kinetic Energy ($TKE$) budgets

In operational regional air-quality platforms with standard surface stations and 0.1° NWP grid points, high-frequency sonic anemometers ($20\text{ Hz}$ eddy covariance) are not available at all stations. Claiming to calculate "exact micrometeorological stability" from standard hourly weather station feeds would be scientifically unsupportable.

Therefore, ATMOSYNC adopts transparent, defensible indicators:
- `atmospheric_stagnation_indicator` (Dimensionless $[0.0, 1.0]$)
- `pollution_trapping_indicator` (Dimensionless $[0.0, 1.0]$)
- `ventilation_index_m2s` ($m^2/s$)

---

## 2. Atmospheric Stagnation Indicator Formulation

Implemented in `scientific/preprocessing/inversion.py`, the **Atmospheric Stagnation Indicator ($S_{\text{stag}}$)** evaluates the probability that the atmospheric column is incapable of dispersing surface-emitted pollutants:

$$S_{\text{stag}} = \frac{\text{ITSI}}{100.0}$$

Where ITSI combines low-level thermal lapse rate $\Gamma_{\text{low}}$, boundary-layer height $h_{\text{pbl}}$, and 10 m wind speed $U_{10m}$.

### Boundary Conditions
- $S_{\text{stag}} = 1.0$: Complete calm ($U < 0.5\text{ m/s}$), ground inversion $> 3.0\text{ }^\circ\text{C}/100\text{m}$, nocturnal boundary layer $< 50\text{ m}$.
- $S_{\text{stag}} = 0.0$: Convective boundary layer $> 1200\text{ m}$, brisk breeze $> 4.0\text{ m/s}$, lapse cooling $\le -0.65\text{ }^\circ\text{C}/100\text{m}$.

---

## 3. Pollution Trapping Indicator Formulation

The **Pollution Trapping Indicator ($I_{\text{trap}}$)** incorporates relative humidity and precipitation to reflect particulate hygroscopic growth and wet scavenging:

$$I_{\text{trap}} = S_{\text{stag}} \times f_{\text{RH}} \times f_{\text{precip}}$$

Where:
1. **Hygroscopic Growth Multiplier ($f_{\text{RH}}$):**
   $$f_{\text{RH}} = 1.0 + 0.3 \times \max\left(0.0, \frac{\text{RH} - 70.0}{30.0}\right)$$
   High relative humidity ($> 70\%$) accelerates secondary aerosol formation (sulfates/nitrates) and fog-droplet trapping.
2. **Precipitation Scavenging Suppressor ($f_{\text{precip}}$):**
   $$f_{\text{precip}} = \exp(-0.5 \times \text{precipitation\_rate\_mmh})$$
   Rainfall $> 2\text{ mm/h}$ efficiently washes out particulate mass from the boundary layer through wet deposition.

---

## 4. Input Variables & Quality Assurance

| Input Variable | Physical Role | Required QC Check |
|---|---|---|
| `boundary_layer_height_m` | Vertical mixing volume | Must be between $20\text{ m}$ and $5000\text{ m}$ |
| `wind_speed_10m` | Horizontal ventilation | Must be non-negative |
| `lapse_rate_low` | Vertical buoyancy suppression | Validated against multi-level temperature differences |
| `relative_humidity_2m` | Particulate condensation | Clamped between $0\%$ and $100\%$ |
| `precipitation` | Wet deposition sink | Non-negative rate |

If any critical input (`pbl_height_m` or `wind_speed_10m`) is `MISSING`, the indicator gracefully defaults to `null` with flag `MISSING`. No synthetic values are substituted.
