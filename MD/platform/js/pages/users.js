// User management (admin): create, edit, roles, activate/deactivate, reset password.
import { t } from '../lib/i18n.js';
import { esc, initials, fmtDate, validateForm, rules } from '../lib/utils.js';
import { db, auth, storage } from '../lib/supabase.js';
import { store, teamById, isAdmin } from '../lib/store.js';
import { loadCore } from '../lib/store.js';
import { dataTable } from '../components/table.js';
import { openModal, confirmDlg } from '../components/modal.js';
import { field, selectField, readForm } from '../components/form.js';
import { pagehead } from '../components/layout.js';
import { render as rerender } from '../lib/router.js';
import { toast } from '../lib/toast.js';
import { ROLES } from '../config.js';

function roleOpts(value) {
  return ROLES.map(r => ({ v: r, l: t(r) }));
}
const teamOpts = () => store.teams.filter(tm => !tm.archived).map(tm => ({ v: tm.id, l: tm.name }));

function openUserForm(p, onDone) {
  const isNew = !p;
  const { el, close } = openModal({
    title: isNew ? t('addUser') : t('editUser'),
    body: `
      <form class="form-grid" novalidate>
        ${field({ label: t('name'), name: 'name', value: p?.name, required: true, span2: true })}
        ${field({ label: t('email'), name: 'email', type: 'email', value: p?.email, required: isNew, dir: 'ltr', span2: !isNew ? false : false, ...(isNew ? {} : {}) })}
        ${field({ label: t('phone'), name: 'phone', type: 'tel', value: p?.phone, dir: 'ltr' })}
        ${isNew ? field({ label: t('tempPassword'), name: 'password', required: true, dir: 'ltr', hint: '≥ 8' }) : ''}
        ${selectField({ label: t('role'), name: 'role', options: roleOpts(), value: p?.role || 'agent', required: true })}
        ${selectField({ label: t('team'), name: 'team_id', options: teamOpts(), value: p?.team_id || '', emptyLabel: t('unassigned') })}
        ${field({ label: t('rating') + ' (0-5)', name: 'performance_rating', type: 'number', value: p?.performance_rating ?? 0, min: 0, max: 5, step: '0.5', dir: 'ltr' })}
        <div class="modal__actions span-2">
          <button type="button" class="btn btn--outline" data-x>${esc(t('cancel'))}</button>
          <button type="submit" class="btn btn--primary">${esc(t('save'))}</button>
        </div>
      </form>`,
  });
  const form = el.querySelector('form');
  if (!isNew) form.email.disabled = true;
  el.querySelector('[data-x]').onclick = close;
  form.onsubmit = async (e) => {
    e.preventDefault();
    const spec = { name: [rules.required], role: [rules.required], performance_rating: [rules.numeric, rules.min(0), rules.max(5)] };
    if (isNew) { spec.email = [rules.required, rules.email]; spec.password = [rules.required, rules.minLen(8)]; }
    if (!validateForm(form, spec)) return;
    const d = readForm(form);
    const patch = {
      name: d.name.trim(), phone: d.phone.trim() || null, role: d.role,
      team_id: d.team_id || null, performance_rating: +d.performance_rating || 0,
    };
    try {
      if (isNew) {
        const res = await auth.signUpDetached(d.email.trim(), d.password);
        const newId = res.user?.id || res.id;
        if (!newId) throw new Error('signup failed');
        // trigger creates the profile row; patch it with details
        await db.update('profiles', newId, { ...patch, email: d.email.trim() })
          .catch(() => db.create('profiles', { id: newId, email: d.email.trim(), ...patch }));
        toast(t('userCreated'));
      } else {
        await db.update('profiles', p.id, patch);
        toast(t('saved'));
      }
      close(); await loadCore(); onDone();
    } catch (err) { toast(err.message, 'error'); }
  };
}

export async function pageUsers() {
  const rows = store.profiles;
  const el = document.createElement('div');
  el.innerHTML = `
    ${pagehead(t('usersTitle'), t('usersSub'), `<button class="btn btn--primary" id="add">＋ ${esc(t('addUser'))}</button>`)}
    <div id="tbl"></div>`;
  el.querySelector('#add').onclick = () => openUserForm(null, rerender);

  el.querySelector('#tbl').appendChild(dataTable({
    rows,
    exportName: 'users',
    searchable: (r, q) => [r.name, r.email, r.phone, t(r.role)].join(' ').toLowerCase().includes(q),
    columns: [
      { key: 'name', label: t('name'), sortable: true, render: r => `
        <div class="row"><span class="avatar avatar--sm">${r.photo ? `<img src="${esc(storage.publicUrl(r.photo))}">` : esc(initials(r.name || r.email))}</span>
        <div><div class="cell-main">${esc(r.name || '—')}</div><div class="xs muted" dir="ltr">${esc(r.email || '')}</div></div></div>` },
      { key: 'phone', label: t('phone'), render: r => `<span dir="ltr">${esc(r.phone || '—')}</span>` },
      { key: 'role', label: t('role'), sortable: true, render: r => `<span class="badge badge--role">${esc(t(r.role))}</span>`, csv: r => t(r.role) },
      { key: 'team_id', label: t('team'), render: r => esc(teamById(r.team_id)?.name || '—'), csv: r => teamById(r.team_id)?.name || '' },
      { key: 'active', label: t('status'), sortable: true, render: r => r.active === false
        ? `<span class="badge badge--archived">${esc(t('inactive'))}</span>`
        : `<span class="badge badge--approved">${esc(t('active'))}</span>`, csv: r => r.active === false ? t('inactive') : t('active') },
      { key: 'joined', label: t('joined'), sortable: true, render: r => esc(fmtDate(r.joined || r.created_at)) },
      { key: '_a', label: t('actions'), render: r => `
        <span class="row" style="gap:4px">
          <button class="btn btn--ghost btn--sm" data-edit="${r.id}" title="${esc(t('edit'))}">✏️</button>
          <button class="btn btn--ghost btn--sm" data-pw="${r.id}" title="${esc(t('resetPw'))}">🔑</button>
          <button class="btn btn--ghost btn--sm" data-act="${r.id}" title="${r.active === false ? esc(t('activate')) : esc(t('deactivate'))}">${r.active === false ? '▶️' : '⏸️'}</button>
          ${isAdmin() && r.id !== store.profile.id ? `<button class="btn btn--danger btn--sm" data-del="${r.id}">🗑️</button>` : ''}
        </span>` },
    ],
  }));

  el.querySelectorAll('[data-edit]').forEach(b => b.onclick = () =>
    openUserForm(rows.find(x => x.id === b.dataset.edit), rerender));
  el.querySelectorAll('[data-pw]').forEach(b => b.onclick = async () => {
    const u = rows.find(x => x.id === b.dataset.pw);
    const ok = await confirmDlg({ title: t('resetPw'), message: t('resetPwHint') + ' — ' + u.email, danger: false, icon: '🔑', okLabel: t('resetPw') });
    if (!ok) return;
    try { await auth.recover(u.email); toast(t('recoverySent')); }
    catch (err) { toast(err.message, 'error'); }
  });
  el.querySelectorAll('[data-act]').forEach(b => b.onclick = async () => {
    const u = rows.find(x => x.id === b.dataset.act);
    await db.update('profiles', u.id, { active: u.active === false });
    await loadCore(); toast(t('saved')); rerender();
  });
  el.querySelectorAll('[data-del]').forEach(b => b.onclick = async () => {
    const u = rows.find(x => x.id === b.dataset.del);
    if (u.role === 'admin' && !isAdmin()) { toast(t('cannotDeleteAdmin'), 'warning'); return; }
    const ok = await confirmDlg({ message: t('confirmDeleteUser') });
    if (!ok) return;
    try {
      await db.remove('profiles', u.id);
      await loadCore(); toast(t('deleted')); rerender();
    } catch (err) { toast(err.message, 'error'); }
  });
  return el;
}
