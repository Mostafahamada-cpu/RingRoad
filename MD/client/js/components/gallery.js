// Large image gallery: swipeable main slide, thumb strip, fullscreen lightbox.
// Only the first image is eager; the rest load lazily so a phone on 3G still
// paints the page fast.
import { esc } from '../lib/format.js';
import { imageUrl } from '../lib/api.js';

export function gallery(paths, alt = '') {
  const el = document.createElement('div');
  const urls = (Array.isArray(paths) ? paths : []).map(imageUrl).filter(Boolean);

  if (!urls.length) {
    el.innerHTML = '<div class="gal"><div class="gal__main" style="display:flex;align-items:center;justify-content:center;font-size:48px">🏛️</div></div>';
    return el;
  }

  let idx = 0;
  const go = (n) => { idx = (n + urls.length) % urls.length; render(); };

  function render() {
    el.innerHTML = `
      <div class="gal">
        <div class="gal__main">
          <img class="img-fade" src="${esc(urls[idx])}" alt="${esc(alt)}"
               ${idx === 0 ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async"
               onload="this.classList.add('is-loaded')">
        </div>
        ${urls.length > 1 ? `
          <button class="gal__nav gal__nav--prev" data-nav="-1" aria-label="Previous image">‹</button>
          <button class="gal__nav gal__nav--next" data-nav="1" aria-label="Next image">›</button>
          <span class="gal__count">${idx + 1} / ${urls.length}</span>` : ''}
      </div>
      ${urls.length > 1 ? `<div class="gal__strip" dir="ltr">
        ${urls.map((u, i) => `<img src="${esc(u)}" loading="lazy" class="${i === idx ? 'on' : ''}" data-go="${i}" alt="">`).join('')}
      </div>` : ''}`;

    el.querySelectorAll('[data-nav]').forEach(b => b.onclick = () => go(idx + Number(b.dataset.nav)));
    el.querySelectorAll('[data-go]').forEach(im => im.onclick = () => go(Number(im.dataset.go)));

    const main = el.querySelector('.gal__main img');
    main.onclick = () => openLightbox(urls, idx, alt);

    // swipe between slides on touch devices
    let x0 = null;
    const stage = el.querySelector('.gal__main');
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
  let i = start;
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
