import React from 'react';
import { StatusBadge } from './StatusBadge.jsx';

/**
 * Ring Roads PropertyCard — expandable listing card from the dashboard.
 * Header (icon + code + address, price + status), a quick-info row of stats,
 * and expandable detail rows. Fully bilingual via the `property` fields and `t` labels.
 */
export function PropertyCard({ property, expanded = false, onToggle, dir = 'ltr', t = {} }) {
  const labels = {
    beds: t.beds ?? 'Beds',
    baths: t.baths ?? 'Baths',
    type: t.type ?? 'Type',
    finish: t.finish ?? 'Finish',
    unit: t.unit ?? 'Unit',
    agent: t.agent ?? 'Agent',
    registered: t.registered ?? 'Registered',
    ...t,
  };

  const statusOrder = { available: 'available', sold: 'sold', rented: 'rented' };
  const detailRows = [
    [labels.unit, property.unit],
    [labels.agent, property.agent],
    [labels.registered, property.registered],
  ];

  return (
    <article
      dir={dir}
      style={{
        background: 'var(--surface-card)',
        borderRadius: 'var(--radius-md)',
        border: `${expanded ? 2 : 1}px solid ${expanded ? 'var(--border-accent)' : 'var(--border-default)'}`,
        boxShadow: 'var(--shadow-card)',
        overflow: 'hidden',
        fontFamily: 'var(--font-sans)',
      }}
    >
      {/* Header */}
      <button
        type="button"
        onClick={onToggle}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 'var(--space-3)',
          padding: 'var(--space-4)',
          background: 'transparent',
          border: 'none',
          borderBottom: '1px solid var(--border-default)',
          cursor: 'pointer',
          textAlign: dir === 'rtl' ? 'right' : 'left',
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', minWidth: 0 }}>
          <span aria-hidden="true" style={{ fontSize: '28px', lineHeight: 1 }}>{property.icon || '🏠'}</span>
          <span style={{ minWidth: 0 }}>
            <span style={{ display: 'block', fontSize: 'var(--text-body)', fontWeight: 'var(--weight-semibold)', color: 'var(--text-heading)' }}>
              {property.code}
            </span>
            <span style={{ display: 'block', fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
              {property.address}
            </span>
          </span>
        </span>
        <span style={{ textAlign: dir === 'rtl' ? 'left' : 'right', flexShrink: 0 }}>
          <span style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-bold)', color: 'var(--brand)', marginBottom: 'var(--space-1)' }}>
            {property.price}
          </span>
          <StatusBadge status={statusOrder[property.status] || 'available'}>{property.statusLabel}</StatusBadge>
        </span>
      </button>

      {/* Quick info */}
      <div style={{ display: 'flex', padding: 'var(--space-3) var(--space-4)', background: 'var(--surface-app)', borderBottom: '1px solid var(--border-default)' }}>
        {[
          [labels.beds, property.beds],
          [labels.baths, property.baths],
          [labels.type, property.typeLabel],
          [labels.finish, property.finish],
        ].map(([k, v]) => (
          <div key={k} style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: 'var(--text-2xs)', color: 'var(--text-muted)', marginBottom: '2px' }}>{k}</div>
            <div style={{ fontSize: 'var(--text-body)', fontWeight: 'var(--weight-semibold)', color: 'var(--brand)' }}>{v}</div>
          </div>
        ))}
      </div>

      {/* Expanded details */}
      {expanded && (
        <div style={{ padding: 'var(--space-2) var(--space-4)', background: 'var(--surface-app)' }}>
          {detailRows.map(([k, v]) => (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: 'var(--space-2) 0', borderBottom: '1px solid var(--border-default)' }}>
              <span style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--weight-semibold)', color: 'var(--text-muted)' }}>{k}</span>
              <span style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-medium)', color: 'var(--text-heading)' }}>{v}</span>
            </div>
          ))}
        </div>
      )}
    </article>
  );
}
