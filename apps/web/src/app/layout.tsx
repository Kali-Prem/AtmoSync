import type { Metadata } from 'next';
import Link from 'next/link';
import ThemeToggle from '@/components/ThemeToggle';
import './globals.css';

export const metadata: Metadata = {
  title: 'ATMOSYNC — Air Pollution–Weather Coupled Forecasting System for Delhi NCR',
  description: 'ATMOSYNC: 72-Hour Coupled Air Quality & Meteorological Forecasting System for Delhi NCR (SIH-26082)',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-theme="light" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var saved = localStorage.getItem('theme');
                  var theme = saved || 'light';
                  document.documentElement.setAttribute('data-theme', theme);
                } catch (e) {
                  document.documentElement.setAttribute('data-theme', 'light');
                }
              })();
            `,
          }}
        />
      </head>
      <body>
        <nav className="navbar">
          <div className="container nav-inner">
            <Link href="/" className="nav-brand">
              <div className="nav-logo-badge">A</div>
              <div>
                <div className="nav-title">ATMOSYNC</div>
                <div className="nav-subtitle">Air Pollution–Weather Coupled Forecasting &bull; SIH-26082</div>
              </div>
            </Link>

            <div className="nav-right-cluster">
              <ul className="nav-links">
                <li><Link href="/" className="nav-link">Dashboard</Link></li>
                <li><Link href="/atmosphere" className="nav-link">Atmosphere</Link></li>
                <li><Link href="/inversion" className="nav-link">Inversion</Link></li>
                <li><Link href="/plume" className="nav-link">Plume & Fires</Link></li>
                <li><Link href="/forecast" className="nav-link">72h Forecast</Link></li>
                <li><Link href="/stations" className="nav-link">Stations</Link></li>
                <li><Link href="/status" className="nav-link">Status</Link></li>
              </ul>
              <ThemeToggle />
            </div>
          </div>
        </nav>

        <main style={{ minHeight: 'calc(100vh - 120px)', padding: '2rem 0' }}>
          {children}
        </main>

        <footer style={{ borderTop: '1px solid var(--border-subtle)', padding: '1.5rem 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
          <div className="container">
            ATMOSYNC &bull; Smart India Hackathon 2026 &bull; Problem Statement SIH-26082 &bull; Air Pollution–Weather Coupled Forecasting System for Delhi NCR
          </div>
        </footer>
      </body>
    </html>
  );
}
