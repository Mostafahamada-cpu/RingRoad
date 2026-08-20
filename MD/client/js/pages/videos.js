// Videos — the public video library.
// Premium card grid; playback happens in a focused modal so the visitor never
// leaves the page they were browsing.
import { esc } from '../lib/format.js';
import { icon } from '../lib/icons.js';
import { loadVideos, allVideos, videoById, videoSource, posterUrl } from '../lib/videos.js';
import { openModal, emptyState } from '../lib/ui.js';

function playerHtml(v) {
  const s = videoSource(v);
  if (!s) {
    return `<div class="c-vstage c-vstage--empty">${icon('film', 'ic--xl')}<span>This video is unavailable.</span></div>`;
  }
  if (s.kind === 'file') {
    const poster = v.thumbnail ? posterUrl(v) : null;
    return `<div class="c-vstage">
      <video class="c-vplayer" controls autoplay playsinline preload="metadata"
        ${poster ? `poster="${esc(poster)}"` : ''} src="${esc(s.src)}"></video>
    </div>`;
  }
  return `<div class="c-vstage">
    <iframe class="c-vplayer" src="${esc(s.src)}?autoplay=1&rel=0"
      title="${esc(v.title || 'Video')}" loading="lazy" frameborder="0"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; picture-in-picture; fullscreen"
      allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe>
  </div>`;
}

export function openVideo(v) {
  if (!v) return;
  openModal({
    title: v.title || 'Video',
    size: 'lg',
    body: `
      <div class="c-vmodal">
        ${playerHtml(v)}
        ${v.description ? `<p class="c-vmodal__desc">${esc(v.description)}</p>` : ''}
      </div>`,
  });
}

function videoCard(v) {
  const poster = posterUrl(v);
  return `
    <article class="c-vcard" data-video="${esc(v.id)}" tabindex="0" role="button"
      aria-label="Play ${esc(v.title || 'video')}">
      <div class="c-vcard__media">
        ${poster
          ? `<img class="img-fade" src="${esc(poster)}" loading="lazy" decoding="async"
               onload="this.classList.add('is-loaded')" alt="">`
          : `<div class="c-vcard__ph">${icon('film', 'ic--xl')}</div>`}
        <span class="c-vcard__play">${icon('playFilled')}</span>
      </div>
      <div class="c-vcard__body">
        <h3 class="c-vcard__title">${esc(v.title || 'Untitled')}</h3>
        ${v.description ? `<p class="c-vcard__desc">${esc(v.description)}</p>` : ''}
      </div>
    </article>`;
}

export async function pageVideos(view) {
  view.innerHTML = `
    <header class="c-head">
      <span class="c-eyebrow">Media</span>
      <h1>Videos</h1>
      <p>Property tours, project walkthroughs and guides from the Ring Roads team.</p>
    </header>
    <div id="vresults">
      <div class="c-vgrid">
        ${Array.from({ length: 6 }, () => `
          <div class="c-vskel"><div class="skel skel-block"></div>
            <div class="c-vskel__body">
              <div class="skel skel-line" style="width:70%"></div>
              <div class="skel skel-line" style="width:45%"></div>
            </div></div>`).join('')}
      </div>
    </div>`;

  const host = view.querySelector('#vresults');

  try {
    await loadVideos();
  } catch (err) {
    host.innerHTML = emptyState({ icon: 'alert', title: 'Could not load videos', text: err.message });
    return;
  }

  const rows = allVideos();
  if (!rows.length) {
    host.innerHTML = emptyState({
      icon: 'film',
      title: 'No videos published yet',
      text: 'Property tours and walkthroughs will appear here soon.',
    });
    return;
  }

  host.innerHTML = `<div class="c-vgrid">${rows.map(videoCard).join('')}</div>`;

  host.querySelectorAll('[data-video]').forEach(cardEl => {
    const open = () => openVideo(videoById(cardEl.dataset.video));
    cardEl.addEventListener('click', open);
    cardEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); }
    });
  });
}
