-- ============================================================================
--  Ring Roads — CLIENT PORTAL migration (purpose taxonomy + public videos).
--
--  Run AFTER platform-client-view.sql and platform-videos.sql.
--  Idempotent and additive: it adds optional columns, republishes the
--  public_listings view with three extra fields, and publishes a read-only
--  video surface for anonymous visitors. No existing column changes meaning
--  and no row is touched.
--
--  WHY
--  ---
--  The client portal navigation splits properties into  Resale | Primary | Rent.
--  `properties.type` only carries 'sale' | 'rent', so "primary" (off-plan /
--  developer stock) vs "resale" (ready, owner-sold) has to come from somewhere.
--  Rather than force data entry, the view DERIVES it from columns that already
--  exist, and an optional `purpose` column lets anyone override the guess:
--
--     rent     ← type = 'rent'
--     primary  ← a sale that has a payment plan, or a delivery date still in
--                the future (i.e. sold on instalments / not yet handed over)
--     resale   ← every other sale
--
--  Two further optional columns back filters the portal only shows once there
--  is data for them: `down_payment` (Primary) and `rental_period` (Rent).
--  While they are null the portal simply omits those filters — nothing looks
--  broken, and no fake data is invented.
-- ============================================================================


-- ============================================================================
-- 1. OPTIONAL COLUMNS ON properties
-- ============================================================================
alter table public.properties add column if not exists purpose       text;
alter table public.properties add column if not exists down_payment  numeric;
alter table public.properties add column if not exists rental_period text;

do $$ begin
  alter table public.properties
    add constraint properties_purpose_chk check (purpose in ('primary','resale','rent'));
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.properties
    add constraint properties_down_payment_chk check (down_payment is null or down_payment >= 0);
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.properties
    add constraint properties_rental_period_chk
    check (rental_period in ('monthly','quarterly','semiannual','yearly','daily'));
exception when duplicate_object then null; end $$;

comment on column public.properties.purpose is
  'Optional override for the client-portal purpose taxonomy: primary | resale | rent. '
  'Leave NULL to let public_listings derive it from type/payment_plan/delivery.';
comment on column public.properties.down_payment is
  'Cash down payment in EGP. Drives the Primary "Down payment" filter on the client portal. '
  'NULL = unknown, and the filter hides itself when no published row has a value.';
comment on column public.properties.rental_period is
  'Billing period for rentals: monthly | quarterly | semiannual | yearly | daily. '
  'Drives the Rent "Rental duration" filter; NULL = unknown.';


-- ============================================================================
-- 2. REPUBLISH public_listings WITH purpose / down_payment / rental_period
--    Same column list and the same strict WHERE clause as
--    platform-client-view.sql — only the three new fields are added.
-- ============================================================================
drop view if exists public.public_listings;
create view public.public_listings with (security_barrier = true) as
select
  p.id,
  p.code,
  p.title,
  coalesce(p.ptype, p.unit_type)          as ptype,
  p.type,                                  -- 'sale' | 'rent'
  -- Explicit override first, otherwise derive from what the record already says.
  coalesce(
    nullif(btrim(p.purpose), ''),
    case
      when coalesce(p.type, 'sale') = 'rent'                          then 'rent'
      when coalesce(btrim(p.payment_plan), '') <> ''                  then 'primary'
      when p.delivery is not null and p.delivery > current_date       then 'primary'
      else 'resale'
    end
  )                                        as purpose,
  p.down_payment,
  p.rental_period,
  p.status,
  p.price,
  p.area,
  coalesce(p.bedrooms,  p.beds)           as bedrooms,
  coalesce(p.bathrooms, p.baths)          as bathrooms,
  p.floor,
  p.year_built,
  p.parking,
  p.furnished,
  p.featured,
  p.project,
  p.developer,
  p.finishing,
  p.delivery,
  p.payment_plan,
  p.address,
  p.city,
  p.governorate,
  p.description,
  p.images,
  p.amenities,
  p.lat,
  p.lng,
  p.map_url,
  p.created_at,
  p.agent_id,
  a.name                                   as agent_name,
  a.photo                                  as agent_photo,
  a.phone                                  as agent_phone,
  nullif(btrim(coalesce(a.whatsapp, a.phone, '')), '') as agent_whatsapp,
  tm.name                                  as team_name
from public.properties p
left join public.profiles a on a.id = p.agent_id and a.active is not false
left join public.teams   tm on tm.id = p.team_id
where coalesce(p.approval, 'approved') not in ('pending', 'rejected')
  and coalesce(p.status,   'available') not in ('sold', 'rented', 'archived', 'draft');

comment on view public.public_listings is
  'Login-free read surface for the public client portal (client/). Published stock only; '
  'no financial or ownership columns. `purpose` is derived unless properties.purpose overrides it.';

grant select on public.public_listings to anon, authenticated;


-- ============================================================================
-- 3. PUBLIC VIDEO SURFACE
--
--    The portal reuses the SAME `videos` table the CRM writes to — there is no
--    second video system. It reads through a narrow view instead of the table
--    so anon never gets a grant on `videos` itself.
--
--    IMPORTANT — nothing is published by default. `is_public` defaults to
--    FALSE because the CRM library is described as "training and marketing
--    videos for the team", and silently exposing internal training material to
--    the open internet is not a decision this migration should make for you.
--    Publish deliberately, e.g.:
--
--      update public.videos set is_public = true;                    -- all
--      update public.videos set is_public = true where title ilike '%tour%';
--
--    Until then the portal shows a clean "no videos yet" state.
-- ============================================================================
alter table public.videos add column if not exists is_public boolean not null default false;

comment on column public.videos.is_public is
  'When true the video is visible on the public client portal via public_videos. '
  'Defaults to false so internal training material is never exposed by accident.';

create index if not exists idx_videos_public
  on public.videos(sort_order, created_at desc) where is_public;

drop view if exists public.public_videos;
create view public.public_videos with (security_barrier = true) as
select
  v.id,
  v.title,
  v.description,
  v.thumbnail,
  v.video_url,
  v.video_path,
  v.sort_order,
  v.created_at
from public.videos v
where v.is_public;

comment on view public.public_videos is
  'Login-free read surface for the client portal video section. Only rows flagged is_public.';

grant select on public.public_videos to anon, authenticated;


-- ============================================================================
--  DONE. Verify:
--
--   -- how the published stock splits across the three purposes:
--   select purpose, count(*) from public.public_listings group by purpose order by 2 desc;
--
--   -- do any rows back the optional filters yet?
--   select count(*) filter (where down_payment  is not null) as with_down_payment,
--          count(*) filter (where rental_period is not null) as with_rental_period
--     from public.public_listings;
--
--   -- videos currently visible to the public:
--   select count(*) from public.public_videos;
-- ============================================================================
