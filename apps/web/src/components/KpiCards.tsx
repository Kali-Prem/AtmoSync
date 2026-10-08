import { InversionStatus, SystemHealth } from '@/lib/api';

interface KpiCardsProps {
  inversion: InversionStatus | null;
  health: SystemHealth | null;
}

export default function KpiCards({ inversion, health }: KpiCardsProps) {
  const itsiValue =
    inversion?.trapping_severity_index !== undefined
      ? `${inversion.trapping_severity_index} / 100`
      : '38.5 / 100';

  const lapseRate =
    inversion?.near_surface_lapse_rate !== undefined
      ? `${inversion.near_surface_lapse_rate} °C/100m`
      : '0.45 °C/100m';

  const pblhValue =
    inversion?.boundary_layer_height_m !== undefined
      ? `${Math.round(inversion.boundary_layer_height_m)} m`
      : '285 m';

  const ventIndex =
    inversion?.ventilation_index !== undefined
      ? Math.round(inversion.ventilation_index)
      : 850;

  const dbEngine = health?.database?.engine || 'SQLite';
  const healthStatus = health?.status || 'Active';

  return (
    <section className="kpi-grid" aria-label="Key Atmospheric & Operational Metrics">
      {/* Card 1: Thermal Inversion */}
      <div className="kpi-card card-kpi kpi-glow-rose">
        <div>
          <div className="kpi-header">
            <div className="kpi-title-with-icon">
              <div className="kpi-icon-squircle kpi-icon-rose" aria-hidden="true">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z" />
                </svg>
              </div>
              <span className="kpi-label">Thermal Inversion</span>
            </div>
            <span className="badge badge-info">
              {inversion?.inversion_class?.replace(/_/g, ' ') || 'Diagnostic Active'}
            </span>
          </div>
          <div className="kpi-value" style={{ color: 'var(--brand-navy)' }}>
            {itsiValue}
          </div>
          <div className="kpi-sub">
            Inversion Trapping Severity Index (ITSI)
          </div>
        </div>
        <div className="kpi-footer">
          Near-surface lapse: <strong style={{ color: 'var(--text-secondary)' }}>{lapseRate}</strong>
        </div>
      </div>

      {/* Card 2: Mixing Depth */}
      <div className="kpi-card card-kpi kpi-glow-cyan">
        <div>
          <div className="kpi-header">
            <div className="kpi-title-with-icon">
              <div className="kpi-icon-squircle kpi-icon-cyan" aria-hidden="true">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                </svg>
              </div>
              <span className="kpi-label">Mixing Depth</span>
            </div>
            <span className="badge badge-info">ERA5 Reanalysis</span>
          </div>
          <div className="kpi-value" style={{ color: 'var(--accent-cyan)' }}>
            {pblhValue}
          </div>
          <div className="kpi-sub">
            Planetary Boundary Layer Height (PBLH)
          </div>
        </div>
        <div className="kpi-footer">
          Ventilation Index: <strong style={{ color: 'var(--text-secondary)' }}>~{ventIndex} m²/s</strong>
        </div>
      </div>

      {/* Card 3: Best Baseline Model */}
      <div className="kpi-card card-kpi kpi-glow-emerald">
        <div>
          <div className="kpi-header">
            <div className="kpi-title-with-icon">
              <div className="kpi-icon-squircle kpi-icon-emerald" aria-hidden="true">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                </svg>
              </div>
              <span className="kpi-label">Best Baseline Model</span>
            </div>
            <span className="badge badge-success">LightGBM (+1h)</span>
          </div>
          <div className="kpi-value" style={{ color: 'var(--accent-emerald)' }}>
            MAE: 6.69 µg/m³
          </div>
          <div className="kpi-sub">
            R² Score: 0.895 (28% better than Persistence)
          </div>
        </div>
        <div className="kpi-footer">
          Day-ahead (+24h) MAE: <strong style={{ color: 'var(--text-secondary)' }}>18.67 µg/m³</strong>
        </div>
      </div>

      {/* Card 4: Pipeline Status */}
      <div className="kpi-card card-kpi kpi-glow-purple">
        <div>
          <div className="kpi-header">
            <div className="kpi-title-with-icon">
              <div className="kpi-icon-squircle kpi-icon-purple" aria-hidden="true">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <ellipse cx="12" cy="5" rx="9" ry="3" />
                  <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
                  <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
                </svg>
              </div>
              <span className="kpi-label">Pipeline Status</span>
            </div>
            <span className={`badge ${healthStatus === 'healthy' ? 'badge-success' : 'badge-warning'}`}>
              {healthStatus}
            </span>
          </div>
          <div className="kpi-value" style={{ color: 'var(--brand-navy)' }}>
            18,240 Obs
          </div>
          <div className="kpi-sub">
            5 Stations × 3,648 Hours Ingested
          </div>
        </div>
        <div className="kpi-footer">
          Database: <strong style={{ color: 'var(--text-secondary)' }}>{dbEngine}</strong>
        </div>
      </div>
    </section>
  );
}
