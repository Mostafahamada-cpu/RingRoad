// Archive module: archived properties stay recoverable; admin can hard-delete.
import { t } from '../lib/i18n.js';
import { esc, money, fmtDate } from '../lib/utils.js';
import { profileById } from '../lib/store.js';
import { loadListings, restoreListing, deleteListing, canManage, typeLabel } from '../lib/listings.js';
import { dataTable } from '../components/table.js';
import { pagehead } from '../components/layout.js';
import { render as rerender, navigate } from '../lib/router.js';

export async function pageArchive() {
  const rows = (await loadListings()).filter(l => l.status === 'archived');
  const el = document.createElement('div');
  el.innerHTML = `${pagehead(t('archiveTitle'), t('archiveSub'))}<div id="tbl"></div>`;

  el.querySelector('#tbl').appendChild(dataTable({
    rows,
    exportName: 'archived-properties',
    emptyText: t('noArchived'),
    onRowClick: (r) => navigate('properties/' + r.id),
    searchable: (r, q) => [r.title, r.city].join(' ').toLowerCase().includes(q),
    columns: [
      { key: 'title', label: t('propertyTitle'), sortable: true, render: r => `<span class="cell-main">${esc(r.title)}</span>` },
      { key: 'ptype', label: t('ptype'), render: r => esc(typeLabel(r.ptype)) },
      { key: 'city', label: t('city'), sortable: true },
      { key: 'price', label: t('price'), sortable: true, render: r => `<span class="money">${esc(money(r.price))}</span>`, csv: r => r.price },
      { key: 'updated_at', label: t('archivedOn'), sortable: true, render: r => esc(fmtDate(r.updated_at)) },
      { key: 'agent_id', label: t('agentInfo'), render: r => esc(profileById(r.agent_id)?.name || '—') },
      { key: '_a', label: t('actions'), render: r => `
        <button class="btn btn--primary btn--sm" data-restore="${r.id}">↩️ ${esc(t('restoreAction'))}</button>
        ${canManage() ? `<button class="btn btn--danger btn--sm" data-del="${r.id}">🗑️</button>` : ''}` },
    ],
  }));

  el.querySelectorAll('[data-restore]').forEach(b => b.onclick = async () => {
    if (await restoreListing(rows.find(x => x.id === b.dataset.restore))) rerender();
  });
  el.querySelectorAll('[data-del]').forEach(b => b.onclick = async () => {
    if (await deleteListing(rows.find(x => x.id === b.dataset.del))) rerender();
  });
  return el;
}
