// Read-only PostgREST access for anonymous visitors.
//
// The public site only ever touches two things:
//   • the  public_listings  view      (published stock, no financial columns)
//   • the  rr_submit_property_request RPC ("Request details")
// Both are created by ../../platform-client-view.sql. No auth, no session,
// no cookies — the anon key is the only credential and it is publishable.
import { SUPABASE_URL, SUPABASE_ANON_KEY, BUCKET, LISTINGS_LIMIT } from '../config.js';

const REST = SUPABASE_URL + '/rest/v1';
const HEADERS = { apikey: SUPABASE_ANON_KEY, Accept: 'application/json' };

const SETUP_HINT = 'The public listings feed is not published yet. Run platform-client-view.sql in Supabase.';

async function get(path) {
  let res;
  try {
    res = await fetch(REST + path, { headers: HEADERS });
  } catch (_) {
    throw new Error('Network error — please check your connection and try again.');
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    // PGRST205 = unknown relation, 42501 = missing grant: both mean "migration not run".
    if (err.code === 'PGRST205' || err.code === '42501') throw new Error(SETUP_HINT);
    throw new Error(err.message || 'Could not load properties (HTTP ' + res.status + ').');
  }
  return res.json();
}

const FIELDS = [
  'id', 'code', 'title', 'ptype', 'type', 'status', 'price', 'area', 'bedrooms', 'bathrooms',
  'floor', 'year_built', 'parking', 'furnished', 'featured', 'project', 'developer', 'finishing',
  'delivery', 'payment_plan', 'address', 'city', 'governorate', 'description', 'images', 'amenities',
  'lat', 'lng', 'map_url', 'created_at', 'agent_id', 'agent_name', 'agent_photo', 'agent_phone',
  'agent_whatsapp', 'team_name',
].join(',');

/** Every publicly visible property, newest first. Filtering/sorting is local. */
export function fetchListings() {
  return get(`/public_listings?select=${FIELDS}&order=created_at.desc&limit=${LISTINGS_LIMIT}`);
}

/** One property by RingRoad code (RR-1024) or by uuid — used for deep links. */
export async function fetchListing(idOrCode) {
  const key = String(idOrCode || '').trim();
  if (!key) return null;
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(key);
  const filter = isUuid ? `id=eq.${encodeURIComponent(key)}` : `code=eq.${encodeURIComponent(key)}`;
  const rows = await get(`/public_listings?select=${FIELDS}&${filter}&limit=1`);
  return rows?.[0] || null;
}

/** "Request details" — the only write an anonymous visitor can perform. */
export async function submitRequest({ property, name, phone, message, url }) {
  let res;
  try {
    res = await fetch(REST + '/rpc/rr_submit_property_request', {
      method: 'POST',
      headers: { ...HEADERS, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        p_property: property, p_name: name, p_phone: phone,
        p_message: message || null, p_url: url || null,
      }),
    });
  } catch (_) {
    throw new Error('Network error — please check your connection and try again.');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const map = {
      invalid_name: 'Please enter your full name.',
      invalid_phone: 'Please enter a valid phone number.',
      message_too_long: 'Your message is too long.',
      property_not_found: 'This property is no longer available.',
      too_many_requests: 'You have sent several requests already — an agent will call you shortly.',
    };
    const raw = String(data.message || '');
    const known = Object.keys(map).find(k => raw.includes(k));
    if (known) throw new Error(map[known]);
    if (data.code === 'PGRST202' || data.code === '42883') throw new Error(SETUP_HINT);
    throw new Error(raw || 'Could not send your request. Please try again.');
  }
  return data;
}

/** Storage path → public CDN url (the platform-images bucket is public). */
export function imageUrl(path) {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${path}`;
}

export function coverUrl(listing) {
  const imgs = Array.isArray(listing?.images) ? listing.images : [];
  return imgs.length ? imageUrl(imgs[0]) : null;
}
