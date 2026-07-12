// Ring Roads — Commission calculator screen. Composes Panel, Input, CommissionRow.
function Commission({ lang }) {
  const { Panel, Input, CommissionRow } = window.RingRoadsDesignSystem_ef90d6;
  const { t, fmt } = window.RR_DATA;
  const L = t[lang];

  const [buyer, setBuyer] = React.useState('30000');
  const [seller, setSeller] = React.useState('50000');
  const [pBuyer, setPBuyer] = React.useState('11');
  const [pSeller, setPSeller] = React.useState('11');
  const [pInsp, setPInsp] = React.useState('5');
  const [pMgr, setPMgr] = React.useState('2');

  const num = (v) => parseFloat(v) || 0;
  const totalMoney = num(buyer) + num(seller);
  const calc = (p) => (num(p) / 100) * totalMoney;
  const money = (n) => `${fmt(Math.round(n))} ${L.currency}`;
  const rows = [
    { l: L.buyerAgent, p: pBuyer }, { l: L.sellerAgent, p: pSeller },
    { l: L.inspection, p: pInsp }, { l: L.manager, p: pMgr },
  ];
  const totalComm = rows.reduce((s, r) => s + calc(r.p), 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', padding: 'var(--space-4)' }}>
      <Panel title={L.amounts} accent="accent" dir={L.dir}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          <Input label={L.buyerAmount} value={buyer} onChange={setBuyer} suffix={L.currency} dir={L.dir} />
          <Input label={L.sellerAmount} value={seller} onChange={setSeller} suffix={L.currency} dir={L.dir} />
        </div>
      </Panel>

      <Panel title={L.percents} accent="accent" dir={L.dir}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
          <Input label={L.buyerAgent} value={pBuyer} onChange={setPBuyer} suffix="%" dir={L.dir} />
          <Input label={L.sellerAgent} value={pSeller} onChange={setPSeller} suffix="%" dir={L.dir} />
          <Input label={L.inspection} value={pInsp} onChange={setPInsp} suffix="%" dir={L.dir} />
          <Input label={L.manager} value={pMgr} onChange={setPMgr} suffix="%" dir={L.dir} />
        </div>
      </Panel>

      <Panel title={L.results} accent="success" dir={L.dir}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          <CommissionRow variant="subtotal" label={L.txnTotal} amount={money(totalMoney)} dir={L.dir} />
          <div>
            {rows.map((r, i) => (
              <CommissionRow key={i} label={r.l} percentage={r.p} amount={money(calc(r.p))} dir={L.dir} />
            ))}
          </div>
          <CommissionRow variant="total" label={L.totalComm} amount={money(totalComm)} dir={L.dir} />
        </div>
      </Panel>
    </div>
  );
}
window.Commission = Commission;
