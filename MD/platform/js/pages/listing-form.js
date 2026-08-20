// Add / edit property: 20 validated fields + real image uploads.
import { t } from '../lib/i18n.js';
import { esc, validateForm, rules, uid } from '../lib/utils.js';
import { db, userId } from '../lib/supabase.js';
import { store, me, isMgmt, isLeader, myTeamId } from '../lib/store.js';
import { typeOptions, canEditListing } from '../lib/listings.js';
import { field, selectField, textareaField, checkField, checkboxGroup, readForm } from '../components/form.js';
import { createUploader } from '../components/uploader.js';
import { createVideoEditor, loadPropertyVideos } from '../components/video-uploader.js';
import { pagehead } from '../components/layout.js';
import { navigate } from '../lib/router.js';
import { toast } from '../lib/toast.js';
import { GOVERNORATES, AMENITIES, STATUSES, FINISHINGS, DEAL_TYPES } from '../config.js';

export async function pageListingForm(params) {
  const isNew = params.id === 'new';
  const l = isNew ? {} : await db.one('properties', params.id);
  if (!isNew && !l) return `<div class="empty">${esc(t('propNotFound'))}</div>`;
  if (!isNew && !canEditListing(l)) { navigate('properties'); return document.createElement('div'); }

  const el = document.createElement('div');
  const up = createUploader({ existing: Array.isArray(l.images) ? l.images : [] });
  // Videos live in the shared `videos` table keyed by property_id, so a new
  // property has none yet and an existing one loads whatever it already has.
  // null means the table is unreachable — the editor then explains why.
  const vids = createVideoEditor({ existing: isNew ? [] : await loadPropertyVideos(l.id) });

  const agentOpts = store.profiles
    .filter(p => ['agent', 'leader'].includes(p.role) && p.active !== false)
    .filter(p => isMgmt() ? true : isLeader() ? p.team_id === myTeamId() : p.id === userId())
    .map(p => ({ v: p.id, l: p.name || p.email }));
  const teamOpts = store.teams.filter(tm => !tm.archived).map(tm => ({ v: tm.id, l: tm.name }));

  el.innerHTML = `
    ${pagehead(isNew ? t('addProperty') : t('editProperty'), l.title || '', `
      <button class="btn btn--outline" id="back">← ${esc(t('back'))}</button>`)}
    <form novalidate class="col" style="gap:24px">
      <div class="card">
        <div class="card__head"><h3>📋 ${esc(t('details'))}</h3></div>
        <div class="form-grid">
          ${field({ label: t('propertyTitle'), name: 'title', value: l.title, required: true, span2: true })}
          ${selectField({ label: t('ptype'), name: 'ptype', options: typeOptions(), value: l.ptype || 'apartment', required: true })}
          ${selectField({ label: t('status'), name: 'status', options: STATUSES.filter(s => s !== 'sold' || l.status === 'sold').map(s => ({ v: s, l: t(s) })), value: l.status || 'available' })}
          ${selectField({ label: t('dealType'), name: 'type', options: DEAL_TYPES.map(v => ({ v, l: t(v === 'rent' ? 'forRent' : 'forSale') })), value: l.type || 'sale' })}
          ${selectField({ label: t('finishing'), name: 'finishing', options: FINISHINGS.map(v => ({ v, l: t(v) })), value: l.finishing, emptyLabel: t('none') })}
          ${field({ label: t('project'), name: 'project', value: l.project })}
          ${field({ label: t('developer'), name: 'developer', value: l.developer })}
          ${field({ label: t('price') + ' (' + t('egp') + ')', name: 'price', type: 'number', value: l.price, required: true, dir: 'ltr', min: 0 })}
          ${field({ label: t('area') + ' (' + t('sqm') + ')', name: 'area', type: 'number', value: l.area, required: true, dir: 'ltr', min: 0 })}
          ${field({ label: t('bedrooms'), name: 'bedrooms', type: 'number', value: l.bedrooms, dir: 'ltr', min: 0, max: 20 })}
          ${field({ label: t('bathrooms'), name: 'bathrooms', type: 'number', value: l.bathrooms, dir: 'ltr', min: 0, max: 20 })}
          ${field({ label: t('floor'), name: 'floor', type: 'number', value: l.floor, dir: 'ltr' })}
          ${field({ label: t('yearBuilt'), name: 'year_built', type: 'number', value: l.year_built, dir: 'ltr', min: 1900, max: 2100 })}
          ${field({ label: t('parking'), name: 'parking', type: 'number', value: l.parking, dir: 'ltr', min: 0 })}
          ${selectField({ label: t('agentInfo'), name: 'agent_id', options: agentOpts, value: l.agent_id || userId(), required: true })}
          ${isMgmt() || isLeader() ? selectField({ label: t('team'), name: 'team_id', options: teamOpts, value: l.team_id ?? (myTeamId() || ''), emptyLabel: t('none') }) : ''}
          ${checkField({ label: '🛋️ ' + t('furnished'), name: 'furnished', checked: !!l.furnished })}
          ${checkField({ label: '★ ' + t('featured'), name: 'featured', checked: !!l.featured })}
        </div>
      </div>
      <div class="card">
        <div class="card__head"><h3>📍 ${esc(t('location'))}</h3></div>
        <div class="form-grid">
          ${field({ label: t('address'), name: 'address', value: l.address, required: true, span2: true })}
          ${field({ label: t('city'), name: 'city', value: l.city, required: true })}
          ${selectField({ label: t('governorate'), name: 'governorate', options: GOVERNORATES.map(g => ({ v: g, l: g })), value: l.governorate || 'Cairo' })}
          ${field({ label: t('latitude'), name: 'lat', type: 'number', value: l.lat, dir: 'ltr', step: 'any', hint: '29.97' })}
          ${field({ label: t('longitude'), name: 'lng', type: 'number', value: l.lng, dir: 'ltr', step: 'any', hint: '31.13' })}
        </div>
      </div>
      <div class="card">
        <div class="card__head"><h3>✨ ${esc(t('amenities'))} & ${esc(t('description'))}</h3></div>
        <div class="form-grid">
          ${checkboxGroup({ label: t('amenities'), name: 'amenities', values: Array.isArray(l.amenities) ? l.amenities : [], options: AMENITIES.map(a => ({ v: a, l: t(a === 'parking' ? 'parkingAm' : a) })) })}
          ${textareaField({ label: t('description'), name: 'description', value: l.description, required: true, rows: 5 })}
        </div>
      </div>
      <div class="card">
        <div class="card__head"><h3>🖼️ ${esc(t('images'))}</h3></div>
        <div id="up-slot"></div>
      </div>
      <div class="card">
        <div class="card__head"><h3>🎥 ${esc(t('videos'))}</h3></div>
        <div id="vid-slot"></div>
      </div>
      <div class="row" style="justify-content:flex-end;gap:12px">
        <button type="button" class="btn btn--outline" id="cancel">${esc(t('cancel'))}</button>
        <button type="submit" class="btn btn--primary btn--lg" id="save">💾 ${esc(t('save'))}</button>
      </div>
    </form>`;

  el.querySelector('#up-slot').appendChild(up.el);
  el.querySelector('#vid-slot').appendChild(vids.el);
  const goBack = () => navigate(isNew ? 'properties' : 'properties/' + params.id);
  el.querySelector('#back').onclick = goBack;
  el.querySelector('#cancel').onclick = goBack;

  const form = el.querySelector('form');
  form.onsubmit = async (e) => {
    e.preventDefault();
    const ok = validateForm(form, {
      title: [rules.required, rules.minLen(4)],
      price: [rules.required, rules.numeric, rules.min(1)],
      area: [rules.required, rules.numeric, rules.min(1)],
      address: [rules.required], city: [rules.required],
      description: [rules.required, rules.minLen(10)],
      agent_id: [rules.required],
      bedrooms: [rules.numeric, rules.min(0), rules.max(20)],
      bathrooms: [rules.numeric, rules.min(0), rules.max(20)],
      year_built: [rules.numeric],
      lat: [rules.numeric], lng: [rules.numeric],
    });
    if (!ok) { toast(t('vRequired'), 'warning'); form.querySelector('.is-invalid')?.scrollIntoView({ behavior: 'smooth', block: 'center' }); return; }

    const btn = el.querySelector('#save');
    btn.disabled = true; btn.textContent = t('loading');
    try {
      const d = readForm(form);
      const id = isNew ? uid() : l.id;
      const images = await up.commit('properties/' + id);
      const numOrNull = (v) => (v === '' || v == null) ? null : +v;
      const addr = d.address.trim();
      const row = {
        title: d.title.trim(), ptype: d.ptype, unit_type: d.ptype, price: +d.price, area: +d.area,
        bedrooms: numOrNull(d.bedrooms) ?? 0, bathrooms: numOrNull(d.bathrooms) ?? 0,
        beds: numOrNull(d.bedrooms) ?? 0, baths: numOrNull(d.bathrooms) ?? 0,
        floor: numOrNull(d.floor), year_built: numOrNull(d.year_built), parking: numOrNull(d.parking) ?? 0,
        address: addr, city: d.city.trim(), governorate: d.governorate,
        description: d.description.trim(), status: d.status || 'available',
        agent_id: d.agent_id, team_id: d.team_id || (store.profiles.find(p => p.id === d.agent_id)?.team_id ?? null),
        furnished: !!d.furnished, featured: !!d.featured,
        type: d.type || 'sale', finishing: d.finishing || null,
        project: d.project.trim() || null, developer: d.developer.trim() || null,
        lat: numOrNull(d.lat), lng: numOrNull(d.lng),
        amenities: d.amenities || [], images,
        // Agents' submissions need approval; management/leaders publish instantly.
        approval: (isMgmt() || isLeader()) ? 'approved' : (isNew ? 'pending' : (l.approval === 'rejected' ? 'pending' : l.approval)),
      };
      // Compat with the original app's NOT NULL columns on `properties`.
      if (isNew) {
        // `code` (RR-1024) is assigned by the trg_properties_code trigger from
        // platform-client-view.sql — it owns the sequence, so it stays unique.
        row.address_en = addr; row.address_ar = addr;
      }
      if (isNew) await db.create('properties', { id, ...row });
      else await db.update('properties', l.id, row);
      // Only now does the property exist, so videos.property_id can point at it.
      // A video failure must not lose the property edit the user just made.
      try {
        await vids.commit(id);
      } catch (vErr) {
        toast(t('propSaved') + ' — ' + (vErr.message || t('vidSaveFailed')), 'warning', 6000);
        navigate('properties/' + id);
        return;
      }
      toast(t('propSaved'));
      navigate('properties/' + id);
    } catch (err) {
      toast(err.message, 'error');
      btn.disabled = false; btn.textContent = '💾 ' + t('save');
    }
  };
  return el;
}
