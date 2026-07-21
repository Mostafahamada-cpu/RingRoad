// App-wide state: session profile + cached collections + tiny pub/sub.
import { db, userId } from './supabase.js';
import { ROLE_RANK } from '../config.js';

const listeners = new Set();

export const store = {
  profile: null,      // my profiles row
  profiles: [],       // all profiles (for pickers/joins)
  teams: [],
  categories: [],
  loaded: false,
};

export function on(fn) { listeners.add(fn); return () => listeners.delete(fn); }
export function emit() { listeners.forEach(fn => fn()); }

export async function loadCore() {
  const [profiles, teams, categories] = await Promise.all([
    db.list('profiles', 'select=*&order=name.asc'),
    db.list('teams', 'select=*&order=name.asc'),
    db.list('categories', 'select=*&order=sort.asc').catch(() => []),
  ]);
  store.profiles = profiles || [];
  store.teams = teams || [];
  store.categories = categories || [];
  store.profile = store.profiles.find(p => p.id === userId()) || null;
  store.loaded = true;
}

export const me = () => store.profile;
export const myRole = () => store.profile?.role || 'agent';
export const isAtLeast = (role) => ROLE_RANK[myRole()] >= ROLE_RANK[role];
export const isAdmin = () => myRole() === 'admin';
export const isMgmt = () => ROLE_RANK[myRole()] >= ROLE_RANK.management;
export const isLeader = () => myRole() === 'leader';
export const myTeamId = () => store.profile?.team_id || null;

export const profileById = (id) => store.profiles.find(p => p.id === id) || null;
export const teamById = (id) => store.teams.find(t => t.id === id) || null;
export const agentsOf = (teamId) => store.profiles.filter(p => p.team_id === teamId);
export const leaderOf = (teamId) => {
  const t = teamById(teamId);
  return t ? profileById(t.leader_id) : null;
};
