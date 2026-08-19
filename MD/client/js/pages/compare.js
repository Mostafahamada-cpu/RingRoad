// Compare — up to four properties side by side.
import {
  esc, money, areaText, groupNum, ptypeLabel, dealTypeLabel, finishingLabel, amenityLabel,
  shortLocation, priceSuffix, pricePerSqm, listOf, isNum,
} from '../lib/format.js';
import { loadAll, resolveMany } from '../lib/catalog.js';
import { compareList, clearCompare, removeFromCompare } from '../lib/store.js';
import { coverUrl } from '../lib/api.js';
import { emptyState, skeletonGrid, toast } from '../lib/ui.js';
import { hrefFor } from '../lib/router.js';
import { whatsappLink } from '../lib/contact.js';
import { MAX_COMPARE } from '../config.js';

// key, label, cell renderer
const ROWS = [
  ['price', 'Price', (l) => `<b class="money">${esc(money(l.price))}</b>${priceSuffix(l) ? ` <span class="xs muted">${esc(priceSuffix(l))}</span>` : ''}`],
  ['ppsqm', 'Price per m²', (l, ctx) => {
    const v = pricePerSqm(l);
    if (v == null) return '<span class="muted">—</span>';
    const best = ctx.bestPpsqm != null && Math.abs(v - ctx.bestPpsqm) < 0.01;
    return `<span class="${best ? 'c-cmp__best' : ''}">${esc(groupNum(v))} EGP${best ? ' · best value' : ''}</span>`;
  }],
  ['area', 'Area', (l) => esc(areaText(l.area))],
  ['bedrooms', 'Bedrooms', (l) => esc(isNum(l.bedrooms) ? String(l.bedrooms) : '—')],
  ['bathrooms', 'Bathrooms', (l) => esc(isNum(l.bathrooms) ? String(l.bathrooms) : '—')],
  ['location', 'Location', (l) => esc(shortLocation(l))],
  ['ptype', 'Property type', (l) => esc(ptypeLabel(l.ptype))],
  ['type', 'Sale / Rent', (l) => esc(dealTypeLabel(l.type))],
  ['finishing', 'Finishing', (l) => esc(finishingLabel(l.finishing) || '—')],
  ['project', 'Project / Compound', (l) => esc(l.project || '—')],
  ['amenities', 'Amenities', (l) => {
    const a = listOf(l.amenities);
    return a.length
      ? `<div class="c-cmp__amen">${a.map(x => `<span>${esc(amenityLabel(x))}</span>`).join('')}</div>`
      : '<span class="muted">—</span>';
  }],
  ['contact', '', (l) => {
    const wa = whatsappLink(l);
    return `<div class="col" style="gap:6px">
      ${wa ? `<a class="btn btn--wa btn--sm" href="${esc(wa)}" target="_blank" rel="noopener">💬 WhatsApp</a>` : ''}
      <button class="btn btn--outline btn--sm" data-drop="${esc(l.code || l.id)}">Remove</button>
    </div>`;
  }],
];

export async function pageCompare(view) {
  view.innerHTML = `
    <div class="c-head">
      <h1>Compare properties</h1>
      <p>Up to ${MAX_COMPARE} properties, side by side. Saved on this device.</p>
    </div>
    <div id="cmp-body">${skeletonGrid(2)}</div>`;

  const body = view.querySelector('#cmp-body');

  function paint() {
    const rows = resolveMany(compareList());

    if (!rows.length) {
      body.innerHTML = emptyState({
        icon: '⚖️',
        title: 'Nothing to compare yet.',
        text: `Add up to ${MAX_COMPARE} properties with the ⚖️ button on any property.`,
        actionHtml: `<a class="btn btn--primary" href="${esc(hrefFor({ name: 'properties' }))}" data-route="properties">Browse properties</a>`,
      });
      return;
    }

    // "Best value" only means something when every column is quoted the same
    // way — a monthly rent per m² must never be compared against a sale price.
    const mixedDealTypes = new Set(rows.map(r => (r.type === 'rent' ? 'rent' : 'sale'))).size > 1;
    const ppsqms = rows.map(pricePerSqm).filter(v => v != null);
    const ctx = { bestPpsqm: (!mixedDealTypes && ppsqms.length > 1) ? Math.min(...ppsqms) : null };

    body.innerHTML = `
      <div class="c-resultbar">
        <span><b>${rows.length}</b> of ${MAX_COMPARE} selected</span>
        <span class="row" style="gap:8px">
          ${rows.length < MAX_COMPARE
            ? `<a class="btn btn--outline btn--sm" href="${esc(hrefFor({ name: 'properties' }))}" data-route="properties">＋ Add property</a>`
            : ''}
          <button class="btn btn--ghost btn--sm" id="clear-cmp">Clear comparison</button>
        </span>
      </div>
      <div class="c-cmpwrap">
        <table class="c-cmp">
          <thead>
            <tr>
              <td class="c-cmp__key"></td>
              ${rows.map(l => {
                const cover = coverUrl(l);
                const href = hrefFor({ name: 'property', code: l.code || l.id });
                return `<td class="c-cmp__col">
                  ${cover
                    ? `<img class="c-cmp__thumb" src="${esc(cover)}" loading="lazy" alt="">`
                    : '<div class="c-cmp__thumb" style="display:flex;align-items:center;justify-content:center;font-size:28px">🏛️</div>'}
                  <a class="c-cmp__name" href="${esc(href)}" data-route="property" data-code="${esc(l.code || l.id)}">${esc(l.title || 'Property')}</a>
                  <span class="badge badge--role">${esc(l.code || '')}</span>
                </td>`;
              }).join('')}
            </tr>
          </thead>
          <tbody>
            ${ROWS.map(([key, label, render]) => `
              <tr>
                <th class="c-cmp__key" scope="row">${esc(label)}</th>
                ${rows.map(l => `<td class="c-cmp__col" data-k="${key}">${render(l, ctx)}</td>`).join('')}
              </tr>`).join('')}
          </tbody>
        </table>
      </div>
      <p class="xs muted" style="margin-top:10px">Swipe the table sideways to see every property.</p>`;

    body.querySelector('#clear-cmp').onclick = () => {
      clearCompare();
      toast('Comparison cleared.', 'info', 1800);
    };
    body.querySelectorAll('[data-drop]').forEach(b => b.onclick = () => {
      removeFromCompare(b.dataset.drop);
      toast('Removed from comparison.', 'info', 1600);
    });
  }

  try {
    await loadAll();
    paint();
  } catch (err) {
    body.innerHTML = emptyState({ icon: '⚠️', title: 'Could not load your comparison', text: err.message });
    return;
  }

  view.addEventListener('rr:staterefresh', paint);
}
