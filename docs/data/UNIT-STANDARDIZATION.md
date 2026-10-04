# Unit Standardization & Conversion Specification

**Document ID:** `DOC-DAT-004`  
**Phase:** Phase 4 — Real Data Pipeline + Baseline Air-Quality Forecasting  
**System:** ATMOSYNC  
**Date:** October 2026  
**Status:** Approved Specification  

---

## 1. Principles of Unit Standardization

Heterogeneous meteorological and atmospheric chemistry data providers report measurements in varying units (e.g., mixing ratios in parts per million or billion vs. mass concentrations in micrograms per cubic meter; temperatures in Kelvin vs. Celsius; wind speeds in km/h vs. m/s).

To prevent silent numerical bugs, **all internal models, database tables, and feature arrays operate strictly on Canonical Internal Units**.

All conversions are performed during the normalization stage using standard atmospheric pressure ($1013.25\ \text{hPa}$) and standard temperature ($25^\circ\text{C} = 298.15\ \text{K}$) conforming to the official Central Pollution Control Board (CPCB) and US-EPA STP guidelines.

---

## 2. Canonical Conversion Dictionary

### 2.1 Trace Gas Volume-to-Mass Conversions
The ideal gas law at standard temperature ($298.15\ \text{K}$) and pressure ($1013.25\ \text{hPa}$) yields a molar volume $V_m$:

$$V_m = \frac{R \cdot T}{P} = \frac{8.314462 \times 298.15}{101325} = 0.0244654\ \text{m}^3/\text{mol} = 24.4654\ \text{L/mol}$$

For any trace gas with molecular weight $M_w$ ($\text{g/mol}$):
- From $\text{ppb}$ to $\mu\text{g/m}^3$:
  $$C\ (\mu\text{g/m}^3) = C\ (\text{ppb}) \times \frac{M_w}{24.4654}$$
- From $\text{ppm}$ to $\text{mg/m}^3$:
  $$C\ (\text{mg/m}^3) = C\ (\text{ppm}) \times \frac{M_w}{24.4654}$$

| Pollutant | Molecular Formula | Molecular Weight ($M_w$) | External Unit | Canonical Internal Unit | Conversion Factor | Formula |
| :--- | :---: | :---: | :---: | :---: | :---: | :--- |
| **Carbon Monoxide** | $\text{CO}$ | $28.01\ \text{g/mol}$ | $\text{ppm}$ | $\mathbf{mg/m^3}$ | $1.1449$ | $C_{\text{mg/m}^3} = C_{\text{ppm}} \times \frac{28.01}{24.4654}$ |
| **Nitrogen Dioxide** | $\text{NO}_2$ | $46.01\ \text{g/mol}$ | $\text{ppb}$ | $\mathbf{\mu g/m^3}$ | $1.8806$ | $C_{\mu\text{g/m}^3} = C_{\text{ppb}} \times \frac{46.01}{24.4654}$ |
| **Sulphur Dioxide** | $\text{SO}_2$ | $64.07\ \text{g/mol}$ | $\text{ppb}$ | $\mathbf{\mu g/m^3}$ | $2.6188$ | $C_{\mu\text{g/m}^3} = C_{\text{ppb}} \times \frac{64.07}{24.4654}$ |
| **Ozone** | $\text{O}_3$ | $48.00\ \text{g/mol}$ | $\text{ppb}$ | $\mathbf{\mu g/m^3}$ | $1.9619$ | $C_{\mu\text{g/m}^3} = C_{\text{ppb}} \times \frac{48.00}{24.4654}$ |
| **Ammonia** | $\text{NH}_3$ | $17.03\ \text{g/mol}$ | $\text{ppb}$ | $\mathbf{\mu g/m^3}$ | $0.6961$ | $C_{\mu\text{g/m}^3} = C_{\text{ppb}} \times \frac{17.03}{24.4654}$ |

### 2.2 Particulate Matter
| Pollutant | External Unit | Canonical Internal Unit | Conversion |
| :--- | :---: | :---: | :--- |
| **$PM_{2.5}$** | $\mu\text{g/m}^3$ | $\mathbf{\mu g/m^3}$ | Identity ($1.0$) |
| **$PM_{10}$** | $\mu\text{g/m}^3$ | $\mathbf{\mu g/m^3}$ | Identity ($1.0$) |

### 2.3 Meteorological Parameters
| Parameter | Symbol | External Unit | Canonical Internal Unit | Conversion Formula |
| :--- | :---: | :---: | :---: | :--- |
| **Temperature** | $T$ | $\text{Kelvin}\ (\text{K})$ | $\mathbf{^\circ C}$ | $T_{^\circ\text{C}} = T_{\text{K}} - 273.15$ |
| **Wind Speed** | $U$ | $\text{km/h}$ | $\mathbf{m/s}$ | $U_{\text{m/s}} = U_{\text{km/h}} / 3.6$ |
| **Wind Speed** | $U$ | $\text{knots}$ | $\mathbf{m/s}$ | $U_{\text{m/s}} = U_{\text{knots}} \times 0.514444$ |
| **Wind Direction** | $\theta$ | $\text{degrees}\ (^\circ)$ | $\mathbf{degrees}\ (^\circ)$ | Identity ($0^\circ - 360^\circ$ clockwise from North) |
| **Pressure** | $P$ | $\text{Pascals}\ (\text{Pa})$ | $\mathbf{hPa}$ | $P_{\text{hPa}} = P_{\text{Pa}} / 100.0$ |
| **Planetary Boundary Layer** | $\text{PBLH}$ | $\text{meters}\ (\text{m})$ | $\mathbf{m\ AGL}$ | Identity |
| **Relative Humidity** | $RH$ | fraction ($0-1$) | $\mathbf{\%}$ | $RH_{\%} = RH_{\text{fraction}} \times 100.0$ |
| **Precipitation** | $P_{\text{precip}}$ | $\text{meters}\ (\text{m})$ | $\mathbf{mm}$ | $P_{\text{mm}} = P_{\text{m}} \times 1000.0$ |
| **Lapse Rate** | $\Gamma_{\text{low}}$ | $\text{K/m}$ | $\mathbf{^\circ C / 100m}$ | $\Gamma = \frac{T_{180\text{m}} - T_{2\text{m}}}{178} \times 100$ |

### 2.4 Spatio-Temporal Standardization
| Dimension | External Representation | Canonical Internal Format | Standard |
| :--- | :--- | :--- | :--- |
| **Timestamps** | Local IST / Epoch / Unix | **UTC ISO-8601** | `YYYY-MM-DDTHH:MM:SSZ` |
| **Latitude** | Varying precision float | **Decimal Degrees (WGS-84)** | Rounded to 4 decimal places (~11.1 meters) |
| **Longitude** | Varying precision float | **Decimal Degrees (WGS-84)** | Rounded to 4 decimal places (~9.8 meters) |
