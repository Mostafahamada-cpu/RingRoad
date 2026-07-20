// Agent directory: photo, contacts, team, listing/sales counts, performance.
import { t } from '../lib/i18n.js';
import { esc, initials, compact, monthKey } from '../lib/utils.js';
import { storage } from '../lib/supabase.js';
import { store, teamById } from '../lib/store.js';
import { loadListings } from '../lib/listings.js';
import { pagehead } from '../components/layout.js';
import { navigate } from '../lib/router.js';

const stars = (r) => { const v = Math.round((+r || 0) * 2) / 2; return '★'.repeat(Math.floor(v)) + (v % 1 ? '½' : '') + '☆'.repeat(Math.max(0, 5 - Math.ceil(v))); };

export async function pageAgents() {
  const listings = await loadListings();
  const mk = monthKey();
  const agents = store.profiles.filter(p => ['agent', 'leader'].includes(p.role));
  const el = document.createElement('div');

  const cardsHtml = agents.map(a => {
    const mine = listings.filter(l => l.agent_id === a.id);
    const sold = mine.filter(l => l.status === 'sold');
    const revenue = sold.filter(l => (l.sold_date || '').slice(0, 7) === mk).reduce((s, l) => s + (+l.sold_price || 0), 0);
    const team = teamById(a.team_id);
    return `
      <div class="card card--hover">
        <div class="row" style="margin-bottom:14px">
          <span class="avatar avatar--lg">${a.photo ? `<img src="${esc(storage.publicUrl(a.photo))}">` : esc(initials(a.name || a.email))}</span>
          <div class="grow">
            <div class="row row--between">
              <b>${esc(a.name || a.email)}</b>
              ${a.active === false ? `<span class="badge badge--archived">${esc(t('inactive'))}</span>` : `<span class="badge badge--role">${esc(t(a.role))}</span>`}
            </div>
            <div class="xs muted" dir="ltr">${esc(a.phone || '')} · ${esc(a.email || '')}</div>
            ${team ? `<div class="xs" style="font-weight:700;color:${esc(team.color || 'var(--burg-700)')}">🛡️ ${esc(team.name)}</div>` : `<div class="xs muted">${esc(t('unassigned'))}</div>`}
          </div>
        </div>
        <div class="grid grid--4" style="gap:8px">
          <div class="center"><div style="font-weight:800;color:var(--burg-700)">${mine.filter(l => l.status === 'available' || l.status === 'reserved').length}</div><div class="xs muted">${esc(t('listings'))}</div></div>
          <div class="center"><div style="font-weight:800;color:var(--burg-700)">${sold.length}</div><div class="xs muted">${esc(t('salesCount'))}</div></div>
          <div class="center"><div style="font-weight:800;color:var(--burg-700)">${compact(revenue)}</div><div class="xs muted">${esc(t('monthlyRevenue'))}</div></div>
          <div class="center"><div style="font-weight:800;color:var(--orange-600)" title="${esc(a.performance_rating ?? 0)}">${stars(a.performance_rating)}</div><div class="xs muted">${esc(t('rating'))}</div></div>
        </div>
      </div>`;
  }).join('');

  el.innerHTML = `
    ${pagehead(t('agentsTitle'), t('agentsSub'))}
    ${agents.length ? `<div class="grid grid--3">${cardsHtml}</div>` : `<div class="empty"><div class="empty__icon">💼</div>${esc(t('noData'))}</div>`}`;
  return el;
}
