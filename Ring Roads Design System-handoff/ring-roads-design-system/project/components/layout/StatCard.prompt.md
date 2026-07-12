Compact metric tile for the dashboard stats row. Put three in a flex row with `gap`.

```jsx
<div style={{ display: 'flex', gap: 'var(--space-3)' }}>
  <StatCard value="12" label="إجمالي العقارات · Total" />
  <StatCard value="8" label="متاح · Available" />
  <StatCard value="6" label="للبيع · For sale" />
</div>
```

Large blue value over a muted bilingual label; blue accent bar on by default.
