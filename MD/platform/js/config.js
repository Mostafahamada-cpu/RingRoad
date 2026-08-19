// Central configuration & domain constants.
export const SUPABASE_URL = 'https://cbjguowbrbxrthokbmpd.supabase.co';
export const SUPABASE_ANON_KEY = 'sb_publishable_H_FVSTN6WJ86vqo9tcPV1Q_pSXRdF68';
export const BUCKET = 'platform-images';

// Origin of the public client view (client/), which is deployed as its own
// Vercel project and therefore lives on its own domain. Used to build the
// shareable /property/RR-1024 links shown on the property page. Point this at
// the custom domain once one is attached; leave it empty to fall back to the
// current origin (correct only if both apps are served from the same host).
export const PUBLIC_SITE_URL = 'https://ring-road-client.vercel.app';
export const SESSION_KEY = 'rrp_session';

export const ROLES = ['admin', 'management', 'leader', 'agent'];
export const ROLE_RANK = { admin: 4, management: 3, leader: 2, agent: 1 };

export const STATUSES = ['available', 'reserved', 'sold', 'archived'];
export const APPROVALS = ['pending', 'approved', 'rejected'];

export const PTYPES = ['apartment', 'villa', 'townhouse', 'duplex', 'penthouse', 'studio', 'chalet', 'office', 'retail', 'land'];

export const GOVERNORATES = ['Cairo', 'Giza', 'Alexandria', 'Qalyubia', 'Red Sea', 'Matrouh', 'South Sinai', 'Suez', 'Ismailia', 'Other'];

// Finishing levels (Egyptian market). Mirrored in client/js/config.js.
// Business units. 'telesales' is the pool the apartment assignment draws from
// (see platform-telesales.sql → rr_is_telesales).
export const DEPARTMENTS = ['telesales', 'engineering', 'management', 'sales'];

export const FINISHINGS = ['not_finished', 'semi_finished', 'fully_finished', 'super_lux', 'ultra_super_lux', 'furnished'];

// Sale vs rent — properties.type
export const DEAL_TYPES = ['sale', 'rent'];

export const AMENITIES = ['pool', 'gym', 'garden', 'security', 'elevator', 'balcony', 'parking', 'central_ac', 'smart_home', 'sea_view', 'clubhouse', 'kids_area'];

export const TEAM_COLORS = ['#F97316', '#EA580C', '#6A003C', '#93195B', '#C9679C', '#B45309'];

export const TASK_PRIORITIES = ['low', 'normal', 'high'];
export const EVENT_KINDS = ['meeting', 'visit', 'followup', 'other'];

export const PAGE_SIZE = 10;

// CRM pipeline vocab (matches the DB check constraints)
export const CLIENT_STAGES = ['new_lead', 'contacted', 'visit_scheduled', 'negotiating', 'reservation', 'contract_signed'];
export const CLIENT_STAGE_COLORS = { new_lead: '#C9679C', contacted: '#F97316', visit_scheduled: '#EA580C', negotiating: '#B45309', reservation: '#93195B', contract_signed: '#6A003C' };
export const DEAL_STAGES = ['lead', 'contacted', 'visit', 'negotiation', 'reservation', 'won', 'lost'];
export const DEAL_STAGE_COLORS = { lead: '#C9679C', contacted: '#F97316', visit: '#EA580C', negotiation: '#B45309', reservation: '#93195B', won: '#16803a', lost: '#9A1B2F' };
export const WON_STAGES = ['won', 'closed'];
export const FU_KINDS = ['call', 'meeting', 'visit', 'other'];
export const FU_KIND_ICONS = { call: '📞', meeting: '🤝', visit: '📍', other: '📌' };
