// Teams directory (admin/management): create, edit, archive, delete, assign leaders.
import { t } from '../lib/i18n.js';
import { esc, initials, compact, validateForm, rules } from '../lib/utils.js';
import { db, storage } from '../lib/supabase.js';
import { store, loadCore, profileById, agentsOf } from '../lib/store.js';
import { loadListings } from '../lib/listings.js';
import { openModal, confirmDlg } from '../components/modal.js';
import { field, selectField, textareaField, readForm } from '../components/form.js';
import { createUploader } from '../components/uploader.js';
import { pagehead } from '../components/layout.js';
import { navigate, render as rerender } from '../lib/router.js';
import { toast } from '../lib/toast.js';
import { TEAM_COLORS } from '../config.js';

export function openTeamForm(team, onDone) {
  const isNew = !team;
  const up = createUploader({ existing: team?.logo ? [team.logo] : [], single: true });
  const leaderOpts = store.profiles
    .filter(p => ['leader', 'agent'].includes(p.role) && p.active !== false)
    .map(p => ({ v: p.id, l: (p.name || p.email) + ' (' + t(p.role) + ')' }));
  const { el, close } = openModal({
    title: isNew ? t('addTeam') : t('editTeam'),
    size: 'lg',
    body: `
      <form class="form-grid" novalidate>
        ${field({ label: t('teamName'), name: 'name', value: team?.name, required: true })}
        ${selectField({ label: t('teamLeader'), name: 'leader_id', options: leaderOpts, value: team?.leader_id || '', emptyLabel: t('none') })}
        <div class="field span-2">
          <span class="field__label">${esc(t('teamColor'))}</span>
          <div class="row">
            ${TEAM_COLORS.map(c => `
              <label style="cursor:pointer"><input type="radio" name="color" value="${c}" ${(team?.color || TEAM_COLORS[0]) === c ? 'checked' : ''} hidden>
              <span class="swatch" data-c="${c}" style="display:inline-block;width:34px;height:34px;border-radius:10px;background:${c};border:3px solid ${(team?.color || TEAM_COLORS[0]) === c ? 'var(--ink)' : 'transparent'}"></span></label>`).join('')}
          </div>
        </div>
        ${textareaField({ label: t('teamDesc'), name: 'description', value: team?.description, rows: 3 })}
        ${field({ label: t('monthlyGoal') + ' (' + t('egp') + ')', name: 'monthly_goal', type: 'number', value: team?.monthly_goal, dir: 'ltr', min: 0 })}
        <div class="field"><span class="field__label">${esc(t('teamLogo'))}</span><div data-up></div></div>
        <div class="modal__actions span-2">
          <button type="button" class="btn btn--outline" data-x>${esc(t('cancel'))}</button>
          <button type="submit" class="btn btn--primary">${esc(t('save'))}</button>
        </div>
      </form>`,
  });
  el.querySelector('[data-up]').appendChild(up.el);
  el.querySelector('[data-x]').onclick = close;
  el.querySelectorAll('input[name="color"]').forEach(r => r.onchange = () => {
    el.querySelectorAll('.swatch').forEach(s => s.style.borderColor = s.dataset.c === r.value ? 'var(--ink)' : 'transparent');
  });
  const form = el.querySelector('form');
  form.onsubmit = async (e) => {
    e.preventDefault();
    if (!validateForm(form, { name: [rules.required], monthly_goal: [rules.numeric] })) return;
    const d = readForm(form);
    try {
      const id = team?.id || crypto.randomUUID();
      const logos = await up.commit('teams/' + id);
      const row = {
        name: d.name.trim(), description: d.description.trim() || null,
        color: d.color || TEAM_COLORS[0], leader_id: d.leader_id || null,
        monthly_goal: d.monthly_goal === '' ? null : +d.monthly_goal,
        logo: logos[0] || null,
      };
      if (isNew) await db.create('teams', { id, ...row });
      else await db.update('teams', team.id, row);
      // promote chosen leader's role + attach to team
      if (d.leader_id) await db.update('profiles', d.leader_id, { role: 'leader', team_id: id });
      close(); await loadCore(); toast(t('saved')); onDone();
    } catch (err) { toast(err.message, 'error'); }
  };
}

export async function pageTeams() {
  const listings = await loadListings();
  const el = document.createElement('div');
  const teams = store.teams;

  const cardsHtml = teams.map(tm => {
    const members = agentsOf(tm.id);
    const leader = profileById(tm.leader_id);
    const sold = listings.filter(l => l.team_id === tm.id && l.status === 'sold');
    const revenue = sold.reduce((s, l) => s + (+l.sold_price || 0), 0);
    return `
      <div class="card card--hover ${tm.archived ? '' : ''}" data-team="${esc(tm.id)}" style="cursor:pointer;${tm.archived ? 'opacity:.6' : ''}">
        <div class="row" style="margin-bottom:12px">
          <span class="avatar avatar--lg" style="background:${esc(tm.color || 'var(--burg-50)')}22;color:${esc(tm.color || 'var(--burg-700)')}">
            ${tm.logo ? `<img src="${esc(storage.publicUrl(tm.logo))}">` : esc(initials(tm.name))}
          </span>
          <div class="grow">
            <div class="row row--between">
              <b>${esc(tm.name)}</b>
              ${tm.archived ? `<span class="badge badge--archived">${esc(t('archived'))}</span>` : `<span class="badge badge--approved">${esc(t('active'))}</span>`}
            </div>
            <div class="xs muted truncate">${esc(tm.description || '')}</div>
            <div class="xs" style="font-weight:700;color:${esc(tm.color || 'var(--burg-700)')}">👑 ${esc(leader?.name || t('none'))}</div>
          </div>
        </div>
        <div class="grid grid--3" style="gap:8px">
          <div class="center"><div style="font-weight:800;color:var(--burg-700)">${members.length}</div><div class="xs muted">${esc(t('members'))}</div></div>
          <div class="center"><div style="font-weight:800;color:var(--burg-700)">${sold.length}</div><div class="xs muted">${esc(t('salesCount'))}</div></div>
          <div class="center"><div style="font-weight:800;color:var(--burg-700)">${compact(revenue)}</div><div class="xs muted">${esc(t('revenue'))}</div></div>
        </div>
        <div class="row" style="margin-top:14px;gap:8px" data-stop>
          <button class="btn btn--outline btn--sm" data-edit="${esc(tm.id)}">✏️ ${esc(t('edit'))}</button>
          <button class="btn btn--ghost btn--sm" data-arch="${esc(tm.id)}">${tm.archived ? '↩️ ' + esc(t('restoreTeam')) : '🗄️ ' + esc(t('archiveTeam'))}</button>
          <button class="btn btn--danger btn--sm" data-del="${esc(tm.id)}" style="margin-inline-start:auto">🗑️</button>
        </div>
      </div>`;
  }).join('');

  el.innerHTML = `
    ${pagehead(t('teamsTitle'), t('teamsSub'), `<button class="btn btn--primary" id="add">＋ ${esc(t('addTeam'))}</button>`)}
    ${teams.length ? `<div class="grid grid--3">${cardsHtml}</div>` : `<div class="empty"><div class="empty__icon">🛡️</div>${esc(t('noTeams'))}</div>`}`;

  el.querySelector('#add').onclick = () => openTeamForm(null, rerender);
  el.querySelectorAll('[data-team]').forEach(c => c.onclick = (e) => {
    if (e.target.closest('[data-stop]')) return;
    navigate('teams/' + c.dataset.team);
  });
  el.querySelectorAll('[data-edit]').forEach(b => b.onclick = () =>
    openTeamForm(teams.find(x => x.id === b.dataset.edit), rerender));
  el.querySelectorAll('[data-arch]').forEach(b => b.onclick = async () => {
    const tm = teams.find(x => x.id === b.dataset.arch);
    await db.update('teams', tm.id, { archived: !tm.archived });
    await loadCore(); toast(t('saved')); rerender();
  });
  el.querySelectorAll('[data-del]').forEach(b => b.onclick = async () => {
    const ok = await confirmDlg({ message: t('confirmDeleteTeam') });
    if (!ok) return;
    try { await db.remove('teams', b.dataset.del); await loadCore(); toast(t('deleted')); rerender(); }
    catch (err) { toast(err.message, 'error'); }
  });
  return el;
}
