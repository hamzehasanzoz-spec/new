import React from 'react';
import { useTheme } from '../hooks/useTheme';

export default function ThemeToggle({ variant = 'icon' }) {
  const { theme, toggleTheme } = useTheme();

  if (variant === 'icon') {
    return (
      <button
        onClick={toggleTheme}
        title={theme === 'dark' ? 'الوضع النهاري' : 'الوضع الليلي'}
        style={{
          background: 'var(--bg-subtle)',
          border: '1px solid var(--border)',
          width: 38,
          height: 38,
          borderRadius: 10,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '1.1em',
          transition: 'all 0.2s',
          color: 'var(--text)',
        }}
      >
        {theme === 'dark' ? '☀️' : '🌙'}
      </button>
    );
  }

  // Full toggle
  return (
    <button
      onClick={toggleTheme}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '10px 16px',
        background: 'var(--bg-subtle)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        cursor: 'pointer',
        color: 'var(--text)',
        fontSize: '0.9em',
        fontFamily: 'inherit',
        width: '100%',
      }}
    >
      <span style={{ fontSize: '1.2em' }}>{theme === 'dark' ? '☀️' : '🌙'}</span>
      <span style={{ fontWeight: 600 }}>
        {theme === 'dark' ? 'الوضع النهاري' : 'الوضع الليلي'}
      </span>
    </button>
  );
}