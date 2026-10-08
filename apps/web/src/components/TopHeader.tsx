'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import ThemeToggle from './ThemeToggle';

interface TopHeaderProps {
  temperature?: number;
  condition?: string;
}

export default function TopHeader({
  temperature = 18,
  condition = 'Clear',
}: TopHeaderProps) {
  const [searchValue, setSearchValue] = useState('');

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchValue.trim()) {
      // Find station or navigate to stations list
      window.location.href = `/stations?q=${encodeURIComponent(searchValue.trim())}`;
    }
  };

  return (
    <header className="top-header">
      {/* Left: Official ATMOSYNC Logo and Title Cluster */}
      <div className="header-left">
        <Link
          href="/"
          className="header-brand"
          aria-label="ATMOSYNC — Air Pollution–Weather Coupled Forecasting System for Delhi NCR"
        >
          <Image
            src="/atmosync-logo.png"
            alt="ATMOSYNC"
            width={124}
            height={42}
            priority
            className="header-logo-img"
          />
          <div className="header-brand-text">
            <span className="header-brand-title">Air Pollution–Weather</span>
            <span className="header-brand-title">Coupled Forecasting System</span>
            <span className="header-brand-subtitle">for Delhi NCR (SIH-26082)</span>
          </div>
        </Link>
      </div>

      {/* Center: Large Rounded Search Field */}
      <div className="header-center">
        <form onSubmit={handleSearchSubmit} className="header-search-bar">
          <span className="header-search-icon" aria-hidden="true">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
          </span>
          <input
            type="text"
            className="header-search-input"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            placeholder="Search stations, locations, parameters, or ask anything..."
            aria-label="Search stations and atmospheric data"
          />
          {searchValue && (
            <button
              type="button"
              onClick={() => setSearchValue('')}
              style={{
                position: 'absolute',
                right: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--text-muted)',
                fontSize: '1rem',
                padding: '4px',
              }}
            >
              &times;
            </button>
          )}
        </form>
      </div>

      {/* Right Side: Delhi NCR Weather Pill, Notifications, User Avatar & Theme */}
      <div className="header-right">
        <div className="weather-pill" title="Live meteorological condition in Delhi NCR">
          <span className="weather-pill-dot" aria-hidden="true"></span>
          <span>Delhi NCR</span>
          <span style={{ color: 'var(--text-muted)' }}>&bull;</span>
          <span>{temperature}&deg;C</span>
          <span style={{ color: 'var(--text-muted)' }}>&bull;</span>
          <span>{condition}</span>
        </div>

        <button
          type="button"
          className="icon-btn"
          aria-label="Notifications"
          title="System alerts & compliance notifications"
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
          </svg>
          <span className="icon-btn-badge" aria-hidden="true"></span>
        </button>

        <ThemeToggle />

        <div
          className="user-avatar"
          title="Account profile — Senior Atmospheric Scientist / CPCB Observer"
          aria-label="User profile: P"
        >
          P
        </div>
      </div>
    </header>
  );
}
