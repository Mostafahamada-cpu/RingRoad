// Property details: gallery, info cards, map, amenities, agent, related listings.
import { t } from '../lib/i18n.js';
import { esc, money, groupNum, compact, initials, fmtDate } from '../lib/utils.js';
import { db, storage } from '../lib/supabase.js';
import { profileById, teamById, isMgmt, isLeader, myTeamId } from '../lib/store.js';
import { loadListings, canEditListing, canArchive, canManage, typeLabel, archiveListing, restoreListing, deleteListing, openMarkSold } from '../lib/listings.js';
import { gallery } from '../components/gallery.js';
import { listingCard, statusBadge } from '../components/cards.js';
import { navigate, render as rerender } from '../lib/router.js';
import { toast } from '../lib/toast.js';

export async function pageListingDetail(params) {
  const l = await db.one('properties', params.id);
  if (!l) return `<div class="empty"><div class="empty__icon">🔍</div>${esc(t('propNotFound'))}</div>`;
  const agent = profileById(l.agent_id);
  const team = teamById(l.team_id);
  const el = document.createElement('div');

  const facts = [
    ['🏷️', t('ptype'), typeLabel(l.ptype)],
    ['📐', t('area'), groupNum(l.area) + ' ' + t('sqm')],
    ['🛏', t('bedrooms'), l.bedrooms ?? 0],
    ['🛁', t('bathrooms'), l.bathrooms ?? 0],
    ['🏢', t('floor'), l.floor ?? '—'],
    ['📅', t('yearBuilt'), l.year_built ?? '—'],
    ['🚗', t('parking'), l.parking ?? 0],
    ['🛋️', t('furnished'), l.furnished ? t('yes') : '—'],
  ];

  const canApprove = l.approval === 'pending' && (isMgmt() || (isLeader() && l.team_id === myTeamId()));
  const actions = [
    canEditListing(l) && l.status !== 'sold' ? `<button class="btn btn--outline" id="a-edit">✏️ ${esc(t('edit'))}</button>` : '',
    canEditListing(l) && l.status !== 'sold' && l.status !== 'archived' ? `<button class="btn btn--secondary" id="a-sold">🤝 ${esc(t('markSold'))}</button>` : '',
    canArchive(l) && l.status !== 'archived' ? `<button class="btn btn--outline" id="a-arch">🗄️ ${esc(t('archiveAction'))}</button>` : '',
    canArchive(l) && l.status === 'archived' ? `<button class="btn btn--primary" id="a-rest">↩️ ${esc(t('restoreAction'))}</button>` : '',
    canManage() ? `<button class="btn btn--danger" id="a-del">🗑️ ${esc(t('del'))}</button>` : '',
  ].filter(Boolean).join('');

  const mapBlock = (l.lat != null && l.lng != null && l.lat !== '' && l.lng !== '') ? `
    <div class="card card--flush">
      <iframe title="map" src="https://maps.google.com/maps?q=${encodeURIComponent(l.lat + ',' + l.lng)}&z=14&output=embed"
        style="width:100%;height:280px;border:0;display:block"></iframe>
      <div style="padding:12px 16px"><a class="btn btn--ghost btn--sm" target="_blank" rel="noopener"
        href="https://maps.google.com/?q=${encodeURIComponent(l.lat + ',' + l.lng)}">📍 ${esc(t('openInMaps'))}</a></div>
    </div>` : '';

  el.innerHTML = `
    <div class="row row--between row--wrap" style="margin-bottom:20px">
      <button class="btn btn--ghost" id="back">← ${esc(t('navProperties'))}</button>
      <div class="row row--wrap">${actions}</div>
    </div>
    ${l.approval === 'pending' ? `
      <div class="card section" style="border-color:var(--warn);display:flex;gap:12px;align-items:center;flex-wrap:wrap">
        <span class="badge badge--pending">⏳ ${esc(t('awaitingApproval'))}</span>
        <span class="small muted">${esc(t('submittedBy'))}: ${esc(agent?.name || '—')}</span>
        ${canApprove ? `<span class="row" style="margin-inline-start:auto">
          <button class="btn btn--primary btn--sm" id="a-approve">✓ ${esc(t('approve'))}</button>
          <button class="btn btn--danger btn--sm" id="a-reject">✕ ${esc(t('reject'))}</button></span>` : ''}
      </div>` : ''}
    <div class="grid section" style="grid-template-columns:1.6fr 1fr">
      <div class="col" style="gap:20px">
        <div id="gal-slot"></div>
        <div class="card">
          <div class="row row--between row--wrap" style="margin-bottom:14px">
            <div>
              <h1 style="margin-bottom:4px">${esc(l.title)} ${l.featured ? '<span class="badge badge--featured">★</span>' : ''}</h1>
              <div class="muted small">📍 ${esc([l.address, l.city, l.governorate].filter(Boolean).join(' · '))}</div>
            </div>
            <div style="text-align:end">
              <div class="stat__val money">${esc(money(l.price))}</div>
              ${statusBadge(l.status)}
            </div>
          </div>
          <div class="grid grid--4">
            ${facts.map(([ic, k, v]) => `
              <div style="background:var(--bg);border-radius:var(--r-md);padding:12px;text-align:center">
                <div style="font-size:18px">${ic}</div>
                <div style="font-weight:800;color:var(--burg-700)">${esc(v)}</div>
                <div class="xs muted">${esc(k)}</div>
              </div>`).join('')}
          </div>
        </div>
        <div class="card"><h3 style="margin-bottom:10px">📝 ${esc(t('description'))}</h3>
          <p class="small" style="color:var(--ink-soft);line-height:1.7;white-space:pre-wrap">${esc(l.description || '—')}</p></div>
        ${(l.amenities || []).length ? `
        <div class="card"><h3 style="margin-bottom:12px">✨ ${esc(t('amenities'))}</h3>
          <div class="row row--wrap">${l.amenities.map(a => `<span class="chip" style="cursor:default">✓ ${esc(t(a === 'parking' ? 'parkingAm' : a))}</span>`).join('')}</div></div>` : ''}
      </div>
      <div class="col" style="gap:20px">
        ${l.status === 'sold' ? `
        <div class="card" style="border-inline-start:4px solid var(--burg-700)">
          <h3 style="margin-bottom:12px">🤝 ${esc(t('sold'))}</h3>
          <div class="col" style="gap:8px" class="small">
            <div class="row row--between small"><span class="muted">${esc(t('buyerName'))}</span><b>${esc(l.buyer_name || '—')}</b></div>
            <div class="row row--between small"><span class="muted">${esc(t('sellingPrice'))}</span><b class="money">${esc(money(l.sold_price))}</b></div>
            <div class="row row--between small"><span class="muted">${esc(t('commission'))}</span><b class="money">${esc(money(l.commission))}</b></div>
            <div class="row row--between small"><span class="muted">${esc(t('soldDate'))}</span><b>${esc(fmtDate(l.sold_date))}</b></div>
          </div>
        </div>` : ''}
        <div class="card">
          <h3 style="margin-bottom:12px">💼 ${esc(t('agentInfo'))}</h3>
          ${agent ? `
            <div class="row">
              <span class="avatar avatar--lg">${agent.photo ? `<img src="${esc(storage.publicUrl(agent.photo))}">` : esc(initials(agent.name || agent.email))}</span>
              <div><div style="font-weight:800">${esc(agent.name || agent.email)}</div>
                <div class="xs muted" dir="ltr">${esc(agent.phone || agent.email || '')}</div>
                ${team ? `<div class="xs" style="color:${esc(team.color || 'var(--burg-700)')};font-weight:700">🛡️ ${esc(team.name)}</div>` : ''}
              </div>
            </div>
            ${agent.phone ? `<a class="btn btn--primary btn--block" style="margin-top:14px" href="tel:${esc(agent.phone)}">📞 ${esc(agent.phone)}</a>` : ''}`
          : `<div class="muted small">—</div>`}
        </div>
        ${mapBlock}
      </div>
    </div>
    <div class="section">
      <h2 style="margin-bottom:14px">🏘️ ${esc(t('relatedProps'))}</h2>
      <div id="related" class="grid grid--3"></div>
    </div>`;

  el.querySelector('#gal-slot').appendChild(gallery(Array.isArray(l.images) ? l.images : []));
  el.querySelector('#back').onclick = () => navigate('properties');
  el.querySelector('#a-edit')?.addEventListener('click', () => navigate('properties/' + l.id + '/edit'));
  el.querySelector('#a-sold')?.addEventListener('click', () => openMarkSold(l, rerender));
  el.querySelector('#a-arch')?.addEventListener('click', async () => { if (await archiveListing(l)) rerender(); });
  el.querySelector('#a-rest')?.addEventListener('click', async () => { if (await restoreListing(l)) rerender(); });
  el.querySelector('#a-del')?.addEventListener('click', async () => { if (await deleteListing(l)) navigate('properties'); });
  el.querySelector('#a-approve')?.addEventListener('click', async () => {
    await db.update('properties', l.id, { approval: 'approved' }); toast(t('saved')); rerender();
  });
  el.querySelector('#a-reject')?.addEventListener('click', async () => {
    await db.update('properties', l.id, { approval: 'rejected' }); toast(t('saved'), 'warning'); rerender();
  });

  // related: same city or type, excluding self
  loadListings().then(all => {
    const rel = all.filter(x => x.id !== l.id && x.status !== 'archived' && x.approval === 'approved'
      && (x.city === l.city || x.ptype === l.ptype)).slice(0, 3);
    const target = el.querySelector('#related');
    if (!rel.length) { target.innerHTML = `<div class="empty">${esc(t('noData'))}</div>`; return; }
    target.innerHTML = rel.map(listingCard).join('');
    target.querySelectorAll('[data-listing]').forEach(c =>
      c.onclick = () => navigate('properties/' + c.dataset.listing));
  });

  return el;
}
