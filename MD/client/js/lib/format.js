// Escaping, money/area formatting and the human labels for the domain slugs.
// English-only on purpose: the public view stays deliberately simple.

export const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, c => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
));

export const num = (v) => { const n = parseFloat(v); return isNaN(n) ? 0 : n; };
export const isNum = (v) => v !== null && v !== undefined && v !== '' && !isNaN(parseFloat(v));

export const groupNum = (n) => Math.round(num(n)).toLocaleString('en-US');
export const money = (n) => groupNum(n) + ' EGP';

export function compactMoney(n) {
  const v = num(n), a = Math.abs(v);
  const f = (x) => { const s = x.toFixed(1); return s.endsWith('.0') ? s.slice(0, -2) : s; };
  if (a >= 1e9) return f(v / 1e9) + 'B EGP';
  if (a >= 1e6) return f(v / 1e6) + 'M EGP';
  if (a >= 1e3) return f(v / 1e3) + 'K EGP';
  return groupNum(v) + ' EGP';
}

export const areaText = (a) => isNum(a) ? groupNum(a) + ' m²' : '—';

/** Price per m² — only when BOTH numbers are real, never a guess. */
export function pricePerSqm(l) {
  const p = parseFloat(l?.price), a = parseFloat(l?.area);
  if (!isFinite(p) || !isFinite(a) || p <= 0 || a <= 0) return null;
  return p / a;
}
export function pricePerSqmText(l) {
  const v = pricePerSqm(l);
  return v == null ? null : groupNum(v) + ' EGP / m²';
}

const TITLECASE = (s) => String(s || '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

const PTYPE_LABELS = {
  apartment: 'Apartment', villa: 'Villa', townhouse: 'Townhouse', duplex: 'Duplex',
  penthouse: 'Penthouse', studio: 'Studio', chalet: 'Chalet', office: 'Office',
  retail: 'Retail', land: 'Land',
};
const FINISHING_LABELS = {
  not_finished: 'Not finished', semi_finished: 'Semi finished', fully_finished: 'Fully finished',
  super_lux: 'Super lux', ultra_super_lux: 'Ultra super lux', furnished: 'Furnished',
};
const AMENITY_LABELS = {
  pool: 'Swimming pool', gym: 'Gym', garden: 'Garden', security: '24/7 security', elevator: 'Elevator',
  balcony: 'Balcony', parking: 'Parking', central_ac: 'Central A/C', smart_home: 'Smart home',
  sea_view: 'Sea view', clubhouse: 'Clubhouse', kids_area: 'Kids area',
};

export const ptypeLabel = (v) => PTYPE_LABELS[v] || (v ? TITLECASE(v) : '—');
export const finishingLabel = (v) => FINISHING_LABELS[v] || (v ? TITLECASE(v) : null);
export const amenityLabel = (v) => AMENITY_LABELS[v] || TITLECASE(v);
export const dealTypeLabel = (v) => (v === 'rent' ? 'For Rent' : 'For Sale');

/** Rent is quoted per month; sale is a one-off figure. */
export const priceSuffix = (l) => (l?.type === 'rent' ? '/ month' : '');

export const listOf = (v) => (Array.isArray(v) ? v : []);

export function locationText(l) {
  return [l?.address, l?.city, l?.governorate].filter(Boolean).join(', ') || '—';
}
export function shortLocation(l) {
  return [l?.city, l?.governorate].filter(Boolean).join(', ') || l?.address || '—';
}

export function debounce(fn, ms = 220) {
  let tm;
  return (...args) => { clearTimeout(tm); tm = setTimeout(() => fn(...args), ms); };
}
