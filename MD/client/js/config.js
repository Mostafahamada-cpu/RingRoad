// Public client view — configuration.
// Backend keys and the domain vocabulary are re-exported from the platform's
// config so the two apps can never drift apart (the anon key is publishable).
export {
  SUPABASE_URL, SUPABASE_ANON_KEY, BUCKET,
  PTYPES, GOVERNORATES, AMENITIES,
} from '../../platform/js/config.js';

// Finishing levels used by the Egyptian market. Mirrored in the admin property
// form (platform/js/config.js → FINISHINGS) — keep the two lists in sync.
export const FINISHINGS = [
  'not_finished', 'semi_finished', 'fully_finished', 'super_lux', 'ultra_super_lux', 'furnished',
];

// Route prefix the rewrites in ../vercel.json publish this app under.
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
