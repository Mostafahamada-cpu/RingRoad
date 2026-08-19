// My Apartments — the telesales employee's own book.
//
// The list comes back filtered by the database: `prop sel` in
// platform-telesales.sql only returns rows where assigned_telesales_id (or
// agent_id) is the caller, so another employee's apartments are unreachable
// even by editing the request by hand. The explicit filter below is just so the
// page shows assignments rather than the user's own listings too.
import { t } from '../lib/i18n.js';
import { esc, money, compact, fmtDate, debounce } from '../lib/utils.js';
import { me } from '../lib/store.js';
import { typeLabel } from '../lib/listings.js';
import { loadMyApartments } from '../lib/telesales.js';
import { listingCard, statusBadge } from '../components/cards.js';
import { dataTable } from '../components/table.js';
import { pagehead } from '../components/layout.js';
import { navigate } from '../lib/router.js';
import { publicUrl } from '../lib/listings.js';

const F = { q: '', status: 'all', view: 'cards' };

export async function pageMyApartments() {
  const rows = await loadMyApartments();
  const el = document.createElement('div');
  const mine = me();

  const count = (s) => rows.filter(r => r.status === s).length;
  const stats = [
    ['🏛️', rows.length, t('tsMyTotal'), ''],
    ['🟢', count('available'), t('available'), ''],
    ['🟠', count('reserved'), t('reserved'), 'burg'],
    ['🤝', count('sold'), t('sold'), 'burg'],
  ];

  function filtered() {
    const q = F.q.trim().toLowerCase();
    return rows.filter(r => {
      if (F.status !== 'all' && r.status !== F.status) return false;
      if (q) {
        const hay = [r.code, r.title, r.city, r.project, r.address].filter(Boolean).join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }

  el.innerHTML = `
    ${pagehead(t('tsMyTitle'), t('tsMySub'), `
      <button class="btn btn--outline" id="view-toggle">
        ${F.view === 'cards' ? '☰ ' + esc(t('tableView')) : '▦ ' + esc(t('cards'))}
      </button>`)}

    ${!mine?.whatsapp ? `
    <div class="card section" style="border-color:var(--warn)">
      <div class="row row--wrap" style="gap:10px">
        <span class="badge badge--pending">⚠️</span>
        <div class="grow"><b>${esc(t('tsAddWaTitle'))}</b>
          <div class="xs muted">${esc(t('tsAddWaHint'))}</div></div>
        <button class="btn btn--primary btn--sm" id="go-settings">${esc(t('navSettings'))}</button>
      </div>
    </div>` : ''}

    <div class="grid grid--4 section">
      ${stats.map(([ic, v, label, tone]) => `
        <div class="card"><div class="stat">
          <div class="stat__icon ${tone === 'burg' ? 'stat__icon--burg' : ''}">${ic}</div>
          <div><div class="stat__val">${v}</div><div class="stat__label">${esc(label)}</div></div>
        </div></div>`).join('')}
    </div>

    <div class="card section" style="padding:16px">
      <div class="row row--wrap" style="gap:10px">
        <div class="searchbox grow" style="min-width:200px">
          <input class="input" id="q" placeholder="${esc(t('search'))}" value="${esc(F.q)}">
        </div>
        <select class="select" id="status" style="width:auto;padding:9px 12px">
          <option value="all">${esc(t('status'))}: ${esc(t('all'))}</option>
          ${['available', 'reserved', 'sold'].map(s =>
            `<option value="${s}" ${F.status === s ? 'selected' : ''}>${esc(t(s))}</option>`).join('')}
        </select>
        <span class="xs muted"><b id="count">0</b> ${esc(t('of'))} ${rows.length}</span>
      </div>
    </div>

    <div id="list"></div>`;

  el.querySelector('#go-settings')?.addEventListener('click', () => navigate('settings'));
  el.querySelector('#view-toggle').onclick = () => {
    F.view = F.view === 'cards' ? 'table' : 'cards';
    paint();
    el.querySelector('#view-toggle').innerHTML =
      F.view === 'cards' ? '☰ ' + esc(t('tableView')) : '▦ ' + esc(t('cards'));
  };
  const onFilter = debounce(paint, 180);
  el.querySelector('#q').oninput = (e) => { F.q = e.target.value; onFilter(); };
  el.querySelector('#status').onchange = (e) => { F.status = e.target.value; paint(); };

  function paint() {
    const list = filtered();
    const target = el.querySelector('#list');
    el.querySelector('#count').textContent = list.length;

    if (!list.length) {
      target.innerHTML = `<div class="empty"><div class="empty__icon">📭</div>
        ${esc(rows.length ? t('noResults') : t('tsNoneAssigned'))}</div>`;
      return;
    }

    if (F.view === 'cards') {
      target.innerHTML = `<div class="grid grid--3">${list.map(listingCard).join('')}</div>`;
      target.querySelectorAll('[data-listing]').forEach(c =>
        c.onclick = () => navigate('properties/' + c.dataset.listing));
      return;
    }

    target.innerHTML = '';
    target.appendChild(dataTable({
      rows: list,
      exportName: 'my-apartments',
      onRowClick: (r) => navigate('properties/' + r.id),
      searchable: null,
      columns: [
        { key: 'code', label: t('propertyId'), sortable: true, render: r => `<b dir="ltr">${esc(r.code || '—')}</b>` },
        { key: 'title', label: t('propertyTitle'), sortable: true,
          render: r => `<span class="cell-main">${esc(r.title || '—')}</span>
            <div class="xs muted">${esc([r.project, r.city].filter(Boolean).join(' · '))}</div>` },
        { key: 'ptype', label: t('ptype'), sortable: true, render: r => esc(typeLabel(r.ptype)) },
        { key: 'price', label: t('price'), sortable: true,
          render: r => `<b class="money">${esc(money(r.price))}</b>`, csv: r => r.price },
        { key: 'area', label: t('area'), sortable: true, render: r => esc(compact(r.area)) },
        { key: 'status', label: t('status'), sortable: true, render: r => statusBadge(r.status), csv: r => t(r.status) },
        { key: 'assigned_at', label: t('tsAssignedAt'), sortable: true,
          render: r => `<span class="xs">${esc(r.assigned_at ? fmtDate(r.assigned_at) : '—')}</span>`,
          csv: r => r.assigned_at || '' },
        { key: '_link', label: '', render: r => {
          const url = publicUrl(r);
          return url ? `<a class="btn btn--ghost btn--sm" href="${esc(url)}" target="_blank" rel="noopener"
            onclick="event.stopPropagation()">↗</a>` : '';
        } },
      ],
    }));
  }

  paint();
  return el;
}
