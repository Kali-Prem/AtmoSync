import Link from 'next/link';
import { fetchFireClusters, fetchPlumeRisk } from '@/lib/api';

export const dynamic = 'force-dynamic';

export default async function PlumePage() {
  const [clustersData, plumeRisk] = await Promise.all([
    fetchFireClusters(),
    fetchPlumeRisk()
  ]);

  const score = plumeRisk?.plume_influence_score ?? 11.0;
  const level = plumeRisk?.plume_influence_level ?? 'LOW';
  const clusters = clustersData?.clusters || [];
  const trajectories = plumeRisk?.sample_trajectories || [];
  const met = plumeRisk?.ambient_meteorology;

  return (
    <div className="container">
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
          <span className="badge badge-success">Phase 5 Operational</span>
          <span className="badge badge-info">Regional Stubble Plume Transport</span>
          <span className="badge badge-neutral">
            NASA FIRMS VIIRS 375m + Lagrangian Puff
          </span>
        </div>
        <h1 style={{ fontSize: '2.25rem', fontWeight: 800 }}>Regional Biomass Burning & Smoke Transport</h1>
        <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem', maxWidth: '800px' }}>
          Diagnostic integration of NASA FIRMS active fire hotspots in Punjab/Haryana, Fire Radiative Power (FRP) emission fluxes,
          and wind-based forward Lagrangian smoke transport toward the Delhi NCR airshed.
        </p>
      </div>

      {/* Primary Plume Risk Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem', marginBottom: '2.5rem' }}>
        
        {/* Card 1: Plume Influence Score */}
        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Plume Risk Score
            </span>
            <span className={`badge ${level === 'SEVERE' ? 'badge-danger' : level === 'HIGH' ? 'badge-danger' : level === 'MODERATE' ? 'badge-warning' : 'badge-success'}`}>
              {level} RISK
            </span>
          </div>
          <div style={{ fontSize: '2.5rem', fontWeight: 800, marginTop: '0.35rem', color: score >= 50 ? '#ef4444' : score >= 25 ? '#f59e0b' : '#10b981' }}>
            {score} <span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>/ 100</span>
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            Delhi NCR Exposure Index
          </div>
          <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-subtle)', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            ETA: <strong style={{ color: 'var(--text-primary)' }}>{plumeRisk?.eta_hours ? `~${plumeRisk.eta_hours} Hours` : 'No direct hit'}</strong>
          </div>
        </div>

        {/* Card 2: Active Upwind Fire Activity */}
        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Active Upwind Fires
          </div>
          <div style={{ fontSize: '2.5rem', fontWeight: 800, marginTop: '0.35rem', color: 'var(--accent-amber)' }}>
            {plumeRisk?.active_upwind_fires_count ?? 0} <span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>Clusters</span>
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            FRP: {plumeRisk?.total_upwind_frp_mw ? `${Math.round(plumeRisk.total_upwind_frp_mw)} MW` : '0 MW'}
          </div>
          <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-subtle)', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Directional Alignment: <span style={{ fontFamily: 'var(--font-mono)' }}>{plumeRisk?.mean_directional_alignment ?? 0.0}</span>
          </div>
        </div>

        {/* Card 3: Total Regional Emission Flux */}
        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Estimated PM2.5 Emission Flux
          </div>
          <div style={{ fontSize: '2.5rem', fontWeight: 800, marginTop: '0.35rem', color: 'var(--accent-cyan)' }}>
            {clustersData?.total_pm25_emission_flux_kg_s ?? 0} <span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>kg/s</span>
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            Wooster et al. (2005) FRE Formulation
          </div>
          <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-subtle)', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Total Hotspot FRP: <strong style={{ color: 'var(--text-primary)' }}>{clustersData?.total_active_frp_mw ?? 0} MW</strong>
          </div>
        </div>

        {/* Card 4: Transport Meteorology */}
        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Steering Wind Vector
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 700, marginTop: '0.35rem' }}>
            {met ? `${met.wind_speed_10m_ms?.toFixed(1)} m/s @ ${Math.round(met.wind_direction_10m_deg)}°` : '2.5 m/s @ 315°'}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            Surface Transport Velocity
          </div>
          <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-subtle)', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            PBL Mixing Depth: {met ? `${met.pbl_height_m} m` : '350 m'}
          </div>
        </div>
      </div>

      {/* Clustered Fire Events Table */}
      <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '2.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Active Regional Stubble Fire Clusters (VIIRS 375m)</h2>
          <span className="badge badge-info">{clusters.length} Spatial Clusters Identified</span>
        </div>

        {clusters.length === 0 ? (
          <div className="empty-state">
            <div className="empty-title">No Active Fire Clusters Detected</div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Cluster ID</th>
                  <th>Region / State</th>
                  <th>Centroid Coordinates</th>
                  <th>Hotspot Count</th>
                  <th>Total FRP</th>
                  <th>Max Single FRP</th>
                  <th>PM2.5 Mass Flux</th>
                  <th>Classification</th>
                </tr>
              </thead>
              <tbody>
                {clusters.map((c: any) => (
                  <tr key={c.event_id}>
                    <td style={{ padding: '0.75rem 1rem', fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)' }}>
                      {c.event_id}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>{c.source_region}</td>
                    <td style={{ padding: '0.75rem 1rem', fontFamily: 'var(--font-mono)', fontSize: '0.82rem' }}>
                      {c.centroid_latitude.toFixed(3)}°N, {c.centroid_longitude.toFixed(3)}°E
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>{c.detection_count} pixels</td>
                    <td style={{ padding: '0.75rem 1rem', fontWeight: 700, color: 'var(--accent-amber)' }}>
                      {c.total_frp_mw} MW
                    </td>
                    <td style={{ padding: '0.75rem 1rem', fontFamily: 'var(--font-mono)' }}>{c.max_single_frp_mw} MW</td>
                    <td style={{ padding: '0.75rem 1rem', fontFamily: 'var(--font-mono)', color: 'var(--accent-emerald)' }}>
                      {c.estimated_pm25_flux_kg_s} kg/s
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <span className="badge badge-warning">{c.classification?.replace(/_/g, ' ')}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Forward Trajectory Sample Inspection */}
      {trajectories.length > 0 && (
        <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '2.5rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>
            Forward Lagrangian Advection Trajectories (48h Projection)
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1rem' }}>
            Modeled using the Forward Lagrangian Segmented Gaussian Puff approximation.
            Plume spread radius ($\sigma_y$) expands downwind via Briggs dispersion formulations.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1rem' }}>
            {trajectories.slice(0, 3).map((t: any) => (
              <div key={t.event_id} style={{ backgroundColor: 'var(--bg-card-hover)', padding: '1.25rem', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <strong style={{ color: 'var(--accent-cyan)' }}>{t.event_id} ({t.source_region})</strong>
                  <span className="badge badge-info">{t.total_frp_mw} MW</span>
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                  Forward trajectory steps:
                </div>
                <div style={{ maxHeight: '180px', overflowY: 'auto', fontSize: '0.78rem', fontFamily: 'var(--font-mono)' }}>
                  {t.trajectory_steps.slice(0, 8).map((s: any) => (
                    <div key={s.step_hours} style={{ padding: '0.3rem 0', display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)' }}>
                      <span>+{s.step_hours}h ({s.latitude.toFixed(2)}°N, {s.longitude.toFixed(2)}°E)</span>
                      <span style={{ color: s.intersects_target_domain ? '#ef4444' : 'var(--text-muted)' }}>
                        {s.distance_to_delhi_km} km to Delhi
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Model Attribution Note */}
      <div className="glass-panel" style={{ padding: '1.25rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
        <strong>Scientific Attribution:</strong> Regional plume dispersion estimates are calculated using the 
        Forward Lagrangian Segmented Gaussian Puff model with Briggs rural dispersion parameters. 
        Designed to provide agile 10-second situational awareness during operational forecasting cycles.
      </div>
    </div>
  );
}
