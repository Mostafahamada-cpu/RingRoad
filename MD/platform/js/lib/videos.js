// Videos domain: the shared video library.
// RLS enforces who may write (management/admin); everyone signed in can read.
// See platform-videos.sql.
import { db, storage } from './supabase.js';

export const loadVideos = () =>
  db.list('videos', 'select=*&order=sort_order.asc,created_at.desc').catch(() => []);

export const createVideo = (row) => db.create('videos', row);
export const updateVideo = (id, row) => db.update('videos', id, row);
export const removeVideo = (id) => db.remove('videos', id);

// Accepted upload types for a video FILE. Anything else should be linked by URL
// instead — the storage bucket is not a transcoding service.
export const VIDEO_MIME = ['video/mp4', 'video/webm', 'video/quicktime'];
export const VIDEO_MAX_MB = 200;

// ---- Source resolution -----------------------------------------------------
// A video is either an external link or an uploaded file. `kind` drives how the
// player renders it, so the page never has to sniff URLs itself.

const YT = /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([\w-]{6,})/i;
const VIMEO = /vimeo\.com\/(?:video\/)?(\d+)/i;

/** { kind: 'youtube'|'vimeo'|'file', src, id } — or null when there's no source. */
export function videoSource(v) {
  const url = (v?.video_url || '').trim();
  if (url) {
    const yt = url.match(YT);
    if (yt) return { kind: 'youtube', id: yt[1], src: `https://www.youtube-nocookie.com/embed/${yt[1]}` };
    const vm = url.match(VIMEO);
    if (vm) return { kind: 'vimeo', id: vm[1], src: `https://player.vimeo.com/video/${vm[1]}` };
    return { kind: 'file', src: url };            // direct .mp4/.webm link
  }
  if (v?.video_path) return { kind: 'file', src: storage.publicUrl(v.video_path) };
  return null;
}

/** Poster image for a card: the uploaded thumbnail, else YouTube's own still. */
export function posterUrl(v) {
  if (v?.thumbnail) return storage.publicUrl(v.thumbnail);
  const s = videoSource(v);
  if (s?.kind === 'youtube') return `https://i.ytimg.com/vi/${s.id}/hqdefault.jpg`;
  return null;
}

/** Short human label for where the video lives. */
export function sourceLabel(v) {
  const s = videoSource(v);
  if (!s) return '';
  if (s.kind === 'youtube') return 'YouTube';
  if (s.kind === 'vimeo') return 'Vimeo';
  return v?.video_path ? 'Uploaded' : 'Link';
}

/** true when the string looks like a usable http(s) URL. */
export function isHttpUrl(s) {
  if (!s) return false;
  try { const u = new URL(String(s).trim()); return u.protocol === 'http:' || u.protocol === 'https:'; }
  catch (_) { return false; }
}
