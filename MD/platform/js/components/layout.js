// App frame: sidebar (role-filtered), glass topbar, profile menu, mobile drawer.
import { t, lang, setLang } from '../lib/i18n.js';
import { esc, initials } from '../lib/utils.js';
import { me, myRole, isAdmin, isMgmt, isLeader, myTeamId } from '../lib/store.js';
import { amTelesales } from '../lib/telesales.js';
import { auth } from '../lib/supabase.js';
import { storage } from '../lib/supabase.js';
import { navigate } from '../lib/router.js';
import { logoSvg } from './logo.js';

let viewEl = null;

function navModel() {
  // Management/Admin → all teams. Leader → own team only. Agent → no team nav
  // (agents must not view other agents' data / manage teams).
  const teamNav = isMgmt()
    ? [{ id: 'teams', ic: '🛡️', label: 'navTeams', path: 'teams' }]
    : (isLeader() && myTeamId())
      ? [{ id: 'myteam', ic: '🛡️', label: 'navMyTeam', path: 'teams/' + myTeamId() }]
      : [];
  return [
    { label: 'secWorkspace', items: [
      { id: 'dashboard', ic: '📊', label: 'navDashboard', path: 'dashboard' },
      { id: 'properties', ic: '🏛️', label: 'navProperties', path: 'properties' },
      { id: 'clients', ic: '👤', label: 'navClients', path: 'clients' },
      { id: 'deals', ic: '📈', label: 'navDeals', path: 'deals' },
      { id: 'followups', ic: '📞', label: 'navFollowups', path: 'followups' },
      ...(amTelesales() ? [{ id: 'myapartments', ic: '📇', label: 'tsMyTitle', path: 'my-apartments' }] : []),
      { id: 'leads', ic: '📩', label: 'navLeads', path: 'leads' },
      { id: 'videos', ic: '🎬', label: 'navVideos', path: 'videos' },
      { id: 'sold', ic: '🤝', label: 'navSold', path: 'sold' },
      ...(isMgmt() || isLeader() ? [{ id: 'archive', ic: '🗄️', label: 'navArchive', path: 'archive' }] : []),
    ]},
    { label: 'secTeamMod', items: [
      ...teamNav,
      { id: 'tasks', ic: '✅', label: 'navTasks', path: 'tasks' },
      { id: 'calendar', ic: '🗓️', label: 'navCalendar', path: 'calendar' },
    ]},
    { label: 'secAdmin', items: [
      ...(isMgmt() ? [{ id: 'telesales', ic: '📞', label: 'tsTitle', path: 'telesales' }] : []),
      ...(isMgmt() ? [{ id: 'agents', ic: '💼', label: 'navAgents', path: 'agents' }] : []),
      ...(isAdmin() ? [{ id: 'users', ic: '👥', label: 'navUsers', path: 'users' }] : []),
      ...(isMgmt() ? [{ id: 'analytics', ic: '📈', label: 'navAnalytics', path: 'analytics' }] : []),
      { id: 'settings', ic: '⚙️', label: 'navSettings', path: 'settings' },
    ]},
  ];
}

export function mountShell() {
  const app = document.getElementById('app');
  const p = me();
  const photo = p?.photo ? `<img src="${esc(storage.publicUrl(p.photo))}" alt="">` : esc(initials(p?.name || p?.email));
  app.innerHTML = `
    <div class="frame">
      <div class="scrim" id="scrim"></div>
      <aside class="sidebar" id="sidebar">
        <div class="sidebar__brand">
          ${logoSvg(40)}
          <div><div class="name">${esc(t('brand'))}</div><div class="sub">${esc(t('brandSub'))}</div></div>
        </div>
        <nav class="sidebar__nav" id="sidenav"></nav>
        <div class="sidebar__foot">
          <button class="navlink" id="nav-signout"><span class="ic">🚪</span>${esc(t('signOut'))}</button>
        </div>
      </aside>
      <div class="main">
        <header class="topbar">
          <button class="iconbtn hamb" id="hamb" aria-label="menu">☰</button>
          <div class="topbar__title" id="topbar-title"></div>
          <div class="topbar__spacer"></div>
          <button class="iconbtn langbtn" id="lang-toggle">${lang() === 'en' ? 'ع' : 'EN'}</button>
          <div class="menu-anchor">
            <button class="profilebtn" id="profile-btn">
              <span class="avatar">${photo}</span>
              <span class="who"><span class="n">${esc(p?.name || p?.email || '')}</span><br><span class="r">${esc(t(myRole()))}</span></span>
            </button>
            <div class="menu" id="profile-menu" hidden>
              <button data-go="settings">⚙️ ${esc(t('navSettings'))}</button>
              <hr>
              <button id="menu-signout">🚪 ${esc(t('signOut'))}</button>
            </div>
          </div>
        </header>
        <main class="content" id="view"></main>
      </div>
    </div>`;

  viewEl = document.getElementById('view');
  renderNav();

  const sidebar = document.getElementById('sidebar');
  const scrim = document.getElementById('scrim');
  document.getElementById('hamb').onclick = () => { sidebar.classList.add('open'); scrim.classList.add('show'); };
  scrim.onclick = () => { sidebar.classList.remove('open'); scrim.classList.remove('show'); };
  document.getElementById('lang-toggle').onclick = () => {
    setLang(lang() === 'en' ? 'ar' : 'en');
    location.reload();
  };
  const pm = document.getElementById('profile-menu');
  document.getElementById('profile-btn').onclick = (e) => { e.stopPropagation(); pm.hidden = !pm.hidden; };
  document.addEventListener('click', () => { pm.hidden = true; });
  pm.querySelector('[data-go]').onclick = () => navigate('settings');
  const signout = async () => { await auth.signOut(); location.reload(); };
  document.getElementById('menu-signout').onclick = signout;
  document.getElementById('nav-signout').onclick = signout;
  return viewEl;
}

function renderNav() {
  const nav = document.getElementById('sidenav');
  nav.innerHTML = navModel().map(sec => sec.items.length ? `
    <div class="navsec">
      <div class="navsec__label">${esc(t(sec.label))}</div>
      ${sec.items.map(it => `
        <button class="navlink" data-nav="${it.id}" data-path="${esc(it.path)}">
          <span class="ic">${it.ic}</span>${esc(t(it.label))}
        </button>`).join('')}
    </div>` : '').join('');
  nav.querySelectorAll('[data-path]').forEach(btn => {
    btn.onclick = () => {
      document.getElementById('sidebar').classList.remove('open');
      document.getElementById('scrim').classList.remove('show');
      navigate(btn.dataset.path);
    };
  });
}

export function updateShell(activeId, titleKey) {
  const titleEl = document.getElementById('topbar-title');
  if (titleEl && titleKey) titleEl.textContent = t(titleKey);
  document.querySelectorAll('#sidenav .navlink').forEach(b =>
    b.classList.toggle('on', b.dataset.nav === activeId));
}

export function pagehead(title, sub, actionsHtml = '') {
  return `
    <div class="pagehead">
      <div><h1>${esc(title)}</h1><div class="pagehead__sub">${esc(sub || '')}</div></div>
      <div class="pagehead__actions">${actionsHtml}</div>
    </div>`;
}
