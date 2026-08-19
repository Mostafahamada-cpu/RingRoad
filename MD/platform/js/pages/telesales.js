// Telesales Management — assign apartments to telesales employees, in bulk or
// one at a time. Management/admin only (guarded in main.js AND by the RPCs).
import { t } from '../lib/i18n.js';
import { esc, money, compact, initials, fmtDate, debounce } from '../lib/utils.js';
import { store, profileById } from '../lib/store.js';
import { loadListings, typeLabel } from '../lib/listings.js';
import {
  activeTelesales, telesalesOptions, isTelesales, isDistributable, assigneeName,
  assignTelesales, distributeApartments, describeDistribution,
} from '../lib/telesales.js';
import { statusBadge } from '../components/cards.js';
import { dataTable } from '../components/table.js';
import { confirmDlg } from '../components/modal.js';
import { pagehead } from '../components/layout.js';
import { render as rerender, navigate } from '../lib/router.js';
import { toast } from '../lib/toast.js';

const F = { q: '', who: 'all', status: 'all' };

export async function pageTelesales() {
  const all = (await loadListings()).filter(isDistributable);
  const team = activeTelesales();
  const el = document.createElement('div');

  const unassigned = all.filter(l => !l.assigned_telesales_id);
  const perAgent = new Map(team.map(p => [p.id, 0]));
  all.forEach(l => {
    if (l.assigned_telesales_id && perAgent.has(l.assigned_telesales_id)) {
      perAgent.set(l.assigned_telesales_id, perAgent.get(l.assigned_telesales_id) + 1);
    }
  });
  // apartments pointing at somebody who is no longer an active telesales user
  const orphaned = all.filter(l => l.assigned_telesales_id && !perAgent.has(l.assigned_telesales_id));

  function filtered() {
    const q = F.q.trim().toLowerCase();
    return all.filter(l => {
      if (F.who === 'unassigned' && l.assigned_telesales_id) return false;
      if (F.who !== 'all' && F.who !== 'unassigned' && l.assigned_telesales_id !== F.who) return false;
      if (F.status !== 'all' && l.status !== F.status) return false;
      if (q) {
        const hay = [l.code, l.title, l.city, l.project, assigneeName(l)].filter(Boolean).join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }

  async function doAssign(listing, telesalesId) {
    try {
      await assignTelesales(listing.id, telesalesId || null);
      toast(t('saved'));
      rerender();
    } catch (err) {
      toast(err.message, 'error', 5000);
    }
  }

  async function runDistribution(redistribute) {
    if (!team.length) { toast(t('tsNoTeam'), 'warning', 5000); return; }
    const count = redistribute ? all.length : unassigned.length;
    if (!count) { toast(t('tsNothingToAssign'), 'info'); return; }

    const ok = await confirmDlg({
      title: redistribute ? t('tsRedistribute') : t('tsDistribute'),
      icon: redistribute ? '♻️' : '📦',
      danger: !!redistribute,
      okLabel: redistribute ? t('tsRedistribute') : t('tsDistribute'),
      message: redistribute
        ? t('tsConfirmRedistribute').replace('{n}', count).replace('{t}', team.length)
        : t('tsConfirmDistribute').replace('{n}', count).replace('{t}', team.length),
    });
    if (!ok) return;

    const banner = el.querySelector('#ts-error');
    banner.hidden = true;
    try {
      const res = await distributeApartments(redistribute);
      toast(describeDistribution(res), 'success', 7000);
      rerender();
    } catch (err) {
      // A transient toast is too easy to miss for something this consequential,
      // so a failed distribution also stays on the page until the next attempt.
      toast(err.message, 'error', 8000);
      banner.hidden = false;
      banner.querySelector('[data-msg]').textContent = err.message;
      banner.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  el.innerHTML = `
    ${pagehead(t('tsTitle'), t('tsSub'), `
      <div class="row row--wrap">
        <button class="btn btn--outline" id="redistribute">♻️ ${esc(t('tsRedistribute'))}</button>
        <button class="btn btn--primary" id="distribute">📦 ${esc(t('tsDistribute'))}</button>
      </div>`)}

    <div class="card section" id="ts-error" hidden
         style="border-color:var(--danger);background:var(--danger-bg)">
      <div class="row" style="gap:10px;align-items:flex-start">
        <span style="font-size:20px">⛔</span>
        <div class="grow">
          <b>${esc(t('tsDistributeFailed'))}</b>
          <div class="small" data-msg style="margin-top:4px;word-break:break-word"></div>
        </div>
      </div>
    </div>

    <div class="grid grid--4 section">
      <div class="card"><div class="stat">
        <div class="stat__icon">🏛️</div>
        <div><div class="stat__val">${all.length}</div><div class="stat__label">${esc(t('tsWorkable'))}</div></div>
      </div></div>
      <div class="card"><div class="stat">
        <div class="stat__icon stat__icon--burg">📭</div>
        <div><div class="stat__val">${unassigned.length}</div><div class="stat__label">${esc(t('tsUnassigned'))}</div></div>
      </div></div>
      <div class="card"><div class="stat">
        <div class="stat__icon">👥</div>
        <div><div class="stat__val">${team.length}</div><div class="stat__label">${esc(t('tsActiveTeam'))}</div></div>
      </div></div>
      <div class="card"><div class="stat">
        <div class="stat__icon stat__icon--burg">⚖️</div>
        <div><div class="stat__val">${team.length ? Math.round(all.length / team.length) : 0}</div>
        <div class="stat__label">${esc(t('tsAvgEach'))}</div></div>
      </div></div>
    </div>

    ${!team.length ? `<div class="card section" style="border-color:var(--warn)">
      <div class="row" style="gap:10px"><span class="badge badge--pending">⚠️</span>
      <div><b>${esc(t('tsNoTeam'))}</b><div class="xs muted">${esc(t('tsNoTeamHint'))}</div></div>
      <button class="btn btn--outline btn--sm" id="go-users" style="margin-inline-start:auto">${esc(t('navUsers'))}</button></div>
    </div>` : ''}

    ${orphaned.length ? `<div class="card section" style="border-color:var(--warn)">
      <div class="row" style="gap:10px"><span class="badge badge--pending">⚠️</span>
      <div><b>${orphaned.length}</b> ${esc(t('tsOrphaned'))}</div></div>
    </div>` : ''}

    <div class="card section">
      <div class="card__head"><h3>👥 ${esc(t('tsWorkload'))}</h3></div>
      ${team.length ? `<div class="col" style="gap:2px">
        ${team.map((p, i) => {
          const n = perAgent.get(p.id) || 0;
          const max = Math.max(1, ...perAgent.values());
          return `
          <div class="rankrow">
            <span class="rankrow__n">${i + 1}</span>
            <span class="rankrow__name" title="${esc(p.email || '')}">
              ${esc(p.name || p.email)}
              ${!p.whatsapp ? `<span class="badge badge--pending" style="margin-inline-start:6px">${esc(t('tsNoWa'))}</span>` : ''}
            </span>
            <span class="rankrow__track"><span class="rankrow__fill" style="width:${Math.round(n / max * 100)}%"></span></span>
            <span class="rankrow__val">${n}</span>
          </div>`;
        }).join('')}
      </div>` : `<div class="xs muted">${esc(t('noData'))}</div>`}
    </div>

    <div class="card section" style="padding:16px">
      <div class="row row--wrap" style="gap:10px">
        <div class="searchbox grow" style="min-width:200px">
          <input class="input" id="q" placeholder="${esc(t('search'))}" value="${esc(F.q)}">
        </div>
        <select class="select" id="who" style="width:auto;padding:9px 12px">
          <option value="all">${esc(t('tsAllApartments'))}</option>
          <option value="unassigned" ${F.who === 'unassigned' ? 'selected' : ''}>📭 ${esc(t('tsUnassignedOnly'))}</option>
          ${telesalesOptions().map(o => `<option value="${esc(o.v)}" ${F.who === o.v ? 'selected' : ''}>${esc(o.l)}</option>`).join('')}
        </select>
        <select class="select" id="status" style="width:auto;padding:9px 12px">
          <option value="all">${esc(t('status'))}: ${esc(t('all'))}</option>
          ${['available', 'reserved'].map(s => `<option value="${s}" ${F.status === s ? 'selected' : ''}>${esc(t(s))}</option>`).join('')}
        </select>
      </div>
    </div>

    <div id="tbl"></div>`;

  el.querySelector('#distribute').onclick = () => runDistribution(false);
  el.querySelector('#redistribute').onclick = () => runDistribution(true);
  el.querySelector('#go-users')?.addEventListener('click', () => navigate('users'));

  const onFilter = debounce(() => paintTable(), 180);
  el.querySelector('#q').oninput = (e) => { F.q = e.target.value; onFilter(); };
  el.querySelector('#who').onchange = (e) => { F.who = e.target.value; paintTable(); };
  el.querySelector('#status').onchange = (e) => { F.status = e.target.value; paintTable(); };

  function paintTable() {
    const rows = filtered();
    const target = el.querySelector('#tbl');
    target.innerHTML = '';
    target.appendChild(dataTable({
      rows,
      exportName: 'telesales-assignments',
      emptyText: t('noResults'),
      searchable: null,
      columns: [
        { key: 'code', label: t('propertyId'), sortable: true,
          render: r => `<b dir="ltr">${esc(r.code || '—')}</b>` },
        { key: 'title', label: t('propertyTitle'), sortable: true,
          render: r => `<span class="cell-main">${esc(r.title || '—')}</span>
            <div class="xs muted">${esc([r.project, r.city].filter(Boolean).join(' · '))}</div>` },
        { key: 'ptype', label: t('ptype'), sortable: true, render: r => esc(typeLabel(r.ptype)) },
        { key: 'price', label: t('price'), sortable: true,
          render: r => `<b class="money">${esc(compact(r.price))}</b>`, csv: r => r.price },
        { key: 'status', label: t('status'), sortable: true,
          render: r => statusBadge(r.status), csv: r => t(r.status) },
        { key: 'assigned_at', label: t('tsAssignedAt'), sortable: true,
          render: r => `<span class="xs">${esc(r.assigned_at ? fmtDate(r.assigned_at) : '—')}</span>`,
          csv: r => r.assigned_at || '' },
        { key: 'assigned_telesales_id', label: t('tsAssignedTo'), sortable: true,
          sortVal: r => assigneeName(r) || '',
          csv: r => assigneeName(r) || '',
          render: r => `
            <select class="select" data-assign="${esc(r.id)}" style="min-width:170px;padding:7px 10px">
              <option value="">— ${esc(t('tsUnassigned'))} —</option>
              ${telesalesOptions().map(o => `
                <option value="${esc(o.v)}" ${r.assigned_telesales_id === o.v ? 'selected' : ''}>${esc(o.l)}</option>`).join('')}
              ${r.assigned_telesales_id && !telesalesOptions().some(o => o.v === r.assigned_telesales_id)
                ? `<option value="${esc(r.assigned_telesales_id)}" selected disabled>${esc(assigneeName(r))} (${esc(t('inactive'))})</option>`
                : ''}
            </select>` },
      ],
    }));

    target.querySelectorAll('[data-assign]').forEach(sel => {
      sel.onchange = () => {
        const row = rows.find(x => x.id === sel.dataset.assign);
        doAssign(row, sel.value || null);
      };
      // the select lives inside a clickable row — don't navigate when using it
      sel.onclick = (e) => e.stopPropagation();
    });
  }

  paintTable();
  return el;
}
