'use client';

import { ReactNode } from 'react';
import TopHeader from './TopHeader';
import Sidebar from './Sidebar';

interface AppShellProps {
  children: ReactNode;
  systemStatus?: string;
  temperature?: number;
  condition?: string;
}

export default function AppShell({
  children,
  systemStatus = 'healthy',
  temperature = 18,
  condition = 'Clear',
}: AppShellProps) {
  return (
    <div className="app-container">
      {/* Top Navigation Bar */}
      <TopHeader temperature={temperature} condition={condition} />

      {/* Main Body: Sidebar + Dynamic Route Content */}
      <div className="app-body">
        <Sidebar systemStatus={systemStatus} />
        <main className="app-main">{children}</main>
      </div>

      {/* Standard Footer */}
      <footer
        style={{
          borderTop: '1px solid var(--border-subtle)',
          padding: '1.25rem 2rem',
          textAlign: 'center',
          color: 'var(--text-muted)',
          fontSize: '0.78rem',
          background: 'var(--bg-glass)',
        }}
      >
        <div>
          ATMOSYNC &bull; Smart India Hackathon 2026 &bull; Problem Statement SIH-26082 &bull; Air Pollution–Weather Coupled Forecasting System for Delhi NCR (MoES / NCMRWF)
        </div>
      </footer>
    </div>
  );
}
