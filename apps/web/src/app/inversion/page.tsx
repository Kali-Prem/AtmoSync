import Link from 'next/link';
import { fetchInversionStatus } from '@/lib/api';

export const dynamic = 'force-dynamic';

export default async function InversionPage() {
  const inv = await fetchInversionStatus();

  const tsi = inv?.trapping_severity_index ?? 38.5;
  const lapse = inv?.near_surface_lapse_rate ?? 0.45;
  const pblh = inv?.boundary_layer_height_m ?? 285;
  const ws = inv?.wind_speed_10m ?? 1.8;
  const vi = inv?.ventilation_index ?? 615;

  return (
    <div className="container">
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
          <span className="badge badge-success">Phase 5 Operational</span>
          <span className="badge badge-warning">Thermal Inversion & Stability Engine</span>
          <span className="badge badge-neutral">
            Multi-Level Temperature Gradient Diagnostic
          </span>
        </div>
        <h1 style={{ fontSize: '2.25rem', fontWeight: 800 }}>Atmospheric Inversion & Trapping Severity</h1>
        <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem', maxWidth: '800px' }}>
          Physical diagnosis of near-surface temperature inversions (&part;T / &part;z &gt; 0),
          boundary layer stratification, and the 0–100 Inversion Trapping Severity Index (ITSI).
        </p>
      </div>

      {/* Main ITSI Gauge Card & Primary Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
        
        {/* Card 1: ITSI Gauge */}
        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Trapping Severity Index
              </span>
              <span className={`badge ${tsi >= 70 ? 'badge-danger' : tsi >= 40 ? 'badge-warning' : 'badge-success'}`}>
                {tsi >= 70 ? 'SEVERE TRAPPING' : tsi >= 40 ? 'MODERATE TRAPPING' : 'FAVORABLE DISPERSION'}
              </span>
            </div>
            <div style={{ fontSize: '3rem', fontWeight: 900, marginTop: '0.5rem', fontFamily: 'var(--font-heading)', color: tsi >= 70 ? '#ef4444' : tsi >= 40 ? '#f59e0b' : '#10b981' }}>
              {tsi} <span style={{ fontSize: '1.25rem', color: 'var(--text-muted)' }}>/ 100</span>
            </div>
            <div style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
              Inversion Trapping Severity Index (ITSI)
            </div>
          </div>

          <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--border-subtle)' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>Risk Summary:</div>
            <div style={{ fontSize: '0.88rem', fontWeight: 500, color: 'var(--text-primary)' }}>
              {inv?.risk_summary || 'Nocturnal boundary layer collapse creates elevated particulate trapping.'}
            </div>
          </div>
        </div>

        {/* Card 2: Near-Surface Lapse Rate */}
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Near-Surface Environmental Lapse Rate (Γ_low)
          </div>
          <div style={{ fontSize: '2.5rem', fontWeight: 800, marginTop: '0.5rem', color: lapse > 0 ? '#ef4444' : '#10b981' }}>
            {lapse > 0 ? `+${lapse}` : lapse} <span style={{ fontSize: '1.1rem', color: 'var(--text-muted)' }}>°C/100m</span>
          </div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            Measured between 2m and 180m AGL
          </div>

          <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--border-subtle)', fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            <div>Inversion Class: <strong style={{ color: 'var(--text-primary)' }}>{inv?.inversion_class?.replace(/_/g, ' ') || 'MODERATE INVERSION'}</strong></div>
            <div>Detection Method: <code style={{ color: 'var(--accent-cyan)' }}>vertical_temperature_profile</code></div>
            <div>Dry Adiabatic Reference: <span style={{ fontFamily: 'var(--font-mono)' }}>-0.98 °C/100m</span></div>
          </div>
        </div>

        {/* Card 3: Boundary Layer & Ventilation Capacity */}
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Boundary Layer Mixing & Stagnation
          </div>
          <div style={{ fontSize: '2.5rem', fontWeight: 800, marginTop: '0.5rem', color: 'var(--accent-cyan)' }}>
            {pblh} <span style={{ fontSize: '1.1rem', color: 'var(--text-muted)' }}>m AGL</span>
          </div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            Planetary Boundary Layer Height ($PBLH$)
          </div>

          <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--border-subtle)', fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            <div>Ventilation Index (VI): <strong style={{ color: 'var(--text-primary)' }}>{Math.round(vi)} m²/s</strong></div>
            <div>Surface Wind Speed: <strong style={{ color: 'var(--text-primary)' }}>{ws} m/s</strong></div>
            <div>Dispersion State: <span className="badge badge-warning">CRITICAL STAGNATION</span></div>
          </div>
        </div>
      </div>

      {/* Physics Breakdown Table */}
      <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '2.5rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem' }}>
          Inversion Trapping Severity Index (ITSI) Multi-Factor Formulation
        </h2>
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Component Factor</th>
                <th>Physical Quantity</th>
                <th>Weight</th>
                <th>Observed State</th>
                <th>Impact on Pollution</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ fontWeight: 600 }}>Lapse Rate Factor (f_γ)</td>
                <td style={{ fontFamily: 'var(--font-mono)' }}>Γ_low = +{lapse} °C/100m</td>
                <td style={{ color: 'var(--accent-cyan)', fontWeight: 600 }}>45%</td>
                <td><span className="badge badge-warning">Inversion Active</span></td>
                <td style={{ color: 'var(--text-secondary)' }}>Suppresses vertical convective turbulence; creates impermeable ceiling.</td>
              </tr>
              <tr>
                <td style={{ fontWeight: 600 }}>PBL Contraction Factor (f_pbl)</td>
                <td style={{ fontFamily: 'var(--font-mono)' }}>PBLH = {pblh} m</td>
                <td style={{ color: 'var(--accent-cyan)', fontWeight: 600 }}>35%</td>
                <td><span className="badge badge-warning">High Contraction (~5x)</span></td>
                <td style={{ color: 'var(--text-secondary)' }}>Compresses surface emissions into shallow nocturnal layer.</td>
              </tr>
              <tr>
                <td style={{ fontWeight: 600 }}>Calm Wind Stagnation (f_wind)</td>
                <td style={{ fontFamily: 'var(--font-mono)' }}>U_10m = {ws} m/s</td>
                <td style={{ color: 'var(--accent-cyan)', fontWeight: 600 }}>20%</td>
                <td><span className="badge badge-info">Low Shear</span></td>
                <td style={{ color: 'var(--text-secondary)' }}>Inadequate mechanical wind shear to mechanically ventilate air basin.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
