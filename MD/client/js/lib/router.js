// Tiny router with two interchangeable URL styles.
//
//   path mode  →  /property/RR-1024      (the deployed site; ../vercel.json
//                                         rewrites these paths to index.html)
//   hash mode  →  /client/#/property/RR-1024
//
// The mode is decided once, from how the page was actually opened, so a shared
// link ALWAYS reopens the exact property no matter how the app is hosted: with
// the rewrites in place visitors get clean paths, and without them (opened
// straight at /client/) everything still works through the hash.
import { SITE_BASE } from '../config.js';

// Directory this app is served from — derived from the module URL, so it stays
// correct even when the document URL is a rewritten /property/... path.
export const APP_DIR = new URL('../../', import.meta.url).pathname;   // e.g. /client/

const ROUTES = ['properties', 'favorites', 'compare', 'property'];

let mode = 'hash';
let listeners = [];

function stripBase(pathname) {
  const base = SITE_BASE.replace(/\/$/, '');
  return base && pathname.startsWith(base) ? pathname.slice(base.length) : pathname;
}

function parsePath(pathname) {
  const parts = stripBase(pathname).split('/').filter(Boolean);
  if (!parts.length) return null;
  if (!ROUTES.includes(parts[0])) return null;
  if (parts[0] === 'property') {
    return parts[1] ? { name: 'property', code: decodeURIComponent(parts[1]) } : null;
  }
  return parts.length === 1 ? { name: parts[0] } : null;
}

/** Decides path vs hash mode from the entry URL. Call once, before start(). */
export function initRouter() {
  const hash = location.hash || '';
  if (hash.startsWith('#/')) mode = 'hash';
  else if (parsePath(location.pathname)) mode = 'path';
  else mode = 'hash';
  return mode;
}

export const routeMode = () => mode;

/** The route the browser is currently showing. Defaults to the properties list. */
export function currentRoute() {
  const hash = (location.hash || '').replace(/^#/, '');
  if (hash.startsWith('/')) return parsePath(hash) || { name: 'properties' };
  return parsePath(location.pathname) || { name: 'properties' };
}

function pathFor(route) {
  if (route.name === 'property') return '/property/' + encodeURIComponent(route.code);
  return '/' + route.name;
}

/** Absolute, shareable URL for a route — the link that goes out to clients. */
export function urlFor(route) {
  const p = pathFor(route);
  return mode === 'path'
    ? location.origin + SITE_BASE.replace(/\/$/, '') + p
    : location.origin + APP_DIR + '#' + p;
}

export function hrefFor(route) {
  const p = pathFor(route);
  return mode === 'path' ? (SITE_BASE.replace(/\/$/, '') + p) : (APP_DIR + '#' + p);
}

export function navigate(route, { replace = false } = {}) {
  const href = hrefFor(route);
  if (mode === 'path') {
    if (replace) history.replaceState(null, '', href);
    else history.pushState(null, '', href);
    fire();
  } else {
    const hash = '#' + pathFor(route);
    if (location.hash === hash) fire();
    else if (replace) { history.replaceState(null, '', APP_DIR + hash); fire(); }
    else location.hash = hash;
  }
}

export const goProperties = () => navigate({ name: 'properties' });
export const goProperty = (codeOrListing) => navigate({
  name: 'property',
  code: typeof codeOrListing === 'string' ? codeOrListing : (codeOrListing.code || codeOrListing.id),
});

export function onRoute(fn) { listeners.push(fn); }
function fire() { listeners.forEach(fn => fn(currentRoute())); }

export function start() {
  window.addEventListener('hashchange', fire);
  window.addEventListener('popstate', fire);
  // Intercept in-app links so path mode never triggers a full page load.
  document.addEventListener('click', (e) => {
    const a = e.target.closest?.('a[data-route]');
    if (!a || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    const code = a.dataset.code;
    navigate(code ? { name: a.dataset.route, code } : { name: a.dataset.route });
  });
  fire();
}
