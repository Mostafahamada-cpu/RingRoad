// Property media: swipeable main stage, thumb strip, fullscreen lightbox.
//
// Media is a single ordered list of ITEMS, not just images — a property's
// video sits in the same strip as its photos so the client meets it where they
// already are, rather than on a separate page. Video slides show a poster with
// a play affordance and open a player on click; image slides open the lightbox.
// Only the first item is eager; the rest load lazily so a phone on 3G still
// paints the page fast.
import { esc } from '../lib/format.js';
import { icon } from '../lib/icons.js';
import { imageUrl } from '../lib/api.js';
import { videoSource, posterUrl, isPlayable } from '../lib/videos.js';
import { openModal } from '../lib/ui.js';

/** Builds the player markup for one video, picking the renderer by source. */
function playerHtml(v) {
  const s = videoSource(v);
  if (!s) return `<div class="c-vstage c-vstage--empty">${icon('film', 'ic--xl')}<span>This video is unavailable.</span></div>`;
  if (s.kind === 'file') {
    const poster = posterUrl(v);
    return `<div class="c-vstage">
      <video class="c-vplayer" controls autoplay playsinline preload="metadata"
        ${poster ? `poster="${esc(poster)}"` : ''} src="${esc(s.src)}"></video>
    </div>`;
  }
  // `rel=0` is a YouTube parameter; Vimeo ignores it but sending it is sloppy,
  // so each provider gets only the params it actually understands.
  const params = s.kind === 'youtube' ? 'autoplay=1&rel=0&modestbranding=1' : 'autoplay=1';
  return `<div class="c-vstage">
    <iframe class="c-vplayer" src="${esc(s.src)}?${params}"
      title="${esc(v.title || 'Property video')}" loading="lazy" frameborder="0"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; picture-in-picture; fullscreen"
      allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe>
  </div>`;
}

export function openVideo(v) {
  if (!v) return;
  openModal({
    title: v.title || 'Property video',
    size: 'lg',
    body: `<div class="c-vmodal">
      ${playerHtml(v)}
      ${v.description ? `<p class="c-vmodal__desc">${esc(v.description)}</p>` : ''}
    </div>`,
  });
}

/**
 * @param {string[]} paths   image storage paths
 * @param {string}   alt
 * @param {object[]} videos  property videos (may be empty)
 */
export function gallery(paths, alt = '', videos = []) {
  const el = document.createElement('div');

  const images = (Array.isArray(paths) ? paths : []).map(imageUrl).filter(Boolean)
    .map(url => ({ kind: 'image', url }));
  // A video with no resolvable source would render a dead slide — drop it.
  const clips = (Array.isArray(videos) ? videos : []).filter(isPlayable)
    .map(v => ({ kind: 'video', video: v, url: posterUrl(v) }));

  // Video sits directly after the cover photo: prominent enough to be found,
  // without displacing the shot that sells the property.
  const items = images.length
    ? [images[0], ...clips, ...images.slice(1)]
    : clips;

  if (!items.length) {
    el.innerHTML = `<div class="gal"><div class="gal__main gal__main--empty">${icon('image', 'ic--xl')}</div></div>`;
    return el;
  }

  let idx = 0;
  const go = (n) => { idx = (n + items.length) % items.length; render(); };
  const imageUrls = () => items.filter(i => i.kind === 'image').map(i => i.url);

  function stageHtml(it, eager) {
    if (it.kind === 'video') {
      return `
        <div class="gal__video" role="button" tabindex="0" aria-label="Play ${esc(it.video.title || 'property video')}">
          ${it.url
            ? `<img class="img-fade" src="${esc(it.url)}" alt="" ${eager ? 'fetchpriority="high"' : 'loading="lazy"'}
                 decoding="async" onload="this.classList.add('is-loaded')">`
            : `<div class="gal__video-ph">${icon('film', 'ic--xl')}</div>`}
          <span class="gal__playbtn">${icon('playFilled')}</span>
          <span class="gal__videolabel">${icon('film', 'ic--sm')} ${esc(it.video.title || 'Video tour')}</span>
        </div>`;
    }
    return `<img class="img-fade" src="${esc(it.url)}" alt="${esc(alt)}"
       ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async"
       onload="this.classList.add('is-loaded')">`;
  }

  function render() {
    const it = items[idx];
    el.innerHTML = `
      <div class="gal">
        <div class="gal__main ${it.kind === 'video' ? 'gal__main--video' : ''}">
          ${stageHtml(it, idx === 0)}
        </div>
        ${items.length > 1 ? `
          <button class="gal__nav gal__nav--prev" data-nav="-1" aria-label="Previous">${icon('chevronLeft')}</button>
          <button class="gal__nav gal__nav--next" data-nav="1" aria-label="Next">${icon('chevronRight')}</button>
          <span class="gal__count">${idx + 1} / ${items.length}</span>` : ''}
      </div>
      ${items.length > 1 ? `<div class="gal__strip" dir="ltr">
        ${items.map((m, i) => `
          <button class="gal__thumb ${i === idx ? 'on' : ''} ${m.kind === 'video' ? 'gal__thumb--video' : ''}"
                  data-go="${i}" aria-label="${m.kind === 'video' ? 'Video' : 'Photo ' + (i + 1)}">
            ${m.url ? `<img src="${esc(m.url)}" loading="lazy" alt="">` : `<span class="gal__thumb-ph">${icon('film', 'ic--sm')}</span>`}
            ${m.kind === 'video' ? `<span class="gal__thumb-play">${icon('playFilled', 'ic--xs')}</span>` : ''}
          </button>`).join('')}
      </div>` : ''}`;

    el.querySelectorAll('[data-nav]').forEach(b => b.onclick = () => go(idx + Number(b.dataset.nav)));
    el.querySelectorAll('[data-go]').forEach(t => t.onclick = () => go(Number(t.dataset.go)));

    const stage = el.querySelector('.gal__main');
    if (it.kind === 'video') {
      const open = () => openVideo(it.video);
      const hot = el.querySelector('.gal__video');
      hot.addEventListener('click', open);
      hot.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); }
      });
    } else {
      const main = stage.querySelector('img');
      // The lightbox only ever cycles photos, so map to the image-only index.
      if (main) main.onclick = () => openLightbox(imageUrls(), imageUrls().indexOf(it.url), alt);
    }

    // swipe between slides on touch devices
    let x0 = null;
    stage.addEventListener('touchstart', (e) => { x0 = e.changedTouches[0].clientX; }, { passive: true });
    stage.addEventListener('touchend', (e) => {
      if (x0 == null) return;
      const dx = e.changedTouches[0].clientX - x0;
      x0 = null;
      if (Math.abs(dx) > 45) go(idx + (dx < 0 ? 1 : -1));
    }, { passive: true });
  }

  render();
  return el;
}

function openLightbox(urls, start, alt) {
  if (!urls.length) return;
  let i = Math.max(0, start);
  const lb = document.createElement('div');
  lb.className = 'lightbox';
  const paint = () => { lb.innerHTML = `<img src="${esc(urls[i])}" alt="${esc(alt)}">`; };
  paint();
  const onKey = (e) => {
    if (e.key === 'Escape') close();
    if (e.key === 'ArrowRight') { i = (i + 1) % urls.length; paint(); }
    if (e.key === 'ArrowLeft') { i = (i - 1 + urls.length) % urls.length; paint(); }
  };
  const close = () => { document.removeEventListener('keydown', onKey); lb.remove(); };
  lb.onclick = close;
  document.addEventListener('keydown', onKey);
  document.body.appendChild(lb);
}
