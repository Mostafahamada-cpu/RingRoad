// Settings: my profile (photo upload) + language + admin category manager.
import { t, lang, setLang } from '../lib/i18n.js';
import { esc, validateForm, rules } from '../lib/utils.js';
import { db, userId } from '../lib/supabase.js';
import { store, me, loadCore, isAdmin } from '../lib/store.js';
import { createUploader } from '../components/uploader.js';
import { field, readForm } from '../components/form.js';
import { confirmDlg } from '../components/modal.js';
import { pagehead } from '../components/layout.js';
import { render as rerender } from '../lib/router.js';
import { toast } from '../lib/toast.js';

export async function pageSettings() {
  const p = me();
  const el = document.createElement('div');
  const up = createUploader({ existing: p?.photo ? [p.photo] : [], single: true });

  el.innerHTML = `
    ${pagehead(t('settingsTitle'), t('settingsSub'))}
    <div class="grid grid--2 section" style="align-items:start">
      <div class="card">
        <div class="card__head"><h3>👤 ${esc(t('myProfile'))}</h3></div>
        <form class="col" style="gap:14px" novalidate>
          ${field({ label: t('name'), name: 'name', value: p?.name, required: true })}
          ${field({ label: t('phone'), name: 'phone', type: 'tel', value: p?.phone, dir: 'ltr' })}
          <div class="field"><span class="field__label">${esc(t('profilePhoto'))}</span><div data-up></div></div>
          <button class="btn btn--primary">${esc(t('save'))}</button>
        </form>
      </div>
      <div class="col" style="gap:20px">
        <div class="card">
          <div class="card__head"><h3>🌐 ${esc(t('language'))}</h3></div>
          <div class="row">
            <button class="chip ${lang() === 'en' ? 'on' : ''}" data-lang="en">English</button>
            <button class="chip ${lang() === 'ar' ? 'on' : ''}" data-lang="ar">العربية</button>
          </div>
        </div>
        ${isAdmin() ? `
        <div class="card">
          <div class="card__head"><h3>🏷️ ${esc(t('categories'))}</h3></div>
          <p class="xs muted" style="margin-bottom:12px">${esc(t('categoriesSub'))}</p>
          <div class="col" id="cats">
            ${store.categories.filter(c => c.kind === 'ptype').map(c => `
              <div class="row row--between" style="border-bottom:1px solid var(--line);padding-bottom:8px">
                <span class="small"><b>${esc(c.name_en)}</b> · ${esc(c.name_ar || '')} <span class="xs muted" dir="ltr">(${esc(c.slug)})</span></span>
                <button class="btn btn--danger btn--sm" data-delcat="${esc(c.id)}">🗑️</button>
              </div>`).join('') || `<div class="xs muted">${esc(t('none'))} — built-in types are used.</div>`}
          </div>
          <form class="row row--wrap" style="margin-top:14px" id="cat-form">
            <input class="input" name="slug" placeholder="slug" dir="ltr" style="width:110px">
            <input class="input" name="name_en" placeholder="English" style="flex:1;min-width:110px">
            <input class="input" name="name_ar" placeholder="عربي" dir="rtl" style="flex:1;min-width:110px">
            <button class="btn btn--outline">＋ ${esc(t('addCategory'))}</button>
          </form>
        </div>` : ''}
      </div>
    </div>`;

  el.querySelector('[data-up]').appendChild(up.el);
  el.querySelector('form').onsubmit = async (e) => {
    e.preventDefault();
    const form = e.target;
    if (!validateForm(form, { name: [rules.required] })) return;
    try {
      const photos = await up.commit('avatars/' + userId());
      const d = readForm(form);
      await db.update('profiles', userId(), { name: d.name.trim(), phone: d.phone.trim() || null, photo: photos[0] || null });
      await loadCore();
      toast(t('profileSaved'));
      location.reload(); // refresh shell header
    } catch (err) { toast(err.message, 'error'); }
  };
  el.querySelectorAll('[data-lang]').forEach(b => b.onclick = () => { setLang(b.dataset.lang); location.reload(); });

  el.querySelector('#cat-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = e.target;
    const slug = f.slug.value.trim().toLowerCase().replace(/\s+/g, '_');
    if (!slug || !f.name_en.value.trim()) return;
    try {
      await db.create('categories', { kind: 'ptype', slug, name_en: f.name_en.value.trim(), name_ar: f.name_ar.value.trim() || null, sort: store.categories.length + 1 });
      await loadCore(); toast(t('saved')); rerender();
    } catch (err) { toast(err.message, 'error'); }
  });
  el.querySelectorAll('[data-delcat]').forEach(b => b.onclick = async () => {
    if (!(await confirmDlg({ message: t('areYouSure') }))) return;
    await db.remove('categories', b.dataset.delcat);
    await loadCore(); toast(t('deleted')); rerender();
  });
  return el;
}
