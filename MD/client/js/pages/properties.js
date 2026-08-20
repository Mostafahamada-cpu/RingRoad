// Properties — the public list: quick filters, search, sort, cards.
//
// The quick-filter bar carries the handful of criteria almost every visitor
// touches (purpose, location, type, price, rooms) so the advanced sheet is
// opt-in rather than a toll gate. Everything shares one filter state with the
// mega-menu and the sheet, so the three never disagree.
import { esc, debounce, ptypeLabel, compactMoney } from '../lib/format.js';
import { icon } from '../lib/icons.js';
import { loadAll, all, facets } from '../lib/catalog.js';
import { skeletonGrid, emptyState } from '../lib/ui.js';
import { cardGrid } from '../components/card.js';
import { PURPOSE_META, purposeCounts } from '../lib/purpose.js';
import {
  F, SORTS, applyFilters, activeChips, activeCount, resetFilters, clearFilter,
  openFilterSheet, hasAnyFilter, setPurpose,
} from '../components/filters.js';

const PRICE_STEPS = [
  { v: '', l: 'Any price' },
  { v: '0|2000000', l: 'Up to 2M' },
  { v: '2000000|5000000', l: '2M – 5M' },
  { v: '5000000|10000000', l: '5M – 10M' },
  { v: '10000000|20000000', l: '10M – 20M' },
  { v: '20000000|', l: '20M +' },
];

const priceValue = () => {
  if (!F.minPrice && !F.maxPrice) return '';
  const hit = PRICE_STEPS.find(s => s.v && s.v === `${F.minPrice}|${F.maxPrice}`);
  return hit ? hit.v : 'custom';
};

export async function pageProperties(view) {
  view.innerHTML = `
    <header class="c-head">
      <span class="c-eyebrow">Portfolio</span>
      <h1>Find your next property</h1>
      <p>Browse the full Ring Roads portfolio — no account needed.</p>
    </header>

    <section class="c-quick" aria-label="Quick filters">
      <div class="c-quick__purposes" id="qpurpose" role="group" aria-label="Purpose"></div>
      <div class="c-quick__row">
        <div class="c-searchbox">
          ${icon('search', 'c-searchbox__ic')}
          <input class="input" id="q" type="search" inputmode="search"
                 placeholder="Search by title, area, project or ID…" value="${esc(F.q)}" aria-label="Search">
        </div>
        <div class="c-quick__selects" id="qselects"></div>
        <button class="btn btn--outline c-filterbtn" id="open-filters">
          ${icon('sliders')}<span>All filters</span>
          <span class="c-count" id="fcount" ${activeCount() ? '' : 'hidden'}>${activeCount()}</span>
        </button>
      </div>
    </section>

    <div id="chips" class="c-activefilters"></div>

    <div class="c-resultbar">
      <span id="count" class="c-resultbar__count"></span>
      <div class="c-sortwrap">
        <label class="c-sortwrap__lbl" for="sort">Sort</label>
        <div class="c-selectwrap">
          <select class="select" id="sort">
            ${SORTS.map(s => `<option value="${s.v}" ${F.sort === s.v ? 'selected' : ''}>${esc(s.l)}</option>`).join('')}
          </select>
          ${icon('chevronDown', 'c-selectwrap__ic')}
        </div>
      </div>
    </div>

    <div id="results">${skeletonGrid(6)}</div>`;

  const results = view.querySelector('#results');
  const chipsEl = view.querySelector('#chips');
  const countEl = view.querySelector('#count');
  const purposeEl = view.querySelector('#qpurpose');
  const selectsEl = view.querySelector('#qselects');

  // ── Purpose segmented control ─────────────────────────────────────────────
  function paintPurposes() {
    const counts = purposeCounts(all());
    const total = all().length;
    const item = (v, label, n) => `
      <button type="button" class="c-seg ${F.purpose === v ? 'on' : ''}" data-p="${esc(v)}"
        aria-pressed="${F.purpose === v}">
        ${v ? icon(PURPOSE_META[v].icon, 'ic--sm') : ''}<span>${esc(label)}</span>
        <span class="c-seg__n">${n}</span>
      </button>`;
    purposeEl.innerHTML = item('', 'All', total)
      + ['primary', 'resale', 'rent'].map(p => item(p, PURPOSE_META[p].label, counts[p] || 0)).join('');
  }

  // ── Quick selects (location / type / price / rooms) ───────────────────────
  function paintSelects() {
    const fx = facets();
    const sel = (id, label, options, value) => `
      <label class="c-qfield">
        <span class="c-qfield__lbl">${esc(label)}</span>
        <div class="c-selectwrap">
          <select class="select" data-q="${id}" aria-label="${esc(label)}">
            ${options.map(o => `<option value="${esc(o.v)}" ${String(value) === String(o.v) ? 'selected' : ''}>${esc(o.l)}</option>`).join('')}
          </select>
          ${icon('chevronDown', 'c-selectwrap__ic')}
        </div>
      </label>`;

    selectsEl.innerHTML = [
      sel('city', 'Location', [{ v: '', l: 'Any location' }, ...fx.cities.map(v => ({ v, l: v }))], F.city),
      sel('ptype', 'Property type', [{ v: '', l: 'Any type' }, ...fx.ptypes.map(v => ({ v, l: ptypeLabel(v) }))], F.ptype),
      sel('price', 'Price', priceValue() === 'custom'
        ? [{ v: 'custom', l: `${F.minPrice ? compactMoney(F.minPrice) : 'Any'} – ${F.maxPrice ? compactMoney(F.maxPrice) : 'Any'}` }, ...PRICE_STEPS]
        : PRICE_STEPS, priceValue()),
      sel('beds', 'Rooms', [{ v: '', l: 'Any rooms' }, ...[1, 2, 3, 4, 5].map(n => ({ v: n, l: `${n}+ rooms` }))], F.beds),
    ].join('');
  }

  function paint() {
    const rows = applyFilters(all());
    const total = all().length;

    paintPurposes();
    paintSelects();

    chipsEl.innerHTML = activeChips().map(c => `
      <span class="c-fchip">${esc(c.label)}
        <button data-clear="${esc(c.key)}" aria-label="Remove ${esc(c.label)} filter">${icon('close', 'ic--xs')}</button></span>`).join('')
      + (hasAnyFilter() ? `<button class="c-fchip c-fchip--reset" id="reset-all">${icon('refresh', 'ic--xs')} Reset all</button>` : '');

    countEl.innerHTML = total
      ? (rows.length === total
        ? `<b>${total}</b> ${total === 1 ? 'property' : 'properties'}`
        : `<b>${rows.length}</b> of ${total} properties`)
      : '';

    const n = activeCount();
    const badge = view.querySelector('#fcount');
    badge.textContent = n;
    badge.hidden = !n;

    if (!rows.length) {
      results.innerHTML = emptyState({
        icon: total ? 'search' : 'building',
        title: total ? 'No properties match your filters' : 'No properties published yet',
        text: total ? 'Try widening your price range, or clearing a filter.' : 'Please check back soon.',
        actionHtml: total ? `<button class="btn btn--primary" id="empty-reset">${icon('refresh')} Reset filters</button>` : '',
      });
      results.querySelector('#empty-reset')?.addEventListener('click', () => { resetFilters(); refresh(); });
    } else {
      results.innerHTML = cardGrid(rows);
    }

    chipsEl.querySelectorAll('[data-clear]').forEach(b => b.onclick = () => {
      const k = b.dataset.clear;
      // The quick price control writes both ends at once, so clearing either
      // chip should clear the pair rather than leave a half-open range.
      if (k === 'minPrice' || k === 'maxPrice') { clearFilter('minPrice'); clearFilter('maxPrice'); }
      else clearFilter(k);
      refresh();
    });
    chipsEl.querySelector('#reset-all')?.addEventListener('click', () => { resetFilters(); refresh(); });
  }

  function refresh() {
    const q = view.querySelector('#q');
    if (q && q.value !== F.q) q.value = F.q;
    const s = view.querySelector('#sort');
    if (s && s.value !== F.sort) s.value = F.sort;
    paint();
  }

  // ── Events ────────────────────────────────────────────────────────────────
  purposeEl.addEventListener('click', (e) => {
    const b = e.target.closest('[data-p]');
    if (!b) return;
    setPurpose(b.dataset.p);
    paint();
  });

  selectsEl.addEventListener('change', (e) => {
    const s = e.target.closest('[data-q]');
    if (!s) return;
    const key = s.dataset.q;
    if (key === 'price') {
      if (s.value === '' ) { F.minPrice = ''; F.maxPrice = ''; }
      else if (s.value !== 'custom') {
        const [min, max] = s.value.split('|');
        F.minPrice = min || '';
        F.maxPrice = max || '';
      }
    } else {
      F[key] = s.value;
    }
    paint();
  });

  view.querySelector('#q').addEventListener('input', debounce((e) => { F.q = e.target.value; paint(); }, 200));
  view.querySelector('#sort').addEventListener('change', (e) => { F.sort = e.target.value; paint(); });
  view.querySelector('#open-filters').onclick = () => openFilterSheet(refresh);

  try {
    await loadAll();
    paint();
  } catch (err) {
    results.innerHTML = emptyState({ icon: 'alert', title: 'Could not load properties', text: err.message });
  }
}
