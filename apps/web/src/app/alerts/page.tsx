import Link from 'next/link';

export default function AlertsPage() {
  return (
    <div className="container">
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
          <span className="badge badge-warning">CAQM Statutory Policy</span>
          <span className="badge badge-info">GRAP Stages I &ndash; IV</span>
        </div>
        <h1 style={{ fontSize: '2rem', fontWeight: 800 }}>Regulatory Alerts & GRAP Compliance</h1>
        <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
          Commission for Air Quality Management (CAQM) Graded Response Action Plan decision support.
        </p>
      </div>

      <div className="empty-state">
        <div className="empty-icon">&#128680;</div>
        <div className="empty-title">Zero Active Emergency Alerts</div>
        <div className="empty-desc">
          No statutory GRAP Stage III/IV or nocturnal inversion lock alerts are currently dispatched.
          The automated policy dispatcher monitors the 24-hour moving average of predicted PM2.5 and triggers compliance webhooks when thresholds are breached.
        </div>
      </div>
    </div>
  );
}
