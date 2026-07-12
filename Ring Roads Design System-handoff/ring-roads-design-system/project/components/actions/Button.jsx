import React from 'react';

/**
 * Ring Roads Button — the app's primary action & tab-style control.
 * Variants: primary (filled blue), secondary (blue tint), ghost (text only).
 */
export function Button({
  children,
  variant = 'primary',
  size = 'md',
  icon = null,
  fullWidth = false,
  disabled = false,
  onClick,
  style = {},
  ...rest
}) {
  const sizes = {
    sm: { padding: '8px 14px', fontSize: 'var(--text-sm)' },
    md: { padding: '12px 18px', fontSize: 'var(--text-body)' },
    lg: { padding: '14px 22px', fontSize: 'var(--text-h3)' },
  };

  const variants = {
    primary: {
      background: 'var(--brand)',
      color: 'var(--text-on-brand)',
      border: '1px solid var(--brand)',
    },
    secondary: {
      background: 'var(--surface-tint)',
      color: 'var(--brand)',
      border: '1px solid var(--blue-100)',
    },
    ghost: {
      background: 'transparent',
      color: 'var(--brand-accent)',
      border: '1px solid transparent',
    },
  };

  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 'var(--space-2)',
        fontFamily: 'var(--font-sans)',
        fontWeight: 'var(--weight-semibold)',
        borderRadius: 'var(--radius-sm)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        width: fullWidth ? '100%' : 'auto',
        transition: 'filter 0.15s ease, transform 0.05s ease',
        ...sizes[size],
        ...variants[variant],
        ...style,
      }}
      onMouseDown={(e) => !disabled && (e.currentTarget.style.transform = 'scale(0.98)')}
      onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
      onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
      {...rest}
    >
      {icon && <span aria-hidden="true" style={{ fontSize: '1.1em', lineHeight: 1 }}>{icon}</span>}
      {children}
    </button>
  );
}
