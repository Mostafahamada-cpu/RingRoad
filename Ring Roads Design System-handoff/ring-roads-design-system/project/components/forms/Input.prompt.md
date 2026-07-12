Labeled text field for Ring Roads forms (commission amounts, percentages, search). Blue focus ring; optional trailing `suffix` for units.

```jsx
<Input label="مبلغ المشتري · Buyer amount" value={amount} onChange={setAmount} suffix="جنيه" type="number" />
<Input label="Commission %" value={pct} onChange={setPct} suffix="%" />
```

Set `dir="rtl"` for Arabic-only fields. `suffix` renders a muted unit inside the field.
