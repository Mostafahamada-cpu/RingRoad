// The public frame: header, desktop nav (with the Properties mega-menu),
// mobile tab bar, compare tray, footer.
import { esc } from '../lib/format.js';
import { icon } from '../lib/icons.js';
import { hrefFor, currentRoute, navigate } from '../lib/router.js';
import { favCount, compareCount, clearCompare, onChange } from '../lib/store.js';
import { MAX_COMPARE } from '../config.js';
import { PURPOSE_META, purposeCounts } from '../lib/purpose.js';
import { all as allListings, isLoaded } from '../lib/catalog.js';

const TABS = [
  { name: 'properties', ic: 'building', label: 'Properties', mega: true },
  { name: 'favorites', ic: 'heart', label: 'Favorites', count: favCount },
  { name: 'compare', ic: 'scale', label: 'Compare', count: compareCount },
];

const pip = (n) => (n ? `<span class="c-count">${n}</span>` : '');

// ── Properties mega-menu ────────────────────────────────────────────────────
// Opens on hover AND on focus, so it is reachable by keyboard. Purely a
// shortcut: the Properties link itself always still navigates, which is what
// makes it safe on touch devices where hover does not exist.
function megaHtml() {
  const counts = isLoaded() ? purposeCounts(allListings()) : null;
  return `
    <div class="c-mega" id="c-mega" role="menu" aria-label="Browse by purpose">
      <div class="c-mega__grid">
        ${['primary', 'resale', 'rent'].map(p => {
          const m = PURPOSE_META[p];
          const n = counts ? counts[p] : null;
          return `
          <a class="c-mega__item" role="menuitem" href="${esc(hrefFor({ name: 'properties' }))}"
             data-route="properties" data-purpose="${p}">
            <span class="c-mega__ic">${icon(m.icon)}</span>
            <span class="c-mega__txt">
              <span class="c-mega__label">${esc(m.label)}${n != null ? `<span class="c-mega__n">${n}</span>` : ''}</span>
              <span class="c-mega__tag">${esc(m.tagline)}</span>
            </span>
            <span class="c-mega__go" aria-hidden="true">${icon('arrowRight')}</span>
          </a>`;
        }).join('')}
      </div>
      <div class="c-mega__foot">
        <a class="c-mega__all" href="${esc(hrefFor({ name: 'properties' }))}" data-route="properties" data-purpose="">
          Browse all properties ${icon('arrowRight', 'ic--sm')}
        </a>
      </div>
    </div>`;
}

function navHtml(active) {
  return TABS.map(tb => {
    const link = `
      <a class="c-nav__link ${tb.name === active ? 'on' : ''}" href="${esc(hrefFor({ name: tb.name }))}"
         data-route="${tb.name}" ${tb.mega ? 'aria-haspopup="true" aria-expanded="false"' : ''}>
        ${icon(tb.ic, 'c-nav__ic')}<span>${esc(tb.label)}</span>${pip(tb.count?.() || 0)}
        ${tb.mega ? icon('chevronDown', 'c-nav__caret') : ''}
      </a>`;
    return tb.mega
      ? `<div class="c-nav__group" data-mega>${link}${megaHtml()}</div>`
      : link;
  }).join('');
}

function tabsHtml(active) {
  return TABS.map(tb => {
    const n = tb.count?.() || 0;
    return `<a class="c-tab ${tb.name === active ? 'on' : ''}" href="${esc(hrefFor({ name: tb.name }))}"
      data-route="${tb.name}" aria-current="${tb.name === active ? 'page' : 'false'}">
      <span class="c-tab__ic">${icon(tb.ic)}${n ? `<span class="c-tab__pip">${n}</span>` : ''}</span>
      <span>${esc(tb.label)}</span>
    </a>`;
  }).join('');
}

export function mountShell() {
  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="c-shell">
      <header class="c-header">
        <a class="c-brand" href="${esc(hrefFor({ name: 'properties' }))}" data-route="properties" aria-label="Ring Roads — home">
          <img src="/assets/logo.svg" width="36" height="36" alt="">
          <span class="c-brand__txt">
            <span class="c-brand__name">Ring Roads</span>
            <span class="c-brand__sub">Real Estate</span>
          </span>
        </a>
        <div class="c-header__spacer"></div>
        <nav class="c-nav" id="c-nav" aria-label="Main"></nav>
      </header>
      <main class="c-main" id="c-view"></main>
      <footer class="c-footer">
        <div class="c-footer__in">
          <span class="c-footer__brand">Ring Roads Real Estate</span>
          <span class="c-footer__sep" aria-hidden="true"></span>
          <span>Browse, save and compare properties — no account needed.</span>
          <span class="c-footer__yr">© ${new Date().getFullYear()}</span>
        </div>
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
  if (nav) { nav.innerHTML = navHtml(active); wireMega(nav); }
  if (tabs) tabs.innerHTML = tabsHtml(active);
  paintTray();
}

/**
 * Hover/focus behaviour for the mega-menu. A short close delay lets the pointer
 * travel from the trigger into the panel without it snapping shut.
 */
function wireMega(nav) {
  const group = nav.querySelector('[data-mega]');
  if (!group) return;
  const trigger = group.querySelector('.c-nav__link');
  let closeTimer = null;

  const panel = group.querySelector('.c-mega');
  // `inert` (not `visibility`) is what keeps the closed panel out of the tab
  // order and away from assistive tech — the CSS only fades it.
  panel?.setAttribute('inert', '');

  const open = () => {
    clearTimeout(closeTimer);
    group.classList.add('is-open');
    trigger.setAttribute('aria-expanded', 'true');
    panel?.removeAttribute('inert');
  };
  const close = () => {
    group.classList.remove('is-open');
    trigger.setAttribute('aria-expanded', 'false');
    panel?.setAttribute('inert', '');
  };
  const closeSoon = () => { clearTimeout(closeTimer); closeTimer = setTimeout(close, 160); };

  group.addEventListener('mouseenter', open);
  group.addEventListener('mouseleave', closeSoon);
  group.addEventListener('focusin', open);
  group.addEventListener('focusout', (e) => {
    if (!group.contains(e.relatedTarget)) close();
  });
  group.addEventListener('keydown', (e) => { if (e.key === 'Escape') { close(); trigger.focus(); } });
  // Navigating away from the menu should not leave it hanging open.
  group.addEventListener('click', close);
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
      <span class="c-tray__ic">${icon('scale')}</span>
      <div class="c-tray__txt">${n} selected<span>Up to ${MAX_COMPARE} properties</span></div>
      <button class="btn btn--ghost btn--sm" id="tray-clear">Clear</button>
      <button class="btn btn--primary btn--sm" id="tray-go">Compare</button>
    </div>`;
  root.querySelector('#tray-go').onclick = () => navigate({ name: 'compare' });
  root.querySelector('#tray-clear').onclick = () => clearCompare();
}
