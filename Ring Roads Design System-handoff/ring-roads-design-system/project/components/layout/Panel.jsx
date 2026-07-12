import React from 'react';

/**
 * Ring Roads Panel — the app's white content card with a colored left accent bar.
 * Used to group form sections and results. Accent maps to a semantic role.
 */
export function Panel({ title, accent = 'accent', children, dir = 'ltr', style = {} }) {
  const accents = {
    accent: 'var(--border-accent)',
    brand: 'var(--brand)',
    success: 'var(--success)',
    warning: 'var(--warning)',
  };
  const borderSide = dir === 'rtl' ? 'borderRight' : 'borderLeft';
  return (
    <section
      dir={dir}
      style={{
        background: 'var(--surface-card)',
        borderRadius: 'var(--radius-md)',
        boxShadow: 'var(--shadow-card)',
        padding: 'var(--space-4)',
        [borderSide]: `4px solid ${accents[accent]}`,
        fontFamily: 'var(--font-sans)',
        ...style,
      }}
    >
      {title && (
        <h3
          style={{
            margin: `0 0 var(--space-4)`,
            fontSize: 'var(--text-h3)',
            fontWeight: 'var(--weight-semibold)',
            color: 'var(--text-heading)',
          }}
        >
          {title}
        </h3>
      )}
      {children}
    </section>
  );
}
