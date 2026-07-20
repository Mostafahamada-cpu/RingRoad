// Inline-SVG charts themed via CSS variables. Colors are validated against the
// white card surface (see PLATFORM.md): --chart-1 (orange), --chart-2 (burgundy).
import { esc, compact } from './utils.js';

function tipEl() {
  let el = document.getElementById('charttip');
  if (!el) {
    el = document.createElement('div');
    el.id = 'charttip'; el.className = 'charttip';
    document.body.appendChild(el);
    document.addEventListener('mousemove', (e) => {
      const target = e.target.closest ? e.target.closest('[data-tip]') : null;
      if (target) {
        el.textContent = target.dataset.tip;
        el.classList.add('on');
        el.style.left = Math.max(4, Math.min(e.clientX + 12, innerWidth - el.offsetWidth - 8)) + 'px';
        el.style.top = Math.max(4, e.clientY - 34) + 'px';
      } else el.classList.remove('on');
    });
  }
  return el;
}

function roundedTop(x, y, w, h, r) {
  r = Math.min(r, w / 2, h);
  return `M${x},${y + r} a${r},${r} 0 0 1 ${r},-${r} h${w - 2 * r} a${r},${r} 0 0 1 ${r},${r} v${h - r} h-${w} z`;
}

// Vertical bars; optional second series (grouped).
export function barChart(items, opts = {}) {
  tipEl();
  const W = opts.width || 420, H = opts.height || 180;
  const padB = 22, padT = 16, padX = 6;
  const twoSeries = items.some(i => i.value2 != null);
  const max = Math.max(...items.flatMap(i => [i.value, i.value2 || 0]), 1);
  const iw = (W - padX * 2) / Math.max(items.length, 1);
  const bw = Math.max(5, Math.min(twoSeries ? 13 : 26, iw * (twoSeries ? 0.3 : 0.55)));
  let out = '';
  items.forEach((it, i) => {
    const cx = padX + iw * i + iw / 2;
    const bars = twoSeries ? [[it.value, 'var(--chart-1)', -bw - 1], [it.value2 || 0, 'var(--chart-2)', 1]] : [[it.value, 'var(--chart-1)', -bw / 2]];
    bars.forEach(([v, fill, off]) => {
      if (v > 0) {
        const h = Math.max(4, (H - padT - padB) * (v / max));
        out += `<path class="cbar" d="${roundedTop(cx + off, H - padB - h, bw, h, 4)}" fill="${fill}" data-tip="${esc(it.tip || it.label + ': ' + compact(v))}"></path>`;
      }
    });
    if (!twoSeries && it.value === max && it.value > 0) {
      out += `<text class="cval" x="${cx}" y="${H - padB - Math.max(4, (H - padT - padB)) - 5}" text-anchor="middle">${esc(compact(it.value))}</text>`;
    }
    out += `<text class="clab" x="${cx}" y="${H - 7}" text-anchor="middle">${esc(it.label)}</text>`;
  });
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" dir="ltr" style="display:block">
    <line x1="${padX}" y1="${H - padB}" x2="${W - padX}" y2="${H - padB}" stroke="var(--chart-grid)"/>
    ${out}</svg>`;
}

// Smooth line chart (single series).
export function lineChart(items, opts = {}) {
  tipEl();
  const W = opts.width || 420, H = opts.height || 170;
  const padB = 22, padT = 14, padX = 10;
  const max = Math.max(...items.map(i => i.value), 1);
  const ix = (W - padX * 2) / Math.max(items.length - 1, 1);
  const pts = items.map((it, i) => [padX + ix * i, H - padB - (H - padT - padB) * (it.value / max)]);
  let d = '';
  pts.forEach(([x, y], i) => {
    if (i === 0) d = `M${x},${y}`;
    else {
      const [px, py] = pts[i - 1];
      const mx = (px + x) / 2;
      d += ` C${mx},${py} ${mx},${y} ${x},${y}`;
    }
  });
  const area = d + ` L${pts[pts.length - 1][0]},${H - padB} L${pts[0][0]},${H - padB} z`;
  let dots = '', labels = '';
  items.forEach((it, i) => {
    dots += `<circle class="cbar" cx="${pts[i][0]}" cy="${pts[i][1]}" r="4.5" fill="var(--chart-1)" data-tip="${esc(it.tip || it.label + ': ' + compact(it.value))}"/>`;
    labels += `<text class="clab" x="${pts[i][0]}" y="${H - 7}" text-anchor="middle">${esc(it.label)}</text>`;
  });
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" dir="ltr" style="display:block">
    <defs><linearGradient id="lg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="var(--chart-1)" stop-opacity=".18"/><stop offset="1" stop-color="var(--chart-1)" stop-opacity="0"/>
    </linearGradient></defs>
    <line x1="${padX}" y1="${H - padB}" x2="${W - padX}" y2="${H - padB}" stroke="var(--chart-grid)"/>
    <path d="${area}" fill="url(#lg)"/>
    <path d="${d}" fill="none" stroke="var(--chart-1)" stroke-width="2.5" stroke-linecap="round"/>
    ${dots}${labels}</svg>`;
}

// Donut for ordered status splits — single-hue steps + labeled legend.
export function donut(items, opts = {}) {
  tipEl();
  const size = opts.size || 160, r = size / 2, ir = r * 0.62;
  const total = items.reduce((s, i) => s + i.value, 0) || 1;
  let angle = -Math.PI / 2, paths = '';
  const steps = ['var(--chart-1)', 'var(--chart-2)', 'var(--burg-300)', 'var(--line-strong)'];
  items.forEach((it, i) => {
    const frac = it.value / total;
    if (frac <= 0) return;
    const a2 = angle + frac * Math.PI * 2 - 0.02;
    const large = frac > 0.5 ? 1 : 0;
    const p = (a, rad) => `${r + rad * Math.cos(a)},${r + rad * Math.sin(a)}`;
    paths += `<path class="cbar" data-tip="${esc(it.label + ': ' + it.value)}" fill="${it.color || steps[i % steps.length]}"
      d="M${p(angle, r)} A${r},${r} 0 ${large} 1 ${p(a2, r)} L${p(a2, ir)} A${ir},${ir} 0 ${large} 0 ${p(angle, ir)} z"/>`;
    angle = a2 + 0.02;
  });
  const legend = items.map((it, i) =>
    `<span><span class="dot" style="background:${it.color || steps[i % steps.length]}"></span>${esc(it.label)} · <b>${it.value}</b></span>`).join('');
  return `<div class="row" style="gap:20px;flex-wrap:wrap">
    <svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" dir="ltr">${paths}
      <text x="${r}" y="${r + 5}" text-anchor="middle" style="font-size:18px;font-weight:800;fill:var(--burg-700)">${total}</text></svg>
    <div class="legend" style="flex-direction:column;align-items:flex-start;margin:0">${legend}</div></div>`;
}

// Horizontal ranked bars.
export function hbars(items, valFmt) {
  if (!items.length) return '';
  const max = Math.max(...items.map(i => i.value), 1);
  return items.map((it, i) => `
    <div class="rankrow">
      <span class="rankrow__n">${i + 1}</span>
      <span class="rankrow__name" title="${esc(it.label)}">${esc(it.label)}</span>
      <span class="rankrow__track"><span class="rankrow__fill" style="width:${Math.max(3, Math.round(100 * it.value / max))}%"></span></span>
      <span class="rankrow__val">${esc(valFmt ? valFmt(it) : compact(it.value))}</span>
    </div>`).join('');
}
