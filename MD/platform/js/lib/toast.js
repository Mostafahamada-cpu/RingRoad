// Toast notifications: success / error / warning / info.
const ICONS = { success: '✅', error: '⛔', warning: '⚠️', info: 'ℹ️' };

export function toast(msg, type = 'success', ms = 3000) {
  const root = document.getElementById('toast-root');
  if (!root) return;
  const el = document.createElement('div');
  el.className = `toast toast--${type}`;
  el.innerHTML = `<span>${ICONS[type] || ''}</span><span>${msg}</span>`;
  root.appendChild(el);
  setTimeout(() => {
    el.classList.add('is-leaving');
    setTimeout(() => el.remove(), 300);
  }, ms);
}
