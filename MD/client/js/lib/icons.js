// Inline SVG icon set for the client portal.
//
// Replaces the emoji the portal used to render in navigation, cards, filters
// and empty states. Emoji render differently on every OS, carry their own
// colour, and read as playful rather than premium — these are stroke-based,
// inherit `currentColor`, and align optically at any size.
//
// Usage:  icon('bed')            -> markup string, 20px, currentColor
//         icon('bed', 'ic--sm')  -> extra class
//         iconEl('bed')          -> a real element

const P = 'stroke="currentColor" fill="none" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"';

const PATHS = {
  // ── navigation ────────────────────────────────────────────────────────────
  building: `<path ${P} d="M3 21h18M5 21V6.5a1.5 1.5 0 0 1 1.5-1.5h6A1.5 1.5 0 0 1 14 6.5V21M14 11h3.5A1.5 1.5 0 0 1 19 12.5V21"/><path ${P} d="M8 9h3M8 13h3M8 17h3M16.5 15h.01M16.5 18h.01"/>`,
  heart: `<path ${P} d="M12 20s-7.2-4.4-9.1-8.6C1.4 8.1 3.2 4.8 6.5 4.4c2-.3 3.9.7 5 2.3 1.1-1.6 3-2.6 5-2.3 3.3.4 5.1 3.7 3.6 7C19.2 15.6 12 20 12 20Z"/>`,
  heartFilled: `<path fill="currentColor" d="M12 20s-7.2-4.4-9.1-8.6C1.4 8.1 3.2 4.8 6.5 4.4c2-.3 3.9.7 5 2.3 1.1-1.6 3-2.6 5-2.3 3.3.4 5.1 3.7 3.6 7C19.2 15.6 12 20 12 20Z"/>`,
  scale: `<path ${P} d="M12 4v16M7 20h10M4.5 8 12 6l7.5 2"/><path ${P} d="M4.5 8 2 14a2.5 2.5 0 0 0 5 0L4.5 8ZM19.5 8 17 14a2.5 2.5 0 0 0 5 0L19.5 8Z"/>`,
  play: `<path ${P} d="M8 5.5v13l11-6.5-11-6.5Z"/>`,
  playFilled: `<path fill="currentColor" d="M8 5.5v13l11-6.5-11-6.5Z"/>`,
  film: `<rect ${P} x="3" y="4.5" width="18" height="15" rx="2.5"/><path ${P} d="M8 4.5v15M16 4.5v15M3 9.5h5M3 14.5h5M16 9.5h5M16 14.5h5"/>`,

  // ── property attributes ───────────────────────────────────────────────────
  bed: `<path ${P} d="M3 18v-8m0 4h18v4M3 14V8a1 1 0 0 1 1-1h6.5a1 1 0 0 1 1 1v6M21 14v-2.5a2.5 2.5 0 0 0-2.5-2.5H11.5"/><circle ${P} cx="7" cy="11" r="1.4"/>`,
  bath: `<path ${P} d="M3 12h18v2.5a4.5 4.5 0 0 1-4.5 4.5h-9A4.5 4.5 0 0 1 3 14.5V12Z"/><path ${P} d="M6 12V6.2A2.2 2.2 0 0 1 8.2 4c1 0 1.8.6 2.1 1.5M6 19l-1 2M18 19l1 2"/>`,
  ruler: `<path ${P} d="M4 15.5 15.5 4l4.5 4.5L8.5 20 4 15.5Z"/><path ${P} d="M8 11.5l1.8 1.8M11 8.5l1.8 1.8M14 5.5l1.8 1.8"/>`,
  tag: `<path ${P} d="M3.5 11.2V4.5A1 1 0 0 1 4.5 3.5h6.7a1 1 0 0 1 .7.3l8.3 8.3a1 1 0 0 1 0 1.4l-6.7 6.7a1 1 0 0 1-1.4 0L3.8 11.9a1 1 0 0 1-.3-.7Z"/><circle ${P} cx="7.8" cy="7.8" r="1.3"/>`,
  pin: `<path ${P} d="M12 21s7-5.6 7-11a7 7 0 1 0-14 0c0 5.4 7 11 7 11Z"/><circle ${P} cx="12" cy="10" r="2.6"/>`,
  layers: `<path ${P} d="m12 3 9 5-9 5-9-5 9-5Z"/><path ${P} d="m3.5 12.5 8.5 4.7 8.5-4.7"/>`,
  palette: `<path ${P} d="M12 21a9 9 0 1 1 0-18c4.9 0 9 3.4 9 7.5 0 2.5-2.1 4-4.3 4H15a2 2 0 0 0-1.5 3.3c.4.5.1 1.2-.6 1.2H12Z"/><circle ${P} cx="7.5" cy="11" r="1"/><circle ${P} cx="10" cy="7.5" r="1"/><circle ${P} cx="14.5" cy="7.8" r="1"/>`,
  car: `<path ${P} d="M4.5 16.5h15M5 16.5v2M19 16.5v2"/><path ${P} d="M4.2 16.5v-3.2l1.6-4A2 2 0 0 1 7.7 8h8.6a2 2 0 0 1 1.9 1.3l1.6 4v3.2"/><path ${P} d="M4.8 13.3h14.4M7.5 15h.01M16.5 15h.01"/>`,
  star: `<path ${P} d="m12 4 2.4 4.9 5.4.8-3.9 3.8.9 5.4-4.8-2.5-4.8 2.5.9-5.4-3.9-3.8 5.4-.8L12 4Z"/>`,
  starFilled: `<path fill="currentColor" d="m12 4 2.4 4.9 5.4.8-3.9 3.8.9 5.4-4.8-2.5-4.8 2.5.9-5.4-3.9-3.8 5.4-.8L12 4Z"/>`,
  calendar: `<rect ${P} x="3" y="5" width="18" height="16" rx="2.5"/><path ${P} d="M3 10h18M8 3v4M16 3v4"/>`,
  key: `<circle ${P} cx="8" cy="12" r="4"/><path ${P} d="M12 12h9M17.5 12v3M20 12v2.2"/>`,
  sparkle: `<path ${P} d="m12 3.5 1.9 5.3 5.3 1.9-5.3 1.9L12 17.9l-1.9-5.3L4.8 10.7l5.3-1.9L12 3.5Z"/><path ${P} d="M18.5 17.5 19 19l1.5.5-1.5.5-.5 1.5-.5-1.5L16.5 19l1.5-.5.5-1.5Z"/>`,
  wallet: `<path ${P} d="M3.5 7.5A2 2 0 0 1 5.5 5.5h11a2 2 0 0 1 2 2v1"/><rect ${P} x="3.5" y="7.5" width="17" height="11" rx="2"/><path ${P} d="M20.5 11.5h-3.2a1.8 1.8 0 0 0 0 3.6h3.2"/>`,

  // ── ui ────────────────────────────────────────────────────────────────────
  search: `<circle ${P} cx="11" cy="11" r="6.5"/><path ${P} d="m20 20-3.6-3.6"/>`,
  sliders: `<path ${P} d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle ${P} cx="15" cy="7" r="2.2"/><circle ${P} cx="9" cy="17" r="2.2"/>`,
  close: `<path ${P} d="m6 6 12 12M18 6 6 18"/>`,
  chevronDown: `<path ${P} d="m6 9 6 6 6-6"/>`,
  chevronLeft: `<path ${P} d="m15 5-7 7 7 7"/>`,
  chevronRight: `<path ${P} d="m9 5 7 7-7 7"/>`,
  arrowLeft: `<path ${P} d="M20 12H4M10 6l-6 6 6 6"/>`,
  arrowRight: `<path ${P} d="M4 12h16M14 6l6 6-6 6"/>`,
  check: `<path ${P} d="m5 12.5 4.5 4.5L19 7"/>`,
  checkCircle: `<circle ${P} cx="12" cy="12" r="8.5"/><path ${P} d="m8.5 12.3 2.4 2.4 4.6-5"/>`,
  alert: `<path ${P} d="M12 4 2.8 20h18.4L12 4Z"/><path ${P} d="M12 10v4.2M12 17.4h.01"/>`,
  info: `<circle ${P} cx="12" cy="12" r="8.5"/><path ${P} d="M12 11.2v5M12 8.2h.01"/>`,
  ban: `<circle ${P} cx="12" cy="12" r="8.5"/><path ${P} d="m6.2 6.2 11.6 11.6"/>`,
  image: `<rect ${P} x="3" y="5" width="18" height="14" rx="2.5"/><circle ${P} cx="8.5" cy="10" r="1.6"/><path ${P} d="m4 17 4.6-4.2a1.6 1.6 0 0 1 2.2.05L15 17M14.5 14l1.6-1.5a1.6 1.6 0 0 1 2.2 0L21 15"/>`,
  phone: `<path ${P} d="M6.2 3.5h2.6l1.4 4-1.9 1.4a11.5 11.5 0 0 0 5.4 5.4l1.4-1.9 4 1.4v2.6a2 2 0 0 1-2.2 2A16.5 16.5 0 0 1 4.2 5.7a2 2 0 0 1 2-2.2Z"/>`,
  whatsapp: `<path ${P} d="M20.2 11.7a8.2 8.2 0 0 1-12.1 7.2L3.8 20.2l1.4-4.2A8.2 8.2 0 1 1 20.2 11.7Z"/><path ${P} d="M9.2 8.6c.3-.1.6 0 .8.3l.7 1.2c.1.3.1.6-.1.8l-.5.5a5.6 5.6 0 0 0 2.5 2.5l.5-.5c.2-.2.5-.2.8-.1l1.2.7c.3.2.4.5.3.8-.3.8-1.2 1.3-2 1.1a8 8 0 0 1-5.5-5.5c-.2-.8.3-1.6 1.1-1.9Z"/>`,
  message: `<path ${P} d="M20.5 11.8a7.8 7.8 0 0 1-11.4 7L4 20.3l1.5-5.1a7.8 7.8 0 1 1 15 -3.4Z"/>`,
  send: `<path ${P} d="M20.5 3.5 10 14M20.5 3.5 14 20.5l-4-6.5-6.5-4 17-6.5Z"/>`,
  share: `<circle ${P} cx="18" cy="5.5" r="2.5"/><circle ${P} cx="6" cy="12" r="2.5"/><circle ${P} cx="18" cy="18.5" r="2.5"/><path ${P} d="m8.2 10.8 7.6-4M8.2 13.2l7.6 4"/>`,
  copy: `<rect ${P} x="9" y="9" width="11.5" height="11.5" rx="2"/><path ${P} d="M5.5 15H4.5a1 1 0 0 1-1-1V4.5a1 1 0 0 1 1-1H14a1 1 0 0 1 1 1v1"/>`,
  external: `<path ${P} d="M14 4h6v6M20 4l-8.5 8.5"/><path ${P} d="M18 14.5V19a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 4 19V8a1.5 1.5 0 0 1 1.5-1.5H10"/>`,
  map: `<path ${P} d="m3.5 6.5 5.5-2 6 2 5.5-2v13l-5.5 2-6-2-5.5 2v-13Z"/><path ${P} d="M9 4.5v13M15 6.5v13"/>`,
  user: `<circle ${P} cx="12" cy="8.5" r="3.8"/><path ${P} d="M4.5 20a7.5 7.5 0 0 1 15 0"/>`,
  grid: `<rect ${P} x="3.5" y="3.5" width="7" height="7" rx="1.6"/><rect ${P} x="13.5" y="3.5" width="7" height="7" rx="1.6"/><rect ${P} x="3.5" y="13.5" width="7" height="7" rx="1.6"/><rect ${P} x="13.5" y="13.5" width="7" height="7" rx="1.6"/>`,
  refresh: `<path ${P} d="M20 12a8 8 0 1 1-2.6-5.9"/><path ${P} d="M20 4v4.5h-4.5"/>`,
};

/** Icon markup. `name` falls back to a neutral dot if unknown. */
export function icon(name, cls = '') {
  const body = PATHS[name];
  if (!body) return '';
  return `<svg class="ic ${cls}" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">${body}</svg>`;
}

/** Same, as a detached element. */
export function iconEl(name, cls = '') {
  const span = document.createElement('span');
  span.innerHTML = icon(name, cls);
  return span.firstElementChild;
}

export const hasIcon = (name) => Object.prototype.hasOwnProperty.call(PATHS, name);
