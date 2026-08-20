// Property videos for the public portal.
//
// A video belongs to a PROPERTY — the portal has no standalone video section.
// This reads the SAME `videos` table the CRM writes to (there is no second
// video system), through the narrow `public_property_videos` view, which only
// yields rows that are attached to a property, whose property is itself visible
// in public_listings, and which are flagged is_public. CRM library videos have
// no property_id and can therefore never surface here.
// See ../../platform-client-portal.sql.
//
// This file deliberately duplicates a little of platform/js/lib/videos.js
// rather than importing it: MD/client is its own Vercel deploy root, so
// anything outside this folder 404s in production (see config.js).
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../config.js';
import { imageUrl } from './api.js';

const REST = SUPABASE_URL + '/rest/v1';
const HEADERS = { apikey: SUPABASE_ANON_KEY, Accept: 'application/json' };
const FIELDS = 'id,property_id,property_code,title,description,thumbnail,video_url,video_path,sort_order';

// Per-property cache so re-opening a listing doesn't refetch, plus an in-flight
// map so two renders of the same page share one request instead of racing.
const cache = new Map();
const inflight = new Map();

// Set once if the view isn't published yet (migration not run). After that we
// stop asking entirely, so a pre-migration portal makes ONE failed request for
// the whole visit rather than one per property opened.
let surfaceMissing = false;

/**
 * Videos attached to one property, ordered the way the CRM ordered them.
 * Never throws: a property with no videos and a portal whose migration has not
 * been run both resolve to [] so the gallery simply shows images only.
 */
export async function loadPropertyVideos(propertyId, propertyCode) {
  const key = String(propertyId || propertyCode || '');
  if (!key || surfaceMissing) return [];
  if (cache.has(key)) return cache.get(key);
  if (inflight.has(key)) return inflight.get(key);

  const filter = propertyId
    ? `property_id=eq.${encodeURIComponent(propertyId)}`
    : `property_code=eq.${encodeURIComponent(propertyCode)}`;

  const req = (async () => {
    try {
      const res = await fetch(
        `${REST}/public_property_videos?select=${FIELDS}&${filter}&order=sort_order.asc&limit=20`,
        { headers: HEADERS });
      if (!res.ok) {
        // PGRST205 / 42501 = the view isn't published yet (migration not run).
        // That is a setup state, not a page error — the property still renders
        // its images, and we stop probing for the rest of the visit.
        const err = await res.json().catch(() => ({}));
        if (err.code === 'PGRST205' || err.code === '42501' || res.status === 404) surfaceMissing = true;
        cache.set(key, []);
        return [];
      }
      const rows = await res.json();
      const list = Array.isArray(rows) ? rows : [];
      cache.set(key, list);
      return list;
    } catch (_) {
      cache.set(key, []);
      return [];
    } finally {
      inflight.delete(key);
    }
  })();

  inflight.set(key, req);
  return req;
}

/** Test seam: lets the verification harness reset the session-level state. */
export function __resetVideoCache() { cache.clear(); inflight.clear(); surfaceMissing = false; }

// ── Source resolution ───────────────────────────────────────────────────────
const YT = /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([\w-]{6,})/i;
const VIMEO = /vimeo\.com\/(?:video\/)?(\d+)/i;

/** { kind: 'youtube'|'vimeo'|'file', src, id } — or null when unplayable. */
export function videoSource(v) {
  const url = String(v?.video_url || '').trim();
  if (url) {
    const yt = url.match(YT);
    if (yt) return { kind: 'youtube', id: yt[1], src: `https://www.youtube-nocookie.com/embed/${yt[1]}` };
    const vm = url.match(VIMEO);
    if (vm) return { kind: 'vimeo', id: vm[1], src: `https://player.vimeo.com/video/${vm[1]}` };
    return { kind: 'file', src: url };            // direct .mp4/.webm link
  }
  if (v?.video_path) return { kind: 'file', src: imageUrl(v.video_path) };
  return null;
}

/** Poster for the media strip: the uploaded thumbnail, else YouTube's own still. */
export function posterUrl(v) {
  if (v?.thumbnail) return imageUrl(v.thumbnail);
  const s = videoSource(v);
  if (s?.kind === 'youtube') return `https://i.ytimg.com/vi/${s.id}/hqdefault.jpg`;
  return null;
}

export const isPlayable = (v) => videoSource(v) !== null;
