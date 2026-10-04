'use client';

import { useEffect, useState } from 'react';

export default function ThemeToggle() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    const initialTheme = savedTheme || 'light';
    setTheme(initialTheme);
    document.documentElement.setAttribute('data-theme', initialTheme);
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
    document.documentElement.setAttribute('data-theme', nextTheme);
    localStorage.setItem('theme', nextTheme);
  };

  if (!mounted) {
    // Render placeholder with same dimensions to avoid layout shift
    return (
      <button
        type="button"
        className="theme-toggle-btn"
        aria-label="Toggle theme"
        style={{ visibility: 'hidden' }}
      >
        <span className="theme-toggle-icon">&#9728;</span>
        <span className="theme-toggle-text">Light</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="theme-toggle-btn"
      title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
      aria-label={`Current theme: ${theme}. Click to switch.`}
    >
      <span className="theme-toggle-icon">
        {theme === 'light' ? '☀' : '🌙'}
      </span>
      <span className="theme-toggle-text">
        {theme === 'light' ? 'Light' : 'Dark'}
      </span>
    </button>
  );
}

export { ThemeToggle };
