Primary action control for Ring Roads — use for confirm/submit actions and prominent CTAs; use `ghost` for inline/low-emphasis actions.

```jsx
<Button variant="primary" icon="💰" onClick={calc}>احسب العمولة · Calculate</Button>
<Button variant="secondary">تفاصيل · Details</Button>
<Button variant="ghost" size="sm">إلغاء · Cancel</Button>
```

Variants: `primary` (filled blue), `secondary` (blue tint), `ghost` (text). Sizes: `sm` / `md` / `lg`. Supports `icon`, `fullWidth`, `disabled`.
