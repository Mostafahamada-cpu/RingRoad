// Clients CRM — list + create/edit + stage + delete. Role visibility via RLS.
import { t } from '../lib/i18n.js';
import { esc, money, compact, validateForm, rules, initials, fmtDate } from '../lib/utils.js';
import { db, userId } from '../lib/supabase.js';
import { store, profileById, teamById, isMgmt, isLeader, myTeamId } from '../lib/store.js';
import { can } from '../lib/perms.js';
import { loadClients, clientStageLabel } from '../lib/crm.js';
import { dataTable } from '../components/table.js';
import { openModal, confirmDlg } from '../components/modal.js';
import { field, selectField, textareaField, readForm } from '../components/form.js';
import { pagehead } from '../components/layout.js';
import { render as rerender } from '../lib/router.js';
import { toast } from '../lib/toast.js';
import { CLIENT_STAGES, CLIENT_STAGE_COLORS, PTYPES } from '../config.js';

function agentOptions() {
  return store.profiles
    .filter(p => ['agent', 'leader'].includes(p.role) && p.active !== false)
    .filter(p => isMgmt() ? true : isLeader() ? p.team_id === myTeamId() : p.id === userId())
    .map(p => ({ v: p.id, l: p.name || p.email }));
}

function openClientForm(c, onDone) {
  const isNew = !c;
  const { el, close } = openModal({
    title: isNew ? t('addClient') : t('editClient'), size: 'lg',
    body: `
      <form class="form-grid" novalidate>
        ${field({ label: t('clientName'), name: 'name', value: c?.name, required: true, span2: true })}
        ${field({ label: t('phone'), name: 'phone', type: 'tel', value: c?.phone, dir: 'ltr' })}
        ${field({ label: t('email'), name: 'email', type: 'email', value: c?.email, dir: 'ltr' })}
        ${field({ label: t('nationality'), name: 'nationality', value: c?.nationality })}
        ${field({ label: t('budget') + ' (' + t('egp') + ')', name: 'budget', type: 'number', value: c?.budget, dir: 'ltr', min: 0 })}
        ${field({ label: t('prefArea'), name: 'preferred_area', value: c?.preferred_area })}
        ${selectField({ label: t('prefType'), name: 'preferred_unit_type', options: PTYPES.map(p => ({ v: p, l: t(p) })), value: c?.preferred_unit_type, emptyLabel: t('none') })}
        ${selectField({ label: t('clientStage'), name: 'stage', options: CLIENT_STAGES.map(s => ({ v: s, l: clientStageLabel(s) })), value: c?.stage || 'new_lead' })}
        ${selectField({ label: t('agentInfo'), name: 'agent_id', options: agentOptions(), value: c?.agent_id || userId(), required: true })}
        ${textareaField({ label: t('notes'), name: 'notes', value: c?.notes })}
        <div class="modal__actions span-2">
          ${!isNew && can('delete:core') ? `<button type="button" class="btn btn--danger" data-del style="margin-inline-end:auto">🗑️ ${esc(t('del'))}</button>` : ''}
          <button type="button" class="btn btn--outline" data-x>${esc(t('cancel'))}</button>
          <button type="submit" class="btn btn--primary">${esc(t('save'))}</button>
        </div>
      </form>`,
  });
  const form = el.querySelector('form');
  el.querySelector('[data-x]').onclick = close;
  el.querySelector('[data-del]')?.addEventListener('click', async () => {
    if (!(await confirmDlg({ message: t('confirmDeleteClient') }))) return;
    await db.remove('clients', c.id); close(); toast(t('deleted')); onDone();
  });
  form.onsubmit = async (e) => {
    e.preventDefault();
    if (!validateForm(form, { name: [rules.required], agent_id: [rules.required], email: [rules.email], budget: [rules.numeric] })) return;
    const d = readForm(form);
    const agent = profileById(d.agent_id);
    const row = {
      name: d.name.trim(), phone: d.phone.trim() || null, email: d.email.trim() || null,
      nationality: d.nationality.trim() || null, budget: d.budget === '' ? null : +d.budget,
      preferred_area: d.preferred_area.trim() || null, preferred_unit_type: d.preferred_unit_type || null,
      stage: d.stage, notes: d.notes.trim() || null,
      agent_id: d.agent_id, team_id: agent?.team_id || myTeamId() || null,
    };
    try {
      if (isNew) await db.create('clients', row); else await db.update('clients', c.id, row);
      close(); toast(t('saved')); onDone();
    } catch (err) { toast(err.message, 'error'); }
  };
}

export async function pageClients() {
  const rows = await loadClients();
  const el = document.createElement('div');
  el.innerHTML = `${pagehead(t('clientsTitle'), t('clientsSub'),
    `<button class="btn btn--primary" id="add">＋ ${esc(t('addClient'))}</button>`)}<div id="tbl"></div>`;
  el.querySelector('#add').onclick = () => openClientForm(null, rerender);

  el.querySelector('#tbl').appendChild(dataTable({
    rows, exportName: 'clients', emptyText: t('noClients'),
    onRowClick: (r) => openClientForm(r, rerender),
    searchable: (r, q) => [r.name, r.phone, r.email, r.nationality, r.preferred_area].join(' ').toLowerCase().includes(q),
    columns: [
      { key: 'name', label: t('clientName'), sortable: true, render: r => `
        <div class="row"><span class="avatar avatar--sm">${esc(initials(r.name))}</span>
        <div><div class="cell-main">${esc(r.name)}</div><div class="xs muted" dir="ltr">${esc(r.phone || '')}</div></div></div>` },
      { key: 'nationality', label: t('nationality'), sortable: true, render: r => esc(r.nationality || '—') },
      { key: 'budget', label: t('budget'), sortable: true, render: r => r.budget ? `<b class="money">${esc(compact(r.budget))}</b>` : '—', csv: r => r.budget || '' },
      { key: 'preferred_area', label: t('prefArea'), render: r => esc(r.preferred_area || '—') },
      { key: 'stage', label: t('clientStage'), sortable: true, render: r => `<span class="badge" style="background:var(--bg-sunken);color:${CLIENT_STAGE_COLORS[r.stage] || 'var(--burg-700)'}">${esc(clientStageLabel(r.stage))}</span>`, csv: r => clientStageLabel(r.stage) },
      { key: 'agent_id', label: t('agentInfo'), render: r => esc(profileById(r.agent_id)?.name || '—'), csv: r => profileById(r.agent_id)?.name || '' },
    ],
  }));
  return el;
}
