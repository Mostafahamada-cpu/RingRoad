// Declarative form field builders (HTML strings) — pair with utils.validateForm.
import { esc } from '../lib/utils.js';

const req = (r) => r ? ' <span class="req">*</span>' : '';
const err = '<div class="field__err"></div>';

// Eye / eye-off icon — the crossbar animates in when the password is revealed.
export const eyeIcon = `
  <svg class="pw-eye" viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
    <path class="pw-eye__eye" d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z"
      stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>
    <circle class="pw-eye__iris" cx="12" cy="12" r="3.1" stroke="currentColor" stroke-width="1.7"/>
    <line class="pw-eye__slash" x1="4" y1="20" x2="20" y2="4" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>
  </svg>`;

// Password input with an accessible, animated show/hide toggle.
// Toggle behaviour is wired globally in lib/ui.js (event delegation).
export function passwordField({ label, name = 'password', value = '', required = false, placeholder = '', hint = '', span2 = false, autocomplete = 'current-password' }) {
  return `
    <label class="field ${span2 ? 'span-2' : ''}">
      <span class="field__label">${esc(label)}${req(required)}</span>
      <div class="input-pw">
        <input class="input" name="${esc(name)}" type="password" value="${esc(value ?? '')}"
          placeholder="${esc(placeholder)}" dir="ltr" autocomplete="${esc(autocomplete)}">
        <button type="button" class="pw-toggle" data-pw-toggle aria-label="${esc(label)} — show" aria-pressed="false" tabindex="0">${eyeIcon}</button>
      </div>
      ${err}${hint ? `<div class="field__hint">${esc(hint)}</div>` : ''}
    </label>`;
}

export function field({ label, name, type = 'text', value = '', required = false, placeholder = '', hint = '', span2 = false, step, min, max, dir }) {
  return `
    <label class="field ${span2 ? 'span-2' : ''}">
      <span class="field__label">${esc(label)}${req(required)}</span>
      <input class="input" name="${esc(name)}" type="${type}" value="${esc(value ?? '')}"
        placeholder="${esc(placeholder)}" ${step != null ? `step="${step}"` : ''} ${min != null ? `min="${min}"` : ''}
        ${max != null ? `max="${max}"` : ''} ${dir ? `dir="${dir}"` : ''}>
      ${err}${hint ? `<div class="field__hint">${esc(hint)}</div>` : ''}
    </label>`;
}

export function selectField({ label, name, options, value = '', required = false, span2 = false, emptyLabel = null }) {
  const opts = (emptyLabel != null ? `<option value="">${esc(emptyLabel)}</option>` : '')
    + options.map(o => `<option value="${esc(o.v)}" ${String(o.v) === String(value ?? '') ? 'selected' : ''}>${esc(o.l)}</option>`).join('');
  return `
    <label class="field ${span2 ? 'span-2' : ''}">
      <span class="field__label">${esc(label)}${req(required)}</span>
      <select class="select" name="${esc(name)}">${opts}</select>
      ${err}
    </label>`;
}

export function textareaField({ label, name, value = '', required = false, span2 = true, rows = 4 }) {
  return `
    <label class="field ${span2 ? 'span-2' : ''}">
      <span class="field__label">${esc(label)}${req(required)}</span>
      <textarea class="textarea" name="${esc(name)}" rows="${rows}">${esc(value ?? '')}</textarea>
      ${err}
    </label>`;
}

export function checkField({ label, name, checked = false, span2 = false }) {
  return `
    <div class="field ${span2 ? 'span-2' : ''}">
      <label class="check"><input type="checkbox" name="${esc(name)}" ${checked ? 'checked' : ''}> ${esc(label)}</label>
    </div>`;
}

export function checkboxGroup({ label, name, options, values = [], span2 = true }) {
  return `
    <div class="field ${span2 ? 'span-2' : ''}">
      <span class="field__label">${esc(label)}</span>
      <div class="row row--wrap" style="gap:10px">
        ${options.map(o => `
          <label class="chip" style="display:inline-flex;align-items:center;gap:8px;cursor:pointer">
            <input type="checkbox" name="${esc(name)}" value="${esc(o.v)}" ${values.includes(o.v) ? 'checked' : ''}
              style="width:14px;height:14px;accent-color:var(--orange-600)"> ${esc(o.l)}
          </label>`).join('')}
      </div>
    </div>`;
}

export function readForm(formEl) {
  const data = {};
  formEl.querySelectorAll('[name]').forEach(el => {
    if (el.type === 'checkbox') {
      if (formEl.querySelectorAll(`[name="${el.name}"]`).length > 1) {
        data[el.name] = data[el.name] || [];
        if (el.checked) data[el.name].push(el.value);
      } else data[el.name] = el.checked;
    } else data[el.name] = el.value;
  });
  return data;
}
