// Sold properties module: record of closed sales with buyer, price, commission.
import { t } from '../lib/i18n.js';
import { esc, money, compact, fmtDate } from '../lib/utils.js';
import { profileById } from '../lib/store.js';
import { loadListings, visibleListings } from '../lib/listings.js';
import { statCard } from '../components/cards.js';
import { dataTable } from '../components/table.js';
import { pagehead } from '../components/layout.js';
import { navigate } from '../lib/router.js';
import { openPrintReport, groupNum } from '../lib/utils.js';

export async function pageSold() {
  const sold = visibleListings(await loadListings()).filter(l => l.status === 'sold')
    .sort((a, b) => String(b.sold_date || '').localeCompare(String(a.sold_date || '')));
  const totalValue = sold.reduce((s, l) => s + (+l.sold_price || 0), 0);
  const totalComm = sold.reduce((s, l) => s + (+l.commission || 0), 0);
  const el = document.createElement('div');

  el.innerHTML = `
    ${pagehead(t('soldTitle'), t('soldSub'), `<button class="btn btn--outline" id="pdf">📄 ${esc(t('exportPdf'))}</button>`)}
    <div class="grid grid--3 section">
      ${statCard({ icon: '🤝', value: sold.length, label: t('soldProperties') })}
      ${statCard({ icon: '💰', value: compact(totalValue), label: t('saleValue'), tone: 'burg' })}
      ${statCard({ icon: '✨', value: compact(totalComm), label: t('totalCommission') })}
    </div>
    <div id="tbl"></div>`;

  el.querySelector('#tbl').appendChild(dataTable({
    rows: sold,
    exportName: 'sold-properties',
    emptyText: t('noSold'),
    onRowClick: (r) => navigate('properties/' + r.id),
    searchable: (r, q) => [r.title, r.buyer_name, r.city, profileById(r.agent_id)?.name].join(' ').toLowerCase().includes(q),
    columns: [
      { key: 'sold_date', label: t('soldDate'), sortable: true, render: r => esc(fmtDate(r.sold_date)) },
      { key: 'title', label: t('propertyTitle'), sortable: true, render: r => `<span class="cell-main">${esc(r.title)}</span><div class="xs muted">${esc(r.city || '')}</div>` },
      { key: 'buyer_name', label: t('buyerName'), sortable: true },
      { key: 'sold_price', label: t('sellingPrice'), sortable: true, render: r => `<b class="money">${esc(money(r.sold_price))}</b>`, csv: r => r.sold_price },
      { key: 'commission', label: t('commission'), sortable: true, render: r => `<span class="money" style="color:var(--orange-600);font-weight:700">${esc(money(r.commission))}</span>`, csv: r => r.commission },
      { key: 'agent_id', label: t('soldBy'), render: r => esc(profileById(r.agent_id)?.name || '—'), csv: r => profileById(r.agent_id)?.name || '' },
    ],
  }));

  el.querySelector('#pdf').onclick = () => {
    openPrintReport(t('soldTitle'), `
      <table><thead><tr>
        <th>${esc(t('soldDate'))}</th><th>${esc(t('propertyTitle'))}</th><th>${esc(t('buyerName'))}</th>
        <th>${esc(t('sellingPrice'))}</th><th>${esc(t('commission'))}</th><th>${esc(t('soldBy'))}</th>
      </tr></thead><tbody>
        ${sold.map(r => `<tr><td>${esc(fmtDate(r.sold_date))}</td><td>${esc(r.title)}</td><td>${esc(r.buyer_name || '')}</td>
          <td>${esc(groupNum(r.sold_price))}</td><td>${esc(groupNum(r.commission))}</td><td>${esc(profileById(r.agent_id)?.name || '')}</td></tr>`).join('')}
      </tbody><tfoot><tr><td colspan="3">${esc(t('all'))} (${sold.length})</td>
        <td>${esc(groupNum(totalValue))}</td><td>${esc(groupNum(totalComm))}</td><td></td></tr></tfoot></table>`);
  };
  return el;
}
