// Role-aware dashboard: admin/management see the org, leaders their team, agents themselves.
import { t } from '../lib/i18n.js';
import { esc, compact, monthsBack, monthKey, money } from '../lib/utils.js';
import { store, me, isMgmt, isLeader, myTeamId, profileById } from '../lib/store.js';
import { userId } from '../lib/supabase.js';
import { loadListings, typeLabel } from '../lib/listings.js';
import { statCard } from '../components/cards.js';
import { barChart, lineChart, donut, hbars } from '../lib/charts.js';
import { pagehead } from '../components/layout.js';
import { navigate } from '../lib/router.js';

export async function pageDashboard() {
  const all = await loadListings();
  const scope = isMgmt() ? all
    : isLeader() ? all.filter(l => l.team_id === myTeamId())
    : all.filter(l => l.agent_id === userId());

  const mk = monthKey();
  const sold = scope.filter(l => l.status === 'sold');
  const soldThisMonth = sold.filter(l => (l.sold_date || '').slice(0, 7) === mk);
  const revenue = soldThisMonth.reduce((s, l) => s + (+l.sold_price || 0), 0);
  const active = scope.filter(l => l.status === 'available' || l.status === 'reserved');
  const archived = scope.filter(l => l.status === 'archived');
  const agents = store.profiles.filter(p => p.role === 'agent' && p.active !== false);
  const pending = scope.filter(l => l.approval === 'pending' && l.status !== 'archived');

  const cards = [
    statCard({ icon: '🏛️', value: scope.length, label: t('totalProperties') }),
    statCard({ icon: '🤝', value: sold.length, label: t('soldProperties'), tone: 'burg' }),
    statCard({ icon: '✨', value: active.length, label: t('activeProps') }),
    statCard({ icon: '🗄️', value: archived.length, label: t('archivedProps'), tone: 'burg' }),
    ...(isMgmt() ? [
      statCard({ icon: '💼', value: agents.length, label: t('totalAgents') }),
      statCard({ icon: '👥', value: store.profiles.length, label: t('totalUsers'), tone: 'burg' }),
    ] : []),
    statCard({ icon: '📈', value: soldThisMonth.length, label: t('monthlySales') }),
    statCard({ icon: '💰', value: compact(revenue), label: t('revenue'), tone: 'burg' }),
  ];

  // charts data
  const months = monthsBack(6);
  const salesSeries = months.map(m => ({
    label: m.label,
    value: sold.filter(l => (l.sold_date || '').slice(0, 7) === m.key).reduce((s, l) => s + (+l.sold_price || 0), 0),
    tip: m.label + ' — ' + money(sold.filter(l => (l.sold_date || '').slice(0, 7) === m.key).reduce((s, l) => s + (+l.sold_price || 0), 0)),
  }));
  const growthSeries = months.map(m => ({
    label: m.label,
    value: scope.filter(l => (l.created_at || '').slice(0, 7) === m.key).length,
  }));
  const typeCounts = {};
  scope.forEach(l => { typeCounts[l.ptype] = (typeCounts[l.ptype] || 0) + 1; });
  const typeItems = Object.entries(typeCounts).sort((a, b) => b[1] - a[1]).slice(0, 4)
    .map(([k, v]) => ({ label: typeLabel(k), value: v }));
  const perf = {};
  sold.forEach(l => {
    const p = profileById(l.agent_id);
    const name = p ? (p.name || p.email) : '—';
    perf[name] = (perf[name] || 0) + (+l.sold_price || 0);
  });
  const perfItems = Object.entries(perf).sort((a, b) => b[1] - a[1]).slice(0, 5)
    .map(([label, value]) => ({ label, value }));

  const el = document.createElement('div');
  el.innerHTML = `
    ${pagehead(t('dashTitle'), t('dashSub'),
      pending.length && (isMgmt() || isLeader())
        ? `<button class="btn btn--secondary" id="go-pending">⏳ ${pending.length} ${esc(t('pendingApprovals'))}</button>` : '')}
    <div class="grid grid--4 section">${cards.join('')}</div>
    <div class="grid grid--2 section">
      <div class="card"><div class="card__head"><h3>📊 ${esc(t('salesChart'))}</h3></div>
        ${sold.length ? barChart(salesSeries) : `<div class="empty"><div class="empty__icon">📊</div>${esc(t('noData'))}</div>`}</div>
      <div class="card"><div class="card__head"><h3>🏷️ ${esc(t('propTypes'))}</h3></div>
        ${typeItems.length ? donut(typeItems) : `<div class="empty"><div class="empty__icon">🏷️</div>${esc(t('noData'))}</div>`}</div>
    </div>
    <div class="grid grid--2 section">
      <div class="card"><div class="card__head"><h3>📈 ${esc(t('monthlyGrowth'))}</h3><span class="xs muted">${esc(t('newListings'))}</span></div>
        ${scope.length ? lineChart(growthSeries) : `<div class="empty">${esc(t('noData'))}</div>`}</div>
      <div class="card"><div class="card__head"><h3>🏆 ${esc(t('agentPerformance'))}</h3></div>
        ${perfItems.length ? hbars(perfItems, i => compact(i.value)) : `<div class="empty">${esc(t('noData'))}</div>`}</div>
    </div>`;

  el.querySelector('#go-pending')?.addEventListener('click', () =>
    navigate(isLeader() ? 'teams/' + myTeamId() : 'properties'));
  return el;
}
