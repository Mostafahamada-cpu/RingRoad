// Shared team calendar: month grid, meetings / visits / follow-ups.
import { t, lang } from '../lib/i18n.js';
import { esc, todayKey, validateForm, rules } from '../lib/utils.js';
import { db, userId } from '../lib/supabase.js';
import { store, isMgmt, isLeader, myTeamId, profileById } from '../lib/store.js';
import { can } from '../lib/perms.js';
import { openModal, confirmDlg } from '../components/modal.js';
import { field, selectField, textareaField, readForm } from '../components/form.js';
import { pagehead } from '../components/layout.js';
import { render as rerender } from '../lib/router.js';
import { toast } from '../lib/toast.js';
import { EVENT_KINDS } from '../config.js';

const KIND_ICON = { meeting: '🤝', visit: '📍', followup: '📞', other: '📌' };
let viewYM = null; // {y, m}

function openEventForm(ev, teamId, date, onDone) {
  const isNew = !ev;
  const teamOpts = isMgmt()
    ? store.teams.filter(x => !x.archived).map(x => ({ v: x.id, l: x.name }))
    : store.teams.filter(x => x.id === teamId).map(x => ({ v: x.id, l: x.name }));
  const start = ev?.starts_at ? new Date(ev.starts_at) : null;
  const dateVal = start ? start.toISOString().slice(0, 10) : (date || todayKey());
  const timeVal = start ? String(start.getHours()).padStart(2, '0') + ':' + String(start.getMinutes()).padStart(2, '0') : '10:00';
  const { el, close } = openModal({
    title: isNew ? t('addEvent') : t('edit'),
    body: `
      <form class="form-grid" novalidate>
        ${field({ label: t('eventTitle'), name: 'title', value: ev?.title, required: true, span2: true })}
        ${selectField({ label: t('kind'), name: 'kind', options: EVENT_KINDS.map(k => ({ v: k, l: KIND_ICON[k] + ' ' + t(k) })), value: ev?.kind || 'meeting' })}
        ${selectField({ label: t('team'), name: 'team_id', options: teamOpts, value: ev?.team_id || teamId || '', required: true })}
        ${field({ label: t('due'), name: 'date', type: 'date', value: dateVal, required: true, dir: 'ltr' })}
        ${field({ label: t('starts'), name: 'time', type: 'time', value: timeVal, required: true, dir: 'ltr' })}
        ${textareaField({ label: t('notes'), name: 'notes', value: ev?.notes, rows: 2 })}
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
    if (!(await confirmDlg({ message: t('confirmDeleteEvent') }))) return;
    await db.remove('events', ev.id); close(); toast(t('deleted')); onDone();
  });
  form.onsubmit = async (e) => {
    e.preventDefault();
    if (!validateForm(form, { title: [rules.required], date: [rules.required], time: [rules.required], team_id: [rules.required] })) return;
    const d = readForm(form);
    const starts = new Date(d.date + 'T' + d.time);
    const row = { title: d.title.trim(), kind: d.kind, team_id: d.team_id, starts_at: starts.toISOString(), notes: d.notes.trim() || null };
    try {
      if (isNew) await db.create('events', row);
      else await db.update('events', ev.id, row);
      close(); toast(t('saved')); onDone();
    } catch (err) { toast(err.message, 'error'); }
  };
}

export async function pageCalendar() {
  const teamId = myTeamId();
  if (!viewYM) { const n = new Date(); viewYM = { y: n.getFullYear(), m: n.getMonth() }; }
  const query = isMgmt() ? 'select=*&order=starts_at.asc' : `select=*&team_id=eq.${teamId}&order=starts_at.asc`;
  const events = (teamId || isMgmt()) ? await db.list('events', query) : [];
  const canCreate = isMgmt() || isLeader();

  const first = new Date(viewYM.y, viewYM.m, 1);
  const startDow = first.getDay(); // 0=Sun
  const daysIn = new Date(viewYM.y, viewYM.m + 1, 0).getDate();
  const monthLabel = first.toLocaleDateString(lang() === 'ar' ? 'ar-EG' : 'en-US', { month: 'long', year: 'numeric' });
  const dayNames = [...Array(7)].map((_, i) =>
    new Date(2026, 2, 1 + i).toLocaleDateString(lang() === 'ar' ? 'ar-EG' : 'en-US', { weekday: 'short' })); // 2026-03-01 is a Sunday
  const dkey = (d) => `${viewYM.y}-${String(viewYM.m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  const byDay = {};
  events.forEach(ev => {
    const k = (ev.starts_at || '').slice(0, 10);
    (byDay[k] = byDay[k] || []).push(ev);
  });

  let cells = '';
  for (let i = 0; i < startDow; i++) cells += '<div class="calcell calcell--pad"></div>';
  for (let d = 1; d <= daysIn; d++) {
    const k = dkey(d);
    const dayEvents = byDay[k] || [];
    const isToday = k === todayKey();
    cells += `
      <div class="calcell ${isToday ? 'is-today' : ''}" data-day="${k}">
        <div class="calcell__n">${d}</div>
        ${dayEvents.slice(0, 3).map(ev => `
          <button class="calev" data-ev="${ev.id}" title="${esc(ev.title)}">
            ${KIND_ICON[ev.kind] || '📌'} <span class="truncate">${esc(ev.title)}</span>
          </button>`).join('')}
        ${dayEvents.length > 3 ? `<div class="xs muted">+${dayEvents.length - 3}</div>` : ''}
      </div>`;
  }

  const el = document.createElement('div');
  el.innerHTML = `
    <style>
      .calgrid { display:grid; grid-template-columns:repeat(7,1fr); gap:6px; }
      .caldow { text-align:center; font-size:var(--fs-2xs); font-weight:800; color:var(--muted); text-transform:uppercase; letter-spacing:.06em; padding:4px 0; }
      .calcell { min-height:92px; background:var(--paper); border:1px solid var(--line); border-radius:var(--r-md); padding:6px; display:flex; flex-direction:column; gap:3px; cursor:pointer; transition:border-color .15s; }
      .calcell:hover { border-color:var(--orange-400); }
      .calcell--pad { background:transparent; border:none; cursor:default; }
      .calcell.is-today { border-color:var(--orange-500); box-shadow:0 0 0 3px var(--orange-50); }
      .calcell__n { font-size:var(--fs-xs); font-weight:800; color:var(--ink-soft); }
      .is-today .calcell__n { color:var(--orange-600); }
      .calev { display:flex; align-items:center; gap:4px; border:none; background:var(--burg-50); color:var(--burg-700); border-radius:7px; padding:3px 6px; font-size:10px; font-weight:700; cursor:pointer; text-align:start; max-width:100%; }
      @media (max-width:760px){ .calcell { min-height:56px; } .calev span { display:none; } }
    </style>
    ${pagehead(t('calTitle'), t('calSub'),
      canCreate ? `<button class="btn btn--primary" id="add">＋ ${esc(t('addEvent'))}</button>` : '')}
    ${!teamId && !isMgmt() ? `<div class="empty"><div class="empty__icon">🛡️</div>${esc(t('noTeam'))}</div>` : `
      <div class="card">
        <div class="row row--between" style="margin-bottom:14px">
          <button class="iconbtn" id="prev">‹</button>
          <h3>${esc(monthLabel)}</h3>
          <button class="iconbtn" id="next">›</button>
        </div>
        <div class="calgrid" style="margin-bottom:6px">${dayNames.map(d => `<div class="caldow">${esc(d)}</div>`).join('')}</div>
        <div class="calgrid">${cells}</div>
      </div>`}`;

  el.querySelector('#add')?.addEventListener('click', () => openEventForm(null, teamId, null, rerender));
  el.querySelector('#prev')?.addEventListener('click', () => {
    viewYM.m--; if (viewYM.m < 0) { viewYM.m = 11; viewYM.y--; } rerender();
  });
  el.querySelector('#next')?.addEventListener('click', () => {
    viewYM.m++; if (viewYM.m > 11) { viewYM.m = 0; viewYM.y++; } rerender();
  });
  el.querySelectorAll('.calcell[data-day]').forEach(c => c.onclick = (e) => {
    if (e.target.closest('.calev')) return;
    if (canCreate) openEventForm(null, teamId, c.dataset.day, rerender);
  });
  el.querySelectorAll('[data-ev]').forEach(b => b.onclick = () => {
    const ev = events.find(x => x.id === b.dataset.ev);
    if (canCreate || ev.created_by === userId()) openEventForm(ev, teamId, null, rerender);
  });
  return el;
}
