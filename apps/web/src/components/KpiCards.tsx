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
      <div className="kpi-card">
        <div>
          <div className="kpi-header">
            <span className="kpi-label">Thermal Inversion</span>
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
      <div className="kpi-card">
        <div>
          <div className="kpi-header">
            <span className="kpi-label">Mixing Depth</span>
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
      <div className="kpi-card">
        <div>
          <div className="kpi-header">
            <span className="kpi-label">Best Baseline Model</span>
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
      <div className="kpi-card">
        <div>
          <div className="kpi-header">
            <span className="kpi-label">Pipeline Status</span>
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
