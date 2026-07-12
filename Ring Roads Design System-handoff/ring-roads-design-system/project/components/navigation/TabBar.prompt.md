Bottom navigation for the Ring Roads app — active tab fills with brand blue. Two-tab default (Dashboard / Commission) but takes any number.

```jsx
<TabBar
  activeId={tab}
  onChange={setTab}
  tabs={[
    { id: 'dashboard', label: 'لوحة العقارات · Dashboard', icon: '📊' },
    { id: 'commission', label: 'العمولات · Commission', icon: '💰' },
  ]}
/>
```

Set `dir="rtl"` to flip order for Arabic.
