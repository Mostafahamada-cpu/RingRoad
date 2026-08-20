// Leads — the "Request details" enquiries filed from the public client view
// (client/). Read-only inbox with a status workflow; the matching CRM client
// row is created server-side by rr_submit_property_request(), so every lead
// also shows up on the Clients page.
//
// NOTE: this is a UI rename only. The backing table is still
// public.property_requests and the RPC is still rr_submit_property_request(),
// so existing data and the public client view keep working untouched.
//
// Visibility follows the same rules as the rest of the CRM (RLS enforces it):
// agent → own, leader → own team, management/admin → everything.
import { t } from '../lib/i18n.js';
import { esc, fmtDate, initials } from '../lib/utils.js';
import { db } from '../lib/supabase.js';
import { profileById } from '../lib/store.js';
import { can } from '../lib/perms.js';
import { dataTable } from '../components/table.js';
import { openModal, confirmDlg } from '../components/modal.js';
import { pagehead } from '../components/layout.js';
import { navigate, render as rerender } from '../lib/router.js';
import { toast } from '../lib/toast.js';

export const loadLeads = () =>
  db.list('property_requests', 'select=*&order=created_at.desc').catch(() => []);

const STATUS_BADGE = { new: 'badge--pending', contacted: 'badge--approved', closed: 'badge--muted' };

const when = (ts) => {
  if (!ts) return '—';
  const d = new Date(ts);
  return isNaN(d) ? fmtDate(ts) : d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
};

function openLead(r, onDone) {
  const agent = profileById(r.agent_id);
  const { el, close } = openModal({
    title: t('leadTitleOne'),
    body: `
      <div class="col" style="gap:14px">
        <div class="row">
          <span class="avatar avatar--lg">${esc(initials(r.name))}</span>
          <div>
            <div style="font-weight:800;font-size:var(--fs-h3)">${esc(r.name)}</div>
            <a class="small" dir="ltr" href="tel:${esc(String(r.phone || '').replace(/\s/g, ''))}">${esc(r.phone || '—')}</a>
          </div>
        </div>
        ${r.message ? `<div class="card" style="background:var(--bg);box-shadow:none">
          <div class="xs muted" style="margin-bottom:4px">${esc(t('leadMessage'))}</div>
          <div class="small" style="white-space:pre-wrap">${esc(r.message)}</div></div>` : ''}
        <div class="col" style="gap:8px">
          <div class="row row--between small"><span class="muted">${esc(t('linkedProperty'))}</span>
            <b>${esc(r.property_title || '—')}</b></div>
          <div class="row row--between small"><span class="muted">${esc(t('propertyId'))}</span>
            <b dir="ltr">${esc(r.property_code || '—')}</b></div>
          <div class="row row--between small"><span class="muted">${esc(t('agentInfo'))}</span>
            <b>${esc(agent?.name || agent?.email || '—')}</b></div>
          <div class="row row--between small"><span class="muted">${esc(t('leadSource'))}</span>
            <b>${esc(r.source === 'client_view' ? t('leadSourceClient') : (r.source || '—'))}</b></div>
          <div class="row row--between small"><span class="muted">${esc(t('leadReceived'))}</span>
            <b>${esc(when(r.created_at))}</b></div>
        </div>
        <div class="row row--wrap" style="gap:8px">
          ${r.property_id ? `<button class="btn btn--outline btn--sm" data-go-prop>🏛️ ${esc(t('viewProperty'))}</button>` : ''}
          ${r.client_id ? `<button class="btn btn--outline btn--sm" data-go-client>👤 ${esc(t('navClients'))}</button>` : ''}
          <a class="btn btn--outline btn--sm" href="tel:${esc(String(r.phone || '').replace(/\s/g, ''))}">📞 ${esc(t('call'))}</a>
        </div>
        <div class="modal__actions">
          ${can('delete:core') ? `<button class="btn btn--danger" data-del style="margin-inline-end:auto">🗑️ ${esc(t('del'))}</button>` : ''}
          ${r.status !== 'contacted' ? `<button class="btn btn--outline" data-st="contacted">${esc(t('leadMarkContacted'))}</button>` : ''}
          ${r.status !== 'closed' ? `<button class="btn btn--primary" data-st="closed">${esc(t('leadMarkClosed'))}</button>` : ''}
          ${r.status !== 'new' ? `<button class="btn btn--ghost" data-st="new">${esc(t('leadReopen'))}</button>` : ''}
        </div>
      </div>`,
  });

  el.querySelector('[data-go-prop]')?.addEventListener('click', () => { close(); navigate('properties/' + r.property_id); });
  el.querySelector('[data-go-client]')?.addEventListener('click', () => { close(); navigate('clients'); });
  el.querySelectorAll('[data-st]').forEach(b => b.onclick = async () => {
    try {
      await db.update('property_requests', r.id, { status: b.dataset.st });
      close(); toast(t('saved')); onDone();
    } catch (err) { toast(err.message, 'error'); }
  });
  el.querySelector('[data-del]')?.addEventListener('click', async () => {
    if (!(await confirmDlg({ message: t('confirmDeleteLead') }))) return;
    try {
      await db.remove('property_requests', r.id);
      close(); toast(t('deleted')); onDone();
    } catch (err) { toast(err.message, 'error'); }
  });
}

export async function pageLeads() {
  const rows = await loadLeads();
  const el = document.createElement('div');
  const fresh = rows.filter(r => r.status === 'new').length;

  el.innerHTML = `${pagehead(t('leadTitle'), t('leadSub'),
    fresh ? `<span class="badge badge--pending">⏳ ${fresh} ${esc(t('leadNew'))}</span>` : '')}<div id="tbl"></div>`;

  el.querySelector('#tbl').appendChild(dataTable({
    rows,
    exportName: 'leads',
    emptyText: t('noLeads'),
    onRowClick: (r) => openLead(r, rerender),
    searchable: (r, q) => [r.name, r.phone, r.property_code, r.property_title, r.message]
      .filter(Boolean).join(' ').toLowerCase().includes(q),
    columns: [
      { key: 'name', label: t('clientName'), sortable: true, render: r => `
        <div class="row"><span class="avatar avatar--sm">${esc(initials(r.name))}</span>
        <div><div class="cell-main">${esc(r.name)}</div>
          <div class="xs muted" dir="ltr">${esc(r.phone || '')}</div></div></div>` },
      { key: 'property_code', label: t('propertyId'), sortable: true,
        render: r => `<b dir="ltr">${esc(r.property_code || '—')}</b>` },
      { key: 'property_title', label: t('linkedProperty'), sortable: true,
        render: r => esc(r.property_title || '—') },
      { key: 'message', label: t('leadMessage'),
        render: r => `<span class="truncate" style="display:block;max-width:220px">${esc(r.message || '—')}</span>`,
        csv: r => r.message || '' },
      { key: 'agent_id', label: t('agentInfo'),
        render: r => esc(profileById(r.agent_id)?.name || '—'),
        csv: r => profileById(r.agent_id)?.name || '' },
      { key: 'created_at', label: t('leadReceived'), sortable: true,
        render: r => `<span class="xs">${esc(when(r.created_at))}</span>`, csv: r => r.created_at },
      { key: 'status', label: t('status'), sortable: true,
        render: r => `<span class="badge ${STATUS_BADGE[r.status] || 'badge--muted'}">${esc(t('leadSt_' + r.status) || r.status)}</span>`,
        csv: r => r.status },
    ],
  }));
  return el;
}
