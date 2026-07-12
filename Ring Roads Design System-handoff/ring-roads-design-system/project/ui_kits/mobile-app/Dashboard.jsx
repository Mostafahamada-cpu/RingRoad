// Ring Roads — Dashboard screen. Composes PropertyCard, StatCard, StatusBadge.
function Dashboard({ lang }) {
  const { PropertyCard, StatCard } = window.RingRoadsDesignSystem_ef90d6;
  const { properties, t, fmt } = window.RR_DATA;
  const L = t[lang];
  const [openId, setOpenId] = React.useState(1);

  const price = (p) =>
    p.type === 'rent' ? `${fmt(p.price)} ${L.currency}${L.month}` : `${fmt(p.price)} ${L.currency}`;
  const statusLabel = { available: L.statusAvailable, sold: L.statusSold, rented: L.statusRented };

  const stats = [
    { v: properties.length, l: L.total },
    { v: properties.filter((p) => p.status === 'available').length, l: L.available },
    { v: properties.filter((p) => p.type === 'sale').length, l: L.forSale },
  ];

  return (
    <div>
      <div style={{ display: 'flex', gap: 'var(--space-3)', padding: 'var(--space-4)' }}>
        {stats.map((s, i) => <StatCard key={i} value={s.v} label={s.l} dir={L.dir} />)}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', padding: '0 var(--space-4) var(--space-4)' }}>
        {properties.map((p) => (
          <PropertyCard
            key={p.id} dir={L.dir}
            expanded={openId === p.id}
            onToggle={() => setOpenId(openId === p.id ? null : p.id)}
            t={{ beds: L.beds, baths: L.baths, type: L.type, finish: L.finish, unit: L.unit, agent: L.agent, registered: L.registered }}
            property={{
              code: p.code, icon: p.icon, status: p.status,
              statusLabel: statusLabel[p.status], address: p.address[lang], price: price(p),
              beds: p.beds, baths: p.baths, typeLabel: p.type === 'rent' ? L.rent : L.sale,
              finish: p.finish[lang], unit: p.unit[lang], agent: p.agent[lang], registered: p.registered,
            }}
          />
        ))}
      </div>
    </div>
  );
}
window.Dashboard = Dashboard;
