// Telesales domain: who may receive apartments, assignment + distribution calls.
//
// Mirrors public.rr_is_telesales() in platform-telesales.sql. The database is
// the authority (the RPCs re-check everything server-side); this module just
// keeps the UI honest so an admin is never offered an ineligible person.
import { db } from './supabase.js';
import { store, me, isMgmt } from './store.js';

export const TELESALES_DEPT = 'telesales';

const dept = (p) => String(p?.department || '').trim().toLowerCase();

/** Eligible to be assigned apartments: active, telesales, never admin/management. */
export function isTelesales(p) {
  return !!p
    && p.active !== false
    && dept(p) === TELESALES_DEPT
    && !['admin', 'management'].includes(p.role);
}

/** The assignment dropdown — only active telesales, sorted by name. */
export function telesalesOptions() {
  return store.profiles
    .filter(isTelesales)
    .sort((a, b) => String(a.name || a.email || '').localeCompare(String(b.name || b.email || '')))
    .map(p => ({ v: p.id, l: p.name || p.email }));
}

export const activeTelesales = () => store.profiles.filter(isTelesales);

/** Is the signed-in user a telesales employee? Drives their own dashboard. */
export const amTelesales = () => isTelesales(me());

/** Only management/admin may move apartments between people. */
export const canAssign = () => isMgmt();

/** Apartments that distribution will consider — workable stock only. */
export const isDistributable = (l) => !['sold', 'rented', 'archived'].includes(l.status);

export const isAssigned = (l) => !!l.assigned_telesales_id;

export function assigneeName(l) {
  if (!l.assigned_telesales_id) return null;
  const p = store.profiles.find(x => x.id === l.assigned_telesales_id);
  return p ? (p.name || p.email) : '—';
}

// --- server calls (all re-authorise inside the database) --------------------

/** Assign, reassign, or clear (pass null) one apartment. */
export const assignTelesales = (propertyId, telesalesId) =>
  db.rpc('rr_assign_telesales', { p_property: propertyId, p_telesales: telesalesId || null });

/** Even distribution. redistribute=false tops up only unassigned apartments. */
export const distributeApartments = (redistribute = false) =>
  db.rpc('rr_distribute_apartments', { p_redistribute: !!redistribute });

export const loadAssignmentHistory = (propertyId) =>
  db.list('telesales_assignment_history',
    `select=*&property_id=eq.${encodeURIComponent(propertyId)}&order=created_at.desc`).catch(() => []);

/** Apartments assigned to me — the telesales dashboard's only data source. */
export const loadMyApartments = () =>
  db.list('properties', `select=*&assigned_telesales_id=eq.${me()?.id}&order=created_at.desc`);

/** Human summary of a distribution result for the toast/report. */
export function describeDistribution(res) {
  if (!res) return '';
  const per = Array.isArray(res.per_agent) ? res.per_agent : [];
  const spread = per.map(x => `${x.name}: ${x.count}`).join(' · ');
  return `${res.assigned} assigned across ${res.telesales}${spread ? ' — ' + spread : ''}`;
}

/** Label shown next to a person: their department, else their RBAC role. */
export function deptLabel(p) {
  const d = dept(p);
  if (d) return d.charAt(0).toUpperCase() + d.slice(1);
  return p?.role || '';
}
