import type { Metadata } from 'next';
import { AppShell } from '@/components';
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
        <AppShell>
          {children}
        </AppShell>
      </body>
    </html>
  );
}
