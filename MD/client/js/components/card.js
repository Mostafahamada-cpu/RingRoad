// Public property card + the shared favorite / compare click handling.
import { esc, compactMoney, groupNum, ptypeLabel, dealTypeLabel, finishingLabel, shortLocation, priceSuffix, isNum } from '../lib/format.js';
import { coverUrl } from '../lib/api.js';
import { hrefFor } from '../lib/router.js';
import { isFavorite, toggleFavorite, inCompare, toggleCompare } from '../lib/store.js';
import { get as catalogGet } from '../lib/catalog.js';
import { toast } from '../lib/ui.js';
import { MAX_COMPARE } from '../config.js';

export function favButton(l, { big = false } = {}) {
  const on = isFavorite(l);
  return `<button class="c-iconbtn c-iconbtn--fav ${on ? 'is-on' : ''}" data-fav="${esc(l.code || l.id)}"
    ${big ? 'style="width:46px;height:46px;font-size:19px"' : ''}
    aria-pressed="${on}" aria-label="${on ? 'Remove from favorites' : 'Save to favorites'}"
    title="${on ? 'Saved' : 'Save to favorites'}">${on ? '❤️' : '🤍'}</button>`;
}

export function compareButton(l, { big = false } = {}) {
  const on = inCompare(l);
  return `<button class="c-iconbtn ${on ? 'is-on' : ''}" data-cmp="${esc(l.code || l.id)}"
    ${big ? 'style="width:46px;height:46px;font-size:19px"' : ''}
    aria-pressed="${on}" aria-label="${on ? 'Remove from comparison' : 'Add to comparison'}"
    title="${on ? 'In comparison' : 'Add to compare'}">⚖️</button>`;
}

export function propertyCard(l) {
  const cover = coverUrl(l);
  const href = hrefFor({ name: 'property', code: l.code || l.id });
  const fin = finishingLabel(l.finishing);
  return `
    <article class="ccard">
      <div class="ccard__media">
        ${cover
          ? `<img class="img-fade" src="${esc(cover)}" loading="lazy" decoding="async"
               onload="this.classList.add('is-loaded')" alt="${esc(l.title || 'Property')}">`
          : '<div class="ccard__ph">🏛️</div>'}
        <a class="ccard__link" href="${esc(href)}" data-route="property" data-code="${esc(l.code || l.id)}"
           aria-label="${esc(l.title || 'Property')}"></a>
        <div class="ccard__tags">
          <span class="badge ${l.type === 'rent' ? 'badge--reserved' : 'badge--available'}">${esc(dealTypeLabel(l.type))}</span>
          ${l.status === 'reserved' ? '<span class="badge badge--sold">Reserved</span>' : ''}
          ${l.featured ? '<span class="badge badge--featured">★ Featured</span>' : ''}
        </div>
        <div class="ccard__tools">${favButton(l)}${compareButton(l)}</div>
        <span class="ccard__id">${esc(l.code || '')}</span>
      </div>
      <div class="ccard__body">
        <div class="ccard__price money">${esc(compactMoney(l.price))} <small>${esc(priceSuffix(l))}</small></div>
        <h3 class="ccard__title"><a href="${esc(href)}" data-route="property" data-code="${esc(l.code || l.id)}">${esc(l.title || 'Property')}</a></h3>
        <div class="ccard__loc">📍 ${esc(shortLocation(l))}${l.project ? ' · ' + esc(l.project) : ''}</div>
        <div class="ccard__meta">
          <span>🛏 ${esc(isNum(l.bedrooms) ? l.bedrooms : '—')}</span>
          <span>🛁 ${esc(isNum(l.bathrooms) ? l.bathrooms : '—')}</span>
          <span>📐 ${esc(isNum(l.area) ? groupNum(l.area) + ' m²' : '—')}</span>
          <span>🏷️ ${esc(ptypeLabel(l.ptype))}</span>
          ${fin ? `<span>🎨 ${esc(fin)}</span>` : ''}
        </div>
      </div>
    </article>`;
}

export const cardGrid = (list) => `<div class="c-grid">${list.map(propertyCard).join('')}</div>`;

/**
 * One delegated listener for every favorite / compare button on the page.
 * `resolve` lets a page hand over listings that are not in the catalogue yet
 * (the detail page for a deep-linked property, for instance).
 */
export function bindCardActions(root, resolve = catalogGet) {
  root.addEventListener('click', (e) => {
    const fav = e.target.closest('[data-fav]');
    const cmp = e.target.closest('[data-cmp]');
    if (!fav && !cmp) return;
    e.preventDefault();
    e.stopPropagation();
    const key = (fav || cmp).dataset.fav || (fav || cmp).dataset.cmp;
    const l = resolve(key) || catalogGet(key) || { code: key };

    if (fav) {
      const on = toggleFavorite(l);
      toast(on ? 'Saved to favorites.' : 'Removed from favorites.', on ? 'success' : 'info', 1800);
      return;
    }
    const res = toggleCompare(l);
    if (res === 'full') { toast(`You can compare up to ${MAX_COMPARE} properties.`, 'warning'); return; }
    toast(res === 'added' ? 'Added to comparison.' : 'Removed from comparison.', res === 'added' ? 'success' : 'info', 1800);
  });
}

/** Repaint every favorite/compare button in a subtree after a state change. */
export function refreshCardStates(root) {
  root.querySelectorAll('[data-fav]').forEach(b => {
    const on = isFavorite(b.dataset.fav);
    b.classList.toggle('is-on', on);
    b.textContent = on ? '❤️' : '🤍';
    b.setAttribute('aria-pressed', String(on));
    b.setAttribute('aria-label', on ? 'Remove from favorites' : 'Save to favorites');
  });
  root.querySelectorAll('[data-cmp]').forEach(b => {
    const on = inCompare(b.dataset.cmp);
    b.classList.toggle('is-on', on);
    b.setAttribute('aria-pressed', String(on));
    b.setAttribute('aria-label', on ? 'Remove from comparison' : 'Add to comparison');
  });
}
