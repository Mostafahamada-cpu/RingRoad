// Public client view — configuration.
//
// Everything this app needs is declared here. It deliberately does NOT import
// from ../../platform/js/config.js: this folder is its own Vercel deploy root
// (Root Directory = MD/client), so anything outside it is not served and such
// an import 404s in production, taking the whole app down with it.
//
// These three must stay identical to platform/js/config.js — same Supabase
// project, same publishable anon key, same public storage bucket.
export const SUPABASE_URL = 'https://cbjguowbrbxrthokbmpd.supabase.co';
export const SUPABASE_ANON_KEY = 'sb_publishable_H_FVSTN6WJ86vqo9tcPV1Q_pSXRdF68';
export const BUCKET = 'platform-images';

// Finishing levels used by the Egyptian market. Mirrored in the admin property
// form (platform/js/config.js → FINISHINGS) — keep the two lists in sync.
export const FINISHINGS = [
  'not_finished', 'semi_finished', 'fully_finished', 'super_lux', 'ultra_super_lux', 'furnished',
];

// Route prefix the rewrites in ./vercel.json publish this app under.
// '' = site root, so a property lives at  https://<host>/property/RR-1024
export const SITE_BASE = '';

// Dial code prepended to local agent numbers when building wa.me links (Egypt).
export const DEFAULT_DIAL_CODE = '20';

// Optional company WhatsApp used only when the assigned agent has no number of
// their own. Leave empty to hide the WhatsApp CTA in that case.
export const OFFICE_WHATSAPP = '';

export const MAX_COMPARE = 4;
export const LISTINGS_LIMIT = 1000;

export const FAVS_KEY = 'rr_client_favorites';
export const CMP_KEY = 'rr_client_compare';
