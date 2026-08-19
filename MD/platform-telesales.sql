-- ============================================================================
--  Ring Roads — TELESALES ASSIGNMENT migration.
--
--  Idempotent add-on to platform-schema.sql. Run AFTER the base schema (order
--  against the other add-ons does not matter). Nothing existing is dropped or
--  repurposed — this only adds columns, one table, helpers, RPCs, and it widens
--  two RLS policies so an assigned telesales agent can see their own apartments.
--
--  WHAT IT ADDS
--    1. profiles.department                → 'telesales' | 'engineering' | …
--    2. properties.assigned_telesales_id   → the telesales employee working it
--       properties.assigned_at / assignment_status / assigned_by
--    3. telesales_assignment_history       → full audit trail of every change
--    4. rr_assign_telesales()              → assign / reassign / unassign (one apartment)
--       rr_distribute_apartments()         → even auto-distribution across the team
--    5. RLS: telesales read + work ONLY their own apartments; a BEFORE UPDATE
--       guard stops them editing the assignment columns at all
--    6. public_listings now contacts the ASSIGNED TELESALES, so the public site's
--       WhatsApp button reaches the person actually working the apartment (it
--       falls back to the listing agent only when nobody is assigned)
--
--  NAMING — reuses what already exists rather than duplicating it:
--    • the WhatsApp number is the existing profiles.whatsapp column added by
--      platform-client-view.sql (no second whatsapp_number column)
--    • apartments are the existing public.properties rows (no second table)
--    • role stays admin | management | leader | agent; "telesales" is a
--      DEPARTMENT, so the four-role RBAC and every existing policy keep working
--
--  SAFE TO RE-RUN: every statement is IF NOT EXISTS / OR REPLACE / drop-create.
-- ============================================================================


-- ============================================================================
-- 1. DEPARTMENT ON PROFILES
-- ============================================================================
alter table public.profiles add column if not exists department text;

comment on column public.profiles.department is
  'Business unit: telesales | engineering | management | sales. Drives telesales apartment assignment; the RBAC role column is unchanged.';

create index if not exists idx_profiles_department on public.profiles(department) where department is not null;

-- Who may be given apartments. Deliberately strict:
--   • must be active
--   • must be in the telesales department
--   • must be role 'agent' — a telesales TEAM LEADER supervises, so leaders,
--     admins, management and engineers are all excluded by construction
create or replace function public.rr_is_telesales(p_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles p
     where p.id = p_id
       and p.active is true
       and lower(btrim(coalesce(p.department, ''))) = 'telesales'
       and p.role = 'agent'
  )
$$;

-- Is the CURRENT user a telesales employee? (used by the UI and the policies)
create or replace function public.rr_am_telesales()
returns boolean language sql stable security definer set search_path = public as $$
  select public.rr_is_telesales(auth.uid())
$$;

grant execute on function public.rr_is_telesales(uuid)  to authenticated;
grant execute on function public.rr_am_telesales()      to authenticated;


-- ============================================================================
-- 2. ASSIGNMENT COLUMNS ON THE EXISTING properties TABLE
-- ============================================================================
alter table public.properties add column if not exists assigned_telesales_id uuid;
alter table public.properties add column if not exists assigned_at           timestamptz;
alter table public.properties add column if not exists assigned_by           uuid;
alter table public.properties add column if not exists assignment_status     text;

do $$ begin
  alter table public.properties
    add constraint properties_assigned_telesales_fk
    foreign key (assigned_telesales_id) references public.profiles(id) on delete set null;
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.properties
    add constraint properties_assignment_status_chk
    check (assignment_status is null
           or assignment_status in ('unassigned', 'assigned', 'reassigned', 'released'));
exception when duplicate_object then null; end $$;

-- rows that predate this migration are simply unassigned
update public.properties
   set assignment_status = 'unassigned'
 where assignment_status is null and assigned_telesales_id is null;

create index if not exists idx_properties_assigned_telesales
  on public.properties(assigned_telesales_id) where assigned_telesales_id is not null;
create index if not exists idx_properties_unassigned
  on public.properties(id) where assigned_telesales_id is null;

comment on column public.properties.assigned_telesales_id is
  'Telesales employee working this apartment. Distinct from agent_id, which stays the listing owner used by deals and commissions.';


-- ============================================================================
-- 3. ASSIGNMENT HISTORY
-- ============================================================================
create table if not exists public.telesales_assignment_history (
  id                 uuid primary key default gen_random_uuid(),
  property_id        uuid references public.properties(id) on delete cascade,
  from_telesales_id  uuid references public.profiles(id) on delete set null,
  to_telesales_id    uuid references public.profiles(id) on delete set null,
  action             text not null default 'assign'
                       check (action in ('assign', 'reassign', 'unassign', 'distribute', 'redistribute')),
  changed_by         uuid references public.profiles(id) on delete set null,
  note               text,
  created_at         timestamptz not null default now()
);

create index if not exists idx_tah_property on public.telesales_assignment_history(property_id);
create index if not exists idx_tah_to       on public.telesales_assignment_history(to_telesales_id);
create index if not exists idx_tah_created  on public.telesales_assignment_history(created_at desc);

alter table public.telesales_assignment_history enable row level security;

-- Management/admin see the whole trail; a telesales employee sees only rows
-- about apartments handed to or taken from them.
drop policy if exists "tah sel" on public.telesales_assignment_history;
create policy "tah sel" on public.telesales_assignment_history for select to authenticated
  using (
    public.rrp_is_mgmt()
    or to_telesales_id = auth.uid()
    or from_telesales_id = auth.uid()
  );

-- Writes only ever happen inside the security-definer RPCs below.
drop policy if exists "tah ins" on public.telesales_assignment_history;
create policy "tah ins" on public.telesales_assignment_history for insert to authenticated
  with check (public.rrp_is_mgmt());

drop policy if exists "tah del" on public.telesales_assignment_history;
create policy "tah del" on public.telesales_assignment_history for delete to authenticated
  using (public.rrp_is_mgmt());


-- ============================================================================
-- 4. RLS — telesales can reach their own apartments, and only those
--
--    The existing policies already scoped agents to `agent_id = auth.uid()`, so
--    this only ADDS the assigned-apartment case. Nobody loses access, and a
--    telesales employee still cannot read or write a row that is neither theirs
--    to own nor assigned to them — changing an id in a URL or calling PostgREST
--    directly returns nothing, because the filter is enforced in the database.
-- ============================================================================
drop policy if exists "prop sel" on public.properties;
create policy "prop sel" on public.properties for select to authenticated
  using (
    public.rrp_is_mgmt()
    or agent_id = auth.uid()
    or assigned_telesales_id = auth.uid()
    or (public.rrp_role() = 'leader' and team_id = public.rrp_team())
  );

drop policy if exists "prop upd" on public.properties;
create policy "prop upd" on public.properties for update to authenticated
  using (
    public.rrp_is_mgmt()
    or agent_id = auth.uid()
    or assigned_telesales_id = auth.uid()
    or (public.rrp_role() = 'leader' and team_id = public.rrp_team())
  )
  with check (true);

-- Column-level guard: only management/admin may move an apartment between
-- telesales employees. A telesales agent updating their own apartment (status,
-- notes, …) silently keeps the assignment columns they were given — mirrors the
-- rrp_guard_profile() pattern already used for role self-escalation.
create or replace function public.rr_guard_assignment()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not public.rrp_is_mgmt() then
    new.assigned_telesales_id := old.assigned_telesales_id;
    new.assigned_at           := old.assigned_at;
    new.assigned_by           := old.assigned_by;
    new.assignment_status     := old.assignment_status;
  end if;
  return new;
end $$;

drop trigger if exists trg_properties_assignment_guard on public.properties;
create trigger trg_properties_assignment_guard before update on public.properties
  for each row execute function public.rr_guard_assignment();

-- Profile guard: extend the existing role guard so a user cannot promote their
-- own department or reactivate a disabled account either. Role handling below
-- is byte-for-byte the original behaviour.
create or replace function public.rrp_guard_profile() returns trigger
  language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not public.rrp_is_mgmt() then
    if new.role is distinct from old.role then
      new.role := old.role;
    end if;
    if new.department is distinct from old.department then
      new.department := old.department;
    end if;
    if new.active is distinct from old.active then
      new.active := old.active;
    end if;
  end if;
  return new;
end $$;


-- ============================================================================
-- 5. ASSIGN / REASSIGN / UNASSIGN ONE APARTMENT
--    p_telesales = null clears the assignment.
-- ============================================================================
create or replace function public.rr_assign_telesales(p_property uuid, p_telesales uuid)
returns json
language plpgsql security definer set search_path = public as $$
declare
  v_prev   uuid;
  v_action text;
  v_status text;
begin
  if not public.rrp_is_mgmt() then
    raise exception 'not_authorised' using errcode = '42501';
  end if;

  select assigned_telesales_id into v_prev
    from public.properties where id = p_property;
  if not found then
    raise exception 'property_not_found' using errcode = '22023';
  end if;

  if p_telesales is not null and not public.rr_is_telesales(p_telesales) then
    raise exception 'not_an_active_telesales_agent' using errcode = '22023';
  end if;

  if p_telesales is null then
    v_action := 'unassign';
  elsif v_prev is null then
    v_action := 'assign';
  elsif v_prev = p_telesales then
    return json_build_object('changed', false, 'action', 'unchanged');
  else
    v_action := 'reassign';
  end if;

  -- the history table stores the VERB, the column stores the STATE
  v_status := case v_action
                when 'unassign' then 'unassigned'
                when 'reassign' then 'reassigned'
                else 'assigned'
              end;

  update public.properties
     set assigned_telesales_id = p_telesales,
         assigned_at           = case when p_telesales is null then null else now() end,
         assigned_by           = case when p_telesales is null then null else auth.uid() end,
         assignment_status     = v_status
   where id = p_property;

  insert into public.telesales_assignment_history
    (property_id, from_telesales_id, to_telesales_id, action, changed_by)
  values (p_property, v_prev, p_telesales, v_action, auth.uid());

  return json_build_object('changed', true, 'action', v_action, 'status', v_status);
end $$;

revoke all on function public.rr_assign_telesales(uuid, uuid) from public;
revoke all on function public.rr_assign_telesales(uuid, uuid) from public;
grant execute on function public.rr_assign_telesales(uuid, uuid) to authenticated;


-- ============================================================================
-- 6. AUTOMATIC DISTRIBUTION
--
--    p_redistribute = false (default)  → only apartments that are currently
--                                        UNASSIGNED are handed out; existing
--                                        assignments are never touched.
--    p_redistribute = true             → every workable apartment is cleared
--                                        first and the whole book is dealt again.
--
--    Fairness: each apartment goes to whichever active telesales employee has
--    the fewest at that moment (ties broken by name, so runs are reproducible).
--    From an empty book that is a plain even split — 102 apartments over 4
--    people gives 26 / 26 / 25 / 25 — and for an incremental run it levels up
--    whoever is behind instead of blindly cycling.
--
--    Sold, rented and archived stock is skipped: it is not workable, so counting
--    it would hand someone a quota of dead rows.
-- ============================================================================
create or replace function public.rr_distribute_apartments(p_redistribute boolean default false)
returns json
language plpgsql security definer set search_path = public as $$
declare
  v_action  text := case when p_redistribute then 'redistribute' else 'distribute' end;
  v_ids     uuid[];
  v_load    integer[];
  v_n       integer;
  v_i       integer;
  v_best    integer;
  v_cnt     integer;
  v_cleared integer := 0;
  v_done    integer := 0;
  v_prop    record;
  v_per     json;
begin
  if not public.rrp_is_mgmt() then
    raise exception 'not_authorised' using errcode = '42501';
  end if;

  -- eligible team, in a stable order
  select array_agg(p.id order by lower(coalesce(p.name, p.email, '')), p.id)
    into v_ids
    from public.profiles p
   where public.rr_is_telesales(p.id);

  v_n := coalesce(array_length(v_ids, 1), 0);
  if v_n = 0 then
    raise exception 'no_active_telesales' using errcode = '22023';
  end if;

  v_load := array_fill(0, array[v_n]);

  if p_redistribute then
    with cleared as (
      update public.properties
         set assigned_telesales_id = null,
             assigned_at           = null,
             assigned_by           = null,
             assignment_status     = 'unassigned'
       where assigned_telesales_id is not null
         and coalesce(status, 'available') not in ('sold', 'rented', 'archived')
      returning id
    )
    select count(*) into v_cleared from cleared;
  else
    -- seed each counter with what that person already carries, so a top-up
    -- levels the team instead of blindly cycling
    for v_i in 1 .. v_n loop
      select count(*) into v_cnt
        from public.properties
       where assigned_telesales_id = v_ids[v_i]
         and coalesce(status, 'available') not in ('sold', 'rented', 'archived');
      v_load[v_i] := v_cnt;
    end loop;
  end if;

  for v_prop in
    select id
      from public.properties
     where assigned_telesales_id is null
       and coalesce(status, 'available') not in ('sold', 'rented', 'archived')
     order by created_at, id
  loop
    -- lowest current load wins; strict < keeps the earlier (name-ordered) person
    v_best := 1;
    for v_i in 2 .. v_n loop
      if v_load[v_i] < v_load[v_best] then
        v_best := v_i;
      end if;
    end loop;

    update public.properties
       set assigned_telesales_id = v_ids[v_best],
           assigned_at           = now(),
           assigned_by           = auth.uid(),
           assignment_status     = 'assigned'
     where id = v_prop.id;

    insert into public.telesales_assignment_history
      (property_id, from_telesales_id, to_telesales_id, action, changed_by, note)
    values (v_prop.id, null, v_ids[v_best], v_action, auth.uid(),
            case when p_redistribute then 'Redistribute All' else 'Distribute unassigned' end);

    v_load[v_best] := v_load[v_best] + 1;
    v_done := v_done + 1;
  end loop;

  select coalesce(json_agg(json_build_object('id', s.id, 'name', s.name, 'count', s.cnt)
                           order by s.cnt desc, s.name), '[]'::json)
    into v_per
    from (
      select v_ids[g.i]                    as id,
             coalesce(p.name, p.email, '') as name,
             v_load[g.i]                   as cnt
        from generate_subscripts(v_ids, 1) as g(i)
        join public.profiles p on p.id = v_ids[g.i]
    ) s;

  return json_build_object(
    'action',    v_action,
    'telesales', v_n,
    'cleared',   v_cleared,
    'assigned',  v_done,
    'per_agent', v_per
  );
end $$;

revoke all on function public.rr_distribute_apartments(boolean) from public;
revoke all on function public.rr_distribute_apartments(boolean) from public;
grant execute on function public.rr_distribute_apartments(boolean) to authenticated;


-- ============================================================================
-- 7. PUBLIC SITE — contact the ASSIGNED TELESALES
--
--    Same column names as before, so client/ needs no change to keep working:
--    agent_* now resolves to the assigned telesales employee when there is one,
--    and falls back to the listing agent otherwise. Only the contact details the
--    button needs are exposed — no ids, no roles, no internal fields.
-- ============================================================================
drop view if exists public.public_listings;
create view public.public_listings with (security_barrier = true) as
select
  p.id,
  p.code,
  p.title,
  coalesce(p.ptype, p.unit_type)          as ptype,
  p.type,
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
  -- the person the public should reach: assigned telesales first, else the agent
  coalesce(ts.id, ag.id)                  as agent_id,
  coalesce(ts.name, ag.name)              as agent_name,
  coalesce(ts.photo, ag.photo)            as agent_photo,
  coalesce(ts.phone, ag.phone)            as agent_phone,
  -- ONLY a genuinely saved WhatsApp number, never a phone number guessed to be
  -- one: the public button must not produce a wa.me link that goes nowhere.
  -- When a telesales employee is assigned, theirs is the only one that counts —
  -- the client must reach the person actually working the apartment.
  case when p.assigned_telesales_id is not null
       then nullif(btrim(coalesce(ts.whatsapp, '')), '')
       else nullif(btrim(coalesce(ag.whatsapp, '')), '')
  end                                     as agent_whatsapp,
  tm.name                                 as team_name
from public.properties p
left join public.profiles ts
       on ts.id = p.assigned_telesales_id and ts.active is not false
left join public.profiles ag
       on ag.id = p.agent_id and ag.active is not false
left join public.teams   tm on tm.id = p.team_id
where coalesce(p.approval, 'approved') not in ('pending', 'rejected')
  and coalesce(p.status,   'available') not in ('sold', 'rented', 'archived', 'draft');

comment on view public.public_listings is
  'Login-free read surface for client/. Published stock only; the agent_* columns resolve to the assigned telesales employee, falling back to the listing agent.';

grant select on public.public_listings to anon, authenticated;


-- ============================================================================
--  DONE. Verify with:
--    select code, assigned_telesales_id, assignment_status from properties limit 5;
--    select * from rr_distribute_apartments(false);   -- as an admin
-- ============================================================================
