// Videos for the public portal.
//
// Reuses the SAME `videos` table the CRM writes to — there is no second video
// system. Anonymous visitors read it through the narrow `public_videos` view
// (platform-client-portal.sql), which exposes only rows flagged `is_public`,
// so internal training material is never published by accident.
//
// This file deliberately duplicates a little of platform/js/lib/videos.js
// rather than importing it: MD/client is its own Vercel deploy root, so
// anything outside this folder 404s in production (see config.js).
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../config.js';
import { imageUrl } from './api.js';

const REST = SUPABASE_URL + '/rest/v1';
const HEADERS = { apikey: SUPABASE_ANON_KEY, Accept: 'application/json' };

const SETUP_HINT = 'The video library is not published yet. Run platform-client-portal.sql in Supabase.';

let rows = null;
let inflight = null;

/** Published videos, ordered the way the CRM ordered them. Cached per visit. */
export async function loadVideos({ force = false } = {}) {
  if (rows && !force) return rows;
  if (!inflight) {
    inflight = (async () => {
      let res;
      try {
        res = await fetch(
          `${REST}/public_videos?select=id,title,description,thumbnail,video_url,video_path,sort_order,created_at`
          + '&order=sort_order.asc,created_at.desc&limit=200',
          { headers: HEADERS });
      } catch (_) {
        throw new Error('Network error — please check your connection and try again.');
      }
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        if (err.code === 'PGRST205' || err.code === '42501') throw new Error(SETUP_HINT);
        throw new Error(err.message || 'Could not load videos (HTTP ' + res.status + ').');
      }
      const list = await res.json();
      rows = Array.isArray(list) ? list : [];
      return rows;
    })().finally(() => { inflight = null; });
  }
  return inflight;
}

export const allVideos = () => rows || [];
export const videoById = (id) => (rows || []).find(v => String(v.id) === String(id)) || null;

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
    return { kind: 'file', src: url };
  }
  if (v?.video_path) return { kind: 'file', src: imageUrl(v.video_path) };
  return null;
}

/** Poster for a card: the uploaded thumbnail, else YouTube's own still. */
export function posterUrl(v) {
  if (v?.thumbnail) return imageUrl(v.thumbnail);
  const s = videoSource(v);
  if (s?.kind === 'youtube') return `https://i.ytimg.com/vi/${s.id}/hqdefault.jpg`;
  return null;
}
