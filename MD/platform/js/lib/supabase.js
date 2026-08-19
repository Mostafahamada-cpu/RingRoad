// Minimal Supabase client over fetch(): GoTrue auth + PostgREST + Storage.
import { SUPABASE_URL, SUPABASE_ANON_KEY, BUCKET, SESSION_KEY } from '../config.js';

const AUTH = SUPABASE_URL + '/auth/v1';
const REST = SUPABASE_URL + '/rest/v1';
const STORE = SUPABASE_URL + '/storage/v1';

let session = null;
let onLogout = () => {};

export function setLogoutHandler(fn) { onLogout = fn; }
export function getSession() { return session; }
export function userId() { return session?.user?.id || null; }

function headers(json = true) {
  const h = { apikey: SUPABASE_ANON_KEY };
  if (session?.access_token) h.Authorization = 'Bearer ' + session.access_token;
  if (json) h['Content-Type'] = 'application/json';
  return h;
}

function persist(payload) {
  session = {
    access_token: payload.access_token,
    refresh_token: payload.refresh_token,
    expires_at: Date.now() + (payload.expires_in || 3600) * 1000,
    user: payload.user || session?.user || null,
  };
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearSession() {
  session = null;
  localStorage.removeItem(SESSION_KEY);
}

async function authPost(path, body) {
  const res = await fetch(AUTH + path, {
    method: 'POST',
    headers: { apikey: SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error_description || data.msg || data.message || ('HTTP ' + res.status));
  return data;
}

export const auth = {
  async signIn(email, password) {
    const data = await authPost('/token?grant_type=password', { email, password });
    persist(data);
    return data;
  },
  // Creates an account WITHOUT touching the current session (used by admin "create user").
  async signUpDetached(email, password) {
    return authPost('/signup', { email, password });
  },
  async signUp(email, password) {
    const data = await authPost('/signup', { email, password });
    if (data.access_token) persist(data);
    return data;
  },
  async recover(email) {
    return authPost('/recover', { email });
  },
  async signOut() {
    try { await fetch(AUTH + '/logout', { method: 'POST', headers: headers(false) }); } catch (_) {}
    clearSession();
  },
  async restore() {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (!raw) return false;
      session = JSON.parse(raw);
      if (!session?.access_token) { clearSession(); return false; }
      if (!session.expires_at || session.expires_at - Date.now() < 60000) return refresh();
      return true;
    } catch (_) { clearSession(); return false; }
  },
};

async function refresh() {
  try {
    const data = await authPost('/token?grant_type=refresh_token', { refresh_token: session.refresh_token });
    if (!data.access_token) return false;
    persist(data);
    return true;
  } catch (_) { clearSession(); return false; }
}

async function request(url, opts = {}, retried = false) {
  const res = await fetch(url, { ...opts, headers: { ...headers(!(opts.body instanceof Blob || opts.body instanceof File)), ...(opts.headers || {}) } });
  if (res.status === 401 && !retried && session?.refresh_token) {
    if (await refresh()) return request(url, opts, true);
    onLogout();
    throw new Error('unauthorized');
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || err.error || err.hint || ('HTTP ' + res.status));
  }
  if (res.status === 204) return null;
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

// --- PostgREST ---
export const db = {
  list: (table, query = 'select=*') => request(`${REST}/${table}?${query}`),
  one: async (table, id, query = 'select=*') => {
    const rows = await request(`${REST}/${table}?id=eq.${encodeURIComponent(id)}&${query}`);
    return rows?.[0] || null;
  },
  create: (table, row) => request(`${REST}/${table}`, {
    method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify(row),
  }).then(r => Array.isArray(r) ? r[0] : r),
  update: (table, id, row) => request(`${REST}/${table}?id=eq.${encodeURIComponent(id)}`, {
    method: 'PATCH', headers: { Prefer: 'return=representation' }, body: JSON.stringify(row),
  }).then(r => Array.isArray(r) ? r[0] : r),
  updateWhere: (table, filter, row) => request(`${REST}/${table}?${filter}`, {
    method: 'PATCH', headers: { Prefer: 'return=representation' }, body: JSON.stringify(row),
  }),
  remove: (table, id) => request(`${REST}/${table}?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE' }),
  // Postgres function call. Used for the operations the database must authorise
  // itself (telesales assignment / distribution) rather than trusting the client.
  rpc: (fn, args = {}) => request(`${REST}/rpc/${fn}`, {
    method: 'POST', body: JSON.stringify(args),
  }),
};

// --- Storage (public bucket) ---
export const storage = {
  publicUrl(path) {
    return `${STORE}/object/public/${BUCKET}/${path}`;
  },
  async upload(file, path) {
    const res = await fetch(`${STORE}/object/${BUCKET}/${path}`, {
      method: 'POST',
      headers: { ...headers(false), 'Content-Type': file.type || 'application/octet-stream', 'x-upsert': 'true' },
      body: file,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || err.error || 'upload failed');
    }
    return path;
  },
  async remove(paths) {
    if (!paths.length) return;
    await request(`${STORE}/object/${BUCKET}`, { method: 'DELETE', body: JSON.stringify({ prefixes: paths }) });
  },
};
