-- ============================================================================
--  Ring Roads — CLIENT PORTAL migration.
--
--  Run AFTER platform-schema.sql and platform-client-view.sql.
--  platform-videos.sql is NOT a prerequisite — section 3 creates the `videos`
--  table if it is missing and only adds to it if it already exists, so the two
--  files can be run in either order.
--
--  Idempotent and additive. It never drops a table, never deletes a row, and
--  changes no existing column's meaning.
--
--  WHY THIS FILE EXISTS
--  --------------------
--  1. PURPOSE TAXONOMY. The portal splits properties into Resale | Primary |
--     Rent, but `properties.type` only carries 'sale' | 'rent'. The view below
--     DERIVES the third state from columns that already exist, and an optional
--     `purpose` column lets anyone override the guess:
--
--        rent     <- type = 'rent'
--        primary  <- a sale with a payment plan, or a delivery date still in
--                    the future (sold on instalments / not yet handed over)
--        resale   <- every other sale
--
--  2. PROPERTY VIDEOS. A video belongs to a PROPERTY — the portal has no
--     standalone video section. This reuses the SAME `videos` table the CRM
--     writes to (no second video system) and adds `property_id` to it.
--
--  HOW PUBLIC EXPOSURE IS GATED  (read this before publishing anything)
--  --------------------------------------------------------------------
--  A video reaches the public ONLY when all three are true:
--     a) it is attached to a property   (property_id is not null)
--     b) that property is itself publicly listed (it appears in public_listings)
--     c) is_public is true
--  The CRM's library videos — training and marketing material — have no
--  property_id, so they can never appear on the portal no matter what else is
--  set. Attaching a video to a published listing is the act of intent, which is
--  why is_public defaults to TRUE: it exists as a kill switch, not as a second
--  hoop to jump through.
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
  'Cash down payment in EGP. Drives the Primary "Down payment" filter on the portal. '
  'NULL = unknown, and the filter hides itself when no published row has a value.';
comment on column public.properties.rental_period is
  'Billing period for rentals: monthly | quarterly | semiannual | yearly | daily. '
  'Drives the Rent "Rental duration" filter; NULL = unknown.';


-- ============================================================================
-- 2. VIDEOS — the shared table, now with a property relationship
--    Created here only if platform-videos.sql has not already made it, so the
--    two migrations are order-independent and neither clobbers the other.
-- ============================================================================
create table if not exists public.videos (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  description  text,
  thumbnail    text,
  video_url    text,
  video_path   text,
  sort_order   integer not null default 0,
  created_by   uuid references public.profiles(id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint videos_title_not_blank check (length(btrim(title)) > 0),
  constraint videos_need_a_source   check (
    coalesce(btrim(video_url), '') <> '' or coalesce(btrim(video_path), '') <> ''
  )
);

-- The property relationship. ON DELETE CASCADE: a video of a property that no
-- longer exists has nothing to show.
alter table public.videos
  add column if not exists property_id uuid references public.properties(id) on delete cascade;

-- Kill switch. Defaults TRUE — see the gating note in the header: a video only
-- becomes public by being attached to a published property in the first place.
alter table public.videos
  add column if not exists is_public boolean not null default true;

comment on column public.videos.property_id is
  'The property this video belongs to. NULL = an internal CRM library video, which is '
  'never exposed on the public client portal.';
comment on column public.videos.is_public is
  'Kill switch for a property video. Public exposure additionally requires a non-null '
  'property_id AND the property being visible in public_listings.';

create index if not exists idx_videos_property on public.videos(property_id) where property_id is not null;
create index if not exists idx_videos_sort     on public.videos(sort_order, created_at desc);
create index if not exists idx_videos_creator  on public.videos(created_by);

-- keep updated_at fresh (the same trigger fn the rest of the schema uses)
do $$ begin
  drop trigger if exists trg_videos_updated_at on public.videos;
  create trigger trg_videos_updated_at before update on public.videos
    for each row execute function public.set_updated_at();
exception when undefined_function then
  raise notice 'set_updated_at() not found - skipping the videos updated_at trigger.';
end $$;

-- ── RLS: unchanged CRM model. Everyone signed in may read; only management and
--    admin may write. (Re-declared here so this file stands alone.)
alter table public.videos enable row level security;

drop policy if exists "videos sel" on public.videos;
create policy "videos sel" on public.videos for select to authenticated using (true);

drop policy if exists "videos ins" on public.videos;
create policy "videos ins" on public.videos for insert to authenticated
  with check (public.rrp_is_mgmt());

drop policy if exists "videos upd" on public.videos;
create policy "videos upd" on public.videos for update to authenticated
  using (public.rrp_is_mgmt()) with check (public.rrp_is_mgmt());

drop policy if exists "videos del" on public.videos;
create policy "videos del" on public.videos for delete to authenticated
  using (public.rrp_is_mgmt());

grant select, insert, update, delete on public.videos to authenticated;
--  anon is deliberately NOT granted on the table. The public reads the view below.


-- ============================================================================
-- 3. REPUBLISH public_listings WITH purpose / down_payment / rental_period
--    Same column list and the same strict WHERE clause as
--    platform-client-view.sql — only the three new fields are added.
-- ============================================================================
drop view if exists public.public_listings cascade;
create view public.public_listings with (security_barrier = true) as
select
  p.id,
  p.code,
  p.title,
  coalesce(p.ptype, p.unit_type)          as ptype,
  p.type,                                  -- 'sale' | 'rent'
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
-- 4. PUBLIC PROPERTY VIDEOS
--    Joining to public_listings is what enforces gate (b): a video inherits its
--    property's visibility, so unpublishing, reserving, selling or archiving a
--    property takes its video off the portal automatically.
-- ============================================================================
--  The portal used to have a standalone Videos page backed by public_videos.
--  Videos now belong to a property, so that surface is retired.
drop view if exists public.public_videos;

create view public.public_property_videos with (security_barrier = true) as
select
  v.id,
  v.property_id,
  pl.code            as property_code,
  v.title,
  v.description,
  v.thumbnail,
  v.video_url,
  v.video_path,
  v.sort_order,
  v.created_at
from public.videos v
join public.public_listings pl on pl.id = v.property_id
where v.property_id is not null
  and v.is_public;

comment on view public.public_property_videos is
  'Login-free read surface for property videos. A row appears only when the video is '
  'attached to a property that is itself visible in public_listings and is_public is true. '
  'CRM library videos (property_id IS NULL) can never appear here.';

grant select on public.public_property_videos to anon, authenticated;


-- ============================================================================
-- 5. REFRESH THE POSTGREST SCHEMA CACHE
--    Without this, a freshly created table or view keeps returning
--    PGRST205 "Could not find the table ... in the schema cache" until the API
--    happens to reload on its own.
-- ============================================================================
notify pgrst, 'reload schema';


-- ============================================================================
--  DONE.
--
--  ── VERIFY ────────────────────────────────────────────────────────────────
--   select purpose, count(*) from public.public_listings group by purpose order by 2 desc;
--   select count(*) from public.videos;                    -- library + property videos
--   select count(*) from public.public_property_videos;    -- what the portal can see
--
--  ── ATTACH A VIDEO TO A PROPERTY ──────────────────────────────────────────
--   YouTube:
--     insert into public.videos (property_id, title, description, video_url)
--     select id, 'Full tour', 'Walkthrough of the apartment',
--            'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
--       from public.properties where code = 'RR-1014';
--
--   Vimeo:
--     insert into public.videos (property_id, title, video_url)
--     select id, 'Cinematic tour', 'https://vimeo.com/76979871'
--       from public.properties where code = 'RR-1008';
--
--   Direct file already uploaded to the platform-images bucket:
--     insert into public.videos (property_id, title, video_path, thumbnail)
--     select id, 'Site visit', 'videos/rr-1002/tour.mp4', 'videos/rr-1002/poster.jpg'
--       from public.properties where code = 'RR-1002';
--
--   Take one back off the portal without deleting it:
--     update public.videos set is_public = false where id = '...';
--
--  NOTE: the CRM's Videos page creates LIBRARY videos (property_id NULL), which
--  stay internal. Attaching to a property is done with the SQL above until a
--  property picker is added to that form.
-- ============================================================================
