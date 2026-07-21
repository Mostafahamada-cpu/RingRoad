// Deals pipeline — Kanban board across stages with quick move + create/edit.
import { t } from '../lib/i18n.js';
import { esc, money, compact, validateForm, rules } from '../lib/utils.js';
import { db, userId } from '../lib/supabase.js';
import { store, profileById, isMgmt, isLeader, myTeamId } from '../lib/store.js';
import { loadClients, loadDeals, loadFollowups, dealStageLabel, dealCommission } from '../lib/crm.js';
import { loadListings } from '../lib/listings.js';
import { openModal, confirmDlg } from '../components/modal.js';
import { field, selectField, readForm } from '../components/form.js';
import { statCard } from '../components/cards.js';
import { pagehead } from '../components/layout.js';
import { render as rerender } from '../lib/router.js';
import { toast } from '../lib/toast.js';
import { DEAL_STAGES, DEAL_STAGE_COLORS } from '../config.js';

function agentOptions() {
  return store.profiles.filter(p => ['agent', 'leader'].includes(p.role) && p.active !== false)
    .filter(p => isMgmt() ? true : isLeader() ? p.team_id === myTeamId() : p.id === userId())
    .map(p => ({ v: p.id, l: p.name || p.email }));
}

async function openDealForm(d, clients, props, onDone) {
  const isNew = !d;
  const { el, close } = openModal({
    title: isNew ? t('addDeal') : t('editDeal'), size: 'lg',
    body: `
      <form class="form-grid" novalidate>
        ${selectField({ label: t('linkedClient'), name: 'client_id', options: clients.map(c => ({ v: c.id, l: c.name })), value: d?.client_id, emptyLabel: t('none') })}
        ${selectField({ label: t('linkedProperty'), name: 'property_id', options: props.map(p => ({ v: p.id, l: p.title || p.code })), value: d?.property_id, emptyLabel: t('none') })}
        ${field({ label: t('dealValue') + ' (' + t('egp') + ')', name: 'value', type: 'number', value: d?.value, required: true, dir: 'ltr', min: 0 })}
        ${field({ label: t('commissionPct'), name: 'commission_pct', type: 'number', value: d?.commission_pct ?? 2.5, dir: 'ltr', step: 'any', min: 0 })}
        ${selectField({ label: t('dealStage'), name: 'stage', options: DEAL_STAGES.map(s => ({ v: s, l: dealStageLabel(s) })), value: d?.stage || 'lead' })}
        ${selectField({ label: t('agentInfo'), name: 'agent_id', options: agentOptions(), value: d?.agent_id || userId(), required: true })}
        <div class="modal__actions span-2">
          ${!isNew ? `<button type="button" class="btn btn--danger" data-del style="margin-inline-end:auto">🗑️ ${esc(t('del'))}</button>` : ''}
          <button type="button" class="btn btn--outline" data-x>${esc(t('cancel'))}</button>
          <button type="submit" class="btn btn--primary">${esc(t('save'))}</button>
        </div>
      </form>`,
  });
  const form = el.querySelector('form');
  el.querySelector('[data-x]').onclick = close;
  el.querySelector('[data-del]')?.addEventListener('click', async () => {
    if (!(await confirmDlg({ message: t('confirmDeleteDeal') }))) return;
    await db.remove('deals', d.id); close(); toast(t('deleted')); onDone();
  });
  form.onsubmit = async (e) => {
    e.preventDefault();
    if (!validateForm(form, { value: [rules.required, rules.numeric, rules.min(1)], agent_id: [rules.required] })) return;
    const dd = readForm(form);
    const agent = profileById(dd.agent_id);
    const row = {
      client_id: dd.client_id || null, property_id: dd.property_id || null,
      value: +dd.value, commission_pct: +dd.commission_pct || 0, stage: dd.stage,
      agent: agent?.name || null, agent_id: dd.agent_id, team_id: agent?.team_id || myTeamId() || null,
      closed_at: (dd.stage === 'won' || dd.stage === 'closed') ? (d?.closed_at || new Date().toISOString().slice(0, 10)) : null,
    };
    try {
      if (isNew) await db.create('deals', row); else await db.update('deals', d.id, row);
      close(); toast(t('saved')); onDone();
    } catch (err) { toast(err.message, 'error'); }
  };
}

export async function pageDeals() {
  const [deals, clients, props] = await Promise.all([loadDeals(), loadClients(), loadListings()]);
  const el = document.createElement('div');
  const won = deals.filter(d => d.stage === 'won' || d.stage === 'closed');
  const lost = deals.filter(d => d.stage === 'lost');
  const revenue = won.reduce((s, d) => s + (+d.value || 0), 0);
  const decided = won.length + lost.length;
  const conv = decided ? Math.round(100 * won.length / decided) : 0;

  async function moveDeal(deal, dir) {
    const idx = DEAL_STAGES.indexOf(deal.stage === 'closed' ? 'won' : deal.stage);
    const next = DEAL_STAGES[idx + dir];
    if (!next) return;
    const patch = { stage: next, closed_at: next === 'won' ? (deal.closed_at || new Date().toISOString().slice(0, 10)) : (next === 'lost' ? null : null) };
    try { await db.update('deals', deal.id, patch); rerender(); }
    catch (err) { toast(err.message, 'error'); }
  }

  const board = DEAL_STAGES.map(stg => {
    const col = deals.filter(d => (d.stage === 'closed' ? 'won' : d.stage) === stg);
    const sum = col.reduce((s, d) => s + (+d.value || 0), 0);
    return `
      <div class="kcol">
        <div class="kcol__head" style="border-top:3px solid ${DEAL_STAGE_COLORS[stg]}">
          <span>${esc(dealStageLabel(stg))}</span><span class="kcol__count">${col.length}</span>
        </div>
        <div class="kcol__sum">${sum ? esc(compact(sum)) + ' ' + esc(t('egp')) : '—'}</div>
        <div class="kcol__cards">
          ${col.map(d => {
            const c = profileById(d.agent_id);
            const cl = clients.find(x => x.id === d.client_id);
            const idx = DEAL_STAGES.indexOf(stg);
            return `
            <div class="kcard" style="border-inline-start-color:${DEAL_STAGE_COLORS[stg]}">
              <div class="kcard__name" data-edit="${d.id}">${esc(cl?.name || t('linkedClient'))}</div>
              <div class="kcard__sub">${esc(compact(d.value))} ${esc(t('egp'))} · ${esc(c?.name || '')}</div>
              <div class="kmove">
                <button data-mv="-1" data-id="${d.id}" ${idx === 0 ? 'disabled' : ''}>‹</button>
                <button data-mv="1" data-id="${d.id}" ${idx === DEAL_STAGES.length - 1 ? 'disabled' : ''}>›</button>
              </div>
            </div>`;
          }).join('') || `<div class="xs muted" style="padding:8px">—</div>`}
        </div>
      </div>`;
  }).join('');

  el.innerHTML = `
    ${pagehead(t('dealsTitle'), t('dealsSub'), `<button class="btn btn--primary" id="add">＋ ${esc(t('addDeal'))}</button>`)}
    <div class="grid grid--4 section">
      ${statCard({ icon: '🏆', value: won.length, label: t('dealsWon') })}
      ${statCard({ icon: '💔', value: lost.length, label: t('dealsLost'), tone: 'burg' })}
      ${statCard({ icon: '🎯', value: conv + '%', label: t('conversionRate') })}
      ${statCard({ icon: '💰', value: compact(revenue), label: t('revenue'), tone: 'burg' })}
    </div>
    <div class="kanban">${board}</div>`;

  el.querySelector('#add').onclick = () => openDealForm(null, clients, props, rerender);
  el.querySelectorAll('[data-edit]').forEach(b => b.onclick = () =>
    openDealForm(deals.find(d => d.id === b.dataset.edit), clients, props, rerender));
  el.querySelectorAll('[data-mv]').forEach(b => b.onclick = () =>
    moveDeal(deals.find(d => d.id === b.dataset.id), +b.dataset.mv));
  return el;
}
