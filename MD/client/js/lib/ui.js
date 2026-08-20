// Toasts, modals and the mobile bottom-sheet used by the public view.
// Styling comes from platform/css/components.css + client.css, so the public
// site looks and feels like the rest of Ring Roads.
import { esc } from './format.js';
import { icon } from './icons.js';

const TOAST_ICON = { success: 'checkCircle', error: 'ban', warning: 'alert', info: 'info' };

export function toast(msg, type = 'success', ms = 3000) {
  const root = document.getElementById('toast-root');
  if (!root) return;
  const el = document.createElement('div');
  el.className = `toast toast--${type}`;
  el.innerHTML = `<span class="toast__ic">${icon(TOAST_ICON[type] || 'info')}</span><span>${esc(msg)}</span>`;
  root.appendChild(el);
  setTimeout(() => {
    el.classList.add('is-leaving');
    setTimeout(() => el.remove(), 300);
  }, ms);
}

// Esc closes any overlay; the returned function detaches the listener on close.
function trapEscape(close) {
  const onKey = (e) => { if (e.key === 'Escape') close(); };
  document.addEventListener('keydown', onKey);
  return () => document.removeEventListener('keydown', onKey);
}

export function openModal({ title, body, size = '' }) {
  const root = document.getElementById('modal-root');
  const overlay = document.createElement('div');
  overlay.className = 'overlay';
  overlay.innerHTML = `
    <div class="modal ${size === 'sm' ? 'modal--sm' : size === 'lg' ? 'modal--lg' : ''}" role="dialog" aria-modal="true" aria-label="${esc(title)}">
      <div class="modal__head"><h2>${esc(title)}</h2>
        <button class="modal__close" aria-label="Close">${icon('close')}</button></div>
      <div class="modal__body"></div>
    </div>`;
  const bodyEl = overlay.querySelector('.modal__body');
  if (typeof body === 'string') bodyEl.innerHTML = body;
  else if (body) bodyEl.appendChild(body);
  const untrap = trapEscape(() => close());
  const close = () => { untrap(); overlay.remove(); };
  overlay.querySelector('.modal__close').onclick = close;
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
  root.appendChild(overlay);
  return { el: overlay, body: bodyEl, close };
}

/**
 * Bottom sheet on phones, centred dialog on desktop — one component, because
 * the filter panel has to be comfortable with a thumb and with a mouse.
 */
export function openSheet({ title, body, footer }) {
  const root = document.getElementById('modal-root');
  const scrim = document.createElement('div');
  scrim.className = 'c-sheet-scrim';
  scrim.innerHTML = `
    <div class="c-sheet" role="dialog" aria-modal="true" aria-label="${esc(title)}">
      <div class="c-sheet__head"><span class="c-sheet__grip" aria-hidden="true"></span><h2>${esc(title)}</h2>
        <button class="modal__close" aria-label="Close">${icon('close')}</button></div>
      <div class="c-sheet__body"></div>
      <div class="c-sheet__foot"></div>
    </div>`;
  const bodyEl = scrim.querySelector('.c-sheet__body');
  const footEl = scrim.querySelector('.c-sheet__foot');
  if (typeof body === 'string') bodyEl.innerHTML = body; else if (body) bodyEl.appendChild(body);
  if (typeof footer === 'string') footEl.innerHTML = footer; else if (footer) footEl.appendChild(footer);
  const untrap = trapEscape(() => close());
  const close = () => { untrap(); scrim.remove(); };
  scrim.querySelector('.modal__close').onclick = close;
  scrim.addEventListener('click', (e) => { if (e.target === scrim) close(); });
  root.appendChild(scrim);
  return { el: scrim, body: bodyEl, foot: footEl, close };
}

export function skeletonGrid(n = 6) {
  return `<div class="c-grid">${Array.from({ length: n }, () => `
    <div class="c-skel-card">
      <div class="skel skel-block"></div>
      <div class="c-skel-card__body">
        <div class="skel skel-line" style="width:45%"></div>
        <div class="skel skel-line" style="width:85%"></div>
        <div class="skel skel-line" style="width:60%"></div>
      </div>
    </div>`).join('')}</div>`;
}

/** `icon` is an icons.js name — the portal no longer renders emoji. */
export function emptyState({ icon: name = 'building', title, text = '', actionHtml = '' }) {
  return `<div class="c-empty">
    <div class="c-empty__ic">${icon(name, 'ic--xl')}</div>
    <h2>${esc(title)}</h2>
    ${text ? `<p>${esc(text)}</p>` : ''}
    ${actionHtml}
  </div>`;
}
