// Properties — the public list: search, filters, sort, cards.
import { esc, debounce } from '../lib/format.js';
import { loadAll, all } from '../lib/catalog.js';
import { skeletonGrid, emptyState } from '../lib/ui.js';
import { cardGrid } from '../components/card.js';
import { F, SORTS, applyFilters, activeChips, activeCount, resetFilters, clearFilter, openFilterSheet, hasAnyFilter } from '../components/filters.js';

export async function pageProperties(view) {
  view.innerHTML = `
    <div class="c-head">
      <h1>Find your next property</h1>
      <p>Browse the full Ring Roads portfolio — no account needed.</p>
    </div>
    <div class="c-toolbar">
      <div class="c-toolbar__row">
        <div class="searchbox">
          <input class="input" id="q" type="search" inputmode="search" placeholder="Search by title, area, project or ID…" value="${esc(F.q)}">
        </div>
        <button class="btn btn--outline c-filterbtn" id="open-filters">
          <span aria-hidden="true">⚙️</span> Filters
          <span class="c-count" id="fcount" ${activeCount() ? '' : 'hidden'}>${activeCount()}</span>
        </button>
      </div>
      <div class="c-sortwrap">
        <label class="xs muted" for="sort" style="font-weight:700;white-space:nowrap">Sort by</label>
        <select class="select" id="sort">
          ${SORTS.map(s => `<option value="${s.v}" ${F.sort === s.v ? 'selected' : ''}>${esc(s.l)}</option>`).join('')}
        </select>
      </div>
    </div>
    <div id="chips" class="c-activefilters"></div>
    <div class="c-resultbar"><span id="count"></span></div>
    <div id="results">${skeletonGrid(6)}</div>`;

  const results = view.querySelector('#results');
  const chipsEl = view.querySelector('#chips');
  const countEl = view.querySelector('#count');

  function paint() {
    const rows = applyFilters(all());
    const total = all().length;

    chipsEl.innerHTML = activeChips().map(c => `
      <span class="c-fchip">${esc(c.label)}
        <button data-clear="${esc(c.key)}" aria-label="Remove filter">✕</button></span>`).join('')
      + (hasAnyFilter() ? '<button class="btn btn--ghost btn--sm" id="reset-all">Reset filters</button>' : '');

    countEl.innerHTML = total
      ? `<b>${rows.length}</b> of ${total} properties`
      : '';

    const n = activeCount();
    const badge = view.querySelector('#fcount');
    badge.textContent = n;
    badge.hidden = !n;

    if (!rows.length) {
      results.innerHTML = emptyState({
        icon: total ? '🔍' : '🏛️',
        title: total ? 'No properties match your filters' : 'No properties published yet',
        text: total ? 'Try widening your price or area range, or clearing a filter.' : 'Please check back soon.',
        actionHtml: total ? '<button class="btn btn--primary" id="empty-reset">Reset filters</button>' : '',
      });
      results.querySelector('#empty-reset')?.addEventListener('click', () => { resetFilters(); refresh(); });
    } else {
      results.innerHTML = cardGrid(rows);
    }

    chipsEl.querySelectorAll('[data-clear]').forEach(b => b.onclick = () => { clearFilter(b.dataset.clear); refresh(); });
    chipsEl.querySelector('#reset-all')?.addEventListener('click', () => { resetFilters(); refresh(); });
  }

  function refresh() {
    const q = view.querySelector('#q');
    if (q && q.value !== F.q) q.value = F.q;
    const s = view.querySelector('#sort');
    if (s && s.value !== F.sort) s.value = F.sort;
    paint();
  }

  view.querySelector('#q').addEventListener('input', debounce((e) => { F.q = e.target.value; paint(); }, 200));
  view.querySelector('#sort').addEventListener('change', (e) => { F.sort = e.target.value; paint(); });
  view.querySelector('#open-filters').onclick = () => openFilterSheet(refresh);

  try {
    await loadAll();
    paint();
  } catch (err) {
    results.innerHTML = emptyState({ icon: '⚠️', title: 'Could not load properties', text: err.message });
  }
}
