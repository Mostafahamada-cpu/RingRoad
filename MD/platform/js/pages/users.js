// User management (admin): create, edit, roles, activate/deactivate, reset password.
import { t } from '../lib/i18n.js';
import { esc, initials, fmtDate, validateForm, rules } from '../lib/utils.js';
import { db, auth, storage } from '../lib/supabase.js';
import { store, teamById, isAdmin } from '../lib/store.js';
import { loadCore } from '../lib/store.js';
import { dataTable } from '../components/table.js';
import { openModal, confirmDlg } from '../components/modal.js';
import { field, selectField, passwordField, readForm } from '../components/form.js';
import { pagehead } from '../components/layout.js';
import { render as rerender } from '../lib/router.js';
import { toast } from '../lib/toast.js';
import { ROLES } from '../config.js';

const ROLE_DESC = { admin: 'roleAdminDesc', management: 'roleMgmtDesc', leader: 'roleLeaderDesc', agent: 'roleAgentDesc' };
const ROLE_ICON = { admin: '👑', management: '📊', leader: '🛡️', agent: '💼' };
const teamOpts = () => store.teams.filter(tm => !tm.archived).map(tm => ({ v: tm.id, l: tm.name }));

function openUserForm(p, onDone) {
  const isNew = !p;
  const curRole = p?.role || 'agent';
  const roleCards = ROLES.map(r => `
    <label class="rolecard ${curRole === r ? 'on' : ''}" data-rolecard="${r}">
      <input type="radio" name="role" value="${r}" ${curRole === r ? 'checked' : ''} hidden>
      <span class="rolecard__ic">${ROLE_ICON[r]}</span>
      <span class="rolecard__tx"><b>${esc(t(r))}</b><span class="xs muted">${esc(t(ROLE_DESC[r]))}</span></span>
    </label>`).join('');
  const { el, close } = openModal({
    title: isNew ? t('addUser') : t('editUser'), size: 'lg',
    body: `
      <style>
        .rolegrid { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
        .rolecard { display:flex; gap:10px; align-items:flex-start; border:1.5px solid var(--line-strong); border-radius:var(--r-md); padding:12px; cursor:pointer; transition:all .15s ease; }
        .rolecard:hover { border-color:var(--orange-400); }
        .rolecard.on { border-color:var(--orange-500); background:var(--orange-50); box-shadow:0 0 0 3px var(--orange-50); }
        .rolecard__ic { font-size:20px; } .rolecard__tx { display:flex; flex-direction:column; gap:2px; line-height:1.3; }
        @media (max-width:560px){ .rolegrid { grid-template-columns:1fr; } }
      </style>
      <form class="form-grid" novalidate>
        <div class="field span-2"><span class="field__label">${esc(t('selectRole'))} <span class="req">*</span></span>
          <div class="rolegrid">${roleCards}</div></div>
        ${field({ label: t('name'), name: 'name', value: p?.name, required: true })}
        ${field({ label: t('nationality'), name: 'nationality', value: p?.nationality })}
        ${field({ label: t('email'), name: 'email', type: 'email', value: p?.email, required: isNew, dir: 'ltr' })}
        ${field({ label: t('phone'), name: 'phone', type: 'tel', value: p?.phone, dir: 'ltr' })}
        ${isNew ? passwordField({ label: t('tempPassword'), name: 'password', required: true, hint: '≥ 8', autocomplete: 'new-password' }) : field({ label: t('rating') + ' (0-5)', name: 'performance_rating', type: 'number', value: p?.performance_rating ?? 0, min: 0, max: 5, step: '0.5', dir: 'ltr' })}
        <div class="field ${isNew ? '' : 'span-2'}" data-teamwrap>
          <span class="field__label">${esc(t('assignTeam'))}</span>
          <select class="select" name="team_id"><option value="">${esc(t('unassigned'))}</option>
            ${teamOpts().map(o => `<option value="${esc(o.v)}" ${p?.team_id === o.v ? 'selected' : ''}>${esc(o.l)}</option>`).join('')}</select>
          <div class="field__hint" data-reports></div>
        </div>
        ${isNew ? field({ label: t('rating') + ' (0-5)', name: 'performance_rating', type: 'number', value: 0, min: 0, max: 5, step: '0.5', dir: 'ltr' }) : ''}
        <div class="modal__actions span-2">
          <button type="button" class="btn btn--outline" data-x>${esc(t('cancel'))}</button>
          <button type="submit" class="btn btn--primary">${esc(t('save'))}</button>
        </div>
      </form>`,
  });
  const form = el.querySelector('form');
  if (!isNew) form.email.disabled = true;
  el.querySelector('[data-x]').onclick = close;

  const teamWrap = el.querySelector('[data-teamwrap]');
  const teamSel = form.querySelector('[name="team_id"]');
  const reports = el.querySelector('[data-reports]');
  const syncRole = () => {
    const role = form.querySelector('[name="role"]:checked').value;
    el.querySelectorAll('[data-rolecard]').forEach(c => c.classList.toggle('on', c.dataset.rolecard === role));
    // team needed for leader & agent; hidden for admin/management
    teamWrap.style.display = (role === 'leader' || role === 'agent') ? '' : 'none';
    syncReports(role);
  };
  const syncReports = (role) => {
    if (role !== 'agent') { reports.textContent = ''; return; }
    const tm = teamById(teamSel.value);
    const leader = tm ? store.profiles.find(x => x.id === tm.leader_id) : null;
    reports.textContent = leader ? `${t('reportsTo')}: ${leader.name || leader.email}` : '';
  };
  el.querySelectorAll('[data-rolecard]').forEach(c => c.onclick = () => { c.querySelector('input').checked = true; syncRole(); });
  teamSel.onchange = () => syncReports(form.querySelector('[name="role"]:checked').value);
  syncRole();

  form.onsubmit = async (e) => {
    e.preventDefault();
    const spec = { name: [rules.required], performance_rating: [rules.numeric, rules.min(0), rules.max(5)] };
    if (isNew) { spec.email = [rules.required, rules.email]; spec.password = [rules.required, rules.minLen(8)]; }
    if (!validateForm(form, spec)) return;
    const d = readForm(form);
    const role = d.role;
    const patch = {
      name: d.name.trim(), phone: d.phone.trim() || null, nationality: d.nationality.trim() || null,
      role, team_id: (role === 'leader' || role === 'agent') ? (d.team_id || null) : null,
      performance_rating: +d.performance_rating || 0,
    };
    try {
      if (isNew) {
        const res = await auth.signUpDetached(d.email.trim(), d.password);
        const newId = res.user?.id || res.id;
        if (!newId) throw new Error('signup failed');
        await db.update('profiles', newId, { ...patch, email: d.email.trim() })
          .catch(() => db.create('profiles', { id: newId, email: d.email.trim(), ...patch }));
        // if this new user is a leader, set them as the team's leader
        if (role === 'leader' && patch.team_id) await db.update('teams', patch.team_id, { leader_id: newId }).catch(() => {});
        toast(t('userCreated'));
      } else {
        await db.update('profiles', p.id, patch);
        if (role === 'leader' && patch.team_id) await db.update('teams', patch.team_id, { leader_id: p.id }).catch(() => {});
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
