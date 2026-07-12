import React from 'react';

/**
 * Ring Roads bottom tab bar — the app's primary navigation.
 * Active tab fills with brand blue; inactive tabs sit on a tint pill.
 */
export function TabBar({ tabs = [], activeId, onChange, dir = 'ltr' }) {
  return (
    <nav
      dir={dir}
      style={{
        display: 'flex',
        gap: 'var(--space-2)',
        padding: 'var(--space-2)',
        background: 'var(--surface-card)',
        borderTop: '1px solid var(--border-default)',
        fontFamily: 'var(--font-sans)',
      }}
    >
      {tabs.map((tab) => {
        const active = tab.id === activeId;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange && onChange(tab.id)}
            style={{
              flex: 1,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 'var(--space-2)',
              padding: '12px 16px',
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              cursor: 'pointer',
              fontFamily: 'var(--font-sans)',
              fontSize: 'var(--text-sm)',
              fontWeight: 'var(--weight-semibold)',
              background: active ? 'var(--brand)' : 'var(--surface-app)',
              color: active ? 'var(--text-on-brand)' : 'var(--text-muted)',
              transition: 'background 0.15s ease, color 0.15s ease',
            }}
          >
            {tab.icon && <span aria-hidden="true">{tab.icon}</span>}
            {tab.label}
          </button>
        );
      })}
    </nav>
  );
}
