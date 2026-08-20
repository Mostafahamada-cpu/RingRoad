// Ring Roads — public client view entry point.
//
// Boot order: mount the frame → decide the URL style → render the route.
// There is deliberately no auth step: a visitor never signs in, and the app
// never asks for one.
import { initRouter, start, onRoute, currentRoute } from './lib/router.js';
import { mountShell, paintNav } from './components/shell.js';
import { onChange } from './lib/store.js';
import { bindCardActions, refreshCardStates } from './components/card.js';
import { emptyState } from './lib/ui.js';
import { setPurpose } from './components/filters.js';
import { pageProperties } from './pages/properties.js';
import { pageVideos } from './pages/videos.js';
import { pageProperty } from './pages/property.js';
import { pageFavorites } from './pages/favorites.js';
import { pageCompare } from './pages/compare.js';

const BASE_TITLE = 'Ring Roads — Properties';
const BASE_DESC = 'Browse apartments, villas and compounds for sale and rent with Ring Roads.';
const TITLES = {
  properties: BASE_TITLE,
  videos: 'Ring Roads — Videos',
  favorites: 'Ring Roads — Saved properties',
  compare: 'Ring Roads — Compare properties',
};

let view = null;
let token = 0;   // guards against a slow page resolving after a newer navigation

async function render(route) {
  const mine = ++token;
  paintNav();
  window.scrollTo(0, 0);

  if (route.name !== 'property') {
    document.title = TITLES[route.name] || BASE_TITLE;
    document.querySelector('meta[name="description"]')?.setAttribute('content', BASE_DESC);
  }

  try {
    if (route.name === 'property') await pageProperty(view, route.code);
    else if (route.name === 'videos') await pageVideos(view);
    else if (route.name === 'favorites') await pageFavorites(view);
    else if (route.name === 'compare') await pageCompare(view);
    else await pageProperties(view);
  } catch (err) {
    console.error(err);
    if (mine === token) view.innerHTML = emptyState({ icon: 'alert', title: 'Something went wrong', text: err.message });
  }
  if (mine !== token) return;   // a newer route already painted
  refreshCardStates(view);
}

function boot() {
  // The URL style has to be settled before anything renders a link.
  initRouter();
  view = mountShell();

  // One delegated handler covers every favorite / compare button the app will
  // ever render.
  bindCardActions(view);

  // The Properties mega-menu and the quick-filter purpose pills both navigate
  // AND pre-set the purpose filter. Registered before router.start() so it runs
  // ahead of the router's own link handler and the page paints already filtered.
  document.addEventListener('click', (e) => {
    const el = e.target.closest?.('[data-purpose]');
    if (!el || !el.matches('a[data-route]')) return;
    setPurpose(el.dataset.purpose || '');
  });

  // Favorites/compare changes repaint the nav counters, the buttons on screen
  // and any page that lists saved items.
  onChange(() => {
    refreshCardStates(view);
    view.dispatchEvent(new CustomEvent('rr:staterefresh'));
  });

  onRoute(render);
  start();
}

// Debug handle — harmless in production, handy when tuning the public site.
window.__rrc = { route: currentRoute };

boot();
