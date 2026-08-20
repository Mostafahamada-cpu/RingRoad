// Videos — a shared video library for the team.
// Everyone signed in can browse and play; management/admin can add, edit and
// delete (can('videos:manage') mirrors the RLS in platform-videos.sql).
// Sources are either an external link (YouTube / Vimeo / direct file) or a file
// uploaded to the existing storage bucket.
import { t } from '../lib/i18n.js';
import { esc, uid, fmtDate, validateForm, rules } from '../lib/utils.js';
import { storage } from '../lib/supabase.js';
import { me, profileById } from '../lib/store.js';
import { can } from '../lib/perms.js';
import {
  loadVideos, createVideo, updateVideo, removeVideo,
  videoSource, posterUrl, sourceLabel, isHttpUrl, VIDEO_MIME, VIDEO_MAX_MB,
} from '../lib/videos.js';
import { openModal, confirmDlg } from '../components/modal.js';
import { field, textareaField, readForm } from '../components/form.js';
import { createUploader } from '../components/uploader.js';
import { pagehead } from '../components/layout.js';
import { render as rerender } from '../lib/router.js';
import { toast } from '../lib/toast.js';

// ---- Player ----------------------------------------------------------------
function playVideo(v) {
  const s = videoSource(v);
  const player = !s
    ? `<div class="empty"><div class="empty__icon">🎬</div>${esc(t('vidNoSource'))}</div>`
    : s.kind === 'file'
      ? `<video class="vid-player" controls autoplay playsinline preload="metadata"
           ${v.thumbnail ? `poster="${esc(storage.publicUrl(v.thumbnail))}"` : ''}
           src="${esc(s.src)}"></video>`
      : `<iframe class="vid-player" src="${esc(s.src)}?autoplay=1" title="${esc(v.title)}"
           frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; picture-in-picture"
           allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe>`;

  const author = profileById(v.created_by);
  openModal({
    title: v.title,
    size: 'lg',
    body: `
      <div class="col" style="gap:14px">
        <div class="vid-stage">${player}</div>
        ${v.description ? `<p class="small" style="white-space:pre-wrap;color:var(--ink-soft)">${esc(v.description)}</p>` : ''}
        <div class="row row--wrap xs muted" style="gap:12px">
          <span>📅 ${esc(fmtDate(v.created_at))}</span>
          ${author ? `<span>👤 ${esc(author.name || author.email)}</span>` : ''}
          <span>🔗 ${esc(sourceLabel(v))}</span>
          ${videoSource(v) ? `<a class="btn btn--ghost btn--sm" href="${esc(videoSource(v).src)}" target="_blank" rel="noopener">${esc(t('vidOpenNew'))}</a>` : ''}
        </div>
      </div>`,
  });
}

// ---- Add / edit form -------------------------------------------------------
function openVideoForm(video, onDone) {
  const isNew = !video;
  const thumb = createUploader({ existing: video?.thumbnail ? [video.thumbnail] : [], single: true });
  // Uploaded file state: keep the existing path until the user picks a new file
  // or clears it.
  let pickedFile = null;
  let keptPath = video?.video_path || null;

  const { el, close } = openModal({
    title: isNew ? t('vidAdd') : t('vidEdit'),
    size: 'lg',
    body: `
      <form class="form-grid" novalidate>
        ${field({ label: t('vidTitleLbl'), name: 'title', value: video?.title, required: true, span2: true })}
        ${textareaField({ label: t('vidDesc'), name: 'description', value: video?.description, rows: 3 })}

        <div class="field span-2">
          <span class="field__label">${esc(t('vidThumb'))}</span>
          <div data-thumb></div>
          <div class="field__hint">${esc(t('vidThumbHint'))}</div>
        </div>

        <div class="field span-2">
          <span class="field__label">${esc(t('vidSource'))} <span class="req">*</span></span>
          <div class="field__hint" style="margin-bottom:8px">${esc(t('vidSourceHint'))}</div>
        </div>

        ${field({ label: t('vidUrl'), name: 'video_url', value: video?.video_url, span2: true,
          placeholder: 'https://youtube.com/watch?v=… ', dir: 'ltr' })}

        <div class="field span-2">
          <span class="field__label">${esc(t('vidFile'))}</span>
          <div class="vid-file" data-filezone tabindex="0" role="button">
            <span class="vid-file__icon">🎬</span>
            <span class="vid-file__name" data-filename>${esc(video?.video_path ? video.video_path.split('/').pop() : t('vidPickFile'))}</span>
            <span class="xs muted">${esc(t('vidFileHint').replace('{mb}', VIDEO_MAX_MB))}</span>
            <input type="file" accept="${VIDEO_MIME.join(',')}" hidden>
          </div>
          <div class="row" style="margin-top:8px">
            <button type="button" class="btn btn--ghost btn--sm" data-clearfile hidden>✕ ${esc(t('vidClearFile'))}</button>
          </div>
          <div class="field__err" data-srcerr></div>
        </div>

        <div class="modal__actions span-2">
          <button type="button" class="btn btn--outline" data-x>${esc(t('cancel'))}</button>
          <button type="submit" class="btn btn--primary">${esc(t('save'))}</button>
        </div>
      </form>`,
  });

  el.querySelector('[data-thumb]').appendChild(thumb.el);
  el.querySelector('[data-x]').onclick = close;

  // --- file picker ---
  const zone = el.querySelector('[data-filezone]');
  const input = zone.querySelector('input');
  const nameEl = el.querySelector('[data-filename]');
  const clearBtn = el.querySelector('[data-clearfile]');

  const paintFile = () => {
    const label = pickedFile ? pickedFile.name
      : keptPath ? keptPath.split('/').pop()
        : t('vidPickFile');
    nameEl.textContent = label;
    zone.classList.toggle('on', !!(pickedFile || keptPath));
    clearBtn.hidden = !(pickedFile || keptPath);
  };
  paintFile();

  zone.onclick = () => input.click();
  zone.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); input.click(); } };
  input.onchange = () => {
    const f = input.files?.[0];
    input.value = '';
    if (!f) return;
    if (!VIDEO_MIME.includes(f.type)) return toast(t('vidBadType'), 'warning');
    if (f.size > VIDEO_MAX_MB * 1024 * 1024) return toast(t('vidTooBig').replace('{mb}', VIDEO_MAX_MB), 'warning');
    pickedFile = f;
    paintFile();
  };
  ['dragenter', 'dragover'].forEach(ev => zone.addEventListener(ev, (e) => { e.preventDefault(); zone.classList.add('is-drag'); }));
  ['dragleave', 'drop'].forEach(ev => zone.addEventListener(ev, (e) => { e.preventDefault(); zone.classList.remove('is-drag'); }));
  zone.addEventListener('drop', (e) => {
    const f = e.dataTransfer?.files?.[0];
    if (!f) return;
    if (!VIDEO_MIME.includes(f.type)) return toast(t('vidBadType'), 'warning');
    if (f.size > VIDEO_MAX_MB * 1024 * 1024) return toast(t('vidTooBig').replace('{mb}', VIDEO_MAX_MB), 'warning');
    pickedFile = f;
    paintFile();
  });
  clearBtn.onclick = () => { pickedFile = null; keptPath = null; paintFile(); };

  // --- save ---
  const form = el.querySelector('form');
  const srcErr = el.querySelector('[data-srcerr]');
  const submitBtn = form.querySelector('[type="submit"]');

  form.onsubmit = async (e) => {
    e.preventDefault();
    srcErr.textContent = '';
    if (!validateForm(form, { title: [rules.required] })) return;
    const d = readForm(form);
    const url = (d.video_url || '').trim();

    // Mirrors the videos_need_a_source CHECK constraint.
    if (!url && !pickedFile && !keptPath) { srcErr.textContent = t('vidNeedSource'); return; }
    if (url && !isHttpUrl(url)) { srcErr.textContent = t('vidBadUrl'); return; }

    submitBtn.disabled = true;
    const restore = () => { submitBtn.disabled = false; };
    try {
      const id = video?.id || uid();
      const thumbs = await thumb.commit('videos/' + id);

      let videoPath = keptPath;
      if (pickedFile) {
        const ext = (pickedFile.name.match(/\.(\w+)$/) || [, 'mp4'])[1].toLowerCase();
        videoPath = `videos/${id}/${uid()}.${ext}`;
        await storage.upload(pickedFile, videoPath);
      }
      // Dropping a file that used to be stored? Clean the object up.
      if (video?.video_path && video.video_path !== videoPath) {
        await storage.remove([video.video_path]).catch(() => {});
      }

      const row = {
        title: d.title.trim(),
        description: (d.description || '').trim() || null,
        thumbnail: thumbs[0] || null,
        video_url: url || null,
        video_path: videoPath || null,
      };
      if (isNew) await createVideo({ id, ...row, created_by: me()?.id || null });
      else await updateVideo(video.id, row);

      close();
      toast(t('saved'));
      onDone();
    } catch (err) {
      toast(err.message, 'error');
      restore();
    }
  };
}

// ---- Card ------------------------------------------------------------------
function videoCard(v, manage) {
  const poster = posterUrl(v);
  return `
    <article class="card card--flush card--hover vcard" data-play="${esc(v.id)}" tabindex="0" role="button"
      aria-label="${esc(t('vidPlay'))}: ${esc(v.title)}">
      <div class="vcard__media">
        ${poster
          ? `<img class="img-fade" src="${esc(poster)}" loading="lazy" onload="this.classList.add('is-loaded')" alt="">`
          : `<div class="vcard__ph">🎬</div>`}
        <span class="vcard__play" aria-hidden="true">▶</span>
        <span class="badge vcard__src">${esc(sourceLabel(v))}</span>
      </div>
      <div class="vcard__body">
        <div class="vcard__title truncate">${esc(v.title)}</div>
        ${v.description ? `<div class="vcard__desc">${esc(v.description)}</div>` : ''}
        <div class="xs muted">${esc(fmtDate(v.created_at))}</div>
        ${manage ? `
          <div class="row vcard__tools" style="gap:8px" data-stop>
            <button class="btn btn--outline btn--sm" data-edit="${esc(v.id)}">✏️ ${esc(t('edit'))}</button>
            <button class="btn btn--danger btn--sm" data-del="${esc(v.id)}" style="margin-inline-start:auto"
              aria-label="${esc(t('del'))}">🗑️</button>
          </div>` : ''}
      </div>
    </article>`;
}

// ---- Page ------------------------------------------------------------------
export async function pageVideos() {
  const videos = await loadVideos();
  const manage = can('videos:manage');
  const el = document.createElement('div');

  el.innerHTML = `
    ${pagehead(t('vidTitle'), t('vidSub'),
      manage ? `<button class="btn btn--primary" id="add">＋ ${esc(t('vidAdd'))}</button>` : '')}
    ${videos.length
      ? `<div class="grid grid--3 vgrid">${videos.map(v => videoCard(v, manage)).join('')}</div>`
      : `<div class="empty"><div class="empty__icon">🎬</div>${esc(t('noVideos'))}
          ${manage ? `<div class="xs muted" style="margin-top:6px">${esc(t('vidEmptyHint'))}</div>` : ''}</div>`}`;

  const byId = (id) => videos.find(v => v.id === id);

  el.querySelector('#add')?.addEventListener('click', () => openVideoForm(null, rerender));

  el.querySelectorAll('[data-play]').forEach(c => {
    const open = (e) => {
      if (e.target.closest('[data-stop]')) return;
      playVideo(byId(c.dataset.play));
    };
    c.addEventListener('click', open);
    c.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(e); }
    });
  });

  el.querySelectorAll('[data-edit]').forEach(b => b.onclick = () =>
    openVideoForm(byId(b.dataset.edit), rerender));

  el.querySelectorAll('[data-del]').forEach(b => b.onclick = async () => {
    const v = byId(b.dataset.del);
    if (!(await confirmDlg({ message: t('confirmDeleteVideo') }))) return;
    try {
      await removeVideo(v.id);
      // Best-effort cleanup of the objects the row owned.
      const paths = [v.video_path, v.thumbnail].filter(Boolean);
      if (paths.length) await storage.remove(paths).catch(() => {});
      toast(t('deleted'));
      rerender();
    } catch (err) { toast(err.message, 'error'); }
  });

  return el;
}
