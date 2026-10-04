import { fetchHealth } from '@/lib/api';

export const dynamic = 'force-dynamic';

export default async function StatusPage() {
  const health = await fetchHealth();

  return (
    <div className="container">
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
          <span className="badge badge-info">Observability & Health</span>
          <span className={`badge ${health?.status === 'healthy' ? 'badge-success' : 'badge-warning'}`}>
            {health?.status === 'healthy' ? 'All Systems Operational' : 'Degraded / Connecting'}
          </span>
        </div>
        <h1 style={{ fontSize: '2rem', fontWeight: 800 }}>Platform System Status & Telemetry</h1>
        <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
          Real-time service health checks, database connectivity, and external data provider ingestion status.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        {/* Service Meta */}
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: 'var(--accent-cyan)' }}>Application Runtime</h3>
          <div style={{ fontSize: '0.88rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Application Name</span>
              <span style={{ fontWeight: 600 }}>{health?.app_name || 'ATMOSYNC'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Version</span>
              <span style={{ fontFamily: 'var(--font-mono)' }}>{health?.version || 'v1.0.0-phase3'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Environment</span>
              <span className="badge badge-info">{health?.environment || 'development'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Timestamp (UTC)</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>{health?.timestamp || new Date().toISOString()}</span>
            </div>
          </div>
        </div>

        {/* Database Status */}
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: 'var(--accent-emerald)' }}>Database Persistence</h3>
          <div style={{ fontSize: '0.88rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Connection Status</span>
              <span className={`badge ${health?.database?.status === 'connected' ? 'badge-success' : 'badge-warning'}`}>
                {health?.database?.status || 'Disconnected'}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Active Engine</span>
              <span style={{ fontWeight: 600 }}>{health?.database?.engine || 'PostgreSQL / SQLite'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Spatial Extensibility</span>
              <span>PostGIS 3.4 / Coordinates Enabled</span>
            </div>
          </div>
        </div>

        {/* External Ingestion Providers */}
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: 'var(--accent-amber)' }}>Verified Ingestion Providers</h3>
          <div style={{ fontSize: '0.88rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Weather (NWP)</span>
              <span style={{ fontFamily: 'var(--font-mono)' }}>{health?.active_providers?.weather || 'open-meteo'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Air Quality (Obs)</span>
              <span style={{ fontFamily: 'var(--font-mono)' }}>{health?.active_providers?.air_quality || 'openaq'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Satellite Active Fires</span>
              <span style={{ fontFamily: 'var(--font-mono)' }}>{health?.active_providers?.satellite_fire || 'nasa-firms'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
