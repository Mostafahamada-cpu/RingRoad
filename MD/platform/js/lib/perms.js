// Central capability model — the single source of truth for role-based access
// in the UI. Mirrors the RLS policies in platform-schema.sql (defence in depth:
// the UI hides/disables, the database enforces).
//
//   Admin       → everything
//   Management  → all data + analytics + teams; NOT user/role management, NOT system settings
//   Team Leader → own team (deals/props/clients/assign/tasks); NO global analytics,
//                 NO user mgmt, NO teams CRUD, cannot hard-delete core records
//   Agent       → own records only; cannot delete records, no reports/analytics/team/user mgmt
import { isAdmin, isMgmt, isLeader } from './store.js';

// Capability → predicate. Kept intentionally small and readable.
const CAPS = {
  // hard-delete of core CRM records (properties · clients · deals)
  'delete:core':   () => isMgmt(),
  // delete operational items owned/led (followups · tasks · events)
  'delete:ops':    () => isMgmt() || isLeader(),
  // user accounts, roles, activation, reset password
  'users':         () => isAdmin(),
  // teams create / edit / delete / archive
  'teams':         () => isMgmt(),
  // global analytics + agents directory + all-teams view
  'analytics':     () => isMgmt(),
  'agents':        () => isMgmt(),
  'viewAllTeams':  () => isMgmt(),
  // assign leads / agents (management anywhere, leader within own team)
  'assign':        () => isMgmt() || isLeader(),
  // system settings (category taxonomy, etc.)
  'settings:system': () => isAdmin(),
  // video library: everyone may watch, management + admin may add/edit/delete
  'videos:manage': () => isMgmt(),
};

/** Returns true if the current user may perform `cap`. Unknown caps → false. */
export function can(cap) {
  const fn = CAPS[cap];
  return fn ? fn() : false;
}
