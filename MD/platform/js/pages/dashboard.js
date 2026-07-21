// Role-aware dashboard: Admin / Management (org) · Team Leader (team) · Agent (self).
// Data arrives already scoped by RLS; the role decides which panels to show.
import { t } from '../lib/i18n.js';
import { esc, compact, money, monthsBack, monthKey, initials, fmtDate } from '../lib/utils.js';
import { userId } from '../lib/supabase.js';
import { store, me, myRole, isAdmin, isMgmt, isLeader, myTeamId, profileById, teamById, agentsOf } from '../lib/store.js';
import { loadListings } from '../lib/listings.js';
import { loadClients, loadDeals, loadFollowups, isWon, isLost, isOpen, isActiveClient, isDueToday, dealStageLabel } from '../lib/crm.js';
import { statCard } from '../components/cards.js';
import { barChart, lineChart, donut, hbars } from '../lib/charts.js';
import { pagehead } from '../components/layout.js';
import { navigate } from '../lib/router.js';

const groupSum = (rows, keyFn, valFn) => {
  const m = new Map();
  rows.forEach(r => { const k = keyFn(r); if (k == null) return; m.set(k, (m.get(k) || 0) + valFn(r)); });
  return [...m.entries()].map(([key, value]) => ({ key, value })).sort((a, b) => b.value - a.value);
};

export async function pageDashboard() {
  const [props, clients, deals, fus] = await Promise.all([loadListings(), loadClients(), loadDeals(), loadFollowups()]);
  const role = myRole();

  const won = deals.filter(isWon), lost = deals.filter(isLost), open = deals.filter(isOpen);
  const revenue = won.reduce((s, d) => s + (+d.value || 0), 0);
  const decided = won.length + lost.length;
  const conv = decided ? Math.round(100 * won.length / decided) : 0;
  const activeClients = clients.filter(isActiveClient).length;
  const pendingFu = fus.filter(f => !f.done).length;
  const dueToday = fus.filter(isDueToday);
  const soldProps = props.filter(p => p.status === 'sold');

  const months = monthsBack(6);
  const revSeries = months.map(m => ({
    label: m.label,
    value: won.filter(d => (d.closed_at || '').slice(0, 7) === m.key).reduce((s, d) => s + (+d.value || 0), 0),
    tip: m.label + ' — ' + money(won.filter(d => (d.closed_at || '').slice(0, 7) === m.key).reduce((s, d) => s + (+d.value || 0), 0)),
  }));
  const stageItems = ['lead', 'contacted', 'visit', 'negotiation', 'reservation', 'won', 'lost']
    .map(s => ({ label: dealStageLabel(s), value: deals.filter(d => (d.stage === 'closed' ? 'won' : d.stage) === s).length }))
    .filter(i => i.value);

  const el = document.createElement('div');
  const sub = role === 'agent' ? me().name : role === 'leader' ? (teamById(myTeamId())?.name || t('dashSub')) : t('dashSub');

  // ---- shared chart panels ----
  const revenueChart = `<div class="card"><div class="card__head"><h3>💰 ${esc(t('monthlyRevenue'))}</h3></div>
    ${won.length ? barChart(revSeries) : `<div class="empty">${esc(t('noData'))}</div>`}</div>`;
  const pipelineChart = `<div class="card"><div class="card__head"><h3>📊 ${esc(t('pipeline'))}</h3></div>
    ${deals.length ? donut(stageItems) : `<div class="empty">${esc(t('noData'))}</div>`}</div>`;

  const dueTodayPanel = `
    <div class="card"><div class="card__head"><h3>📞 ${esc(t('fuDueToday'))}</h3>
      <button class="panel__more" data-go="followups" style="border:none;background:none;color:var(--orange-600);font-weight:700;cursor:pointer">${esc(t('view'))}</button></div>
      ${dueToday.length ? `<div class="col">${dueToday.slice(0, 5).map(f => {
        const c = clients.find(x => x.id === f.client_id);
        return `<div class="row row--between"><span class="small"><b>${esc(f.title)}</b>${c ? ' · ' + esc(c.name) : ''}</span>
          <span class="xs muted">${esc(new Date(f.due_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }))}</span></div>`;
      }).join('')}</div>` : `<div class="empty" style="padding:20px">${esc(t('noFollowups'))}</div>`}
    </div>`;

  if (isMgmt()) {
    // ---- Admin & Management ----
    const bestTeam = groupSum(won, d => d.team_id, d => +d.value || 0)[0];
    const bestAgent = groupSum(won, d => d.agent_id, d => +d.value || 0)[0];
    const teamRank = store.teams.filter(x => !x.archived).map(tm => ({
      label: tm.name, value: won.filter(d => d.team_id === tm.id).reduce((s, d) => s + (+d.value || 0), 0),
    })).sort((a, b) => b.value - a.value);
    const agentRank = groupSum(won, d => d.agent_id, d => +d.value || 0).slice(0, 5)
      .map(x => ({ label: profileById(x.key)?.name || '—', value: x.value }));
    const recent = [...deals].sort((a, b) => String(b.created_at).localeCompare(String(a.created_at))).slice(0, 6);

    const adminExtra = isAdmin() ? `
      ${statCard({ icon: '👥', value: store.profiles.length, label: t('totalUsers') })}
      ${statCard({ icon: '🛡️', value: store.teams.length, label: t('navTeams'), tone: 'burg' })}` : '';

    el.innerHTML = `
      ${pagehead(t('dashTitle'), isAdmin() ? t('systemOverview') : t('dashSub'))}
      <div class="grid grid--4 section">
        ${statCard({ icon: '🏛️', value: props.length, label: t('totalProperties') })}
        ${statCard({ icon: '🤝', value: soldProps.length, label: t('soldProperties'), tone: 'burg' })}
        ${statCard({ icon: '🏆', value: won.length, label: t('dealsWon') })}
        ${statCard({ icon: '💔', value: lost.length, label: t('dealsLost'), tone: 'burg' })}
        ${statCard({ icon: '🎯', value: conv + '%', label: t('conversionRate') })}
        ${statCard({ icon: '💰', value: compact(revenue), label: t('revenue'), tone: 'burg' })}
        ${statCard({ icon: '👤', value: activeClients, label: t('activeClientsK') })}
        ${statCard({ icon: '📞', value: pendingFu, label: t('pendingFu'), tone: 'burg' })}
        ${adminExtra}
      </div>
      <div class="grid grid--2 section">${revenueChart}${pipelineChart}</div>
      <div class="grid grid--2 section">
        <div class="card"><div class="card__head"><h3>🥇 ${esc(t('topTeams'))}</h3>
          ${bestTeam ? `<span class="badge badge--featured">${esc(t('bestTeam'))}: ${esc(teamById(bestTeam.key)?.name || '')}</span>` : ''}</div>
          ${teamRank.some(x => x.value) ? hbars(teamRank, i => compact(i.value)) : `<div class="empty">${esc(t('noData'))}</div>`}</div>
        <div class="card"><div class="card__head"><h3>🏆 ${esc(t('topAgents'))}</h3>
          ${bestAgent ? `<span class="badge badge--featured">${esc(t('bestAgent'))}: ${esc(profileById(bestAgent.key)?.name || '')}</span>` : ''}</div>
          ${agentRank.some(x => x.value) ? hbars(agentRank, i => compact(i.value)) : `<div class="empty">${esc(t('noData'))}</div>`}</div>
      </div>
      <div class="card section"><div class="card__head"><h3>🕑 ${esc(t('recentActivity'))}</h3></div>
        <div class="col">${recent.map(d => {
          const c = clients.find(x => x.id === d.client_id); const a = profileById(d.agent_id);
          return `<div class="row row--between" style="border-bottom:1px solid var(--line);padding-bottom:8px">
            <span class="small">📈 <b>${esc(c?.name || t('navDeals'))}</b> — ${esc(dealStageLabel(d.stage))} · <span class="money">${esc(compact(d.value))}</span></span>
            <span class="xs muted">${esc(a?.name || '')} · ${esc(fmtDate(d.created_at))}</span></div>`;
        }).join('') || `<div class="empty">${esc(t('noData'))}</div>`}</div>
      </div>`;
    wire(el);
    return el;
  }

  if (isLeader()) {
    // ---- Team Leader ----
    const team = teamById(myTeamId());
    const members = agentsOf(myTeamId()).filter(m => m.id !== userId() || true);
    const perAgent = agentsOf(myTeamId()).map(m => ({
      label: m.name || m.email,
      value: won.filter(d => d.agent_id === m.id).reduce((s, d) => s + (+d.value || 0), 0),
    })).sort((a, b) => b.value - a.value);

    el.innerHTML = `
      ${pagehead(team?.name || t('dashTitle'), t('teamDashboard'))}
      <div class="grid grid--4 section">
        ${statCard({ icon: '💼', value: agentsOf(myTeamId()).length, label: t('members') })}
        ${statCard({ icon: '📈', value: open.length, label: t('activeListings'), tone: 'burg' })}
        ${statCard({ icon: '🏆', value: won.length, label: t('closedDeals') })}
        ${statCard({ icon: '💰', value: compact(revenue), label: t('revenue'), tone: 'burg' })}
        ${statCard({ icon: '🎯', value: conv + '%', label: t('conversionRate') })}
        ${statCard({ icon: '👤', value: activeClients, label: t('activeClientsK'), tone: 'burg' })}
        ${statCard({ icon: '📞', value: dueToday.length, label: t('fuDueToday') })}
        ${statCard({ icon: '🏛️', value: props.length, label: t('totalProperties'), tone: 'burg' })}
      </div>
      <div class="grid grid--2 section">${revenueChart}
        <div class="card"><div class="card__head"><h3>🏆 ${esc(t('agentPerformance'))}</h3></div>
          ${perAgent.some(x => x.value) ? hbars(perAgent, i => compact(i.value)) : `<div class="empty">${esc(t('noData'))}</div>`}</div>
      </div>
      <div class="grid grid--2 section">${dueTodayPanel}${pipelineChart}</div>`;
    wire(el);
    return el;
  }

  // ---- Agent ----
  el.innerHTML = `
    ${pagehead(t('dashTitle'), sub)}
    <div class="grid grid--4 section">
      ${statCard({ icon: '👤', value: clients.length, label: t('navClients') })}
      ${statCard({ icon: '📈', value: open.length, label: t('pipeline'), tone: 'burg' })}
      ${statCard({ icon: '🏆', value: won.length, label: t('dealsWon') })}
      ${statCard({ icon: '💰', value: compact(revenue), label: t('revenue'), tone: 'burg' })}
      ${statCard({ icon: '🏛️', value: props.length, label: t('myListings') })}
      ${statCard({ icon: '🤝', value: soldProps.length, label: t('soldProperties'), tone: 'burg' })}
      ${statCard({ icon: '📞', value: dueToday.length, label: t('fuDueToday') })}
      ${statCard({ icon: '🎯', value: conv + '%', label: t('conversionRate'), tone: 'burg' })}
    </div>
    <div class="grid grid--2 section">${revenueChart}${pipelineChart}</div>
    <div class="section">${dueTodayPanel}</div>`;
  wire(el);
  return el;
}

function wire(el) {
  el.querySelectorAll('[data-go]').forEach(b => b.onclick = () => navigate(b.dataset.go));
}
