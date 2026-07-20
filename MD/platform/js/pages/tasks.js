// Team tasks: assignments, due dates, priorities, follow-ups.
import { t } from '../lib/i18n.js';
import { esc, initials, fmtDate, todayKey, validateForm, rules } from '../lib/utils.js';
import { db, userId } from '../lib/supabase.js';
import { store, profileById, isMgmt, isLeader, myTeamId, agentsOf } from '../lib/store.js';
import { openModal, confirmDlg } from '../components/modal.js';
import { field, selectField, textareaField, readForm } from '../components/form.js';
import { pagehead } from '../components/layout.js';
import { render as rerender } from '../lib/router.js';
import { toast } from '../lib/toast.js';
import { TASK_PRIORITIES } from '../config.js';

const PRI_TONE = { high: 'var(--danger)', normal: 'var(--orange-600)', low: 'var(--muted)' };

function openTaskForm(task, teamId, onDone) {
  const isNew = !task;
  const teamOpts = isMgmt()
    ? store.teams.filter(x => !x.archived).map(x => ({ v: x.id, l: x.name }))
    : store.teams.filter(x => x.id === teamId).map(x => ({ v: x.id, l: x.name }));
  const assignees = (tid) => (tid ? agentsOf(tid) : store.profiles).map(p => ({ v: p.id, l: p.name || p.email }));
  const { el, close } = openModal({
    title: isNew ? t('addTask') : t('edit'),
    body: `
      <form class="form-grid" novalidate>
        ${field({ label: t('taskTitle'), name: 'title', value: task?.title, required: true, span2: true })}
        ${selectField({ label: t('team'), name: 'team_id', options: teamOpts, value: task?.team_id || teamId || '', required: true })}
        ${selectField({ label: t('assignee'), name: 'assignee_id', options: assignees(task?.team_id || teamId), value: task?.assignee_id || userId(), emptyLabel: t('none') })}
        ${field({ label: t('due'), name: 'due', type: 'date', value: task?.due || todayKey(), required: true, dir: 'ltr' })}
        ${selectField({ label: t('priority'), name: 'priority', options: TASK_PRIORITIES.map(p => ({ v: p, l: t(p) })), value: task?.priority || 'normal' })}
        ${textareaField({ label: t('notes'), name: 'notes', value: task?.notes, rows: 3 })}
        <div class="modal__actions span-2">
          ${!isNew ? `<button type="button" class="btn btn--danger" data-del style="margin-inline-end:auto">🗑️</button>` : ''}
          <button type="button" class="btn btn--outline" data-x>${esc(t('cancel'))}</button>
          <button type="submit" class="btn btn--primary">${esc(t('save'))}</button>
        </div>
      </form>`,
  });
  const form = el.querySelector('form');
  el.querySelector('[data-x]').onclick = close;
  form.querySelector('[name="team_id"]').onchange = (e) => {
    const sel = form.querySelector('[name="assignee_id"]');
    sel.innerHTML = `<option value="">${esc(t('none'))}</option>` + assignees(e.target.value).map(o => `<option value="${esc(o.v)}">${esc(o.l)}</option>`).join('');
  };
  el.querySelector('[data-del]')?.addEventListener('click', async () => {
    if (!(await confirmDlg({ message: t('confirmDeleteTask') }))) return;
    await db.remove('tasks', task.id); close(); toast(t('deleted')); onDone();
  });
  form.onsubmit = async (e) => {
    e.preventDefault();
    if (!validateForm(form, { title: [rules.required], due: [rules.required], team_id: [rules.required] })) return;
    const d = readForm(form);
    const row = {
      title: d.title.trim(), team_id: d.team_id, assignee_id: d.assignee_id || null,
      due: d.due, priority: d.priority, notes: d.notes.trim() || null,
    };
    try {
      if (isNew) await db.create('tasks', row);
      else await db.update('tasks', task.id, row);
      close(); toast(t('saved')); onDone();
    } catch (err) { toast(err.message, 'error'); }
  };
}

export async function pageTasks() {
  const teamId = myTeamId();
  const query = isMgmt() ? 'select=*&order=due.asc'
    : `select=*&team_id=eq.${teamId}&order=due.asc`;
  const rows = teamId || isMgmt() ? await db.list('tasks', query) : [];
  const canCreate = isMgmt() || isLeader();
  const today = todayKey();

  const groups = [
    { key: 'overdue', label: t('overdue'), rows: rows.filter(x => !x.done && x.due < today), tone: 'var(--danger)' },
    { key: 'open', label: t('open'), rows: rows.filter(x => !x.done && x.due >= today), tone: 'var(--orange-500)' },
    { key: 'done', label: t('done'), rows: rows.filter(x => x.done), tone: 'var(--muted)' },
  ];

  const el = document.createElement('div');
  el.innerHTML = `
    ${pagehead(t('tasksTitle'), t('tasksSub'),
      canCreate ? `<button class="btn btn--primary" id="add">＋ ${esc(t('addTask'))}</button>` : '')}
    ${!teamId && !isMgmt() ? `<div class="empty"><div class="empty__icon">🛡️</div>${esc(t('noTeam'))}</div>` : ''}
    ${rows.length ? groups.map(g => g.rows.length ? `
      <div class="section">
        <div class="eyebrow" style="margin-bottom:10px;color:${g.tone}">${esc(g.label)} · ${g.rows.length}</div>
        <div class="col">
          ${g.rows.map(x => {
            const who = profileById(x.assignee_id);
            const team = store.teams.find(tm => tm.id === x.team_id);
            const canToggle = isMgmt() || isLeader() || x.assignee_id === userId();
            return `
            <div class="card row" style="gap:14px;${x.done ? 'opacity:.55' : ''}">
              <button class="iconbtn" data-toggle="${x.id}" ${canToggle ? '' : 'disabled'}
                style="border-radius:50%;${x.done ? 'background:var(--orange-500);color:#fff;border-color:var(--orange-500)' : ''}">${x.done ? '✓' : ''}</button>
              <div class="grow" ${canCreate ? `data-edit="${x.id}" style="cursor:pointer"` : ''}>
                <b style="${x.done ? 'text-decoration:line-through' : ''}">${esc(x.title)}</b>
                <div class="xs muted">📅 ${esc(fmtDate(x.due))}${who ? ` · 👤 ${esc(who.name || who.email)}` : ''}${isMgmt() && team ? ` · 🛡️ ${esc(team.name)}` : ''}${x.notes ? ' · ' + esc(x.notes) : ''}</div>
              </div>
              <span class="badge" style="color:${PRI_TONE[x.priority] || 'var(--muted)'};background:var(--bg-sunken)">${esc(t(x.priority || 'normal'))}</span>
            </div>`;
          }).join('')}
        </div>
      </div>` : '').join('')
    : (teamId || isMgmt() ? `<div class="empty"><div class="empty__icon">✅</div>${esc(t('noTasks'))}</div>` : '')}`;

  el.querySelector('#add')?.addEventListener('click', () => openTaskForm(null, teamId, rerender));
  el.querySelectorAll('[data-toggle]').forEach(b => b.onclick = async () => {
    const x = rows.find(r => r.id === b.dataset.toggle);
    await db.update('tasks', x.id, { done: !x.done });
    rerender();
  });
  el.querySelectorAll('[data-edit]').forEach(d => d.onclick = () =>
    openTaskForm(rows.find(r => r.id === d.dataset.edit), teamId, rerender));
  return el;
}
