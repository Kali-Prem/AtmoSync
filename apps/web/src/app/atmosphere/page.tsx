import Link from 'next/link';
import { fetchAtmosphereCurrent } from '@/lib/api';

export const dynamic = 'force-dynamic';

export default async function AtmospherePage() {
  const atmoData = await fetchAtmosphereCurrent();

  const summary = atmoData?.regional_summary;
  const stations = atmoData?.station_observations || [];

  return (
    <div className="container">
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
          <span className="badge badge-success">Phase 5 Operational</span>
          <span className="badge badge-info">Boundary Layer & Atmospheric State</span>
          <span className="badge badge-neutral">
            ECMWF ERA5 / High-Res NWP
          </span>
        </div>
        <h1 style={{ fontSize: '2.25rem', fontWeight: 800 }}>Atmospheric Structure & Boundary Layer Dynamics</h1>
        <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem', maxWidth: '800px' }}>
          Real-time diagnostic analysis of surface thermodynamics, planetary boundary layer height ($PBLH$),
          volume contraction ratios, and ventilation coefficients across the Delhi NCR airshed.
        </p>
      </div>

      {/* Summary Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem', marginBottom: '2.5rem' }}>
        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Planetary Boundary Layer Height
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 700, marginTop: '0.25rem', color: 'var(--accent-cyan)' }}>
            {summary ? `${summary.mean_pbl_height_m} m` : 'N/A'}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            Regional Mean Depth (AGL)
          </div>
          <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-subtle)', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Volume Contraction: ~{summary ? (1500 / Math.max(50, summary.mean_pbl_height_m)).toFixed(1) : 4.2}x vs. Daytime
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Ventilation Index (VI)
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 700, marginTop: '0.25rem', color: summary?.is_stagnant ? '#ef4444' : '#10b981' }}>
            {summary ? `${Math.round(summary.regional_ventilation_index)} m²/s` : 'N/A'}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            CPCB / IMD Dispersion Metric
          </div>
          <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-subtle)', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Status: <span className="badge badge-warning">{summary?.dispersion_category || 'CRITICAL STAGNATION'}</span>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Mean Transport Wind Speed
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 700, marginTop: '0.25rem' }}>
            {summary ? `${summary.mean_wind_speed_ms} m/s` : 'N/A'}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            10-Meter Surface Wind Velocity
          </div>
          <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-subtle)', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Mechanical Shear: {summary && summary.mean_wind_speed_ms < 1.5 ? 'Extremely Weak (Stagnant)' : 'Moderate'}
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Atmospheric Stagnation State
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 700, marginTop: '0.25rem', color: '#f59e0b' }}>
            {summary?.is_stagnant ? 'STAGNANT' : 'VENTILATED'}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            Trapping Condition
          </div>
          <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-subtle)', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Pollution Accumulation: High Risk
          </div>
        </div>
      </div>

      {/* Station Meteorological Observations Table */}
      <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '2.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Station-Level Atmospheric Observations</h2>
          <span className="badge badge-info">Normalized Canonical Units</span>
        </div>

        {stations.length === 0 ? (
          <div className="empty-state">
            <div className="empty-title">No Atmospheric Records Available</div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Location / Station</th>
                  <th>Temp (2m)</th>
                  <th>Rel Humidity</th>
                  <th>Wind (U, V)</th>
                  <th>Direction</th>
                  <th>PBL Height</th>
                  <th>Contraction</th>
                  <th>Lapse Rate</th>
                  <th>Ventilation (VI)</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {stations.map((stn: any, idx: number) => (
                  <tr key={idx}>
                    <td style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>
                      {stn.location_id?.replace('loc_', '').replace('_', ' ').toUpperCase()}
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                        {stn.latitude.toFixed(2)}°N, {stn.longitude.toFixed(2)}°E
                      </div>
                    </td>
                    <td style={{ padding: '0.75rem 1rem', fontFamily: 'var(--font-mono)' }}>{stn.temperature_2m_c} °C</td>
                    <td style={{ padding: '0.75rem 1rem', fontFamily: 'var(--font-mono)' }}>{stn.relative_humidity_2m_pct} %</td>
                    <td style={{ padding: '0.75rem 1rem', fontFamily: 'var(--font-mono)', fontSize: '0.82rem' }}>
                      {stn.wind_speed_10m_ms} m/s
                      <div style={{ color: 'var(--text-muted)' }}>({stn.wind_u_ms}, {stn.wind_v_ms})</div>
                    </td>
                    <td style={{ padding: '0.75rem 1rem', fontFamily: 'var(--font-mono)' }}>{stn.wind_direction_10m_deg}°</td>
                    <td style={{ padding: '0.75rem 1rem', fontWeight: 700, color: 'var(--accent-cyan)' }}>{stn.pbl_height_m} m</td>
                    <td style={{ padding: '0.75rem 1rem', color: 'var(--accent-amber)' }}>{stn.pbl_contraction_ratio}x</td>
                    <td style={{ padding: '0.75rem 1rem', color: stn.lapse_rate_low_c_100m > 0 ? '#ef4444' : '#10b981' }}>
                      {stn.lapse_rate_low_c_100m} °C/100m
                    </td>
                    <td style={{ padding: '0.75rem 1rem', fontFamily: 'var(--font-mono)' }}>
                      {stn.ventilation_index_m2s} m²/s
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <span className="badge badge-success">{stn.quality_flag}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Scientific Insights */}
      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '0.5rem' }}>
          Physical Laws Governing Atmospheric Boundary Layer Accumulation
        </h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6 }}>
          Ground pollutant concentration (C) is inversely proportional to the product of mixing depth (PBLH)
          and mean transport wind velocity (U_mean):
        </p>
        <div className="formula-box">
          C = Q / (L · Ū · PBLH)
        </div>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', lineHeight: 1.6 }}>
          During winter evenings in Delhi NCR, sunset radiative cooling triggers boundary layer collapse from 1,500 m down to under 150 m AGL.
          The effective dilution volume contracts by a factor of <strong>10x to 15x</strong>, driving catastrophic ground-level particulate surges
          even without any increase in baseline urban emission rates.
        </p>
      </div>
    </div>
  );
}
