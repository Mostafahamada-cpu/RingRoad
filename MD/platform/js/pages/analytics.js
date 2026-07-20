// Org analytics: trends, comparisons, leaderboards, report exports.
import { t } from '../lib/i18n.js';
import { esc, compact, money, groupNum, monthsBack, monthKey, downloadCsv, openPrintReport, fmtDate } from '../lib/utils.js';
import { store, profileById, teamById } from '../lib/store.js';
import { loadListings, typeLabel } from '../lib/listings.js';
import { statCard } from '../components/cards.js';
import { barChart, lineChart, donut, hbars } from '../lib/charts.js';
import { pagehead } from '../components/layout.js';

export async function pageAnalytics() {
  const all = await loadListings();
  const sold = all.filter(l => l.status === 'sold');
  const soldVal = (rows) => rows.reduce((s, l) => s + (+l.sold_price || 0), 0);

  const mk = monthKey();
  const prev = (() => { const d = new Date(); d.setMonth(d.getMonth() - 1); return d.toISOString().slice(0, 7); })();
  const inMonth = (m) => sold.filter(l => (l.sold_date || '').slice(0, 7) === m);
  const thisM = soldVal(inMonth(mk)), lastM = soldVal(inMonth(prev));
  const growthPct = lastM ? Math.round(100 * (thisM - lastM) / lastM) : (thisM ? 100 : 0);

  const months = monthsBack(12);
  const revSeries = months.map(m => ({ label: m.label, value: soldVal(inMonth(m.key)), tip: m.label + ' — ' + money(soldVal(inMonth(m.key))) }));
  const cntSeries = months.map(m => ({ label: m.label, value: inMonth(m.key).length }));

  // quarterly (last 4 quarters)
  const qtr = [];
  const now = new Date();
  for (let i = 3; i >= 0; i--) {
    const qEnd = new Date(now.getFullYear(), now.getMonth() - i * 3, 1);
    const keys = [0, 1, 2].map(o => {
      const d = new Date(qEnd.getFullYear(), qEnd.getMonth() - o, 1);
      return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
    });
    qtr.push({ label: 'Q' + (Math.floor(qEnd.getMonth() / 3) + 1) + ' ' + String(qEnd.getFullYear()).slice(2), value: soldVal(sold.filter(l => keys.includes((l.sold_date || '').slice(0, 7)))) });
  }

  const statusItems = ['available', 'reserved', 'sold', 'archived']
    .map(s => ({ label: t(s), value: all.filter(l => l.status === s).length })).filter(i => i.value);

  const byTeam = store.teams.filter(x => !x.archived).map(tm => ({
    label: tm.name, value: soldVal(sold.filter(l => l.team_id === tm.id)),
  })).filter(i => i.value > 0).sort((a, b) => b.value - a.value).slice(0, 5);
  const byLeader = store.teams.filter(x => !x.archived && x.leader_id).map(tm => ({
    label: profileById(tm.leader_id)?.name || '—', value: soldVal(sold.filter(l => l.team_id === tm.id)),
  })).filter(i => i.value > 0).sort((a, b) => b.value - a.value).slice(0, 5);
  const byAgent = {};
  sold.forEach(l => {
    const p = profileById(l.agent_id); const k = p ? (p.name || p.email) : '—';
    byAgent[k] = (byAgent[k] || 0) + (+l.sold_price || 0);
  });
  const agentItems = Object.entries(byAgent).map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value).slice(0, 5);

  const el = document.createElement('div');
  el.innerHTML = `
    ${pagehead(t('analyticsTitle'), t('analyticsSub'), `
      <div class="row">
        <button class="btn btn--outline" id="csv">📊 ${esc(t('exportCsv'))}</button>
        <button class="btn btn--outline" id="pdf">📄 ${esc(t('exportPdf'))}</button>
      </div>`)}
    <div class="grid grid--4 section">
      ${statCard({ icon: '💰', value: compact(thisM), label: t('thisMonth') })}
      ${statCard({ icon: '🗓️', value: compact(lastM), label: t('lastMonth'), tone: 'burg' })}
      ${statCard({ icon: growthPct >= 0 ? '📈' : '📉', value: (growthPct >= 0 ? '+' : '') + growthPct + '%', label: t('growth') })}
      ${statCard({ icon: '🤝', value: sold.length, label: t('closedDeals'), tone: 'burg' })}
    </div>
    <div class="grid grid--2 section">
      <div class="card"><div class="card__head"><h3>💰 ${esc(t('revenueTrend'))}</h3></div>
        ${sold.length ? lineChart(revSeries) : `<div class="empty">${esc(t('noData'))}</div>`}</div>
      <div class="card"><div class="card__head"><h3>📊 ${esc(t('salesTrend'))}</h3></div>
        ${sold.length ? barChart(cntSeries) : `<div class="empty">${esc(t('noData'))}</div>`}</div>
    </div>
    <div class="grid grid--2 section">
      <div class="card"><div class="card__head"><h3>🗂️ ${esc(t('statusDist'))}</h3></div>
        ${statusItems.length ? donut(statusItems) : `<div class="empty">${esc(t('noData'))}</div>`}</div>
      <div class="card"><div class="card__head"><h3>📆 ${esc(t('quarterly'))}</h3></div>
        ${sold.length ? barChart(qtr) : `<div class="empty">${esc(t('noData'))}</div>`}</div>
    </div>
    <div class="grid grid--3 section">
      <div class="card"><div class="card__head"><h3>🥇 ${esc(t('topTeams'))}</h3></div>
        ${byTeam.length ? hbars(byTeam, i => compact(i.value)) : `<div class="empty">${esc(t('noData'))}</div>`}</div>
      <div class="card"><div class="card__head"><h3>👑 ${esc(t('topLeaders'))}</h3></div>
        ${byLeader.length ? hbars(byLeader, i => compact(i.value)) : `<div class="empty">${esc(t('noData'))}</div>`}</div>
      <div class="card"><div class="card__head"><h3>🏆 ${esc(t('topAgents'))}</h3></div>
        ${agentItems.length ? hbars(agentItems, i => compact(i.value)) : `<div class="empty">${esc(t('noData'))}</div>`}</div>
    </div>`;

  el.querySelector('#csv').onclick = () => {
    downloadCsv(
      [t('soldDate'), t('propertyTitle'), t('ptype'), t('city'), t('sellingPrice'), t('commission'), t('agentInfo'), t('team')],
      sold.map(l => [l.sold_date, l.title, typeLabel(l.ptype), l.city, l.sold_price, l.commission,
        profileById(l.agent_id)?.name || '', teamById(l.team_id)?.name || '']),
      'ringroads-analytics');
  };
  el.querySelector('#pdf').onclick = () => {
    openPrintReport(t('analyticsTitle'), `
      <table><thead><tr><th>${esc(t('soldDate'))}</th><th>${esc(t('propertyTitle'))}</th><th>${esc(t('sellingPrice'))}</th>
        <th>${esc(t('commission'))}</th><th>${esc(t('agentInfo'))}</th><th>${esc(t('team'))}</th></tr></thead>
      <tbody>${sold.map(l => `<tr><td>${esc(fmtDate(l.sold_date))}</td><td>${esc(l.title)}</td>
        <td>${esc(groupNum(l.sold_price))}</td><td>${esc(groupNum(l.commission))}</td>
        <td>${esc(profileById(l.agent_id)?.name || '')}</td><td>${esc(teamById(l.team_id)?.name || '')}</td></tr>`).join('')}</tbody>
      <tfoot><tr><td colspan="2">${esc(t('all'))} (${sold.length})</td><td>${esc(groupNum(soldVal(sold)))}</td>
        <td>${esc(groupNum(sold.reduce((s, l) => s + (+l.commission || 0), 0)))}</td><td></td><td></td></tr></tfoot></table>`);
  };
  return el;
}
