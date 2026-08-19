// The public frame: header, desktop nav, mobile tab bar, compare tray, footer.
import { esc } from '../lib/format.js';
import { hrefFor, currentRoute, navigate } from '../lib/router.js';
import { favCount, compareCount, clearCompare, onChange } from '../lib/store.js';
import { MAX_COMPARE } from '../config.js';

const TABS = [
  { name: 'properties', ic: '🏛️', label: 'Properties' },
  { name: 'favorites', ic: '❤️', label: 'Favorites', count: favCount },
  { name: 'compare', ic: '⚖️', label: 'Compare', count: compareCount },
];

const pip = (n) => (n ? `<span class="c-count">${n}</span>` : '');

function navHtml(active) {
  return TABS.map(tb => `
    <a class="c-nav__link ${tb.name === active ? 'on' : ''}" href="${esc(hrefFor({ name: tb.name }))}"
       data-route="${tb.name}">
      <span aria-hidden="true">${tb.ic}</span>${tb.label}${pip(tb.count?.() || 0)}
    </a>`).join('');
}

function tabsHtml(active) {
  return TABS.map(tb => {
    const n = tb.count?.() || 0;
    return `<a class="c-tab ${tb.name === active ? 'on' : ''}" href="${esc(hrefFor({ name: tb.name }))}"
      data-route="${tb.name}" aria-current="${tb.name === active ? 'page' : 'false'}">
      <span class="c-tab__ic" aria-hidden="true">${tb.ic}${n ? `<span class="c-tab__pip">${n}</span>` : ''}</span>
      <span>${tb.label}</span>
    </a>`;
  }).join('');
}

export function mountShell() {
  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="c-shell">
      <header class="c-header">
        <a class="c-brand" href="${esc(hrefFor({ name: 'properties' }))}" data-route="properties" aria-label="Ring Roads — home">
          <img src="/assets/logo.svg" width="34" height="34" alt="">
          <span><span class="c-brand__name">Ring Roads</span><br><span class="c-brand__sub">REAL ESTATE</span></span>
        </a>
        <div class="c-header__spacer"></div>
        <nav class="c-nav" id="c-nav" aria-label="Main"></nav>
      </header>
      <main class="c-main" id="c-view"></main>
      <footer class="c-footer">
        © ${new Date().getFullYear()} Ring Roads Real Estate · Browse, save and compare properties — no account needed.
      </footer>
      <nav class="c-tabbar" id="c-tabbar" aria-label="Main"></nav>
    </div>
    <div id="c-tray"></div>`;
  paintNav();
  onChange(paintNav);
  return document.getElementById('c-view');
}

export function paintNav() {
  const active = currentRoute().name;
  const nav = document.getElementById('c-nav');
  const tabs = document.getElementById('c-tabbar');
  if (nav) nav.innerHTML = navHtml(active);
  if (tabs) tabs.innerHTML = tabsHtml(active);
  paintTray();
}

/** Floating "compare (n)" tray — hidden on the compare page itself. */
export function paintTray() {
  const root = document.getElementById('c-tray');
  if (!root) return;
  const n = compareCount();
  const route = currentRoute().name;
  if (!n || route === 'compare') { root.innerHTML = ''; return; }
  root.innerHTML = `
    <div class="c-tray">
      <div class="c-tray__txt">${n} selected<span>Up to ${MAX_COMPARE} properties</span></div>
      <button class="btn btn--ghost btn--sm" id="tray-clear">Clear</button>
      <button class="btn btn--primary btn--sm" id="tray-go">Compare</button>
    </div>`;
  root.querySelector('#tray-go').onclick = () => navigate({ name: 'compare' });
  root.querySelector('#tray-clear').onclick = () => clearCompare();
}
