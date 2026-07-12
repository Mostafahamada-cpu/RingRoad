The core dashboard listing card — tap the header to expand agent/unit/registration details. Composes `StatusBadge`. All copy comes from the `property` object so it works in either language; pass `t` to translate the fixed row labels and `dir="rtl"` for Arabic layout.

```jsx
<PropertyCard
  property={{
    code: 'A-101', address: 'الشيخ زايد · Sheikh Zayed', price: '2,500,000 EGP',
    icon: '🏠', status: 'available', statusLabel: 'متاح · Available',
    beds: 3, baths: 2, typeLabel: 'بيع · Sale', finish: 'فاخر · Luxury',
    unit: 'Apt 1', agent: 'محمد أحمد', registered: '2024-01-15',
  }}
  expanded={open} onToggle={() => setOpen(!open)}
  t={{ beds: 'غرف · Beds', baths: 'حمام · Baths', type: 'نوع · Type', finish: 'تشطيب · Finish' }}
/>
```
