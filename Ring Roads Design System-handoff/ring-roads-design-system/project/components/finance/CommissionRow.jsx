import React from 'react';

/**
 * Ring Roads CommissionRow — one line in the commission breakdown.
 * label · optional percentage · computed amount. Use `variant="total"`
 * for the grand-total emphasis row (filled brand block).
 */
export function CommissionRow({ label, percentage, amount, variant = 'default', dir = 'ltr' }) {
  if (variant === 'total') {
    return (
      <div
        dir={dir}
        style={{
          background: 'var(--brand)',
          borderRadius: 'var(--radius-sm)',
          padding: 'var(--space-4)',
          fontFamily: 'var(--font-sans)',
        }}
      >
        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--blue-200)', marginBottom: 'var(--space-2)' }}>{label}</div>
        <div style={{ fontSize: 'var(--text-display)', fontWeight: 'var(--weight-bold)', color: 'var(--text-on-brand)' }}>{amount}</div>
      </div>
    );
  }

  if (variant === 'subtotal') {
    return (
      <div
        dir={dir}
        style={{
          background: 'var(--surface-app)',
          borderRadius: 'var(--radius-sm)',
          padding: 'var(--space-3)',
          borderInlineStart: '4px solid var(--border-accent)',
          fontFamily: 'var(--font-sans)',
        }}
      >
        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginBottom: 'var(--space-1)' }}>{label}</div>
        <div style={{ fontSize: 'var(--text-h2)', fontWeight: 'var(--weight-bold)', color: 'var(--brand)' }}>{amount}</div>
      </div>
    );
  }

  return (
    <div
      dir={dir}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 'var(--space-2)',
        padding: 'var(--space-3) 0',
        borderBottom: '1px solid var(--border-default)',
        fontFamily: 'var(--font-sans)',
      }}
    >
      <span style={{ flex: 1, fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-medium)', color: 'var(--text-body)' }}>{label}</span>
      {percentage != null && (
        <span style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--weight-semibold)', color: 'var(--text-accent)', minWidth: 40, textAlign: 'end' }}>
          {percentage}%
        </span>
      )}
      <span style={{ fontSize: 'var(--text-body)', fontWeight: 'var(--weight-semibold)', color: 'var(--brand)', minWidth: 110, textAlign: 'end' }}>{amount}</span>
    </div>
  );
}
