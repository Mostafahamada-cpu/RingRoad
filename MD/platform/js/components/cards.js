// Reusable cards: stat card, property card.
import { t } from '../lib/i18n.js';
import { esc, money, compact } from '../lib/utils.js';
import { storage } from '../lib/supabase.js';
import { profileById } from '../lib/store.js';

export function statCard({ icon, value, label, tone = '' }) {
  return `
    <div class="card card--hover">
      <div class="stat">
        <div class="stat__icon ${tone === 'burg' ? 'stat__icon--burg' : ''}">${icon}</div>
        <div><div class="stat__val">${value}</div><div class="stat__label">${esc(label)}</div></div>
      </div>
    </div>`;
}

export function statusBadge(status) {
  return `<span class="badge badge--${esc(status)}">${esc(t(status))}</span>`;
}

export function coverUrl(listing) {
  const imgs = Array.isArray(listing.images) ? listing.images : [];
  return imgs.length ? storage.publicUrl(imgs[0]) : null;
}

export function listingCard(l) {
  const cover = coverUrl(l);
  const agent = profileById(l.agent_id);
  return `
    <article class="card card--flush card--hover pcard" data-listing="${esc(l.id)}">
      <div class="pcard__media">
        ${cover
          ? `<img class="img-fade" src="${esc(cover)}" loading="lazy" onload="this.classList.add('is-loaded')" alt="">`
          : `<div style="display:flex;align-items:center;justify-content:center;height:100%;font-size:34px">🏛️</div>`}
        ${statusBadge(l.status)}
        ${l.featured ? `<span class="badge badge--featured">★ ${esc(t('featured'))}</span>` : ''}
      </div>
      <div class="pcard__body">
        <div class="pcard__price money">${esc(money(l.price))}</div>
        <div class="pcard__title truncate">${esc(l.title)}</div>
        <div class="pcard__meta">
          <span>🛏 ${esc(l.bedrooms ?? 0)}</span>
          <span>🛁 ${esc(l.bathrooms ?? 0)}</span>
          <span>📐 ${esc(compact(l.area))} ${esc(t('sqm'))}</span>
          <span class="truncate">📍 ${esc(l.city || '')}</span>
        </div>
        ${agent ? `<div class="xs muted">${esc(t('agentInfo'))}: ${esc(agent.name || agent.email)}</div>` : ''}
      </div>
    </article>`;
}
