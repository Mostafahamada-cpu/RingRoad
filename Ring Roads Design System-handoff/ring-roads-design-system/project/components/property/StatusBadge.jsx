import React from 'react';

/**
 * Ring Roads StatusBadge — property state pill.
 * available = green, sold = red, rented (or other) = amber.
 */
export function StatusBadge({ status = 'available', children, style = {} }) {
  const map = {
    available: { color: 'var(--success)', bg: 'var(--success-bg)' },
    sold: { color: 'var(--error)', bg: 'var(--error-bg)' },
    rented: { color: 'var(--warning)', bg: 'var(--warning-bg)' },
  };
  const tone = map[status] || map.available;
  return (
    <span
      style={{
        display: 'inline-block',
        fontFamily: 'var(--font-sans)',
        fontSize: 'var(--text-2xs)',
        fontWeight: 'var(--weight-semibold)',
        color: tone.color,
        background: tone.bg,
        padding: '4px 8px',
        borderRadius: 'var(--radius-xs)',
        lineHeight: 1,
        ...style,
      }}
    >
      {children}
    </span>
  );
}
