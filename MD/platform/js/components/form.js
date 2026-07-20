// Declarative form field builders (HTML strings) — pair with utils.validateForm.
import { esc } from '../lib/utils.js';

const req = (r) => r ? ' <span class="req">*</span>' : '';
const err = '<div class="field__err"></div>';

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
