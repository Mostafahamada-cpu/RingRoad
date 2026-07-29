// Follow-ups — grouped by overdue / today / upcoming / completed, with done toggle.
import { t } from '../lib/i18n.js';
import { esc, validateForm, rules, todayKey } from '../lib/utils.js';
import { db, userId } from '../lib/supabase.js';
import { store, profileById, isMgmt, isLeader, myTeamId } from '../lib/store.js';
import { can } from '../lib/perms.js';
import { loadClients, loadFollowups, dueBucket } from '../lib/crm.js';
import { openModal, confirmDlg } from '../components/modal.js';
import { field, selectField, textareaField, readForm } from '../components/form.js';
import { pagehead } from '../components/layout.js';
import { render as rerender } from '../lib/router.js';
import { toast } from '../lib/toast.js';
import { FU_KINDS, FU_KIND_ICONS } from '../config.js';

function agentOptions() {
  return store.profiles.filter(p => ['agent', 'leader'].includes(p.role) && p.active !== false)
    .filter(p => isMgmt() ? true : isLeader() ? p.team_id === myTeamId() : p.id === userId())
    .map(p => ({ v: p.id, l: p.name || p.email }));
}

function openFuForm(f, clients, onDone) {
  const isNew = !f;
  const due = f?.due_at ? new Date(f.due_at) : null;
  const dateVal = due ? due.toISOString().slice(0, 10) : todayKey();
  const timeVal = due ? String(due.getHours()).padStart(2, '0') + ':' + String(due.getMinutes()).padStart(2, '0') : '10:00';
  const { el, close } = openModal({
    title: isNew ? t('addFollowup') : t('editFollowup'),
    body: `
      <form class="form-grid" novalidate>
        ${field({ label: t('fuTitle'), name: 'title', value: f?.title, required: true, span2: true })}
        ${selectField({ label: t('linkedClient'), name: 'client_id', options: clients.map(c => ({ v: c.id, l: c.name })), value: f?.client_id, emptyLabel: t('none') })}
        ${selectField({ label: t('fuKind'), name: 'kind', options: FU_KINDS.map(k => ({ v: k, l: FU_KIND_ICONS[k] + ' ' + t(k === 'visit' ? 'kvisit' : k) })), value: f?.kind || 'call' })}
        ${field({ label: t('dueAt'), name: 'due_date', type: 'date', value: dateVal, required: true, dir: 'ltr' })}
        ${field({ label: '⏰', name: 'due_time', type: 'time', value: timeVal, required: true, dir: 'ltr' })}
        ${selectField({ label: t('agentInfo'), name: 'agent_id', options: agentOptions(), value: f?.agent_id || userId(), required: true })}
        ${textareaField({ label: t('notes'), name: 'notes', value: f?.notes })}
        <div class="modal__actions span-2">
          ${!isNew && can('delete:ops') ? `<button type="button" class="btn btn--danger" data-del style="margin-inline-end:auto">🗑️</button>` : ''}
          <button type="button" class="btn btn--outline" data-x>${esc(t('cancel'))}</button>
          <button type="submit" class="btn btn--primary">${esc(t('save'))}</button>
        </div>
      </form>`,
  });
  const form = el.querySelector('form');
  el.querySelector('[data-x]').onclick = close;
  el.querySelector('[data-del]')?.addEventListener('click', async () => {
    if (!(await confirmDlg({ message: t('confirmDeleteFu') }))) return;
    await db.remove('followups', f.id); close(); toast(t('deleted')); onDone();
  });
  form.onsubmit = async (e) => {
    e.preventDefault();
    if (!validateForm(form, { title: [rules.required], due_date: [rules.required], due_time: [rules.required], agent_id: [rules.required] })) return;
    const d = readForm(form);
    const agent = profileById(d.agent_id);
    const cl = clients.find(c => c.id === d.client_id);
    const row = {
      title: d.title.trim(), client_id: d.client_id || null, kind: d.kind,
      due_at: new Date(d.due_date + 'T' + d.due_time).toISOString(), notes: d.notes.trim() || null,
      agent_id: d.agent_id, team_id: agent?.team_id || cl?.team_id || myTeamId() || null,
    };
    try {
      if (isNew) await db.create('followups', row); else await db.update('followups', f.id, row);
      close(); toast(t('saved')); onDone();
    } catch (err) { toast(err.message, 'error'); }
  };
}

export async function pageFollowups() {
  const [rows, clients] = await Promise.all([loadFollowups(), loadClients()]);
  const el = document.createElement('div');
  const groups = { overdue: [], dueToday: [], upcoming: [], completed: [] };
  rows.forEach(f => groups[dueBucket(f)].push(f));
  const tone = { overdue: 'var(--danger)', dueToday: 'var(--orange-600)', upcoming: 'var(--burg-500)', completed: 'var(--muted)' };

  const rowHtml = (f) => {
    const c = clients.find(x => x.id === f.client_id);
    const due = new Date(f.due_at);
    return `
      <div class="card row" style="gap:14px;${f.done ? 'opacity:.6' : ''}">
        <button class="iconbtn" data-done="${f.id}" style="border-radius:50%;${f.done ? 'background:var(--orange-500);color:#fff;border-color:var(--orange-500)' : ''}">${f.done ? '✓' : ''}</button>
        <div class="grow" data-edit="${f.id}" style="cursor:pointer">
          <b style="${f.done ? 'text-decoration:line-through' : ''}">${esc(FU_KIND_ICONS[f.kind] || '📌')} ${esc(f.title)}</b>
          <div class="xs muted">${esc(due.toLocaleString())}${c ? ' · 👤 ' + esc(c.name) : ''}${f.notes ? ' · ' + esc(f.notes) : ''}</div>
        </div>
        <span class="badge badge--muted">${esc(profileById(f.agent_id)?.name || '')}</span>
      </div>`;
  };

  const section = (key) => groups[key].length ? `
    <div class="section">
      <div class="eyebrow" style="margin-bottom:10px;color:${tone[key]}">${esc(t(key))} · ${groups[key].length}</div>
      <div class="col">${groups[key].map(rowHtml).join('')}</div>
    </div>` : '';

  el.innerHTML = `
    ${pagehead(t('followupsTitle'), t('followupsSub'), `<button class="btn btn--primary" id="add">＋ ${esc(t('addFollowup'))}</button>`)}
    ${rows.length ? (section('overdue') + section('dueToday') + section('upcoming') + section('completed'))
      : `<div class="empty"><div class="empty__icon">📞</div>${esc(t('noFollowups'))}</div>`}`;

  el.querySelector('#add').onclick = () => openFuForm(null, clients, rerender);
  el.querySelectorAll('[data-edit]').forEach(b => b.onclick = () =>
    openFuForm(rows.find(f => f.id === b.dataset.edit), clients, rerender));
  el.querySelectorAll('[data-done]').forEach(b => b.onclick = async () => {
    const f = rows.find(x => x.id === b.dataset.done);
    try { await db.update('followups', f.id, { done: !f.done }); rerender(); }
    catch (err) { toast(err.message, 'error'); }
  });
  return el;
}
