// In-memory catalogue of the published stock.
//
// The whole public feed is fetched once and then filtered/sorted locally, which
// is what makes the filters feel instant on a phone. Lookups are keyed by both
// the RingRoad code and the uuid so favorites, compare and deep links all
// resolve through the same map.
import { fetchListings, fetchListing } from './api.js';

let rows = null;
let inflight = null;
const index = new Map();

function reindex(list) {
  index.clear();
  list.forEach(l => {
    if (l.code) index.set(String(l.code), l);
    if (l.id) index.set(String(l.id), l);
  });
}

/** All publicly visible properties (cached after the first call). */
export async function loadAll({ force = false } = {}) {
  if (rows && !force) return rows;
  if (!inflight) {
    inflight = fetchListings()
      .then(list => { rows = Array.isArray(list) ? list : []; reindex(rows); return rows; })
      .finally(() => { inflight = null; });
  }
  return inflight;
}

export const all = () => rows || [];
export const isLoaded = () => rows !== null;
export const get = (key) => index.get(String(key)) || null;

/** Resolve one property, falling back to a single-row fetch for deep links. */
export async function getOne(key) {
  const hit = get(key);
  if (hit) return hit;
  const row = await fetchListing(key);
  if (row) {
    if (row.code) index.set(String(row.code), row);
    if (row.id) index.set(String(row.id), row);
  }
  return row;
}

/** Resolve a saved key list (favorites / compare) to listings, order preserved. */
export function resolveMany(keys) {
  return keys.map(k => get(k)).filter(Boolean);
}

const uniqSorted = (vals) => [...new Set(vals.filter(v => v != null && String(v).trim() !== ''))]
  .map(String).sort((a, b) => a.localeCompare(b));

/** Filter dropdown options, derived from the stock that actually exists. */
export function facets() {
  const list = all();
  return {
    cities: uniqSorted(list.map(l => l.city)),
    governorates: uniqSorted(list.map(l => l.governorate)),
    projects: uniqSorted(list.map(l => l.project)),
    ptypes: uniqSorted(list.map(l => l.ptype)),
    finishings: uniqSorted(list.map(l => l.finishing)),
  };
}
