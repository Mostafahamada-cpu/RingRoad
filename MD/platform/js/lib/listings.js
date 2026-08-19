// Listing domain: loading, permissions, lifecycle actions shared across pages.
import { db, userId } from './supabase.js';
import { t } from './i18n.js';
import { esc, money, validateForm, rules, todayKey } from './utils.js';
import { store, me, isMgmt, isLeader, myTeamId } from './store.js';
import { toast } from './toast.js';
import { openModal, confirmDlg } from '../components/modal.js';
import { field } from '../components/form.js';
import { PTYPES, PUBLIC_SITE_URL } from '../config.js';

export const loadListings = () => db.list('properties', 'select=*&order=created_at.desc');

// Visibility: everyone sees approved; own + team pending stay visible to their owners/leaders/mgmt.
export function visibleListings(all) {
  if (isMgmt()) return all;
  if (isLeader()) return all.filter(l => l.approval === 'approved' || l.team_id === myTeamId());
  return all.filter(l => l.approval === 'approved' || l.agent_id === userId());
}

export const canManage = () => isMgmt();
export function canEditListing(l) {
  return isMgmt() || (isLeader() && l.team_id === myTeamId()) || l.agent_id === userId();
}
export function canArchive(l) {
  return isMgmt() || (isLeader() && l.team_id === myTeamId());
}

export function typeOptions() {
  const cats = store.categories.filter(c => c.kind === 'ptype');
  if (cats.length) return cats.map(c => ({ v: c.slug, l: (document.documentElement.lang === 'ar' ? c.name_ar : c.name_en) || c.slug }));
  return PTYPES.map(p => ({ v: p, l: t(p) }));
}
export function typeLabel(v) {
  const opt = typeOptions().find(o => o.v === v);
  return opt ? opt.l : (t(v) || v || '—');
}

// --- lifecycle actions (each returns true if a change happened) ---
export async function archiveListing(l) {
  const ok = await confirmDlg({ message: t('confirmArchive'), icon: '🗄️', danger: false, okLabel: t('archiveAction') });
  if (!ok) return false;
  await db.update('properties', l.id, { status: 'archived' });
  toast(t('saved')); return true;
}

export async function restoreListing(l) {
  const ok = await confirmDlg({ message: t('confirmRestore'), icon: '↩️', danger: false, okLabel: t('restoreAction') });
  if (!ok) return false;
  await db.update('properties', l.id, { status: 'available' });
  toast(t('saved')); return true;
}

export async function deleteListing(l) {
  const ok = await confirmDlg({ message: t('confirmDeleteProp') });
  if (!ok) return false;
  await db.remove('properties', l.id);
  toast(t('deleted')); return true;
}

export function openMarkSold(l, onDone) {
  const { el, close } = openModal({
    title: t('markSold') + ' — ' + l.title,
    body: `
      <form class="form-grid" novalidate>
        ${field({ label: t('buyerName'), name: 'buyer_name', required: true, span2: true })}
        ${field({ label: t('sellingPrice'), name: 'sold_price', type: 'number', value: l.price, required: true, dir: 'ltr' })}
        ${field({ label: t('commission'), name: 'commission', type: 'number', value: Math.round((l.price || 0) * 0.025), required: true, dir: 'ltr' })}
        ${field({ label: t('soldDate'), name: 'sold_date', type: 'date', value: todayKey(), required: true, dir: 'ltr' })}
        <div class="modal__actions span-2">
          <button type="button" class="btn btn--outline" data-x>${esc(t('cancel'))}</button>
          <button type="submit" class="btn btn--secondary">🤝 ${esc(t('markSold'))}</button>
        </div>
      </form>`,
  });
  const form = el.querySelector('form');
  el.querySelector('[data-x]').onclick = close;
  form.onsubmit = async (e) => {
    e.preventDefault();
    if (!validateForm(form, {
      buyer_name: [rules.required], sold_price: [rules.required, rules.numeric, rules.min(1)],
      commission: [rules.required, rules.numeric, rules.min(0)], sold_date: [rules.required],
    })) return;
    const fd = new FormData(form);
    try {
      await db.update('properties', l.id, {
        status: 'sold',
        buyer_name: fd.get('buyer_name').trim(),
        sold_price: parseFloat(fd.get('sold_price')),
        commission: parseFloat(fd.get('commission')),
        sold_date: fd.get('sold_date'),
      });
      close();
      toast(t('saved'));
      onDone?.();
    } catch (err) { toast(err.message, 'error'); }
  };
}

export function priceLine(l) {
  return money(l.status === 'sold' && l.sold_price != null ? l.sold_price : l.price);
}

// Public, shareable URL of a listing on the client view (client/).
// Matches the /property/:code rewrite in client/vercel.json.
export function publicUrl(l) {
  const key = l?.code || l?.id;
  if (!key) return null;
  const origin = (PUBLIC_SITE_URL || location.origin).replace(/\/$/, '');
  return origin + '/property/' + encodeURIComponent(key);
}
