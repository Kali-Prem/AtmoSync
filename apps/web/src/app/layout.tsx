import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import ThemeToggle from '@/components/ThemeToggle';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://atmosync-web.onrender.com'),
  title: 'ATMOSYNC — Air Pollution–Weather Coupled Forecasting System for Delhi NCR',
  description: 'ATMOSYNC: 72-Hour Coupled Air Quality & Meteorological Forecasting System for Delhi NCR (SIH-26082)',
  icons: {
    icon: [
      { url: '/icon.png', type: 'image/png' },
      { url: '/favicon.ico' },
    ],
    apple: '/apple-icon.png',
  },
  openGraph: {
    title: 'ATMOSYNC — Air Pollution–Weather Coupled Forecasting System for Delhi NCR',
    description: '72-Hour Coupled Air Quality & Meteorological Forecasting System for Delhi NCR (SIH-26082)',
    images: [{ url: '/atmosync-logo.png', width: 1024, height: 372, alt: 'ATMOSYNC' }],
  },
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
            <Link
              href="/"
              className="nav-brand"
              aria-label="ATMOSYNC — Air Pollution–Weather Coupled Forecasting System for Delhi NCR"
            >
              <Image
                src="/atmosync-logo.png"
                alt="ATMOSYNC"
                width={121}
                height={44}
                priority
                className="nav-logo-img"
              />
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
