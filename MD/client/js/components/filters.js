// Filtering + sorting for the public properties list.
//
// The filter state lives in this module for the lifetime of the visit, so a
// client can open a property and come back to the exact same result set.
// Everything runs against the in-memory catalogue — no round-trips, no account.
//
// The filter SET changes with the chosen purpose (Primary / Resale / Rent):
// Primary offers Down payment, Rent offers Rental duration and Furnished,
// Resale offers neither. See lib/purpose.js for the taxonomy, and note that
// the two optional filters only render when the published stock actually has
// data behind them.
import { esc, num, ptypeLabel, finishingLabel, groupNum, compactMoney } from '../lib/format.js';
import { icon } from '../lib/icons.js';
import { facets, all } from '../lib/catalog.js';
import { openSheet } from '../lib/ui.js';
import {
  PURPOSE_META, PURPOSE_FIELDS, purposeOf, dataSupport,
  availableRentalPeriods, rentalPeriodLabel,
} from '../lib/purpose.js';

export const SORTS = [
  { v: 'newest', l: 'Newest first' },
  { v: 'price_asc', l: 'Price: Low to High' },
  { v: 'price_desc', l: 'Price: High to Low' },
  { v: 'area_asc', l: 'Area: Small to Large' },
  { v: 'area_desc', l: 'Area: Large to Small' },
];

const BLANK = {
  q: '', purpose: '', city: '', project: '', ptype: '', finishing: '',
  minPrice: '', maxPrice: '', minArea: '', maxArea: '', beds: '', baths: '',
  minDown: '', maxDown: '', rentalPeriod: '', furnished: '',
};

export const F = { ...BLANK, sort: 'newest' };

export function resetFilters() { Object.assign(F, BLANK); }
export function clearFilter(key) { if (key in BLANK) F[key] = BLANK[key]; }

/** Set the purpose and drop filters that purpose doesn't offer. */
export function setPurpose(p) {
  F.purpose = p || '';
  const fields = p ? PURPOSE_FIELDS[p] : null;
  if (!fields) return;
  if (!fields.includes('downPayment')) { F.minDown = ''; F.maxDown = ''; }
  if (!fields.includes('rentalPeriod')) F.rentalPeriod = '';
  if (!fields.includes('furnished')) F.furnished = '';
  if (!fields.includes('baths')) F.baths = '';
}

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
  if (F.purpose) push('purpose', PURPOSE_META[F.purpose]?.label || F.purpose);
  if (F.ptype) push('ptype', ptypeLabel(F.ptype));
  if (F.city) push('city', F.city);
  if (F.project) push('project', F.project);
  if (F.finishing) push('finishing', finishingLabel(F.finishing));
  if (F.beds) push('beds', `${F.beds}+ bed`);
  if (F.baths) push('baths', `${F.baths}+ bath`);
  if (F.minPrice) push('minPrice', `From ${compactMoney(F.minPrice)}`);
  if (F.maxPrice) push('maxPrice', `Up to ${compactMoney(F.maxPrice)}`);
  if (F.minDown) push('minDown', `Down from ${compactMoney(F.minDown)}`);
  if (F.maxDown) push('maxDown', `Down up to ${compactMoney(F.maxDown)}`);
  if (F.rentalPeriod) push('rentalPeriod', rentalPeriodLabel(F.rentalPeriod));
  if (F.furnished) push('furnished', F.furnished === 'yes' ? 'Furnished' : 'Unfurnished');
  if (F.minArea) push('minArea', `From ${groupNum(F.minArea)} m²`);
  if (F.maxArea) push('maxArea', `Up to ${groupNum(F.maxArea)} m²`);
  return chips;
}

function matches(l) {
  if (F.purpose && purposeOf(l) !== F.purpose) return false;
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
  // Optional data — a listing without the value can never satisfy the filter.
  if (F.minDown || F.maxDown) {
    if (l.down_payment == null || l.down_payment === '') return false;
    if (F.minDown && num(l.down_payment) < num(F.minDown)) return false;
    if (F.maxDown && num(l.down_payment) > num(F.maxDown)) return false;
  }
  if (F.rentalPeriod && String(l.rental_period || '') !== F.rentalPeriod) return false;
  if (F.furnished) {
    const want = F.furnished === 'yes';
    if (Boolean(l.furnished) !== want) return false;
  }
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

/** How many listings a hypothetical filter change would return. */
export function countWith(overrides) {
  const snapshot = { ...F };
  Object.assign(F, overrides);
  const n = all().filter(matches).length;
  Object.assign(F, snapshot);
  return n;
}

// ── field builders ──────────────────────────────────────────────────────────
const selectHtml = (name, label, options, value, anyLabel) => `
  <label class="field">
    <span class="field__label">${esc(label)}</span>
    <div class="c-selectwrap">
      <select class="select" data-f="${name}">
        ${anyLabel == null ? '' : `<option value="">${esc(anyLabel)}</option>`}
        ${options.map(o => `<option value="${esc(o.v)}" ${String(value) === String(o.v) ? 'selected' : ''}>${esc(o.l)}</option>`).join('')}
      </select>
      ${icon('chevronDown', 'c-selectwrap__ic')}
    </div>
  </label>`;

const pillsHtml = (name, label, values, value, suffix = '+') => `
  <div class="field span-2">
    <span class="field__label">${esc(label)}</span>
    <div class="c-pills" data-pills="${name}">
      <button type="button" class="c-pill ${!value ? 'on' : ''}" data-v="">Any</button>
      ${values.map(v => `<button type="button" class="c-pill ${String(value) === String(v) ? 'on' : ''}" data-v="${v}">${v}${suffix}</button>`).join('')}
    </div>
  </div>`;

const rangeHtml = (minName, maxName, label, minVal, maxVal, unit) => `
  <div class="field span-2">
    <span class="field__label">${esc(label)}</span>
    <div class="c-range">
      <input class="input" type="number" inputmode="numeric" min="0" dir="ltr"
             data-f="${minName}" value="${esc(minVal)}" placeholder="Min${unit ? ' ' + unit : ''}">
      <span class="c-range__sep" aria-hidden="true">–</span>
      <input class="input" type="number" inputmode="numeric" min="0" dir="ltr"
             data-f="${maxName}" value="${esc(maxVal)}" placeholder="Max${unit ? ' ' + unit : ''}">
    </div>
  </div>`;

/**
 * Builds the field markup for one purpose (or the generic set when no purpose
 * is chosen). Fields with no data behind them are skipped entirely.
 */
export function purposeFieldsHtml(purpose, draft) {
  const fx = facets();
  const support = dataSupport(all());
  const fields = PURPOSE_FIELDS[purpose] || ['ptype', 'city', 'project', 'price', 'beds', 'baths', 'area', 'finishing'];
  const meta = PURPOSE_META[purpose];
  const out = [];

  for (const f of fields) {
    if (f === 'ptype') {
      out.push(selectHtml('ptype', 'Property type', fx.ptypes.map(v => ({ v, l: ptypeLabel(v) })), draft.ptype, 'Any type'));
    } else if (f === 'city') {
      out.push(selectHtml('city', 'Location', fx.cities.map(v => ({ v, l: v })), draft.city, 'Any location'));
    } else if (f === 'project') {
      if (fx.projects.length) {
        out.push(selectHtml('project', 'Project / Compound', fx.projects.map(v => ({ v, l: v })), draft.project, 'Any project'));
      }
    } else if (f === 'finishing') {
      if (fx.finishings.length) {
        out.push(selectHtml('finishing', 'Finishing', fx.finishings.map(v => ({ v, l: finishingLabel(v) })), draft.finishing, 'Any finishing'));
      }
    } else if (f === 'price') {
      out.push(rangeHtml('minPrice', 'maxPrice', (meta?.priceLabel || 'Price') + ' (EGP)', draft.minPrice, draft.maxPrice, ''));
    } else if (f === 'downPayment') {
      // Only offered when at least one published listing carries the value.
      if (support.downPayment) {
        out.push(rangeHtml('minDown', 'maxDown', 'Down payment (EGP)', draft.minDown, draft.maxDown, ''));
      }
    } else if (f === 'area') {
      out.push(rangeHtml('minArea', 'maxArea', 'Area (m²)', draft.minArea, draft.maxArea, ''));
    } else if (f === 'beds') {
      out.push(pillsHtml('beds', 'Rooms', [1, 2, 3, 4, 5], draft.beds));
    } else if (f === 'baths') {
      out.push(pillsHtml('baths', 'Bathrooms', [1, 2, 3, 4], draft.baths));
    } else if (f === 'rentalPeriod') {
      const periods = availableRentalPeriods(all());
      if (support.rentalPeriod && periods.length) {
        out.push(selectHtml('rentalPeriod', 'Rental duration', periods, draft.rentalPeriod, 'Any duration'));
      }
    } else if (f === 'furnished') {
      out.push(selectHtml('furnished', 'Furnishing',
        [{ v: 'yes', l: 'Furnished' }, { v: 'no', l: 'Unfurnished' }], draft.furnished, 'Any'));
    }
  }
  return out.join('');
}

/** Wire `data-f` inputs and `data-pills` groups to a draft object. */
export function bindFields(root, draft) {
  root.querySelectorAll('[data-f]').forEach(inp => {
    const set = () => { draft[inp.dataset.f] = inp.value; };
    inp.addEventListener('change', set);
    inp.addEventListener('input', set);
  });
  root.querySelectorAll('[data-pills]').forEach(group => {
    group.addEventListener('click', (e) => {
      const b = e.target.closest('.c-pill');
      if (!b) return;
      group.querySelectorAll('.c-pill').forEach(x => x.classList.toggle('on', x === b));
      draft[group.dataset.pills] = b.dataset.v;
    });
  });
}

// ── the filter sheet ────────────────────────────────────────────────────────
/**
 * Opens the filter panel — a bottom sheet on phones, a centred dialog on
 * desktop. Edits are staged on a draft and only committed on "Show results",
 * so cancelling never disturbs the current list.
 */
export function openFilterSheet(onApply, { purpose = null } = {}) {
  const draft = { ...F };
  if (purpose) { draft.purpose = purpose; }

  const purposeTabs = `
    <div class="field span-2">
      <span class="field__label">Purpose</span>
      <div class="c-pills" data-pills="purpose">
        <button type="button" class="c-pill ${!draft.purpose ? 'on' : ''}" data-v="">All</button>
        ${['primary', 'resale', 'rent'].map(p => `
          <button type="button" class="c-pill ${draft.purpose === p ? 'on' : ''}" data-v="${p}">${esc(PURPOSE_META[p].label)}</button>`).join('')}
      </div>
    </div>`;

  const body = `
    <div class="c-filtergrid" id="fgrid">
      ${purposeTabs}
      <div class="c-filtergrid__fields span-2" id="ffields">${purposeFieldsHtml(draft.purpose, draft)}</div>
      ${selectHtml('sort', 'Sort by', SORTS, draft.sort, null)}
    </div>`;

  const footer = `
    <button class="btn btn--ghost" data-act="reset">${icon('refresh')} Reset</button>
    <button class="btn btn--primary" data-act="apply"><span data-count></span></button>`;

  const sheet = openSheet({ title: 'Filters', body, footer });
  const fieldsHost = sheet.body.querySelector('#ffields');
  const countLabel = sheet.foot.querySelector('[data-count]');

  const paintCount = () => {
    const n = countWith(draft);
    countLabel.textContent = n === 1 ? 'Show 1 property' : `Show ${n} properties`;
  };

  const rewire = () => {
    bindFields(fieldsHost, draft);
    fieldsHost.addEventListener('input', paintCount);
    fieldsHost.addEventListener('click', (e) => { if (e.target.closest('.c-pill')) paintCount(); });
  };

  bindFields(sheet.body, draft);
  rewire();
  paintCount();

  // Switching purpose swaps the whole field set — that is the point of the
  // three-way split, not just a different label.
  sheet.body.querySelector('[data-pills="purpose"]').addEventListener('click', (e) => {
    const b = e.target.closest('.c-pill');
    if (!b) return;
    draft.purpose = b.dataset.v;
    const fields = draft.purpose ? PURPOSE_FIELDS[draft.purpose] : null;
    if (fields) {
      if (!fields.includes('downPayment')) { draft.minDown = ''; draft.maxDown = ''; }
      if (!fields.includes('rentalPeriod')) draft.rentalPeriod = '';
      if (!fields.includes('furnished')) draft.furnished = '';
      if (!fields.includes('baths')) draft.baths = '';
    }
    fieldsHost.innerHTML = purposeFieldsHtml(draft.purpose, draft);
    rewire();
    paintCount();
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
