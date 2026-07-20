// Modal + confirmation dialog.
import { t } from '../lib/i18n.js';
import { esc } from '../lib/utils.js';

export function openModal({ title, body, size = '' }) {
  const root = document.getElementById('modal-root');
  const overlay = document.createElement('div');
  overlay.className = 'overlay';
  overlay.innerHTML = `
    <div class="modal ${size === 'sm' ? 'modal--sm' : size === 'lg' ? 'modal--lg' : ''}" role="dialog" aria-modal="true">
      <div class="modal__head"><h2>${esc(title)}</h2>
        <button class="modal__close" aria-label="${esc(t('close'))}">×</button></div>
      <div class="modal__body"></div>
    </div>`;
  const bodyEl = overlay.querySelector('.modal__body');
  if (typeof body === 'string') bodyEl.innerHTML = body;
  else if (body) bodyEl.appendChild(body);
  const close = () => overlay.remove();
  overlay.querySelector('.modal__close').onclick = close;
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
  root.appendChild(overlay);
  return { el: overlay, body: bodyEl, close };
}

export function confirmDlg({ title, message, okLabel, danger = true, icon = '🗑️' }) {
  return new Promise((resolve) => {
    const { el, close } = openModal({
      title: title || t('areYouSure'),
      size: 'sm',
      body: `
        <div class="center">
          <div class="confirm-icon" ${danger ? '' : 'style="background:var(--orange-50)"'}>${icon}</div>
          <p class="small" style="color:var(--ink-soft)">${message || t('irreversible')}</p>
        </div>
        <div class="modal__actions" style="justify-content:center">
          <button class="btn btn--outline" data-x="no">${esc(t('cancel'))}</button>
          <button class="btn ${danger ? 'btn--danger' : 'btn--primary'}" data-x="yes">${esc(okLabel || t('confirm'))}</button>
        </div>`,
    });
    el.querySelector('[data-x="no"]').onclick = () => { close(); resolve(false); };
    el.querySelector('[data-x="yes"]').onclick = () => { close(); resolve(true); };
  });
}
