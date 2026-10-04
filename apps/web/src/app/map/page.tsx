import Link from 'next/link';

export default function MapPage() {
  return (
    <div className="container">
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
          <span className="badge badge-info">MapLibre GL JS Engine</span>
          <span className="badge badge-success">Domain Defined</span>
        </div>
        <h1 style={{ fontSize: '2rem', fontWeight: 800 }}>Regional Geospatial & Plume Transport Map</h1>
        <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
          Interactive multi-scale domain: D01 Regional Corridor, D02 NCR Mesoscale, and D03 Delhi Urban Core.
        </p>
      </div>

      <div className="glass-panel" style={{ padding: '2rem', marginBottom: '2rem' }}>
        <h3 style={{ marginBottom: '1rem' }}>Configured Modeling Domains (EPSG:4326)</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
          <div style={{ background: 'var(--bg-card-hover)', border: '1px solid var(--border-subtle)', padding: '1.25rem', borderRadius: '8px' }}>
            <div style={{ fontWeight: 700, color: 'var(--accent-cyan)' }}>D01: Regional Transport Corridor</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.35rem', lineHeight: 1.5 }}>
              Lat: 27.00°N &ndash; 32.50°N<br />
              Lon: 74.00°E &ndash; 79.50°E<br />
              Grid: 9 km / Synoptic NW Winds
            </div>
          </div>
          <div style={{ background: 'var(--bg-card-hover)', border: '1px solid var(--border-subtle)', padding: '1.25rem', borderRadius: '8px' }}>
            <div style={{ fontWeight: 700, color: 'var(--accent-emerald)' }}>D02: NCR Mesoscale Basin</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.35rem', lineHeight: 1.5 }}>
              Lat: 27.80°N &ndash; 29.40°N<br />
              Lon: 76.40°E &ndash; 78.10°E<br />
              Grid: 3 km / Boundary Layer & Inversion
            </div>
          </div>
          <div style={{ background: 'var(--bg-card-hover)', border: '1px solid var(--border-subtle)', padding: '1.25rem', borderRadius: '8px' }}>
            <div style={{ fontWeight: 700, color: 'var(--accent-amber)' }}>D03: Delhi NCT Urban Core</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.35rem', lineHeight: 1.5 }}>
              Lat: 28.40°N &ndash; 28.90°N<br />
              Lon: 76.80°E &ndash; 77.40°E<br />
              Grid: 1 km / 40+ CAAQMS Stations
            </div>
          </div>
        </div>
      </div>

      <div className="empty-state">
        <div className="empty-icon">&#128506;</div>
        <div className="empty-title">Map Canvas Standby</div>
        <div className="empty-desc">
          MapLibre GL JS container and custom WebGL vector streamline shaders will mount to this viewport.
          Live satellite active fire vectors from NASA FIRMS and forward puff dispersion will activate in Phase 4.
        </div>
      </div>
    </div>
  );
}
