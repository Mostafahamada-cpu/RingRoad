// Anonymous, device-local state: favorites + comparison basket.
//
// No account, no server round-trip. Both lists are kept in localStorage keyed
// by the property CODE (RR-1024) so they survive refreshes, new tabs and later
// visits on the same browser, and so a saved item stays resolvable even if the
// underlying row is re-created. Everything degrades to memory-only when storage
// is unavailable (private mode / storage disabled).
import { FAVS_KEY, CMP_KEY, MAX_COMPARE } from '../config.js';

const listeners = new Set();
export function onChange(fn) { listeners.add(fn); return () => listeners.delete(fn); }
function emit() { listeners.forEach(fn => { try { fn(); } catch (e) { console.error(e); } }); }

const memory = {};   // fallback when localStorage throws (Safari private mode)

function read(key) {
  try {
    const raw = localStorage.getItem(key);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr.filter(v => typeof v === 'string') : [];
  } catch (_) {
    return memory[key] || [];
  }
}

function write(key, list) {
  memory[key] = list;
  try { localStorage.setItem(key, JSON.stringify(list)); } catch (_) { /* memory-only */ }
  emit();
}

/** Stable identity for a listing across sessions: the RingRoad code, else uuid. */
export const keyOf = (l) => String((typeof l === 'string' ? l : (l?.code || l?.id)) || '');

// ── favorites ───────────────────────────────────────────────────────────────
export const favorites = () => read(FAVS_KEY);
export const favCount = () => favorites().length;
export const isFavorite = (l) => favorites().includes(keyOf(l));

/** Toggles and returns the new state (true = now saved). */
export function toggleFavorite(l) {
  const k = keyOf(l);
  if (!k) return false;
  const list = favorites();
  const i = list.indexOf(k);
  if (i >= 0) list.splice(i, 1); else list.unshift(k);
  write(FAVS_KEY, list);
  return i < 0;
}

export function clearFavorites() { write(FAVS_KEY, []); }

// ── compare basket (max 4) ──────────────────────────────────────────────────
export const compareList = () => read(CMP_KEY).slice(0, MAX_COMPARE);
export const compareCount = () => compareList().length;
export const inCompare = (l) => compareList().includes(keyOf(l));
export const compareFull = () => compareCount() >= MAX_COMPARE;

/**
 * Adds/removes a property. Returns:
 *   'added' | 'removed' | 'full'   ('full' = the 4-property cap was hit)
 */
export function toggleCompare(l) {
  const k = keyOf(l);
  if (!k) return 'removed';
  const list = compareList();
  const i = list.indexOf(k);
  if (i >= 0) { list.splice(i, 1); write(CMP_KEY, list); return 'removed'; }
  if (list.length >= MAX_COMPARE) return 'full';
  list.push(k);
  write(CMP_KEY, list);
  return 'added';
}

export function removeFromCompare(l) {
  const list = compareList().filter(k => k !== keyOf(l));
  write(CMP_KEY, list);
}

export function clearCompare() { write(CMP_KEY, []); }

// Keep every open tab in sync (favoriting on one tab updates the others).
window.addEventListener('storage', (e) => {
  if (e.key === FAVS_KEY || e.key === CMP_KEY) emit();
});
