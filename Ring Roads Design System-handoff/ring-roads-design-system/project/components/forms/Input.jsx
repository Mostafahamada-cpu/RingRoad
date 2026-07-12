import React from 'react';

/**
 * Ring Roads Input — labeled text field used across the commission calculator.
 * Bilingual-ready: pass any label; set dir="rtl" for Arabic contexts.
 */
export function Input({
  label,
  value,
  onChange,
  placeholder = '',
  suffix = null,
  type = 'text',
  dir = 'ltr',
  disabled = false,
  style = {},
  ...rest
}) {
  const [focused, setFocused] = React.useState(false);
  return (
    <label style={{ display: 'block', fontFamily: 'var(--font-sans)', ...style }}>
      {label && (
        <span
          style={{
            display: 'block',
            fontSize: 'var(--text-sm)',
            fontWeight: 'var(--weight-semibold)',
            color: 'var(--text-body)',
            marginBottom: 'var(--space-2)',
          }}
        >
          {label}
        </span>
      )}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        <input
          type={type}
          value={value}
          dir={dir}
          disabled={disabled}
          placeholder={placeholder}
          onChange={(e) => onChange && onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{
            width: '100%',
            boxSizing: 'border-box',
            fontFamily: 'var(--font-sans)',
            fontSize: 'var(--text-body)',
            color: 'var(--text-body)',
            background: 'var(--surface-app)',
            border: `1px solid ${focused ? 'var(--border-accent)' : 'var(--border-default)'}`,
            boxShadow: focused ? '0 0 0 3px var(--blue-100)' : 'none',
            borderRadius: 'var(--radius-sm)',
            padding: '10px 12px',
            paddingInlineEnd: suffix ? '40px' : '12px',
            outline: 'none',
            transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
          }}
          {...rest}
        />
        {suffix && (
          <span
            style={{
              position: 'absolute',
              insetInlineEnd: '12px',
              fontSize: 'var(--text-sm)',
              fontWeight: 'var(--weight-semibold)',
              color: 'var(--text-muted)',
              pointerEvents: 'none',
            }}
          >
            {suffix}
          </span>
        )}
      </div>
    </label>
  );
}
