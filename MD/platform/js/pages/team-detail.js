// Team workspace: overview dashboard, members, approvals queue, performance & KPIs.
import { t } from '../lib/i18n.js';
import { esc, initials, compact, money, monthsBack, monthKey, validateForm, rules } from '../lib/utils.js';
import { db, storage, userId } from '../lib/supabase.js';
import { store, loadCore, profileById, agentsOf, isMgmt, isLeader, myTeamId } from '../lib/store.js';
import { loadListings, typeLabel } from '../lib/listings.js';
import { statCard, statusBadge } from '../components/cards.js';
import { barChart, lineChart, donut, hbars } from '../lib/charts.js';
import { openModal, confirmDlg } from '../components/modal.js';
import { selectField, field, readForm } from '../components/form.js';
import { pagehead } from '../components/layout.js';
import { navigate, render as rerender } from '../lib/router.js';
import { toast } from '../lib/toast.js';
import { openTeamForm } from './teams.js';

let activeTab = 'overview';

export async function pageTeamDetail(params) {
  const team = store.teams.find(x => x.id === params.id);
  if (!team) return `<div class="empty">${esc(t('noTeams'))}</div>`;
  // access: mgmt anywhere; leader/agent only their own team
  if (!isMgmt() && myTeamId() !== team.id) { navigate('dashboard'); return document.createElement('div'); }

  const listings = (await loadListings()).filter(l => l.team_id === team.id);
  const members = agentsOf(team.id);
  const leader = profileById(team.leader_id);
  const canLead = isMgmt() || (isLeader() && myTeamId() === team.id);
  const mk = monthKey();

  const sold = listings.filter(l => l.status === 'sold');
  const soldMonth = sold.filter(l => (l.sold_date || '').slice(0, 7) === mk);
  const revenue = soldMonth.reduce((s, l) => s + (+l.sold_price || 0), 0);
  const active = listings.filter(l => l.status === 'available' || l.status === 'reserved');
  const pending = listings.filter(l => l.approval === 'pending' && l.status !== 'archived');
  const conv = listings.length ? Math.round(100 * sold.length / listings.length) : 0;

  // team ranking by all-time sold value
  const allListings = await loadListings();
  const ranks = store.teams.filter(x => !x.archived).map(x => ({
    id: x.id,
    value: allListings.filter(l => l.team_id === x.id && l.status === 'sold').reduce((s, l) => s + (+l.sold_price || 0), 0),
  })).sort((a, b) => b.value - a.value);
  const myRank = ranks.findIndex(r => r.id === team.id) + 1;

  const el = document.createElement('div');
  const kpi = team.kpis || {};

  function tabOverview() {
    const months = monthsBack(6);
    const salesSeries = months.map(m => ({
      label: m.label,
      value: sold.filter(l => (l.sold_date || '').slice(0, 7) === m.key).reduce((s, l) => s + (+l.sold_price || 0), 0),
    }));
    const growth = months.map(m => ({ label: m.label, value: listings.filter(l => (l.created_at || '').slice(0, 7) === m.key).length }));
    const statusItems = ['available', 'reserved', 'sold', 'archived']
      .map(s => ({ label: t(s), value: listings.filter(l => l.status === s).length }))
      .filter(i => i.value);
    const goalPct = team.monthly_goal ? Math.min(100, Math.round(100 * revenue / team.monthly_goal)) : null;
    return `
      <div class="grid grid--4 section">
        ${statCard({ icon: '💼', value: members.length, label: t('totalAgents') })}
        ${statCard({ icon: '✨', value: active.length, label: t('activeListings') })}
        ${statCard({ icon: '🤝', value: sold.length, label: t('soldProperties'), tone: 'burg' })}
        ${statCard({ icon: '🗄️', value: listings.filter(l => l.status === 'archived').length, label: t('archivedProps') })}
        ${statCard({ icon: '⏳', value: pending.length, label: t('pendingApprovals'), tone: 'burg' })}
        ${statCard({ icon: '📈', value: soldMonth.length, label: t('monthlySales') })}
        ${statCard({ icon: '💰', value: compact(revenue), label: t('revenue'), tone: 'burg' })}
        ${statCard({ icon: '🏆', value: myRank ? '#' + myRank : '—', label: t('teamRanking') })}
      </div>
      ${goalPct != null ? `
        <div class="card section">
          <div class="row row--between"><h3>🎯 ${esc(t('monthlyGoal'))}</h3>
            <b class="money">${esc(compact(revenue))} / ${esc(compact(team.monthly_goal))}</b></div>
          <div class="rankrow__track" style="margin-top:12px;height:12px"><span class="rankrow__fill" style="width:${goalPct}%"></span></div>
          <div class="xs muted" style="margin-top:6px">${goalPct}% · ${esc(t('conversionRate'))}: <b>${conv}%</b></div>
        </div>` : ''}
      <div class="grid grid--2 section">
        <div class="card"><div class="card__head"><h3>📊 ${esc(t('salesByMonth'))}</h3></div>
          ${sold.length ? barChart(salesSeries) : `<div class="empty">${esc(t('noData'))}</div>`}</div>
        <div class="card"><div class="card__head"><h3>🏷️ ${esc(t('statusDist'))}</h3></div>
          ${statusItems.length ? donut(statusItems) : `<div class="empty">${esc(t('noData'))}</div>`}</div>
      </div>
      <div class="grid grid--2 section">
        <div class="card"><div class="card__head"><h3>📈 ${esc(t('listingGrowth'))}</h3></div>
          ${listings.length ? lineChart(growth) : `<div class="empty">${esc(t('noData'))}</div>`}</div>
        <div class="card"><div class="card__head"><h3>🏆 ${esc(t('agentPerformance'))}</h3></div>
          ${memberPerfItems().length ? hbars(memberPerfItems(), i => compact(i.value)) : `<div class="empty">${esc(t('noData'))}</div>`}</div>
      </div>`;
  }

  function memberPerfItems() {
    return members.map(m => ({
      label: m.name || m.email,
      value: sold.filter(l => l.agent_id === m.id).reduce((s, l) => s + (+l.sold_price || 0), 0),
    })).sort((a, b) => b.value - a.value).slice(0, 6);
  }

  function tabMembers() {
    return `
      ${canLead ? `<div class="row" style="justify-content:flex-end;margin-bottom:14px">
        <button class="btn btn--primary btn--sm" data-add-member>＋ ${esc(t('addMember'))}</button></div>` : ''}
      <div class="grid grid--2">
        ${members.map(m => {
          const mine = listings.filter(l => l.agent_id === m.id);
          const msold = mine.filter(l => l.status === 'sold');
          return `
          <div class="card">
            <div class="row">
              <span class="avatar">${m.photo ? `<img src="${esc(storage.publicUrl(m.photo))}">` : esc(initials(m.name || m.email))}</span>
              <div class="grow">
                <div class="row row--between"><b>${esc(m.name || m.email)}</b>
                  ${m.id === team.leader_id ? '<span class="badge badge--featured">👑 ' + esc(t('leader')) + '</span>' : `<span class="badge badge--role">${esc(t(m.role))}</span>`}
                </div>
                <div class="xs muted" dir="ltr">${esc(m.phone || m.email || '')}</div>
              </div>
            </div>
            <div class="grid grid--3" style="gap:8px;margin-top:12px">
              <div class="center"><div style="font-weight:800;color:var(--burg-700)">${mine.filter(l => ['available', 'reserved'].includes(l.status)).length}</div><div class="xs muted">${esc(t('activeListings'))}</div></div>
              <div class="center"><div style="font-weight:800;color:var(--burg-700)">${msold.length}</div><div class="xs muted">${esc(t('closedDeals'))}</div></div>
              <div class="center"><div style="font-weight:800;color:var(--burg-700)">${compact(msold.reduce((s, l) => s + (+l.sold_price || 0), 0))}</div><div class="xs muted">${esc(t('revenue'))}</div></div>
            </div>
            ${canLead && m.id !== team.leader_id ? `
              <div class="row" style="margin-top:12px;gap:8px">
                <button class="btn btn--outline btn--sm" data-assign="${m.id}">🏛️ ${esc(t('assignAgent'))}</button>
                <button class="btn btn--danger btn--sm" data-remove="${m.id}" style="margin-inline-start:auto">✕ ${esc(t('removeMember'))}</button>
              </div>` : ''}
          </div>`;
        }).join('') || `<div class="empty">${esc(t('noData'))}</div>`}
      </div>`;
  }

  function tabApprovals() {
    if (!pending.length) return `<div class="empty"><div class="empty__icon">🎉</div>${esc(t('noPending'))}</div>`;
    return `<div class="col">
      ${pending.map(l => `
        <div class="card row row--wrap" style="gap:14px">
          <div class="grow" style="cursor:pointer" data-open="${l.id}">
            <b>${esc(l.title)}</b> · <span class="money">${esc(money(l.price))}</span>
            <div class="xs muted">${esc(typeLabel(l.ptype))} · ${esc(l.city || '')} · ${esc(t('submittedBy'))}: ${esc(profileById(l.agent_id)?.name || '—')}</div>
          </div>
          ${canLead ? `
            <button class="btn btn--primary btn--sm" data-approve="${l.id}">✓ ${esc(t('approve'))}</button>
            <button class="btn btn--danger btn--sm" data-reject="${l.id}">✕ ${esc(t('reject'))}</button>` : ''}
        </div>`).join('')}
    </div>`;
  }

  function tabPerformance() {
    return `
      <div class="grid grid--4 section">
        ${statCard({ icon: '🤝', value: sold.length, label: t('closedDeals') })}
        ${statCard({ icon: '💰', value: compact(sold.reduce((s, l) => s + (+l.sold_price || 0), 0)), label: t('revenue'), tone: 'burg' })}
        ${statCard({ icon: '🎯', value: conv + '%', label: t('conversionRate') })}
        ${statCard({ icon: '✨', value: compact(sold.reduce((s, l) => s + (+l.commission || 0), 0)), label: t('totalCommission'), tone: 'burg' })}
      </div>
      <div class="grid grid--2">
        <div class="card"><div class="card__head"><h3>🏆 ${esc(t('memberProductivity'))}</h3></div>
          ${memberPerfItems().length ? hbars(memberPerfItems(), i => compact(i.value)) : `<div class="empty">${esc(t('noData'))}</div>`}</div>
        <div class="card">
          <div class="card__head"><h3>📌 ${esc(t('kpis'))}</h3>${canLead ? `<button class="btn btn--outline btn--sm" data-kpi>✏️ ${esc(t('edit'))}</button>` : ''}</div>
          <div class="col" style="gap:10px">
            <div class="row row--between small"><span class="muted">${esc(t('avgResponse'))}</span><b>${esc(kpi.response ?? '—')}</b></div>
            <div class="row row--between small"><span class="muted">${esc(t('satisfaction'))}</span><b>${esc(kpi.satisfaction ?? '—')}</b></div>
            <div class="row row--between small"><span class="muted">${esc(t('leadConversion'))}</span><b>${esc(kpi.lead_conversion ?? '—')}</b></div>
            <div class="row row--between small"><span class="muted">${esc(t('monthlyGoal'))}</span><b class="money">${team.monthly_goal ? esc(money(team.monthly_goal)) : '—'}</b></div>
          </div>
        </div>
      </div>`;
  }

  function renderTabs() {
    const body = { overview: tabOverview, members: tabMembers, approvals: tabApprovals, performance: tabPerformance }[activeTab]();
    el.querySelector('#tab-body').innerHTML = body;
    wireTabBody();
  }

  el.innerHTML = `
    ${pagehead(team.name, team.description || t('teamDashboard'), `
      <div class="row">
        ${isMgmt() ? `<button class="btn btn--outline" id="t-edit">✏️ ${esc(t('editTeam'))}</button>` : ''}
        ${leader ? `<span class="badge badge--featured" style="padding:8px 14px">👑 ${esc(leader.name || leader.email)}</span>` : ''}
      </div>`)}
    <div class="tabs section" id="tabs">
      <button data-tab="overview" class="${activeTab === 'overview' ? 'on' : ''}">📊 ${esc(t('overview'))}</button>
      <button data-tab="members" class="${activeTab === 'members' ? 'on' : ''}">👥 ${esc(t('members'))} (${members.length})</button>
      <button data-tab="approvals" class="${activeTab === 'approvals' ? 'on' : ''}">⏳ ${esc(t('approvalsQueue'))} (${pending.length})</button>
      <button data-tab="performance" class="${activeTab === 'performance' ? 'on' : ''}">🏆 ${esc(t('teamPerformance'))}</button>
    </div>
    <div id="tab-body"></div>`;

  el.querySelector('#t-edit')?.addEventListener('click', () => openTeamForm(team, rerender));
  el.querySelectorAll('#tabs [data-tab]').forEach(b => b.onclick = () => {
    activeTab = b.dataset.tab;
    el.querySelectorAll('#tabs button').forEach(x => x.classList.toggle('on', x === b));
    renderTabs();
  });

  function wireTabBody() {
    const body = el.querySelector('#tab-body');
    body.querySelector('[data-add-member]')?.addEventListener('click', () => {
      const free = store.profiles.filter(p => p.role === 'agent' && p.team_id !== team.id && p.active !== false);
      const { el: m, close } = openModal({
        title: t('addMember'), size: 'sm',
        body: `<form>${selectField({ label: t('agent'), name: 'pid', options: free.map(p => ({ v: p.id, l: (p.name || p.email) + (p.team_id ? ' — ' + (store.teams.find(x => x.id === p.team_id)?.name || '') : '') })), required: true, span2: true })}
          <div class="modal__actions"><button type="button" class="btn btn--outline" data-x>${esc(t('cancel'))}</button>
          <button class="btn btn--primary">${esc(t('add'))}</button></div></form>`,
      });
      m.querySelector('[data-x]').onclick = close;
      m.querySelector('form').onsubmit = async (e) => {
        e.preventDefault();
        const pid = m.querySelector('[name="pid"]').value;
        if (!pid) return;
        await db.update('profiles', pid, { team_id: team.id });
        close(); await loadCore(); toast(t('saved')); rerender();
      };
    });
    body.querySelectorAll('[data-remove]').forEach(b => b.onclick = async () => {
      const ok = await confirmDlg({ message: t('removeMember') + '?', icon: '👥' });
      if (!ok) return;
      await db.update('profiles', b.dataset.remove, { team_id: null });
      await loadCore(); toast(t('saved')); rerender();
    });
    body.querySelectorAll('[data-assign]').forEach(b => b.onclick = () => {
      const assignable = listings.filter(l => l.status !== 'sold' && l.status !== 'archived');
      const { el: m, close } = openModal({
        title: t('assignAgent'), size: 'sm',
        body: `<form>${selectField({ label: t('navProperties'), name: 'lid', options: assignable.map(l => ({ v: l.id, l: l.title })), required: true, span2: true })}
          <div class="modal__actions"><button type="button" class="btn btn--outline" data-x>${esc(t('cancel'))}</button>
          <button class="btn btn--primary">${esc(t('confirm'))}</button></div></form>`,
      });
      m.querySelector('[data-x]').onclick = close;
      m.querySelector('form').onsubmit = async (e) => {
        e.preventDefault();
        const lid = m.querySelector('[name="lid"]').value;
        if (!lid) return;
        await db.update('properties', lid, { agent_id: b.dataset.assign, team_id: team.id });
        close(); toast(t('saved')); rerender();
      };
    });
    body.querySelectorAll('[data-open]').forEach(d => d.onclick = () => navigate('properties/' + d.dataset.open));
    body.querySelectorAll('[data-approve]').forEach(b => b.onclick = async () => {
      await db.update('properties', b.dataset.approve, { approval: 'approved' });
      toast(t('saved')); rerender();
    });
    body.querySelectorAll('[data-reject]').forEach(b => b.onclick = async () => {
      await db.update('properties', b.dataset.reject, { approval: 'rejected' });
      toast(t('saved'), 'warning'); rerender();
    });
    body.querySelector('[data-kpi]')?.addEventListener('click', () => {
      const { el: m, close } = openModal({
        title: t('kpis'),
        body: `<form class="form-grid">
          ${field({ label: t('avgResponse'), name: 'response', type: 'number', value: kpi.response, dir: 'ltr', step: 'any' })}
          ${field({ label: t('satisfaction'), name: 'satisfaction', type: 'number', value: kpi.satisfaction, dir: 'ltr', min: 0, max: 100 })}
          ${field({ label: t('leadConversion'), name: 'lead_conversion', type: 'number', value: kpi.lead_conversion, dir: 'ltr', min: 0, max: 100 })}
          ${field({ label: t('monthlyGoal'), name: 'monthly_goal', type: 'number', value: team.monthly_goal, dir: 'ltr', min: 0 })}
          <div class="modal__actions span-2"><button type="button" class="btn btn--outline" data-x>${esc(t('cancel'))}</button>
          <button class="btn btn--primary">${esc(t('save'))}</button></div></form>`,
      });
      m.querySelector('[data-x]').onclick = close;
      m.querySelector('form').onsubmit = async (e) => {
        e.preventDefault();
        const d = readForm(m.querySelector('form'));
        const clean = (v) => v === '' ? null : +v;
        await db.update('teams', team.id, {
          kpis: { response: clean(d.response), satisfaction: clean(d.satisfaction), lead_conversion: clean(d.lead_conversion) },
          monthly_goal: clean(d.monthly_goal),
        });
        close(); await loadCore(); toast(t('saved')); rerender();
      };
    });
  }

  renderTabs();
  return el;
}
