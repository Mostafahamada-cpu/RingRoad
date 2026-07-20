// Properties: searchable/filterable list with card & table views, bulk actions.
import { t } from '../lib/i18n.js';
import { esc, money, compact, num, debounce } from '../lib/utils.js';
import { db } from '../lib/supabase.js';
import { store, profileById, isMgmt } from '../lib/store.js';
import { loadListings, visibleListings, canManage, typeOptions, typeLabel, archiveListing, openMarkSold } from '../lib/listings.js';
import { listingCard, statusBadge } from '../components/cards.js';
import { dataTable } from '../components/table.js';
import { pagehead } from '../components/layout.js';
import { navigate, render as rerender } from '../lib/router.js';
import { toast } from '../lib/toast.js';

const F = { q: '', status: 'all', type: 'all', agent: 'all', city: '', minPrice: '', maxPrice: '', beds: '', baths: '', minArea: '', view: 'cards' };

export async function pageListings() {
  const all = visibleListings(await loadListings()).filter(l => l.status !== 'archived');
  const el = document.createElement('div');

  const agents = store.profiles.filter(p => ['agent', 'leader'].includes(p.role));
  const cities = [...new Set(all.map(l => l.city).filter(Boolean))].sort();

  function filtered() {
    const q = F.q.trim().toLowerCase();
    return all.filter(l => {
      if (F.status !== 'all' && l.status !== F.status) return false;
      if (F.type !== 'all' && l.ptype !== F.type) return false;
      if (F.agent !== 'all' && l.agent_id !== F.agent) return false;
      if (F.city && l.city !== F.city) return false;
      if (F.minPrice && num(l.price) < num(F.minPrice)) return false;
      if (F.maxPrice && num(l.price) > num(F.maxPrice)) return false;
      if (F.beds && num(l.bedrooms) < num(F.beds)) return false;
      if (F.baths && num(l.bathrooms) < num(F.baths)) return false;
      if (F.minArea && num(l.area) < num(F.minArea)) return false;
      if (q) {
        const agent = profileById(l.agent_id);
        const hay = [l.title, l.city, l.address, l.governorate, agent?.name].join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }

  function listArea() {
    const rows = filtered();
    const target = el.querySelector('#list-area');
    if (!rows.length) {
      target.innerHTML = `<div class="empty"><div class="empty__icon">🏛️</div>${esc(all.length ? t('noResults') : t('noProps'))}</div>`;
      return;
    }
    if (F.view === 'cards') {
      target.innerHTML = `<div class="grid grid--3">${rows.map(listingCard).join('')}</div>`;
      target.querySelectorAll('[data-listing]').forEach(c =>
        c.onclick = () => navigate('properties/' + c.dataset.listing));
    } else {
      target.innerHTML = '';
      target.appendChild(dataTable({
        rows,
        exportName: 'properties',
        onRowClick: (r) => navigate('properties/' + r.id),
        searchable: null,
        bulk: canManage() ? [
          { label: '🗄️ ' + t('bulkArchive'), onAction: async (sel) => {
            for (const l of sel) await db.update('listings', l.id, { status: 'archived' });
            toast(t('saved')); rerender();
          }},
          { label: '★ ' + t('bulkFeature'), onAction: async (sel) => {
            for (const l of sel) await db.update('listings', l.id, { featured: true });
            toast(t('saved')); rerender();
          }},
        ] : [],
        columns: [
          { key: 'title', label: t('propertyTitle'), sortable: true, render: r => `<span class="cell-main">${esc(r.title)}</span>${r.featured ? ' ★' : ''}` },
          { key: 'ptype', label: t('ptype'), sortable: true, render: r => esc(typeLabel(r.ptype)), csv: r => typeLabel(r.ptype) },
          { key: 'city', label: t('city'), sortable: true },
          { key: 'price', label: t('price'), sortable: true, render: r => `<b class="money">${esc(money(r.price))}</b>`, csv: r => r.price },
          { key: 'bedrooms', label: '🛏', sortable: true },
          { key: 'area', label: t('area'), sortable: true, render: r => esc(compact(r.area)) },
          { key: 'status', label: t('status'), sortable: true, render: r => statusBadge(r.status), csv: r => t(r.status) },
          { key: 'agent_id', label: t('agentInfo'), render: r => esc(profileById(r.agent_id)?.name || '—'), csv: r => profileById(r.agent_id)?.name || '' },
          { key: '_a', label: '', render: r => `
            ${r.status !== 'sold' ? `<button class="btn btn--ghost btn--sm" data-sold="${r.id}">🤝</button>` : ''}
            ${canManage() ? `<button class="btn btn--ghost btn--sm" data-arch="${r.id}">🗄️</button>` : ''}` },
        ],
      }));
      target.querySelectorAll('[data-sold]').forEach(b => b.onclick = () =>
        openMarkSold(rows.find(x => x.id === b.dataset.sold), rerender));
      target.querySelectorAll('[data-arch]').forEach(b => b.onclick = async () => {
        if (await archiveListing(rows.find(x => x.id === b.dataset.arch))) rerender();
      });
    }
    el.querySelector('#count').textContent = rows.length;
  }

  const sel = (name, options, cur, allLabel) => `
    <select class="select" data-f="${name}" style="width:auto;padding:9px 12px">
      <option value="all">${esc(allLabel)}</option>
      ${options.map(o => `<option value="${esc(o.v)}" ${String(cur) === String(o.v) ? 'selected' : ''}>${esc(o.l)}</option>`).join('')}
    </select>`;

  el.innerHTML = `
    ${pagehead(t('propsTitle'), t('propsSub'), `
      <div class="row">
        <button class="btn btn--outline" id="view-toggle">${F.view === 'cards' ? '☰ ' + esc(t('tableView')) : '▦ ' + esc(t('cards'))}</button>
        <button class="btn btn--primary" id="add-prop">＋ ${esc(t('addProperty'))}</button>
      </div>`)}
    <div class="card section" style="padding:16px">
      <div class="row row--wrap" style="gap:10px">
        <div class="searchbox grow" style="min-width:200px"><input class="input" data-f="q" placeholder="${esc(t('search'))}" value="${esc(F.q)}"></div>
        ${sel('status', ['available', 'reserved', 'sold'].map(s => ({ v: s, l: t(s) })), F.status, t('status') + ': ' + t('all'))}
        ${sel('type', typeOptions(), F.type, t('ptype') + ': ' + t('all'))}
        ${isMgmt() ? sel('agent', agents.map(a => ({ v: a.id, l: a.name || a.email })), F.agent, t('agentInfo') + ': ' + t('all')) : ''}
        ${sel('city', cities.map(c => ({ v: c, l: c })), F.city || 'all', t('city') + ': ' + t('all'))}
        <input class="input" data-f="minPrice" type="number" placeholder="${esc(t('minPrice'))}" value="${esc(F.minPrice)}" style="width:110px" dir="ltr">
        <input class="input" data-f="maxPrice" type="number" placeholder="${esc(t('maxPrice'))}" value="${esc(F.maxPrice)}" style="width:110px" dir="ltr">
        <input class="input" data-f="beds" type="number" placeholder="🛏 ${esc(t('bedrooms'))}+" value="${esc(F.beds)}" style="width:92px" dir="ltr">
        <input class="input" data-f="baths" type="number" placeholder="🛁+" value="${esc(F.baths)}" style="width:78px" dir="ltr">
        <input class="input" data-f="minArea" type="number" placeholder="${esc(t('minArea'))}" value="${esc(F.minArea)}" style="width:100px" dir="ltr">
      </div>
    </div>
    <div class="row row--between" style="margin-bottom:12px">
      <span class="xs muted"><b id="count">0</b> ${esc(t('of'))} ${all.length}</span>
    </div>
    <div id="list-area"></div>`;

  el.querySelector('#add-prop').onclick = () => navigate('properties/new');
  el.querySelector('#view-toggle').onclick = () => { F.view = F.view === 'cards' ? 'table' : 'cards'; rerender(); };
  const onFilter = debounce(() => listArea(), 200);
  el.querySelectorAll('[data-f]').forEach(inp => {
    const apply = () => { F[inp.dataset.f] = inp.value === 'all' ? (inp.tagName === 'SELECT' ? 'all' : '') : inp.value; onFilter(); };
    inp.tagName === 'SELECT' ? (inp.onchange = apply) : (inp.oninput = apply);
  });
  // city select uses '' for all
  listArea();
  return el;
}
