// Boot: session → profile → shell → routed pages.
import { auth, setLogoutHandler, userId, getSession, db } from './lib/supabase.js';
import { loadCore, store, me, on, isAdmin, isMgmt, isLeader } from './lib/store.js';
import { amTelesales } from './lib/telesales.js';
import { defineRoutes, setTarget, start, current, navigate } from './lib/router.js';
import { mountShell, updateShell } from './components/layout.js';
import { renderLogin } from './pages/login.js';
import { t } from './lib/i18n.js';
import { toast } from './lib/toast.js';
import { initUi } from './lib/ui.js';

import { pageDashboard } from './pages/dashboard.js';
import { pageListings } from './pages/listings.js';
import { pageClients } from './pages/clients.js';
import { pageDeals } from './pages/deals.js';
import { pageFollowups } from './pages/followups.js';
import { pageLeads } from './pages/leads.js';
import { pageVideos } from './pages/videos.js';
import { pageTelesales } from './pages/telesales.js';
import { pageMyApartments } from './pages/my-apartments.js';
import { pageListingForm } from './pages/listing-form.js';
import { pageListingDetail } from './pages/listing-detail.js';
import { pageSold } from './pages/sold.js';
import { pageArchive } from './pages/archive.js';
import { pageUsers } from './pages/users.js';
import { pageAgents } from './pages/agents.js';
import { pageTeams } from './pages/teams.js';
import { pageTeamDetail } from './pages/team-detail.js';
import { pageTasks } from './pages/tasks.js';
import { pageCalendar } from './pages/calendar.js';
import { pageAnalytics } from './pages/analytics.js';
import { pageSettings } from './pages/settings.js';

setLogoutHandler(() => location.reload());

async function ensureProfile() {
  if (store.profile) return true;
  // First login for a user created before the profile trigger existed.
  const sess = getSession();
  try {
    await db.create('profiles', { id: userId(), email: sess?.user?.email || null, name: sess?.user?.email || 'User' });
    await loadCore();
  } catch (_) { /* profile may exist but not be readable yet */ }
  return !!store.profile;
}

async function enterApp() {
  await loadCore();
  const ok = await ensureProfile();
  if (!ok) { toast(t('loginFailed'), 'error'); await auth.signOut(); location.reload(); return; }
  if (me().active === false) {
    toast(t('accountInactive'), 'error', 6000);
    await auth.signOut();
    setTimeout(() => location.reload(), 2500);
    return;
  }

  const view = mountShell();
  setTarget(view);

  defineRoutes([
    { path: 'dashboard', page: pageDashboard, nav: 'dashboard', title: 'navDashboard' },
    { path: 'properties', page: pageListings, nav: 'properties', title: 'navProperties' },
    { path: 'properties/new', page: (p) => pageListingForm({ id: 'new' }), nav: 'properties', title: 'addProperty' },
    { path: 'properties/:id', page: pageListingDetail, nav: 'properties', title: 'navProperties' },
    { path: 'properties/:id/edit', page: pageListingForm, nav: 'properties', title: 'editProperty' },
    { path: 'clients', page: pageClients, nav: 'clients', title: 'navClients' },
    { path: 'deals', page: pageDeals, nav: 'deals', title: 'navDeals' },
    { path: 'followups', page: pageFollowups, nav: 'followups', title: 'navFollowups' },
    { path: 'leads', page: pageLeads, nav: 'leads', title: 'leadTitle' },
    // Legacy path kept as a redirect so old bookmarks and links still resolve.
    { path: 'requests', page: async () => { navigate('leads'); return document.createElement('div'); },
      nav: 'leads', title: 'leadTitle' },
    { path: 'videos', page: pageVideos, nav: 'videos', title: 'vidTitle' },
    { path: 'my-apartments', page: pageMyApartments, nav: 'myapartments', title: 'tsMyTitle', guard: amTelesales },
    { path: 'telesales', page: pageTelesales, nav: 'telesales', title: 'tsTitle', guard: isMgmt },
    { path: 'sold', page: pageSold, nav: 'sold', title: 'navSold' },
    { path: 'archive', page: pageArchive, nav: 'archive', title: 'navArchive', guard: () => isMgmt() || isLeader() },
    { path: 'teams', page: pageTeams, nav: 'teams', title: 'navTeams', guard: isMgmt },
    { path: 'teams/:id', page: pageTeamDetail, nav: 'myteam', title: 'navTeams' },
    { path: 'tasks', page: pageTasks, nav: 'tasks', title: 'navTasks' },
    { path: 'calendar', page: pageCalendar, nav: 'calendar', title: 'navCalendar' },
    { path: 'agents', page: pageAgents, nav: 'agents', title: 'navAgents', guard: isMgmt },
    { path: 'users', page: pageUsers, nav: 'users', title: 'navUsers', guard: isAdmin },
    { path: 'analytics', page: pageAnalytics, nav: 'analytics', title: 'navAnalytics', guard: isMgmt },
    { path: 'settings', page: pageSettings, nav: 'settings', title: 'navSettings' },
  ], {
    notFound: { page: async () => { navigate('dashboard'); return document.createElement('div'); }, nav: 'dashboard', title: 'navDashboard' },
    beforeEach: (info) => {
      if (info.route?.guard && !info.route.guard()) return 'dashboard';
      return null;
    },
  });

  on(() => {
    const c = current();
    if (c?.route) updateShell(c.route.nav, c.route.title);
  });

  if (!location.hash || location.hash === '#/') location.hash = '#/dashboard';
  start();
}

async function boot() {
  const hasSession = await auth.restore();
  if (hasSession) {
    try { await enterApp(); return; }
    catch (err) { console.error(err); await auth.signOut(); }
  }
  renderLogin(enterApp);
}

// Debug handle for development tooling (harmless in production).
window.__rrp = { store, navigate };

initUi();
boot();
