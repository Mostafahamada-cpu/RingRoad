// Central configuration & domain constants.
export const SUPABASE_URL = 'https://cbjguowbrbxrthokbmpd.supabase.co';
export const SUPABASE_ANON_KEY = 'sb_publishable_H_FVSTN6WJ86vqo9tcPV1Q_pSXRdF68';
export const BUCKET = 'platform-images';
export const SESSION_KEY = 'rrp_session';

export const ROLES = ['admin', 'management', 'leader', 'agent'];
export const ROLE_RANK = { admin: 4, management: 3, leader: 2, agent: 1 };

export const STATUSES = ['available', 'reserved', 'sold', 'archived'];
export const APPROVALS = ['pending', 'approved', 'rejected'];

export const PTYPES = ['apartment', 'villa', 'townhouse', 'duplex', 'penthouse', 'studio', 'chalet', 'office', 'retail', 'land'];

export const GOVERNORATES = ['Cairo', 'Giza', 'Alexandria', 'Qalyubia', 'Red Sea', 'Matrouh', 'South Sinai', 'Suez', 'Ismailia', 'Other'];

export const AMENITIES = ['pool', 'gym', 'garden', 'security', 'elevator', 'balcony', 'parking', 'central_ac', 'smart_home', 'sea_view', 'clubhouse', 'kids_area'];

export const TEAM_COLORS = ['#F97316', '#EA580C', '#6A003C', '#93195B', '#C9679C', '#B45309'];

export const TASK_PRIORITIES = ['low', 'normal', 'high'];
export const EVENT_KINDS = ['meeting', 'visit', 'followup', 'other'];

export const PAGE_SIZE = 10;
