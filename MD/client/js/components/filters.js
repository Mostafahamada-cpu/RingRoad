// Filtering + sorting for the public properties list.
//
// The filter state lives in this module for the lifetime of the visit, so a
// client can open a property and come back to the exact same result set.
// Everything runs against the in-memory catalogue — no round-trips, no account.
import { esc, num, ptypeLabel, finishingLabel, groupNum, compactMoney } from '../lib/format.js';
import { facets } from '../lib/catalog.js';
import { openSheet } from '../lib/ui.js';

export const SORTS = [
  { v: 'newest', l: 'Newest first' },
  { v: 'price_asc', l: 'Price: Low to High' },
  { v: 'price_desc', l: 'Price: High to Low' },
  { v: 'area_asc', l: 'Area: Small to Large' },
  { v: 'area_desc', l: 'Area: Large to Small' },
];

const BLANK = {
  q: '', city: '', project: '', ptype: '', type: '', finishing: '',
  minPrice: '', maxPrice: '', minArea: '', maxArea: '', beds: '', baths: '',
};

export const F = { ...BLANK, sort: 'newest' };

export function resetFilters() { Object.assign(F, BLANK); }
export function clearFilter(key) { if (key in BLANK) F[key] = BLANK[key]; }

/** Number of filters (search excluded — it has its own visible box). */
export function activeCount() {
  return Object.keys(BLANK).filter(k => k !== 'q' && String(F[k]).trim() !== '').length;
}
export const hasAnyFilter = () => activeCount() > 0 || F.q.trim() !== '';

/** Human-readable chips for whatever is currently narrowing the list. */
export function activeChips() {
  const chips = [];
  const push = (key, label) => chips.push({ key, label });
  if (F.q.trim()) push('q', `“${F.q.trim()}”`);
  if (F.type) push('type', F.type === 'rent' ? 'For Rent' : 'For Sale');
  if (F.ptype) push('ptype', ptypeLabel(F.ptype));
  if (F.city) push('city', '📍 ' + F.city);
  if (F.project) push('project', '🏗️ ' + F.project);
  if (F.finishing) push('finishing', '🎨 ' + finishingLabel(F.finishing));
  if (F.beds) push('beds', `🛏 ${F.beds}+`);
  if (F.baths) push('baths', `🛁 ${F.baths}+`);
  if (F.minPrice) push('minPrice', `Min ${compactMoney(F.minPrice)}`);
  if (F.maxPrice) push('maxPrice', `Max ${compactMoney(F.maxPrice)}`);
  if (F.minArea) push('minArea', `Min ${groupNum(F.minArea)} m²`);
  if (F.maxArea) push('maxArea', `Max ${groupNum(F.maxArea)} m²`);
  return chips;
}

function matches(l) {
  if (F.type && l.type !== F.type) return false;
  if (F.ptype && l.ptype !== F.ptype) return false;
  if (F.city && l.city !== F.city) return false;
  if (F.project && l.project !== F.project) return false;
  if (F.finishing && l.finishing !== F.finishing) return false;
  if (F.beds && num(l.bedrooms) < num(F.beds)) return false;
  if (F.baths && num(l.bathrooms) < num(F.baths)) return false;
  if (F.minPrice && num(l.price) < num(F.minPrice)) return false;
  if (F.maxPrice && num(l.price) > num(F.maxPrice)) return false;
  if (F.minArea && num(l.area) < num(F.minArea)) return false;
  if (F.maxArea && num(l.area) > num(F.maxArea)) return false;
  const q = F.q.trim().toLowerCase();
  if (q) {
    const hay = [l.title, l.code, l.city, l.governorate, l.address, l.project, l.developer, ptypeLabel(l.ptype)]
      .filter(Boolean).join(' ').toLowerCase();
    if (!hay.includes(q)) return false;
  }
  return true;
}

function sorted(list) {
  const rows = [...list];
  switch (F.sort) {
    case 'price_asc': return rows.sort((a, b) => num(a.price) - num(b.price));
    case 'price_desc': return rows.sort((a, b) => num(b.price) - num(a.price));
    case 'area_asc': return rows.sort((a, b) => num(a.area) - num(b.area));
    case 'area_desc': return rows.sort((a, b) => num(b.area) - num(a.area));
    default:
      // newest, with featured stock floated to the top of the page
      return rows.sort((a, b) => (Number(!!b.featured) - Number(!!a.featured))
        || (new Date(b.created_at || 0) - new Date(a.created_at || 0)));
  }
}

/** Filters AND sorts — the two always work together. */
export const applyFilters = (list) => sorted(list.filter(matches));

// ── the filter sheet ────────────────────────────────────────────────────────
// `anyLabel = null` renders a select with no "any" entry (used for Sort by).
const selectHtml = (name, label, options, value, anyLabel) => `
  <label class="field">
    <span class="field__label">${esc(label)}</span>
    <select class="select" data-f="${name}">
      ${anyLabel == null ? '' : `<option value="">${esc(anyLabel)}</option>`}
      ${options.map(o => `<option value="${esc(o.v)}" ${String(value) === String(o.v) ? 'selected' : ''}>${esc(o.l)}</option>`).join('')}
    </select>
  </label>`;

const pillsHtml = (name, label, values, value, suffix = '+') => `
  <div class="field span-2">
    <span class="field__label">${esc(label)}</span>
    <div class="c-pills" data-pills="${name}">
      <button type="button" class="c-pill ${!value ? 'on' : ''}" data-v="">Any</button>
      ${values.map(v => `<button type="button" class="c-pill ${String(value) === String(v) ? 'on' : ''}" data-v="${v}">${v}${suffix}</button>`).join('')}
    </div>
  </div>`;

const numHtml = (name, label, value, ph) => `
  <label class="field">
    <span class="field__label">${esc(label)}</span>
    <input class="input" type="number" inputmode="numeric" min="0" dir="ltr"
           data-f="${name}" value="${esc(value)}" placeholder="${esc(ph)}">
  </label>`;

/**
 * Opens the filter panel. `onApply` runs when the client applies or resets, so
 * the page can repaint. Edits are staged on a draft and only committed on
 * "Show results" — cancelling never disturbs the current list.
 */
export function openFilterSheet(onApply) {
  const fx = facets();
  const draft = { ...F };

  const body = `
    <div class="c-filtergrid">
      ${selectHtml('type', 'Sale / Rent', [{ v: 'sale', l: 'For Sale' }, { v: 'rent', l: 'For Rent' }], draft.type, 'Any')}
      ${selectHtml('ptype', 'Property type', fx.ptypes.map(v => ({ v, l: ptypeLabel(v) })), draft.ptype, 'Any type')}
      ${selectHtml('city', 'Location', fx.cities.map(v => ({ v, l: v })), draft.city, 'Any location')}
      ${selectHtml('project', 'Project / Compound', fx.projects.map(v => ({ v, l: v })), draft.project, 'Any project')}
      ${selectHtml('finishing', 'Finishing', fx.finishings.map(v => ({ v, l: finishingLabel(v) })), draft.finishing, 'Any finishing')}
      ${selectHtml('sort', 'Sort by', SORTS, draft.sort, null)}
      ${numHtml('minPrice', 'Min price (EGP)', draft.minPrice, 'e.g. 2000000')}
      ${numHtml('maxPrice', 'Max price (EGP)', draft.maxPrice, 'e.g. 9000000')}
      ${numHtml('minArea', 'Min area (m²)', draft.minArea, 'e.g. 120')}
      ${numHtml('maxArea', 'Max area (m²)', draft.maxArea, 'e.g. 350')}
      ${pillsHtml('beds', 'Bedrooms', [1, 2, 3, 4, 5], draft.beds)}
      ${pillsHtml('baths', 'Bathrooms', [1, 2, 3, 4], draft.baths)}
    </div>`;

  const footer = `
    <button class="btn btn--outline" data-act="reset">Reset filters</button>
    <button class="btn btn--primary" data-act="apply">Show results</button>`;

  const sheet = openSheet({ title: 'Filters', body, footer });

  sheet.body.querySelectorAll('[data-f]').forEach(inp => {
    inp.addEventListener('change', () => { draft[inp.dataset.f] = inp.value; });
    inp.addEventListener('input', () => { draft[inp.dataset.f] = inp.value; });
  });
  sheet.body.querySelectorAll('[data-pills]').forEach(group => {
    group.addEventListener('click', (e) => {
      const b = e.target.closest('.c-pill');
      if (!b) return;
      group.querySelectorAll('.c-pill').forEach(x => x.classList.toggle('on', x === b));
      draft[group.dataset.pills] = b.dataset.v;
    });
  });

  sheet.foot.querySelector('[data-act="apply"]').onclick = () => {
    Object.assign(F, draft);
    sheet.close();
    onApply?.();
  };
  sheet.foot.querySelector('[data-act="reset"]').onclick = () => {
    resetFilters();
    sheet.close();
    onApply?.();
  };
  return sheet;
}
