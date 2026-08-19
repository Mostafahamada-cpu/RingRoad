-- ============================================================================
--  Ring Roads — PUBLIC CLIENT VIEW migration.
--
--  Idempotent add-on to platform-schema.sql. Run AFTER the base schema exists
--  (and after platform-rbac-tighten.sql / platform-attendance.sql if you use
--  them — order between the add-ons does not matter).
--
--  Adds everything the login-free client browsing experience in `client/`
--  needs, WITHOUT touching a single existing table, policy or column:
--
--    1. properties.finishing / properties.project      → new optional columns
--    2. profiles.whatsapp                              → agent WhatsApp number
--    3. RR-#### property codes                         → sequence + trigger +
--                                                        backfill + unique index
--    4. public.public_listings                         → read-only, anon-safe
--                                                        view of published stock
--    5. public.property_requests                       → "Request details" leads
--    6. public.rr_submit_property_request()            → the only write anon can
--                                                        do; also creates a CRM
--                                                        client row so the lead
--                                                        shows up in the existing
--                                                        Clients pipeline
--
--  SECURITY MODEL
--    • anon may SELECT public.public_listings (published stock only — pending,
--      rejected, sold, rented and archived rows are filtered out, and money
--      columns such as sold_price / commission / buyer_name are not selected).
--    • anon may EXECUTE rr_submit_property_request() and nothing else. It has
--      no direct INSERT/UPDATE/DELETE grant on any table.
--    • Every existing `to authenticated` policy is left exactly as it was.
--
--  SAFE TO RE-RUN: every statement is IF NOT EXISTS / OR REPLACE / guarded.
-- ============================================================================


-- ============================================================================
-- 1. NEW OPTIONAL COLUMNS ON properties
--    `project` already exists in platform-schema.sql; the guard keeps this file
--    runnable against older databases that predate it.
-- ============================================================================
alter table public.properties add column if not exists project   text;
alter table public.properties add column if not exists developer text;
alter table public.properties add column if not exists finishing text;

comment on column public.properties.project   is 'Project / compound name (shown in the public client view).';
comment on column public.properties.finishing is 'Finishing status slug: not_finished | semi_finished | fully_finished | super_lux | ultra_super_lux | furnished';


-- ============================================================================
-- 2. AGENT WHATSAPP NUMBER
--    Falls back to profiles.phone in the public view when left empty, so
--    existing agents keep working with zero data entry.
-- ============================================================================
alter table public.profiles add column if not exists whatsapp text;

comment on column public.profiles.whatsapp is 'WhatsApp number used by the public client view. Falls back to phone when null.';


-- ============================================================================
-- 3. UNIQUE RING ROADS PROPERTY CODE  (RR-1024, RR-1025, …)
-- ============================================================================
create sequence if not exists public.property_code_seq as bigint start with 1024;

-- Lift the sequence above every RR-#### code that already exists so a backfill
-- (or a future insert) can never collide with a code already handed out.
do $$
declare
  mx      bigint;
  cur     bigint;
  target  bigint;
begin
  select max((substring(code from '^RR-(\d+)$'))::bigint)
    into mx
    from public.properties
   where code ~ '^RR-\d+$';

  select coalesce(last_value, 0) into cur
    from pg_sequences
   where schemaname = 'public' and sequencename = 'property_code_seq';

  target := greatest(coalesce(mx, 0) + 1, cur + 1, 1024);
  perform setval('public.property_code_seq', target, false);   -- next nextval() = target
end $$;

-- Assign a code on insert whenever the app did not supply one.
create or replace function public.rr_assign_property_code()
returns trigger language plpgsql as $$
begin
  if new.code is null or btrim(new.code) = '' then
    new.code := 'RR-' || nextval('public.property_code_seq')::text;
  end if;
  return new;
end $$;

drop trigger if exists trg_properties_code on public.properties;
create trigger trg_properties_code before insert on public.properties
  for each row execute function public.rr_assign_property_code();

-- The trigger runs as the inserting role, so it needs the sequence.
grant usage on sequence public.property_code_seq to authenticated;

-- Backfill: rows with no code at all.
update public.properties
   set code = 'RR-' || nextval('public.property_code_seq')::text
 where code is null or btrim(code) = '';

-- Backfill: duplicated codes — the oldest row keeps the code, the rest get new ones.
with dups as (
  select id, row_number() over (partition by code order by created_at, id) as rn
    from public.properties
   where code is not null
)
update public.properties p
   set code = 'RR-' || nextval('public.property_code_seq')::text
  from dups d
 where d.id = p.id and d.rn > 1;

create unique index if not exists idx_properties_code_uniq
  on public.properties (code) where code is not null;


-- ============================================================================
-- 4. PUBLIC READ SURFACE  —  public.public_listings
--
--    A plain (security-definer) view: it runs with the view owner's rights, so
--    anon can read it without any RLS policy being opened on `properties`
--    itself. The WHERE clause below is therefore the *only* thing that decides
--    what the public can see — keep it strict.
--
--    The status/approval filters are written as exclusions on purpose: the
--    original seed contains a few rows whose `status` and `approval` values are
--    cross-swapped (documented at the top of platform-schema.sql), and an
--    equality filter would silently hide them from the public site.
-- ============================================================================
drop view if exists public.public_listings;
create view public.public_listings with (security_barrier = true) as
select
  p.id,
  p.code,
  p.title,
  coalesce(p.ptype, p.unit_type)          as ptype,
  p.type,                                  -- 'sale' | 'rent'
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
  'Login-free read surface for the public client view (client/). Published stock only; no financial or ownership columns.';

grant select on public.public_listings to anon, authenticated;


-- ============================================================================
-- 5. PROPERTY REQUESTS  ("Request details" leads from the client view)
-- ============================================================================
create table if not exists public.property_requests (
  id             uuid primary key default gen_random_uuid(),
  property_id    uuid references public.properties(id) on delete set null,
  property_code  text,
  property_title text,
  agent_id       uuid references public.profiles(id) on delete set null,
  team_id        uuid references public.teams(id) on delete set null,
  client_id      uuid references public.clients(id) on delete set null,
  name           text not null,
  phone          text not null,
  message        text,
  source         text not null default 'client_view',
  status         text not null default 'new' check (status in ('new', 'contacted', 'closed')),
  page_url       text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

drop trigger if exists trg_property_requests_updated_at on public.property_requests;
create trigger trg_property_requests_updated_at before update on public.property_requests
  for each row execute function public.set_updated_at();

create index if not exists idx_prop_req_agent    on public.property_requests(agent_id);
create index if not exists idx_prop_req_team     on public.property_requests(team_id);
create index if not exists idx_prop_req_property on public.property_requests(property_id);
create index if not exists idx_prop_req_created  on public.property_requests(created_at desc);
-- powers the anti-spam / de-dupe lookups in the RPC below
create index if not exists idx_prop_req_phone    on public.property_requests(phone, created_at desc);

alter table public.property_requests enable row level security;

-- SELECT: agent sees own, leader sees own team, management/admin see everything.
drop policy if exists "preq sel" on public.property_requests;
create policy "preq sel" on public.property_requests for select to authenticated
  using (
    public.rrp_is_mgmt()
    or agent_id = auth.uid()
    or (public.rrp_role() = 'leader' and team_id = public.rrp_team())
  );

-- UPDATE: same audience (used to move a request new → contacted → closed).
drop policy if exists "preq upd" on public.property_requests;
create policy "preq upd" on public.property_requests for update to authenticated
  using (
    public.rrp_is_mgmt()
    or agent_id = auth.uid()
    or (public.rrp_role() = 'leader' and team_id = public.rrp_team())
  )
  with check (true);

-- INSERT: staff may log a request manually; the public goes through the RPC.
drop policy if exists "preq ins" on public.property_requests;
create policy "preq ins" on public.property_requests for insert to authenticated
  with check (true);

-- DELETE: management/admin only, like the other core CRM records.
drop policy if exists "preq del" on public.property_requests;
create policy "preq del" on public.property_requests for delete to authenticated
  using (public.rrp_is_mgmt());


-- ============================================================================
-- 6. THE ONLY PUBLIC WRITE  —  rr_submit_property_request()
--
--    security definer so an anonymous visitor can file a lead without any
--    INSERT grant. Everything is validated and normalised here:
--      • the property must exist AND be publicly visible
--      • name / phone / message are length-checked
--      • a duplicate submit (same phone + property within 10 minutes) is
--        collapsed instead of creating a second lead
--      • a light per-phone hourly cap keeps the endpoint from being farmed
--      • a matching `clients` row (stage = new_lead) is created and linked, so
--        the request lands in the CRM the agents already use
-- ============================================================================
create or replace function public.rr_submit_property_request(
  p_property text,
  p_name     text,
  p_phone    text,
  p_message  text default null,
  p_url      text default null
) returns json
language plpgsql security definer set search_path = public as $$
declare
  prop     public.properties%rowtype;
  v_name   text := btrim(coalesce(p_name, ''));
  v_phone  text := btrim(coalesce(p_phone, ''));
  v_msg    text := nullif(btrim(coalesce(p_message, '')), '');
  v_digits text := regexp_replace(coalesce(p_phone, ''), '\D', '', 'g');
  v_recent integer;
  cli_id   uuid;
  req_id   uuid;
begin
  -- ── validation ────────────────────────────────────────────────────────────
  if char_length(v_name) < 2 or char_length(v_name) > 120 then
    raise exception 'invalid_name' using errcode = '22023';
  end if;
  if char_length(v_digits) < 7 or char_length(v_phone) > 40 then
    raise exception 'invalid_phone' using errcode = '22023';
  end if;
  if char_length(coalesce(v_msg, '')) > 1000 then
    raise exception 'message_too_long' using errcode = '22023';
  end if;

  -- ── the property must be publicly visible (same rule as public_listings) ──
  select p.* into prop
    from public.properties p
   where (p.code = p_property or p.id::text = p_property)
     and coalesce(p.approval, 'approved') not in ('pending', 'rejected')
     and coalesce(p.status,   'available') not in ('sold', 'rented', 'archived', 'draft')
   limit 1;

  if not found then
    raise exception 'property_not_found' using errcode = '22023';
  end if;

  -- ── de-dupe: the same visitor tapping twice must not create two leads ─────
  select r.id into req_id
    from public.property_requests r
   where r.property_id = prop.id
     and r.phone = v_phone
     and r.created_at > now() - interval '10 minutes'
   order by r.created_at desc
   limit 1;

  if req_id is not null then
    return json_build_object('id', req_id, 'code', prop.code, 'duplicate', true);
  end if;

  -- ── light abuse guard ─────────────────────────────────────────────────────
  select count(*) into v_recent
    from public.property_requests r
   where r.phone = v_phone
     and r.created_at > now() - interval '1 hour';

  if v_recent >= 10 then
    raise exception 'too_many_requests' using errcode = '22023';
  end if;

  -- ── CRM lead so the request shows up in the existing Clients pipeline ─────
  insert into public.clients (name, phone, stage, agent_id, team_id, preferred_area, preferred_unit_type, budget, notes)
  values (
    v_name, v_phone, 'new_lead', prop.agent_id, prop.team_id,
    prop.city, coalesce(prop.ptype, prop.unit_type), prop.price,
    concat_ws(E'\n',
      'Client View request · ' || coalesce(prop.code, '—') || ' · ' || coalesce(prop.title, ''),
      v_msg)
  )
  returning id into cli_id;

  insert into public.property_requests (
    property_id, property_code, property_title, agent_id, team_id, client_id,
    name, phone, message, source, page_url
  ) values (
    prop.id, prop.code, prop.title, prop.agent_id, prop.team_id, cli_id,
    v_name, v_phone, v_msg, 'client_view', left(coalesce(p_url, ''), 500)
  )
  returning id into req_id;

  return json_build_object('id', req_id, 'code', prop.code, 'duplicate', false);
end $$;

revoke all on function public.rr_submit_property_request(text, text, text, text, text) from public;
grant execute on function public.rr_submit_property_request(text, text, text, text, text) to anon, authenticated;

comment on function public.rr_submit_property_request(text, text, text, text, text) is
  'Public "Request details" endpoint for client/. Creates a property_requests row + a linked new_lead client. The only write available to the anon role.';


-- ============================================================================
--  DONE.  Quick smoke test (run as anon in a fresh SQL editor tab is not
--  possible, but these two work from the app):
--    GET  /rest/v1/public_listings?select=code,title,price&limit=5
--    POST /rest/v1/rpc/rr_submit_property_request
--         {"p_property":"RR-1024","p_name":"Test","p_phone":"01000000000"}
-- ============================================================================
