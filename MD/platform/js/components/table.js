// DataTable: search, column sorting, pagination, bulk selection, CSV export.
import { t } from '../lib/i18n.js';
import { esc, downloadCsv, debounce } from '../lib/utils.js';
import { PAGE_SIZE } from '../config.js';

export function dataTable({ columns, rows, pageSize = PAGE_SIZE, searchable, exportName, bulk = [], onRowClick, emptyText }) {
  const el = document.createElement('div');
  const state = { page: 1, sortKey: null, sortDir: 1, q: '', selected: new Set() };

  const visible = () => {
    let out = rows;
    if (state.q && searchable) out = out.filter(r => searchable(r, state.q.toLowerCase()));
    if (state.sortKey) {
      const col = columns.find(c => c.key === state.sortKey);
      out = [...out].sort((a, b) => {
        const va = col.sortVal ? col.sortVal(a) : a[state.sortKey];
        const vb = col.sortVal ? col.sortVal(b) : b[state.sortKey];
        if (va == null) return 1; if (vb == null) return -1;
        return (typeof va === 'number' ? va - vb : String(va).localeCompare(String(vb))) * state.sortDir;
      });
    }
    return out;
  };

  function render() {
    const list = visible();
    const pages = Math.max(1, Math.ceil(list.length / pageSize));
    state.page = Math.min(state.page, pages);
    const slice = list.slice((state.page - 1) * pageSize, state.page * pageSize);
    const selRows = rows.filter(r => state.selected.has(r.id));

    const bulkbar = bulk.length && selRows.length ? `
      <div class="bulkbar">
        <b>${selRows.length}</b> ${esc(t('selected'))}
        ${bulk.map((b, i) => `<button class="btn btn--outline" data-bulk="${i}" style="background:rgba(255,255,255,.14);color:#fff;border-color:rgba(255,255,255,.3)">${esc(b.label)}</button>`).join('')}
        <button class="btn btn--ghost" data-bulk-clear style="color:#fff">✕</button>
      </div>` : '';

    const head = (bulk.length ? `<th style="width:36px"><input type="checkbox" data-selall ${slice.length && slice.every(r => state.selected.has(r.id)) ? 'checked' : ''}></th>` : '')
      + columns.map(c => `
        <th class="${c.sortable ? 'sortable' : ''}" data-sort="${c.sortable ? c.key : ''}">
          ${esc(c.label)}${state.sortKey === c.key ? (state.sortDir > 0 ? ' ↑' : ' ↓') : ''}
        </th>`).join('');

    const body = slice.length ? slice.map(r => `
      <tr data-id="${esc(r.id)}" class="${state.selected.has(r.id) ? 'is-selected' : ''}" ${onRowClick ? 'style="cursor:pointer"' : ''}>
        ${bulk.length ? `<td><input type="checkbox" data-sel="${esc(r.id)}" ${state.selected.has(r.id) ? 'checked' : ''}></td>` : ''}
        ${columns.map(c => `<td>${c.render ? c.render(r) : esc(r[c.key] ?? '—')}</td>`).join('')}
      </tr>`).join('')
      : `<tr><td colspan="${columns.length + (bulk.length ? 1 : 0)}"><div class="empty">${esc(emptyText || t('noResults'))}</div></td></tr>`;

    let pager = '';
    if (pages > 1) {
      const btn = (p, label, on = false, dis = false) =>
        `<button data-page="${p}" class="${on ? 'on' : ''}" ${dis ? 'disabled' : ''}>${label}</button>`;
      const nums = [];
      for (let p = 1; p <= pages; p++) {
        if (p === 1 || p === pages || Math.abs(p - state.page) <= 1) nums.push(btn(p, p, p === state.page));
        else if (nums[nums.length - 1] !== '<span class="muted">…</span>') nums.push('<span class="muted">…</span>');
      }
      pager = `<div class="pager">${btn(state.page - 1, '‹', false, state.page === 1)}${nums.join('')}${btn(state.page + 1, '›', false, state.page === pages)}</div>`;
    }

    el.innerHTML = `
      <div class="row row--between row--wrap" style="margin-bottom:12px">
        ${searchable ? `<div class="searchbox grow" style="max-width:320px"><input class="input" data-q placeholder="${esc(t('search'))}" value="${esc(state.q)}"></div>` : '<span></span>'}
        ${exportName ? `<button class="btn btn--outline btn--sm" data-export>📊 ${esc(t('exportCsv'))}</button>` : ''}
      </div>
      ${bulkbar}
      <div class="card card--flush">
        <div class="tablewrap"><table class="table">
          <thead><tr>${head}</tr></thead><tbody>${body}</tbody>
        </table></div>
      </div>
      <div class="tfoot">
        <span class="xs muted">${esc(t('showing'))} ${slice.length} ${esc(t('of'))} ${list.length}</span>
        ${pager}
      </div>`;

    // wire
    const qInput = el.querySelector('[data-q]');
    if (qInput) {
      const doSearch = debounce((v) => { state.q = v; state.page = 1; render(); }, 220);
      qInput.oninput = (e) => doSearch(e.target.value);
      qInput.focus?.();
      if (state.q) { const v = qInput.value; qInput.setSelectionRange?.(v.length, v.length); }
    }
    el.querySelectorAll('[data-sort]').forEach(th => {
      if (!th.dataset.sort) return;
      th.onclick = () => {
        if (state.sortKey === th.dataset.sort) state.sortDir *= -1;
        else { state.sortKey = th.dataset.sort; state.sortDir = 1; }
        render();
      };
    });
    el.querySelectorAll('[data-page]').forEach(b => b.onclick = () => { state.page = +b.dataset.page; render(); });
    el.querySelector('[data-export]')?.addEventListener('click', () => {
      downloadCsv(columns.map(c => c.label), visible().map(r => columns.map(c => c.csv ? c.csv(r) : (r[c.key] ?? ''))), exportName);
    });
    el.querySelector('[data-selall]')?.addEventListener('change', (e) => {
      slice.forEach(r => e.target.checked ? state.selected.add(r.id) : state.selected.delete(r.id));
      render();
    });
    el.querySelectorAll('[data-sel]').forEach(cb => cb.onchange = (e) => {
      e.target.checked ? state.selected.add(cb.dataset.sel) : state.selected.delete(cb.dataset.sel);
      render();
    });
    el.querySelectorAll('[data-bulk]').forEach(b => b.onclick = () => {
      bulk[+b.dataset.bulk].onAction(rows.filter(r => state.selected.has(r.id)));
      state.selected.clear();
    });
    el.querySelector('[data-bulk-clear]')?.addEventListener('click', () => { state.selected.clear(); render(); });
    if (onRowClick) el.querySelectorAll('tbody tr[data-id]').forEach(tr => {
      tr.onclick = (e) => {
        if (e.target.closest('button, a, input, select')) return;
        onRowClick(rows.find(r => r.id === tr.dataset.id));
      };
    });
  }

  render();
  return el;
}
