// Global UI enhancers wired once at boot (event delegation → works for
// dynamically-rendered fields inside modals, forms, the login screen, etc.).

let wired = false;

export function initUi() {
  if (wired) return;
  wired = true;

  // Show / hide password toggle. Any `[data-pw-toggle]` button inside an
  // `.input-pw` wrapper flips its sibling <input> between password ⇆ text.
  document.addEventListener('click', (e) => {
    const btn = e.target.closest?.('[data-pw-toggle]');
    if (!btn) return;
    const input = btn.closest('.input-pw')?.querySelector('input');
    if (!input) return;
    const reveal = input.type === 'password';
    input.type = reveal ? 'text' : 'password';
    btn.classList.toggle('is-on', reveal);
    btn.setAttribute('aria-pressed', String(reveal));
    const base = btn.getAttribute('aria-label')?.replace(/ — (show|hide)$/, '') || 'Password';
    btn.setAttribute('aria-label', `${base} — ${reveal ? 'hide' : 'show'}`);
    // keep focus/caret in the field for a smooth typing experience
    input.focus({ preventScroll: true });
  });
}
