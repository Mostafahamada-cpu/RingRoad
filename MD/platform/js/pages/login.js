// Auth screen — brand split panel + sign-in form.
import { t, lang, setLang } from '../lib/i18n.js';
import { esc, validateForm, rules } from '../lib/utils.js';
import { auth } from '../lib/supabase.js';
import { toast } from '../lib/toast.js';

export function renderLogin(onSuccess) {
  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="auth">
      <div class="auth__brandside">
        <div class="row"><div class="logo-mark">RR</div>
          <div><div style="font-weight:800">${esc(t('brand'))}</div>
          <div class="xs" style="opacity:.75;letter-spacing:.14em;font-weight:700">${esc(t('brandSub'))}</div></div>
        </div>
        <div class="tag">${esc(t('authTag')).replace('\n', '<br>')}</div>
        <div class="pts">
          <span>◆ ${esc(t('authPt1'))}</span>
          <span>◆ ${esc(t('authPt2'))}</span>
          <span>◆ ${esc(t('authPt3'))}</span>
        </div>
      </div>
      <div class="auth__formside">
        <div class="auth__card">
          <div class="row row--between" style="margin-bottom:24px">
            <div><h1>${esc(t('welcomeBack'))}</h1><p class="muted small">${esc(t('signIn'))} · ${esc(t('brand'))}</p></div>
            <button class="iconbtn langbtn" id="auth-lang">${lang() === 'en' ? 'ع' : 'EN'}</button>
          </div>
          <form class="col" style="gap:16px" novalidate>
            <label class="field">
              <span class="field__label">${esc(t('email'))}</span>
              <input class="input" name="email" type="email" dir="ltr" autocomplete="email">
              <div class="field__err"></div>
            </label>
            <label class="field">
              <span class="field__label">${esc(t('password'))}</span>
              <input class="input" name="password" type="password" dir="ltr" autocomplete="current-password">
              <div class="field__err"></div>
            </label>
            <button type="submit" class="btn btn--primary btn--lg btn--block">${esc(t('signIn'))}</button>
            <button type="button" class="btn btn--ghost btn--sm" id="forgot">${esc(t('forgotPw'))}</button>
          </form>
        </div>
      </div>
    </div>`;

  document.getElementById('auth-lang').onclick = () => {
    setLang(lang() === 'en' ? 'ar' : 'en');
    renderLogin(onSuccess);
  };
  const form = app.querySelector('form');
  form.onsubmit = async (e) => {
    e.preventDefault();
    if (!validateForm(form, { email: [rules.required, rules.email], password: [rules.required] })) return;
    const btn = form.querySelector('[type="submit"]');
    btn.disabled = true; btn.textContent = t('loading');
    try {
      await auth.signIn(form.email.value.trim(), form.password.value);
      await onSuccess();
    } catch (_) {
      toast(t('loginFailed'), 'error');
      btn.disabled = false; btn.textContent = t('signIn');
    }
  };
  document.getElementById('forgot').onclick = async () => {
    const email = form.email.value.trim();
    if (!email) { validateForm(form, { email: [rules.required, rules.email] }); return; }
    try { await auth.recover(email); toast(t('recoverySent')); }
    catch (err) { toast(err.message, 'error'); }
  };
}
