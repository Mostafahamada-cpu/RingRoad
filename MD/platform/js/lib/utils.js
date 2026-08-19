// Formatting, validation, export helpers.
import { t, lang } from './i18n.js';

export const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, c => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
));
export const num = (v) => { const n = parseFloat(v); return isNaN(n) ? 0 : n; };
export const groupNum = (n) => Math.round(num(n)).toLocaleString('en-US');
export const money = (n) => groupNum(n) + ' ' + t('egp');
export function compact(n) {
  n = num(n); const a = Math.abs(n);
  const f = (v) => { const s = v.toFixed(1); return s.endsWith('.0') ? s.slice(0, -2) : s; };
  if (a >= 1e9) return f(n / 1e9) + 'B';
  if (a >= 1e6) return f(n / 1e6) + 'M';
  if (a >= 1e3) return f(n / 1e3) + 'K';
  return groupNum(n);
}
export const todayKey = () => new Date().toISOString().slice(0, 10);
export const monthKey = () => new Date().toISOString().slice(0, 7);
export function fmtDate(d) {
  if (!d) return '—';
  return String(d).slice(0, 10);
}
export function initials(name) {
  return String(name || '?').trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();
}
export function debounce(fn, ms = 250) {
  let tm; return (...args) => { clearTimeout(tm); tm = setTimeout(() => fn(...args), ms); };
}
export const uid = () => crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(36).slice(2);

export function monthsBack(n) {
  const out = []; const d = new Date(); d.setDate(1);
  for (let i = n - 1; i >= 0; i--) {
    const dd = new Date(d.getFullYear(), d.getMonth() - i, 1);
    out.push({ key: dd.getFullYear() + '-' + String(dd.getMonth() + 1).padStart(2, '0'), label: dd.toLocaleDateString(lang() === 'ar' ? 'ar-EG' : 'en-US', { month: 'short' }) });
  }
  return out;
}

// --- validation ---
export const rules = {
  required: (v) => (v == null || String(v).trim() === '') ? t('vRequired') : null,
  email: (v) => (!v || /^\S+@\S+\.\S+$/.test(v)) ? null : t('vEmail'),
  min: (min) => (v) => (String(v).trim() !== '' && num(v) < min) ? t('vMin') + ' ' + min : null,
  max: (max) => (v) => (String(v).trim() !== '' && num(v) > max) ? t('vMax') + ' ' + max : null,
  numeric: (v) => (String(v).trim() === '' || !isNaN(parseFloat(v))) ? null : t('vNumber'),
  minLen: (n) => (v) => (!v || String(v).trim().length >= n) ? null : t('vMinLen') + ' ' + n,
  // Phone / WhatsApp: optional, but when given it must be dialable — 7-15 digits
  // (ITU E.164 max), allowing +, spaces, dashes and parentheses as separators.
  phone: (v) => {
    const raw = String(v == null ? '' : v).trim();
    if (!raw) return null;
    if (!/^\+?[\d\s()-]{6,24}$/.test(raw)) return t('vPhone');
    const digits = raw.replace(/\D/g, '');
    return (digits.length >= 7 && digits.length <= 15) ? null : t('vPhone');
  },
};

// Validate a form element: pass { fieldName: [rule,...] }. Marks .field.is-invalid.
export function validateForm(formEl, spec) {
  let ok = true;
  for (const [name, checks] of Object.entries(spec)) {
    const input = formEl.querySelector(`[name="${name}"]`);
    if (!input) continue;
    const field = input.closest('.field') || input.parentElement;
    const value = input.type === 'checkbox' ? (input.checked ? '1' : '') : input.value;
    let err = null;
    for (const check of checks) { err = check(value); if (err) break; }
    field.classList.toggle('is-invalid', !!err);
    const errEl = field.querySelector('.field__err');
    if (errEl) errEl.textContent = err || '';
    if (err) ok = false;
  }
  return ok;
}

// --- exports ---
export function downloadCsv(headers, rowsArr, name) {
  const q = (v) => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';
  const lines = [headers.map(q).join(',')];
  rowsArr.forEach(r => lines.push(r.map(q).join(',')));
  const blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name + '.csv';
  a.click();
  URL.revokeObjectURL(a.href);
}

export function openPrintReport(title, bodyHtml) {
  const w = window.open('', '_blank');
  if (!w) return false;
  w.document.write(`<!DOCTYPE html><html lang="${lang()}" dir="${lang() === 'ar' ? 'rtl' : 'ltr'}"><head><meta charset="utf-8">
    <title>${esc(title)}</title>
    <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;600;700;800&family=IBM+Plex+Sans+Arabic:wght@400;600;700&display=swap" rel="stylesheet">
    <style>
      body{font-family:'Manrope','IBM Plex Sans Arabic',sans-serif;color:#2B1420;margin:32px}
      h1{color:#6A003C;font-size:22px;margin:0} .sub{color:#8E7A85;font-size:12px;margin:4px 0 20px}
      table{width:100%;border-collapse:collapse;font-size:12px}
      th{background:#FBF2F7;color:#6A003C;text-align:start;padding:8px;border-bottom:2px solid #F97316}
      td{padding:7px 8px;border-bottom:1px solid #F0E4EA}
      tfoot td{font-weight:700;background:#FAF6F8;border-top:2px solid #6A003C}
      .brand{display:flex;align-items:center;gap:10px;margin-bottom:6px}
      .mark{width:34px;height:34px;border-radius:10px;background:linear-gradient(135deg,#F97316,#6A003C);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:800}
      @media print{body{margin:12mm}}
    </style></head><body>
    <div class="brand"><div class="mark">RR</div><h1>${esc(title)}</h1></div>
    <div class="sub">Ring Roads Platform · ${todayKey()}</div>
    ${bodyHtml}
    <script>addEventListener('load',()=>setTimeout(()=>print(),350))<\/script></body></html>`);
  w.document.close();
  return true;
}
