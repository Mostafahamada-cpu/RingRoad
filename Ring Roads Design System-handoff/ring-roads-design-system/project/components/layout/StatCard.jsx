import React from 'react';

/**
 * Ring Roads StatCard — compact metric tile from the dashboard stats row.
 * White card, accent left bar, big blue value over a muted label.
 */
export function StatCard({ value, label, accent = true, dir = 'ltr', style = {} }) {
  const borderSide = dir === 'rtl' ? 'borderRight' : 'borderLeft';
  return (
    <div
      dir={dir}
      style={{
        flex: 1,
        background: 'var(--surface-card)',
        borderRadius: 'var(--radius-md)',
        boxShadow: 'var(--shadow-stat)',
        padding: 'var(--space-3)',
        textAlign: 'center',
        [borderSide]: accent ? '4px solid var(--border-accent)' : 'none',
        fontFamily: 'var(--font-sans)',
        ...style,
      }}
    >
      <div
        style={{
          fontSize: 'var(--text-h1)',
          fontWeight: 'var(--weight-bold)',
          color: 'var(--brand)',
          marginBottom: 'var(--space-1)',
          lineHeight: 'var(--leading-tight)',
        }}
      >
        {value}
      </div>
      <div
        style={{
          fontSize: 'var(--text-xs)',
          color: 'var(--text-muted)',
          lineHeight: 'var(--leading-snug)',
        }}
      >
        {label}
      </div>
    </div>
  );
}
