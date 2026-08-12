// Attendance — personal clock in/out + today's summary, and (for leaders /
// management / admin) a team-attendance section on the same page.
// Backed by public.attendance via lib/attendance.js; RLS enforces visibility.
import { t, lang } from '../lib/i18n.js';
import { esc, initials } from '../lib/utils.js';
import { userId, storage } from '../lib/supabase.js';
import { me, isLeader, isMgmt, myTeamId, agentsOf, profileById, store } from '../lib/store.js';
import { pagehead } from '../components/layout.js';
import { toast } from '../lib/toast.js';
import {
  myTodayRecord, clockIn, clockOut, loadTodayScoped,
  workedMinutes, fmtHM, stateOf,
} from '../lib/attendance.js';

const loc = () => (lang() === 'ar' ? 'ar-EG' : 'en-US');
const fmtClock = (d = new Date()) => d.toLocaleTimeString(loc(), { hour: '2-digit', minute: '2-digit' });
const fmtClockS = (d = new Date()) => d.toLocaleTimeString(loc(), { hour: '2-digit', minute: '2-digit', second: '2-digit' });
const fmtLongDate = (d = new Date()) => d.toLocaleDateString(loc(), { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
const timeOf = (iso) => (iso ? fmtClock(new Date(iso)) : '--');

export async function pageAttendance() {
  const el = document.createElement('div');
  let rec = await myTodayRecord();

  el.innerHTML = `${pagehead(t('attendanceTitle'), t('attendanceSub'))}
    <div class="grid grid--2 section attn-layout">
      <div id="attn-clock"></div>
      <div id="attn-side"></div>
    </div>
    <div id="attn-team" class="section"></div>`;

  const clockBox = el.querySelector('#attn-clock');
  const sideBox = el.querySelector('#attn-side');
  const teamBox = el.querySelector('#attn-team');

  function paint() {
    clockBox.innerHTML = clockCard(rec);
    sideBox.innerHTML = summaryCard(rec) + timelineCard(rec);
    wire();
  }

  function wire() {
    const btn = clockBox.querySelector('[data-punch]');
    if (!btn) return;
    btn.onclick = async () => {
      const st = stateOf(rec);
      if (st === 'completed') return;
      btn.disabled = true;
      btn.dataset.loading = '1';
      btn.innerHTML = `<span class="attn-spin"></span> ${esc(t('loading'))}`;
      try {
        if (st === 'none') { rec = await clockIn(); toast(t('attnInSuccess'), 'success'); }
        else { rec = await clockOut(rec); toast(t('attnOutSuccess'), 'success'); }
        paint();
        renderTeam();
      } catch (err) {
        // Unique-violation → someone/another tab already clocked in today: reload state.
        const msg = String(err.message || '');
        if (/duplicate|unique|conflict/i.test(msg)) { rec = await myTodayRecord(); toast(t('attnAlready'), 'warning'); paint(); }
        else { toast(t('attnErr'), 'error'); btn.disabled = false; delete btn.dataset.loading; paint(); }
      }
    };
  }

  async function renderTeam() {
    if (!(isLeader() || isMgmt())) { teamBox.innerHTML = ''; return; }
    teamBox.innerHTML = `<div class="card"><div class="card__head"><h3>👥 ${esc(t('attnTeam'))}</h3></div>
      <div class="skel skel-block" style="height:120px"></div></div>`;
    try {
      const rows = await loadTodayScoped();
      const byUser = new Map(rows.map(r => [r.user_id, r]));
      // Which people to list: leader → own team; mgmt/admin → all active staff.
      const people = (isMgmt()
        ? store.profiles.filter(p => p.active !== false)
        : agentsOf(myTeamId()))
        .filter(p => p.id !== userId())
        .sort((a, b) => String(a.name || a.email).localeCompare(String(b.name || b.email)));
      teamBox.innerHTML = teamCard(people, byUser);
    } catch (_) {
      teamBox.innerHTML = `<div class="card"><div class="empty">${esc(t('noData'))}</div></div>`;
    }
  }

  paint();
  renderTeam();
  startTicker(el, () => rec);
  return el;
}

// ---- clock card (the hero) -------------------------------------------------
function clockCard(rec) {
  const st = stateOf(rec);
  const p = me();
  const photo = p?.photo ? `<img src="${esc(storage.publicUrl(p.photo))}" alt="">` : esc(initials(p?.name || p?.email));

  let btn, statusLine;
  if (st === 'none') {
    btn = `<button class="btn btn--lg btn--block attn-punch attn-punch--in" data-punch>👆 ${esc(t('attnClockIn'))}</button>`;
    statusLine = t('attnNotIn');
  } else if (st === 'working') {
    btn = `<button class="btn btn--lg btn--block attn-punch attn-punch--out" data-punch>✋ ${esc(t('attnClockOut'))}</button>`;
    statusLine = t('attnWorkingNow');
  } else {
    btn = `<button class="btn btn--lg btn--block attn-punch attn-punch--done" data-punch disabled>✓ ${esc(t('attnTimeMarked'))}</button>`;
    statusLine = t('attnDone');
  }

  return `<div class="card attn-hero">
    <div class="attn-hero__top">
      <span class="avatar avatar--lg">${photo}</span>
      <div class="attn-hero__who">
        <div class="attn-hero__name">${esc(p?.name || p?.email || '')}</div>
        <div class="attn-hero__role xs muted">${esc(t(p?.role || 'agent'))}</div>
      </div>
    </div>
    <div class="attn-hero__clock">
      <div class="attn-time" data-clock>${esc(fmtClock())}</div>
      <div class="attn-date" data-date>${esc(fmtLongDate())}</div>
    </div>
    <div class="attn-status attn-status--${st}" data-statusline>${esc(statusLine)}</div>
    ${btn}
  </div>`;
}

// ---- today's summary (clock in / out / hours) ------------------------------
function summaryCard(rec) {
  const st = stateOf(rec);
  const mins = workedMinutes(rec?.clock_in, rec?.clock_out);
  const cell = (label, value, accent) => `
    <div class="attn-sum__cell">
      <div class="attn-sum__label">${esc(label)}</div>
      <div class="attn-sum__val ${accent ? 'attn-sum__val--accent' : ''}" ${accent ? 'data-hours' : ''}>${esc(value)}</div>
    </div>`;
  return `<div class="card"><div class="card__head"><h3>🗒️ ${esc(t('attnTodaySummary'))}</h3></div>
    <div class="attn-sum">
      ${cell(t('attnClockInLbl'), timeOf(rec?.clock_in))}
      ${cell(t('attnClockOutLbl'), timeOf(rec?.clock_out))}
      ${cell(t('attnWorkingHours'), st === 'none' ? '--' : fmtHM(mins), true)}
    </div>
  </div>`;
}

// ---- today's timeline ------------------------------------------------------
function timelineCard(rec) {
  const st = stateOf(rec);
  const items = [];
  if (rec?.clock_in) items.push({ ic: '🟢', txt: t('attnClockedInAt') + ' ' + timeOf(rec.clock_in), tone: 'in' });
  if (rec?.clock_out) items.push({ ic: '🔴', txt: t('attnClockedOutAt') + ' ' + timeOf(rec.clock_out), tone: 'out' });
  const body = items.length
    ? `<div class="attn-tl">${items.map(i => `<div class="attn-tl__row attn-tl__row--${i.tone}"><span class="attn-tl__dot">${i.ic}</span><span>${esc(i.txt)}</span></div>`).join('')}</div>`
    : `<div class="empty" style="padding:20px">${esc(t('attnNotIn'))}</div>`;
  return `<div class="card" style="margin-top:var(--s4)"><div class="card__head"><h3>🕓 ${esc(t('attnTimeline'))}</h3></div>${body}</div>`;
}

// ---- team attendance table -------------------------------------------------
function teamCard(people, byUser) {
  if (!people.length) return `<div class="card"><div class="card__head"><h3>👥 ${esc(t('attnTeam'))}</h3></div>
    <div class="empty" style="padding:20px">${esc(t('noData'))}</div></div>`;
  const rows = people.map(p => {
    const r = byUser.get(p.id);
    const st = stateOf(r);
    const badge = st === 'completed' ? `<span class="badge badge--approved">${esc(t('completed'))}</span>`
      : st === 'working' ? `<span class="badge badge--pending">${esc(t('attnWorking'))}</span>`
      : `<span class="badge badge--muted">${esc(t('attnAbsent'))}</span>`;
    const photo = p.photo ? `<img src="${esc(storage.publicUrl(p.photo))}" alt="">` : esc(initials(p.name || p.email));
    const mins = workedMinutes(r?.clock_in, r?.clock_out);
    return `<tr>
      <td><div class="row"><span class="avatar avatar--sm">${photo}</span><span class="truncate">${esc(p.name || p.email)}</span></div></td>
      <td class="mono">${esc(timeOf(r?.clock_in))}</td>
      <td class="mono">${esc(timeOf(r?.clock_out))}</td>
      <td class="mono">${st === 'none' ? '--' : esc(fmtHM(mins))}</td>
      <td>${badge}</td>
    </tr>`;
  }).join('');
  return `<div class="card card--flush">
    <div class="card__head" style="padding:var(--s4) var(--s4) 0"><h3>👥 ${esc(t('attnTeam'))}</h3></div>
    <div class="tablewrap"><table class="table attn-team">
      <thead><tr><th>${esc(t('name'))}</th><th>${esc(t('attnClockInLbl'))}</th><th>${esc(t('attnClockOutLbl'))}</th><th>${esc(t('attnWorkingHours'))}</th><th>${esc(t('status'))}</th></tr></thead>
      <tbody>${rows}</tbody>
    </table></div>
  </div>`;
}

// Live 1s ticker: updates the clock + the running working-hours; self-stops on unmount.
function startTicker(el, getRec) {
  const tick = () => {
    if (!document.body.contains(el)) return;
    const now = new Date();
    const c = el.querySelector('[data-clock]'); if (c) c.textContent = fmtClock(now);
    const d = el.querySelector('[data-date]'); if (d) d.textContent = fmtLongDate(now);
    const rec = getRec();
    if (rec && rec.clock_in && !rec.clock_out) {
      const h = el.querySelector('[data-hours]');
      if (h) h.textContent = fmtHM(workedMinutes(rec.clock_in, null));
    }
    setTimeout(tick, 1000);
  };
  setTimeout(tick, 1000);
}
