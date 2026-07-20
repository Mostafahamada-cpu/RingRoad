// Hash router with role guards and animated page transitions.
// Route shape: { path:'listings/:id', page: async (params) => html|Element, guard: () => bool, title: key }
import { emit } from './store.js';

let routes = [];
let notFound = null;
let beforeEach = null;
let renderTarget = null;
let currentInfo = null;

export function defineRoutes(list, opts = {}) {
  routes = list.map(r => ({ ...r, parts: r.path.split('/') }));
  notFound = opts.notFound;
  beforeEach = opts.beforeEach;
}

export function setTarget(el) { renderTarget = el; }
export function current() { return currentInfo; }

export function navigate(path) {
  if (('#/' + path) === location.hash) render();
  else location.hash = '#/' + path;
}

function match(hashPath) {
  const parts = hashPath.split('/').filter(Boolean);
  for (const r of routes) {
    if (r.parts.length !== parts.length) continue;
    const params = {};
    let ok = true;
    for (let i = 0; i < r.parts.length; i++) {
      if (r.parts[i].startsWith(':')) params[r.parts[i].slice(1)] = decodeURIComponent(parts[i]);
      else if (r.parts[i] !== parts[i]) { ok = false; break; }
    }
    if (ok) return { route: r, params };
  }
  return null;
}

export async function render() {
  if (!renderTarget) return;
  const hashPath = (location.hash || '#/').replace(/^#\//, '');
  const m = match(hashPath) || (routes.length ? null : null);
  const info = m || { route: notFound, params: {} };
  if (beforeEach) {
    const redirect = beforeEach(info);
    if (redirect) { navigate(redirect); return; }
  }
  currentInfo = { path: hashPath, route: info.route, params: info.params };
  renderTarget.innerHTML = '<div class="col" style="gap:16px;padding:8px 0">'
    + '<div class="skel skel-line" style="width:30%"></div>'
    + '<div class="skel skel-block"></div><div class="skel skel-block" style="height:200px"></div></div>';
  try {
    const out = await info.route.page(info.params);
    renderTarget.innerHTML = '';
    const wrap = document.createElement('div');
    wrap.className = 'page-enter';
    if (typeof out === 'string') wrap.innerHTML = out;
    else wrap.appendChild(out);
    renderTarget.appendChild(wrap);
  } catch (err) {
    renderTarget.innerHTML = `<div class="empty"><div class="empty__icon">⚠️</div><div>${err.message}</div></div>`;
  }
  emit();
}

export function start() {
  window.addEventListener('hashchange', render);
  render();
}
