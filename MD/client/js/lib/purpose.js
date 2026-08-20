// The Resale | Primary | Rent taxonomy used by the Properties menu.
//
// `properties.type` only carries 'sale' | 'rent', so the split between primary
// (off-plan / developer stock, sold on instalments) and resale (ready, owner
// sold) is DERIVED. public_listings does the same derivation server-side
// (platform-client-portal.sql); this mirror keeps the portal working even
// against a database where that migration has not been run yet.
//
// Each purpose declares which filters are relevant to it, so the filter
// experience genuinely changes with the choice rather than just re-labelling.

export const PURPOSES = ['primary', 'resale', 'rent'];

export const PURPOSE_META = {
  primary: {
    label: 'Primary',
    tagline: 'New launches and off-plan units, sold on a payment plan',
    icon: 'sparkle',
    priceLabel: 'Price',
  },
  resale: {
    label: 'Resale',
    tagline: 'Ready homes available for immediate handover',
    icon: 'key',
    priceLabel: 'Price',
  },
  rent: {
    label: 'Rent',
    tagline: 'Long and short term rentals across Cairo and the coast',
    icon: 'calendar',
    priceLabel: 'Rent',
  },
};

export const purposeLabel = (p) => PURPOSE_META[p]?.label || '';

/**
 * Which filters each purpose exposes, in display order.
 * `downPayment` and `rentalPeriod` are declared here but only actually render
 * when the published stock has data behind them — see filters.js.
 */
export const PURPOSE_FIELDS = {
  primary: ['ptype', 'city', 'project', 'downPayment', 'price', 'beds', 'area', 'finishing'],
  resale:  ['ptype', 'city', 'project', 'price', 'beds', 'baths', 'area', 'finishing'],
  rent:    ['ptype', 'city', 'project', 'price', 'beds', 'baths', 'rentalPeriod', 'furnished'],
};

/**
 * The purpose of one listing. Prefers the server-derived/overridden column and
 * falls back to the same rule locally.
 */
export function purposeOf(l) {
  const explicit = String(l?.purpose || '').trim();
  if (PURPOSES.includes(explicit)) return explicit;
  if ((l?.type || 'sale') === 'rent') return 'rent';
  if (String(l?.payment_plan || '').trim()) return 'primary';
  const d = l?.delivery ? new Date(l.delivery) : null;
  if (d && !isNaN(d) && d > new Date()) return 'primary';
  return 'resale';
}

/** How many published listings sit under each purpose. */
export function purposeCounts(list) {
  const out = { primary: 0, resale: 0, rent: 0 };
  for (const l of list || []) out[purposeOf(l)] = (out[purposeOf(l)] || 0) + 1;
  return out;
}

// ── Rental period ───────────────────────────────────────────────────────────
export const RENTAL_PERIODS = [
  { v: 'daily', l: 'Daily' },
  { v: 'monthly', l: 'Monthly' },
  { v: 'quarterly', l: 'Quarterly' },
  { v: 'semiannual', l: 'Semi-annual' },
  { v: 'yearly', l: 'Yearly' },
];

export const rentalPeriodLabel = (v) =>
  RENTAL_PERIODS.find(p => p.v === v)?.l || '';

/**
 * Which optional fields the CURRENT stock actually supports. The portal hides
 * a filter rather than showing one that can never match anything — the
 * migration ships these columns empty on purpose.
 */
export function dataSupport(list) {
  const rows = list || [];
  return {
    downPayment: rows.some(l => l.down_payment != null && l.down_payment !== ''),
    rentalPeriod: rows.some(l => String(l.rental_period || '').trim() !== ''),
  };
}

/** Rental periods that at least one listing actually uses. */
export function availableRentalPeriods(list) {
  const present = new Set((list || []).map(l => String(l.rental_period || '').trim()).filter(Boolean));
  return RENTAL_PERIODS.filter(p => present.has(p.v));
}
