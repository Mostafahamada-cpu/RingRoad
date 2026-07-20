// Image uploader: drag & drop, multi-file, previews, delete, reorder.
// Files upload to Supabase Storage on commit() — never as pasted URLs.
import { t } from '../lib/i18n.js';
import { esc, uid } from '../lib/utils.js';
import { storage } from '../lib/supabase.js';
import { toast } from '../lib/toast.js';

const ACCEPT = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_MB = 8;

export function createUploader({ existing = [], single = false, max = 14 } = {}) {
  const el = document.createElement('div');
  // items: { id, path (existing) | file (new), url (preview) }
  let items = existing.map(p => ({ id: uid(), path: p, url: storage.publicUrl(p) }));
  const removedExisting = [];

  function addFiles(files) {
    for (const f of files) {
      if (!ACCEPT.includes(f.type)) { toast(f.name + ' — JPG/PNG/WebP', 'warning'); continue; }
      if (f.size > MAX_MB * 1024 * 1024) { toast(f.name + ' > ' + MAX_MB + 'MB', 'warning'); continue; }
      if (single) {
        items.forEach(it => { if (it.path) removedExisting.push(it.path); });
        items = [];
      }
      if (items.length >= max) { toast('Max ' + max, 'warning'); break; }
      items.push({ id: uid(), file: f, url: URL.createObjectURL(f) });
    }
    render();
  }

  function move(id, dir) {
    const i = items.findIndex(x => x.id === id);
    const j = i + dir;
    if (j < 0 || j >= items.length) return;
    [items[i], items[j]] = [items[j], items[i]];
    render();
  }

  function render() {
    el.innerHTML = `
      <div class="dropzone" tabindex="0" role="button">
        <div class="dropzone__icon">🖼️</div>
        <div style="font-weight:700">${esc(t('dropHere'))}</div>
        <div class="xs muted" style="margin-top:4px">${esc(t('dropHint'))}</div>
        <input type="file" accept="${ACCEPT.join(',')}" ${single ? '' : 'multiple'} hidden>
      </div>
      ${items.length ? `<div class="thumbs">
        ${items.map((it, i) => `
          <div class="thumb ${it.file ? 'is-new' : ''}">
            <img src="${esc(it.url)}" alt="">
            ${i === 0 && !single ? `<span class="badge badge--featured thumb__cover">${esc(t('cover'))}</span>` : ''}
            <div class="thumb__tools" dir="ltr">
              <span>
                <button type="button" data-mv="-1" data-id="${it.id}" title="◀">◀</button>
                <button type="button" data-mv="1" data-id="${it.id}" title="▶">▶</button>
              </span>
              <button type="button" data-del="${it.id}" title="✕">✕</button>
            </div>
          </div>`).join('')}
      </div>` : ''}`;

    const dz = el.querySelector('.dropzone');
    const input = dz.querySelector('input');
    dz.onclick = () => input.click();
    input.onchange = () => { addFiles([...input.files]); input.value = ''; };
    ['dragenter', 'dragover'].forEach(ev => dz.addEventListener(ev, (e) => { e.preventDefault(); dz.classList.add('is-drag'); }));
    ['dragleave', 'drop'].forEach(ev => dz.addEventListener(ev, (e) => { e.preventDefault(); dz.classList.remove('is-drag'); }));
    dz.addEventListener('drop', (e) => addFiles([...e.dataTransfer.files]));

    el.querySelectorAll('[data-del]').forEach(b => b.onclick = () => {
      const it = items.find(x => x.id === b.dataset.del);
      if (it?.path) removedExisting.push(it.path);
      if (it?.file) URL.revokeObjectURL(it.url);
      items = items.filter(x => x.id !== b.dataset.del);
      render();
    });
    el.querySelectorAll('[data-mv]').forEach(b => b.onclick = () => move(b.dataset.id, +b.dataset.mv));
  }

  render();

  return {
    el,
    count: () => items.length,
    // Uploads new files under `prefix/`, deletes removed originals, returns ordered path list.
    async commit(prefix) {
      const out = [];
      for (const it of items) {
        if (it.path) { out.push(it.path); continue; }
        const ext = (it.file.name.match(/\.(\w+)$/) || [, 'jpg'])[1].toLowerCase();
        const path = `${prefix}/${uid()}.${ext}`;
        await storage.upload(it.file, path);
        out.push(path);
      }
      if (removedExisting.length) {
        await storage.remove(removedExisting).catch(() => {});
        removedExisting.length = 0;
      }
      return out;
    },
  };
}
