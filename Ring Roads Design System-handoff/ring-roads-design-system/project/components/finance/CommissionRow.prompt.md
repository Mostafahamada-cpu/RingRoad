Line item for the commission-calculator results. Three variants build the whole breakdown.

```jsx
<CommissionRow variant="subtotal" label="إجمالي المعاملة · Transaction total" amount="80,000 EGP" />
<CommissionRow label="عمولة وكيل المشتري · Buyer agent" percentage={11} amount="8,800 EGP" />
<CommissionRow label="الفحص · Inspection" percentage={5} amount="4,000 EGP" />
<CommissionRow variant="total" label="إجمالي العمولات · Total commission" amount="23,200 EGP" />
```

`default` = bordered line, `subtotal` = blue-accented tint box, `total` = filled brand block.
