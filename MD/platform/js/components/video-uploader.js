// Property videos editor — used by the Edit Property page, directly below the
// Photos section. Deliberately mirrors createUploader()'s shape (`el`, plus a
// `commit()` that runs after the property id is known) so the two sections
// behave and look the same, and so listing-form.js only gains a few lines.
//
// A video is either a LINK (YouTube / Vimeo / a direct file URL) or an uploaded
// FILE. Files go to the same Supabase Storage bucket the photos already use —
// there is no Cloudinary in this project; `platform-images` is the existing
// upload setup for listing photos, avatars, team logos and CRM videos alike.
//
// Rows live in the shared `videos` table keyed by `property_id`, which is what
// the public client portal already reads through `public_property_videos`
// (see platform-client-portal.sql). No second video system.
import { t } from '../lib/i18n.js';
import { esc, uid } from '../lib/utils.js';
import { db, storage } from '../lib/supabase.js';
import { toast } from '../lib/toast.js';

const ACCEPT = ['video/mp4', 'video/webm', 'video/quicktime'];
const MAX_MB = 200;

const YT = /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([\w-]{6,})/i;
const VIMEO = /vimeo\.com\/(?:video\/)?(\d+)/i;

/** Existing property videos, or [] when the videos surface isn't published yet. */
export async function loadPropertyVideos(propertyId) {
  if (!propertyId) return [];
  try {
    return await db.list('videos', `property_id=eq.${propertyId}&select=*&order=sort_order.asc,created_at.asc`);
  } catch (_) {
    return null;   // null = the table is unreachable (migration not run)
  }
}

function kindOf(url) {
  const u = String(url || '').trim();
  if (YT.test(u)) return 'youtube';
  if (VIMEO.test(u)) return 'vimeo';
  return 'file';
}

function isHttpUrl(s) {
  try { const u = new URL(String(s).trim()); return u.protocol === 'http:' || u.protocol === 'https:'; }
  catch (_) { return false; }
}

/** Poster for an existing/link video; null when we can't derive one. */
function posterFor(item) {
  if (item.thumbnail) return storage.publicUrl(item.thumbnail);
  const m = String(item.video_url || '').match(YT);
  return m ? `https://i.ytimg.com/vi/${m[1]}/hqdefault.jpg` : null;
}

/**
 * @param {object[]|null} existing  rows from `videos`, or null when unavailable
 */
export function createVideoEditor({ existing = [] } = {}) {
  const el = document.createElement('div');
  const unavailable = existing === null;

  // items: { key, row? (existing), file? (new upload), video_url? (new link), objUrl? }
  let items = (existing || []).map(r => ({ key: uid(), row: r }));
  const removed = [];          // ids of existing rows the user deleted
  const removedPaths = [];     // their storage objects, cleaned up on commit

  function addUrl(raw) {
    const url = String(raw || '').trim();
    if (!url) return toast(t('vidNeedSource'), 'warning');
    if (!isHttpUrl(url)) return toast(t('vidBadUrl'), 'warning');
    items.push({ key: uid(), video_url: url });
    render();
  }

  function addFiles(files) {
    for (const f of files) {
      if (!ACCEPT.includes(f.type)) { toast(f.name + ' — MP4/WebM/MOV', 'warning'); continue; }
      if (f.size > MAX_MB * 1024 * 1024) { toast(f.name + ' > ' + MAX_MB + 'MB', 'warning'); continue; }
      items.push({ key: uid(), file: f, objUrl: URL.createObjectURL(f) });
    }
    render();
  }

  function remove(key) {
    const it = items.find(x => x.key === key);
    if (!it) return;
    if (it.row) {
      removed.push(it.row.id);
      if (it.row.video_path) removedPaths.push(it.row.video_path);
      if (it.row.thumbnail) removedPaths.push(it.row.thumbnail);
    }
    if (it.objUrl) URL.revokeObjectURL(it.objUrl);
    items = items.filter(x => x.key !== key);
    render();
  }

  // One tile per video, styled with the very same .thumb classes the Photos
  // grid uses so the two sections read as one system.
  function tileHtml(it) {
    const isNew = !it.row;
    const url = it.row?.video_url || it.video_url || '';
    const kind = it.file ? 'file' : kindOf(url);
    const poster = it.row ? posterFor(it.row) : (kind === 'youtube' ? posterFor({ video_url: url }) : null);
    const label = kind === 'youtube' ? 'YouTube' : kind === 'vimeo' ? 'Vimeo' : it.file ? esc(it.file.name) : esc(t('vidFileLabel'));

    const preview = it.objUrl
      // The browser paints the first frame from the local file — no upload needed
      // just to show a preview.
      ? `<video src="${esc(it.objUrl)}" preload="metadata" muted playsinline></video>`
      : it.row?.video_path
        ? `<video src="${esc(storage.publicUrl(it.row.video_path))}#t=0.1" preload="metadata" muted playsinline></video>`
        : poster
          ? `<img src="${esc(poster)}" alt="" loading="lazy">`
          : `<div class="vthumb__ph">🎥</div>`;

    return `
      <div class="thumb vthumb ${isNew ? 'is-new' : ''}" data-key="${esc(it.key)}">
        ${preview}
        <span class="vthumb__kind">${label}</span>
        <div class="thumb__tools" dir="ltr">
          <span></span>
          <button type="button" data-del="${esc(it.key)}" title="${esc(t('del'))}" aria-label="${esc(t('del'))}">✕</button>
        </div>
      </div>`;
  }

  function render() {
    el.innerHTML = `
      ${unavailable ? `<div class="vid-note">⚠️ ${esc(t('vidTableMissing'))}</div>` : ''}
      <div class="vid-add">
        <div class="vid-add__row">
          <input class="input" type="url" inputmode="url" dir="ltr" data-url
                 placeholder="${esc(t('vidUrlPlaceholder'))}" aria-label="${esc(t('vidUrl'))}">
          <button type="button" class="btn btn--outline" data-addurl>➕ ${esc(t('vidAddUrl'))}</button>
        </div>
        <div class="vid-add__or"><span>${esc(t('or'))}</span></div>
        <button type="button" class="btn btn--outline vid-add__upload" data-pick>
          ⬆️ ${esc(t('vidUploadBtn'))}
        </button>
        <input type="file" accept="${ACCEPT.join(',')}" multiple hidden data-file>
        <p class="vid-add__hint">${esc(t('vidHint').replace('{mb}', MAX_MB))}</p>
      </div>
      ${items.length ? `<div class="thumbs">${items.map(tileHtml).join('')}</div>` : ''}`;

    const urlInput = el.querySelector('[data-url]');
    el.querySelector('[data-addurl]').onclick = () => { addUrl(urlInput.value); urlInput.value = ''; };
    // Enter inside the URL box must add the video, never submit the property form.
    urlInput.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      addUrl(urlInput.value);
      urlInput.value = '';
    });

    const fileInput = el.querySelector('[data-file]');
    el.querySelector('[data-pick]').onclick = () => fileInput.click();
    fileInput.onchange = () => { addFiles([...fileInput.files]); fileInput.value = ''; };

    el.querySelectorAll('[data-del]').forEach(b => b.onclick = () => remove(b.dataset.del));
  }

  render();

  return {
    el,
    count: () => items.length,
    /**
     * Runs AFTER the property row exists, so `property_id` always points at a
     * real record. Uploads new files, inserts new rows, deletes removed ones.
     */
    async commit(propertyId) {
      if (unavailable) return;

      for (const id of removed) {
        await db.remove('videos', id).catch(() => {});
      }
      if (removedPaths.length) await storage.remove(removedPaths).catch(() => {});
      removed.length = 0; removedPaths.length = 0;

      let order = 0;
      for (const it of items) {
        if (it.row) {
          // Existing row: only its position can have changed.
          if (it.row.sort_order !== order) {
            await db.update('videos', it.row.id, { sort_order: order }).catch(() => {});
            it.row.sort_order = order;
          }
          order++;
          continue;
        }

        const row = { property_id: propertyId, sort_order: order++, is_public: true };
        if (it.file) {
          const ext = (it.file.name.match(/\.(\w+)$/) || [, 'mp4'])[1].toLowerCase();
          const path = `videos/${propertyId}/${uid()}.${ext}`;
          await storage.upload(it.file, path);
          row.video_path = path;
          row.title = it.file.name.replace(/\.[^.]+$/, '').slice(0, 120) || t('vidFileLabel');
        } else {
          row.video_url = it.video_url;
          const k = kindOf(it.video_url);
          row.title = k === 'youtube' ? 'YouTube video' : k === 'vimeo' ? 'Vimeo video' : t('vidFileLabel');
        }
        const saved = await db.create('videos', row);
        it.row = saved || row;
        if (it.objUrl) { URL.revokeObjectURL(it.objUrl); it.objUrl = null; }
        it.file = null;
      }
    },
  };
}
