# Regional Plume Transport & Risk Pipeline Specification

**Document ID:** `DOC-SCI-007`  
**Phase:** Phase 5 — Atmospheric Variables + Inversion + Regional Fire/Plume Pipeline  
**System:** ATMOSYNC  
**Date:** October 2026  
**Status:** Approved Scientific Specification  

---

## 1. Scope & Operational Designation

The regional plume transport engine (`services/plume/transport.py` and `services/plume/engine.py`) provides hourly spatial forward advection and arrival risk estimates for biomass burning smoke emitted across Northwest India.

**CRITICAL SCIENTIFIC DESIGNATION:**  
This implementation is designated strictly as a:
> **"wind-based transport estimate (Forward Lagrangian Segmented Puff approximation)"**

It is **NOT** a full Eulerian 3D chemical-transport model (e.g. WRF-Chem). It captures first-order horizontal advection, downwind Gaussian lateral diffusion, atmospheric loss timescales, and boundary-layer trapping, balancing physical fidelity with sub-second operational execution.

---

## 2. Forward Lagrangian Segmented Puff Formulation

Rather than assuming an unphysical straight-line trajectory across varying meteorological fields, emissions from aggregated fire clusters are represented as discrete Lagrangian puffs released at fire acquisition time $t_0$.

### 2.1 Advection Step
At each time step $\Delta t = 3600\text{ s}$ ($1\text{ hour}$), the puff center coordinates $(\phi, \lambda)$ are updated using horizontal wind velocity components $(u, v)$:

$$\Delta x = u(t) \cdot \Delta t \quad (m)$$
$$\Delta y = v(t) \cdot \Delta t \quad (m)$$

$$\phi(t + \Delta t) = \phi(t) + \frac{\Delta y}{110800.0}$$
$$\lambda(t + \Delta t) = \lambda(t) + \frac{\Delta x}{110800.0 \cdot \cos(\text{rad}(\phi))}$$

### 2.2 Lateral Dispersion Broadening
The horizontal plume spread radius $\sigma_y(x)$ broadens with downwind travel distance $x$ ($m$) following the empirical Briggs rural dispersion formulation (Briggs, 1973):

$$\sigma_y(x) = 0.08 \cdot x \cdot (1.0 + 0.0001 \cdot x)^{-0.5}$$

### 2.3 Atmospheric Depletion & Deposition
Particulate mass within the puff decays exponentially with an atmospheric residence timescale $\tau_{\text{loss}} \approx 36\text{ hours}$ (representing combined dry deposition, gravitational settling, and background dilution):

$$M(t) = M_0 \cdot \exp\left(-\frac{t}{\tau_{\text{loss}}}\right)$$

---

## 3. Transparent Plume-Risk Feature Formulation

To inform both decision-makers and downstream machine-learning models, ATMOSYNC computes a composite, physically grounded **Plume Risk Score ($S_{\text{plume}}$: 0 – 100)**:

$$S_{\text{plume}} = \text{Alignment} \times f_{\text{source}} \times f_{\text{speed}} \times f_{\text{trap}} \times 100$$

### Component Formulations:
1. **Directional Transport Alignment ($\text{Alignment} \in [0, 1]$):**
   $$\text{Alignment} = \frac{\sum_{i} \text{FRP}_i \cdot \max(0.0, \cos(\theta_{\text{blows\_toward}} - \beta_i))}{\sum_i \text{FRP}_i}$$
   Only upwind fires blowing toward Delhi NCR ($\text{alignment} > 0.15$) enter the threat calculation.
2. **Logarithmic Source Strength ($f_{\text{source}} \in [0, 1]$):**
   $$f_{\text{source}} = \min\left(1.0, \frac{\ln(1 + \sum \text{FRP}_{\text{upwind}})}{9.2}\right)$$
   ($\sum \text{FRP} = 10,000\text{ MW}$ scales to $1.0$).
3. **Transport Speed Penalty ($f_{\text{speed}} \in [0, 1]$):**
   - $U < 1.0\text{ m/s}$: Stagnant calm (smoke cannot travel 250 km in 24h); $f_{\text{speed}} = 0.2$.
   - $1.0 \le U \le 12.0\text{ m/s}$: Optimal advection regime; $f_{\text{speed}} = \min(1.0, U / 4.5)$.
   - $U > 12.0\text{ m/s}$: Severe gale (intense dilution); $f_{\text{speed}} = 0.4$.
4. **Boundary Layer Trapping Amplifier ($f_{\text{trap}} \in [1.0, 1.8]$):**
   $$f_{\text{trap}} = \min\left(1.8, \frac{500.0}{\max(80.0, h_{\text{pbl}})} \times \left(1.0 + \frac{\max(0.0, \Gamma_{\text{low}})}{2.0}\right)\right)$$
   Amplifies the threat when advected smoke enters a collapsed, inverted nocturnal boundary layer.

---

## 4. Threat Categorization

| Score Range | Plume Risk Level | Operational Meaning |
|---|---|---|
| $0.0 - 9.9$ | `NONE` | No regional fires upwind or winds steering smoke away |
| $10.0 - 29.9$ | `LOW` | Isolated fires or marginal directional alignment |
| $30.0 - 54.9$ | `MODERATE` | Moderate fire activity advecting toward Delhi NCR |
| $55.0 - 74.9$ | `HIGH` | Heavy burning ($> 2000\text{ MW}$) with direct NW corridor alignment |
| $75.0 - 100.0$| `SEVERE` | Massive burning event combined with nocturnal boundary layer trap |
