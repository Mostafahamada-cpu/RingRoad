// Image gallery: main slide + thumb strip + fullscreen lightbox.
import { esc } from '../lib/utils.js';
import { storage } from '../lib/supabase.js';

export function gallery(paths) {
  const el = document.createElement('div');
  if (!paths.length) {
    el.innerHTML = `<div class="gal"><div class="gal__main" style="display:flex;align-items:center;justify-content:center;font-size:44px">🏛️</div></div>`;
    return el;
  }
  const urls = paths.map(p => storage.publicUrl(p));
  let idx = 0;

  function render() {
    el.innerHTML = `
      <div class="gal">
        <div class="gal__main"><img class="img-fade" src="${esc(urls[idx])}" onload="this.classList.add('is-loaded')" alt=""></div>
        ${urls.length > 1 ? `
          <button class="gal__nav gal__nav--prev" data-nav="-1">‹</button>
          <button class="gal__nav gal__nav--next" data-nav="1">›</button>
          <span class="gal__count">${idx + 1} / ${urls.length}</span>` : ''}
      </div>
      ${urls.length > 1 ? `<div class="gal__strip" dir="ltr">
        ${urls.map((u, i) => `<img src="${esc(u)}" class="${i === idx ? 'on' : ''}" data-go="${i}" alt="">`).join('')}
      </div>` : ''}`;
    el.querySelectorAll('[data-nav]').forEach(b => b.onclick = () => {
      idx = (idx + (+b.dataset.nav) + urls.length) % urls.length; render();
    });
    el.querySelectorAll('[data-go]').forEach(im => im.onclick = () => { idx = +im.dataset.go; render(); });
    el.querySelector('.gal__main img').onclick = () => {
      const lb = document.createElement('div');
      lb.className = 'lightbox';
      lb.innerHTML = `<img src="${esc(urls[idx])}" alt="">`;
      lb.onclick = () => lb.remove();
      document.body.appendChild(lb);
    };
  }
  render();
  return el;
}
