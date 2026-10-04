import { fetchStations } from '@/lib/api';

export const dynamic = 'force-dynamic';

export default async function StationsPage() {
  const stations = await fetchStations();

  return (
    <div className="container">
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
          <span className="badge badge-success">Verified Ground Network</span>
          <span className="badge badge-info">{stations.length} Active Monitors</span>
        </div>
        <h1 style={{ fontSize: '2rem', fontWeight: 800 }}>Delhi NCR CAAQMS Monitoring Network</h1>
        <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
          Continuous Ambient Air Quality Monitoring Stations (CAAQMS) operated by CPCB, DPCC, HSPCB, and UPPCB.
        </p>
      </div>

      {stations.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">&#128225;</div>
          <div className="empty-title">No Stations Found in Database</div>
          <div className="empty-desc">
            Run <code style={{ color: 'var(--accent-cyan)' }}>python scripts/cli.py db seed</code> to populate verified station metadata.
          </div>
        </div>
      ) : (
        <div className="glass-panel" style={{ overflowX: 'auto', padding: '0.5rem' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Station Code</th>
                <th>Station Name</th>
                <th>Provider</th>
                <th>Coordinates</th>
                <th>Elevation</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {stations.map((stn) => (
                <tr key={stn.id}>
                  <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)', fontWeight: 600 }}>
                    {stn.station_code}
                  </td>
                  <td style={{ fontWeight: 600 }}>
                    {stn.name}
                  </td>
                  <td>
                    <span className="badge badge-info">{stn.provider}</span>
                  </td>
                  <td style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', fontSize: '0.82rem' }}>
                    {stn.latitude.toFixed(4)}°N, {stn.longitude.toFixed(4)}°E
                  </td>
                  <td style={{ color: 'var(--text-secondary)' }}>
                    {stn.elevation_m} m ASL
                  </td>
                  <td>
                    <span className="badge badge-success">{stn.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
