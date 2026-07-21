-- ============================================================================
-- Ring Roads — COMPLETE from-scratch schema (real-estate CRM).
-- Rebuilds the database after a reset. Run this FIRST, then platform-seed.sql.
--
-- Design goals honored:
--   * CREATE TABLE IF NOT EXISTS only (no ALTER except the one unavoidable
--     circular FK teams.leader_id -> profiles, added via a guarded DO block).
--   * Fully idempotent — safe to run any number of times.
--   * FKs, indexes, triggers, RLS policies, helper functions, storage bucket.
--
-- SEED COMPATIBILITY NOTES (platform-seed.sql runs UNMODIFIED):
--   * properties.status canonical values: available | reserved | sold | rented
--     (the app also uses 'archived'). properties.approval canonical values:
--     pending | approved | rejected. The provided seed contains a few rows
--     with these two columns cross-swapped ('approved' as a status, 'available'
--     as an approval), so NO CHECK is placed on status/approval — a strict
--     CHECK would reject the unmodified seed. All other enums ARE constrained.
--   * The role-guard trigger only applies to real end users (auth.uid() not
--     null); service-role seeding may set any role.
-- ============================================================================

create extension if not exists pgcrypto;   -- gen_random_uuid(), crypt()/gen_salt() for the seed

-- ── shared updated_at trigger fn (no table dependency) ───────────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

-- ============================================================================
--  TABLES  (created in FK dependency order)
-- ============================================================================

-- 1. teams ────────────────────────────────────────────────────────────────────
--    leader_id FK to profiles is added later (circular dependency).
create table if not exists public.teams (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  description   text,
  color         text,
  logo          text,                       -- storage path in platform-images
  leader_id     uuid,                        -- -> profiles(id), FK added below
  monthly_goal  numeric,
  kpis          jsonb not null default '{}'::jsonb,
  archived      boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- 2. profiles (mirror of auth.users with role + team) ────────────────────────
create table if not exists public.profiles (
  id                 uuid primary key references auth.users(id) on delete cascade,
  email              text,
  name               text,
  phone              text,
  photo              text,                   -- storage path in platform-images
  nationality        text,
  role               text not null default 'agent'
                       check (role in ('admin','management','leader','agent')),
  team_id            uuid references public.teams(id) on delete set null,
  performance_rating numeric not null default 0,
  active             boolean not null default true,
  joined             date not null default current_date,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

-- 3. properties ──────────────────────────────────────────────────────────────
create table if not exists public.properties (
  id           uuid primary key default gen_random_uuid(),
  code         text,
  title        text,
  ptype        text,                          -- platform type slug (apartment, villa, ...)
  unit_type    text,                          -- legacy alias of ptype
  project      text,
  developer    text,
  price        numeric not null default 0,
  area         numeric,
  bedrooms     integer default 0,
  bathrooms    integer default 0,
  beds         integer default 0,             -- legacy alias of bedrooms
  baths        integer default 0,             -- legacy alias of bathrooms
  floor        integer,
  year_built   integer,
  parking      integer default 0,
  furnished    boolean not null default false,
  featured     boolean not null default false,
  address      text,
  address_en   text,
  address_ar   text,
  city         text,
  governorate  text,
  type         text not null default 'sale' check (type in ('sale','rent')),
  status       text not null default 'available',  -- see SEED COMPAT NOTES (no CHECK)
  approval     text not null default 'pending',    -- see SEED COMPAT NOTES (no CHECK)
  description  text,
  payment_plan text,
  delivery     date,
  images       jsonb not null default '[]'::jsonb,
  map_url      text,
  amenities    jsonb not null default '[]'::jsonb,
  lat          numeric,
  lng          numeric,
  sold_date    date,
  buyer_name   text,
  sold_price   numeric,
  commission   numeric,
  agent_id     uuid references public.profiles(id) on delete set null,
  team_id      uuid references public.teams(id) on delete set null,
  created_by   uuid references auth.users(id) on delete set null default auth.uid(),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- 4. clients ─────────────────────────────────────────────────────────────────
create table if not exists public.clients (
  id                  uuid primary key default gen_random_uuid(),
  name                text not null,
  phone               text,
  email               text,
  nationality         text,
  budget              numeric,
  preferred_area      text,
  preferred_unit_type text,
  notes               text,
  stage               text not null default 'new_lead'
                        check (stage in ('new_lead','contacted','visit_scheduled','negotiating','reservation','contract_signed')),
  agent_id            uuid references public.profiles(id) on delete set null,
  team_id             uuid references public.teams(id) on delete set null,
  created_by          uuid references auth.users(id) on delete set null default auth.uid(),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- 5. deals ───────────────────────────────────────────────────────────────────
create table if not exists public.deals (
  id                 uuid primary key default gen_random_uuid(),
  client_id          uuid references public.clients(id) on delete set null,
  property_id        uuid references public.properties(id) on delete set null,
  agent              text,                    -- denormalized agent name
  agent_id           uuid references public.profiles(id) on delete set null,
  team_id            uuid references public.teams(id) on delete set null,
  stage              text not null default 'lead'
                       check (stage in ('lead','contacted','visit','negotiation','reservation','won','lost','closed')),
  value              numeric not null default 0,
  commission_pct     numeric not null default 2.5,
  agent_share_pct    numeric not null default 40,
  company_share_pct  numeric not null default 60,
  closed_at          date,
  created_by         uuid references auth.users(id) on delete set null default auth.uid(),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

-- 6. followups ───────────────────────────────────────────────────────────────
create table if not exists public.followups (
  id         uuid primary key default gen_random_uuid(),
  client_id  uuid references public.clients(id) on delete cascade,
  agent_id   uuid references public.profiles(id) on delete set null,
  team_id    uuid references public.teams(id) on delete set null,
  title      text not null,
  kind       text not null default 'call'
               check (kind in ('call','meeting','visit','followup','other')),
  due_at     timestamptz not null,
  done       boolean not null default false,
  notes      text,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);

-- 7. categories (admin-managed property types) ───────────────────────────────
create table if not exists public.categories (
  id      uuid primary key default gen_random_uuid(),
  kind    text not null default 'ptype',
  slug    text not null,
  name_en text not null,
  name_ar text,
  sort    integer not null default 0,
  unique (kind, slug)
);

-- 8. tasks (team to-dos) ──────────────────────────────────────────────────────
create table if not exists public.tasks (
  id          uuid primary key default gen_random_uuid(),
  team_id     uuid references public.teams(id) on delete cascade,
  title       text not null,
  notes       text,
  assignee_id uuid references public.profiles(id) on delete set null,
  due         date not null,
  priority    text not null default 'normal' check (priority in ('low','normal','high')),
  done        boolean not null default false,
  created_by  uuid references auth.users(id) on delete set null default auth.uid(),
  created_at  timestamptz not null default now()
);

-- 9. events (team calendar) ───────────────────────────────────────────────────
create table if not exists public.events (
  id         uuid primary key default gen_random_uuid(),
  team_id    uuid references public.teams(id) on delete cascade,
  title      text not null,
  kind       text not null default 'meeting' check (kind in ('meeting','visit','followup','other')),
  starts_at  timestamptz not null,
  notes      text,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);

-- circular FK: teams.leader_id -> profiles(id) (only unavoidable ALTER) ───────
do $$ begin
  alter table public.teams
    add constraint teams_leader_fk foreign key (leader_id)
    references public.profiles(id) on delete set null;
exception when duplicate_object then null; end $$;

-- ============================================================================
--  HELPER FUNCTIONS  (security definer so RLS can call them without recursion)
-- ============================================================================
create or replace function public.rrp_role() returns text
  language sql stable security definer set search_path = public as
$$ select role from public.profiles where id = auth.uid() $$;

create or replace function public.rrp_team() returns uuid
  language sql stable security definer set search_path = public as
$$ select team_id from public.profiles where id = auth.uid() $$;

create or replace function public.rrp_is_mgmt() returns boolean
  language sql stable security definer set search_path = public as
$$ select coalesce(public.rrp_role() in ('admin','management'), false) $$;

-- auto-create a profile whenever an auth user is created
create or replace function public.rrp_handle_new_user() returns trigger
  language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, name)
  values (new.id, new.email, split_part(coalesce(new.email,'user'), '@', 1))
  on conflict (id) do nothing;
  return new;
end $$;

-- prevent role self-escalation by real end users (service-role seeding is exempt)
create or replace function public.rrp_guard_profile() returns trigger
  language plpgsql security definer set search_path = public as $$
begin
  if new.role is distinct from old.role
     and auth.uid() is not null
     and not public.rrp_is_mgmt() then
    new.role := old.role;
  end if;
  return new;
end $$;

-- ============================================================================
--  TRIGGERS  (drop-if-exists + create = idempotent)
-- ============================================================================
drop trigger if exists trg_teams_updated_at on public.teams;
create trigger trg_teams_updated_at before update on public.teams
  for each row execute function public.set_updated_at();

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists trg_profiles_guard on public.profiles;
create trigger trg_profiles_guard before update on public.profiles
  for each row execute function public.rrp_guard_profile();

drop trigger if exists trg_properties_updated_at on public.properties;
create trigger trg_properties_updated_at before update on public.properties
  for each row execute function public.set_updated_at();

drop trigger if exists trg_clients_updated_at on public.clients;
create trigger trg_clients_updated_at before update on public.clients
  for each row execute function public.set_updated_at();

drop trigger if exists trg_deals_updated_at on public.deals;
create trigger trg_deals_updated_at before update on public.deals
  for each row execute function public.set_updated_at();

drop trigger if exists rrp_on_auth_user_created on auth.users;
create trigger rrp_on_auth_user_created after insert on auth.users
  for each row execute function public.rrp_handle_new_user();

-- backfill profiles for any auth users that already exist, then keep admin working
insert into public.profiles (id, email, name)
select u.id, u.email, split_part(coalesce(u.email,'user'), '@', 1)
from auth.users u
on conflict (id) do nothing;

update public.profiles set role = 'admin' where email = 'ringroad.re@gmail.com';

-- ============================================================================
--  INDEXES
-- ============================================================================
create index if not exists idx_profiles_team    on public.profiles(team_id);
create index if not exists idx_profiles_role     on public.profiles(role);
create index if not exists idx_teams_leader      on public.teams(leader_id);
create index if not exists idx_prop_agent        on public.properties(agent_id);
create index if not exists idx_prop_team         on public.properties(team_id);
create index if not exists idx_prop_status       on public.properties(status);
create index if not exists idx_prop_approval     on public.properties(approval);
create index if not exists idx_prop_code         on public.properties(code);
create index if not exists idx_clients_agent     on public.clients(agent_id);
create index if not exists idx_clients_team      on public.clients(team_id);
create index if not exists idx_clients_stage     on public.clients(stage);
create index if not exists idx_deals_agent       on public.deals(agent_id);
create index if not exists idx_deals_team        on public.deals(team_id);
create index if not exists idx_deals_stage       on public.deals(stage);
create index if not exists idx_deals_client      on public.deals(client_id);
create index if not exists idx_deals_property    on public.deals(property_id);
create index if not exists idx_fu_agent          on public.followups(agent_id);
create index if not exists idx_fu_team           on public.followups(team_id);
create index if not exists idx_fu_client         on public.followups(client_id);
create index if not exists idx_fu_due            on public.followups(due_at);
create index if not exists idx_tasks_team        on public.tasks(team_id);
create index if not exists idx_tasks_assignee    on public.tasks(assignee_id);
create index if not exists idx_events_team       on public.events(team_id);

-- ============================================================================
--  ROW LEVEL SECURITY
--    admin/management = everything · leader = own team · agent = own rows.
--    (Service role / SQL editor bypasses RLS, so seeding is unaffected.)
-- ============================================================================
alter table public.profiles   enable row level security;
alter table public.teams      enable row level security;
alter table public.properties enable row level security;
alter table public.clients    enable row level security;
alter table public.deals      enable row level security;
alter table public.followups  enable row level security;
alter table public.tasks      enable row level security;
alter table public.events     enable row level security;
alter table public.categories enable row level security;

-- profiles
drop policy if exists "prof sel" on public.profiles;
create policy "prof sel" on public.profiles for select to authenticated using (true);
drop policy if exists "prof ins" on public.profiles;
create policy "prof ins" on public.profiles for insert to authenticated
  with check (id = auth.uid() or public.rrp_is_mgmt());
drop policy if exists "prof upd" on public.profiles;
create policy "prof upd" on public.profiles for update to authenticated
  using (id = auth.uid() or public.rrp_is_mgmt() or (public.rrp_role()='leader' and team_id = public.rrp_team()))
  with check (true);
drop policy if exists "prof del" on public.profiles;
create policy "prof del" on public.profiles for delete to authenticated
  using (public.rrp_role()='admin' or (public.rrp_role()='management' and role <> 'admin'));

-- teams
drop policy if exists "team sel" on public.teams;
create policy "team sel" on public.teams for select to authenticated
  using (public.rrp_is_mgmt() or id = public.rrp_team());
drop policy if exists "team ins" on public.teams;
create policy "team ins" on public.teams for insert to authenticated with check (public.rrp_is_mgmt());
drop policy if exists "team upd" on public.teams;
create policy "team upd" on public.teams for update to authenticated
  using (public.rrp_is_mgmt() or (public.rrp_role()='leader' and id = public.rrp_team())) with check (true);
drop policy if exists "team del" on public.teams;
create policy "team del" on public.teams for delete to authenticated using (public.rrp_is_mgmt());

-- properties
drop policy if exists "prop sel" on public.properties;
create policy "prop sel" on public.properties for select to authenticated
  using (public.rrp_is_mgmt() or agent_id = auth.uid() or (public.rrp_role()='leader' and team_id = public.rrp_team()));
drop policy if exists "prop ins" on public.properties;
create policy "prop ins" on public.properties for insert to authenticated with check (true);
drop policy if exists "prop upd" on public.properties;
create policy "prop upd" on public.properties for update to authenticated
  using (public.rrp_is_mgmt() or agent_id = auth.uid() or (public.rrp_role()='leader' and team_id = public.rrp_team()))
  with check (true);
drop policy if exists "prop del" on public.properties;
create policy "prop del" on public.properties for delete to authenticated using (public.rrp_is_mgmt());

-- clients
drop policy if exists "cli sel" on public.clients;
create policy "cli sel" on public.clients for select to authenticated
  using (public.rrp_is_mgmt() or agent_id = auth.uid() or (public.rrp_role()='leader' and team_id = public.rrp_team()));
drop policy if exists "cli ins" on public.clients;
create policy "cli ins" on public.clients for insert to authenticated with check (true);
drop policy if exists "cli upd" on public.clients;
create policy "cli upd" on public.clients for update to authenticated
  using (public.rrp_is_mgmt() or agent_id = auth.uid() or (public.rrp_role()='leader' and team_id = public.rrp_team()))
  with check (true);
drop policy if exists "cli del" on public.clients;
create policy "cli del" on public.clients for delete to authenticated
  using (public.rrp_is_mgmt() or agent_id = auth.uid() or (public.rrp_role()='leader' and team_id = public.rrp_team()));

-- deals
drop policy if exists "deal sel" on public.deals;
create policy "deal sel" on public.deals for select to authenticated
  using (public.rrp_is_mgmt() or agent_id = auth.uid() or (public.rrp_role()='leader' and team_id = public.rrp_team()));
drop policy if exists "deal ins" on public.deals;
create policy "deal ins" on public.deals for insert to authenticated with check (true);
drop policy if exists "deal upd" on public.deals;
create policy "deal upd" on public.deals for update to authenticated
  using (public.rrp_is_mgmt() or agent_id = auth.uid() or (public.rrp_role()='leader' and team_id = public.rrp_team()))
  with check (true);
drop policy if exists "deal del" on public.deals;
create policy "deal del" on public.deals for delete to authenticated
  using (public.rrp_is_mgmt() or (public.rrp_role()='leader' and team_id = public.rrp_team()));

-- followups
drop policy if exists "fu sel" on public.followups;
create policy "fu sel" on public.followups for select to authenticated
  using (public.rrp_is_mgmt() or agent_id = auth.uid() or (public.rrp_role()='leader' and team_id = public.rrp_team()));
drop policy if exists "fu ins" on public.followups;
create policy "fu ins" on public.followups for insert to authenticated with check (true);
drop policy if exists "fu upd" on public.followups;
create policy "fu upd" on public.followups for update to authenticated
  using (public.rrp_is_mgmt() or agent_id = auth.uid() or (public.rrp_role()='leader' and team_id = public.rrp_team()))
  with check (true);
drop policy if exists "fu del" on public.followups;
create policy "fu del" on public.followups for delete to authenticated
  using (public.rrp_is_mgmt() or agent_id = auth.uid() or (public.rrp_role()='leader' and team_id = public.rrp_team()));

-- tasks
drop policy if exists "task sel" on public.tasks;
create policy "task sel" on public.tasks for select to authenticated
  using (public.rrp_is_mgmt() or team_id = public.rrp_team() or assignee_id = auth.uid());
drop policy if exists "task ins" on public.tasks;
create policy "task ins" on public.tasks for insert to authenticated
  with check (public.rrp_is_mgmt() or (public.rrp_role()='leader' and team_id = public.rrp_team()));
drop policy if exists "task upd" on public.tasks;
create policy "task upd" on public.tasks for update to authenticated
  using (public.rrp_is_mgmt() or (public.rrp_role()='leader' and team_id = public.rrp_team()) or assignee_id = auth.uid())
  with check (true);
drop policy if exists "task del" on public.tasks;
create policy "task del" on public.tasks for delete to authenticated
  using (public.rrp_is_mgmt() or (public.rrp_role()='leader' and team_id = public.rrp_team()));

-- events
drop policy if exists "ev sel" on public.events;
create policy "ev sel" on public.events for select to authenticated
  using (public.rrp_is_mgmt() or team_id = public.rrp_team());
drop policy if exists "ev ins" on public.events;
create policy "ev ins" on public.events for insert to authenticated
  with check (public.rrp_is_mgmt() or (public.rrp_role()='leader' and team_id = public.rrp_team()));
drop policy if exists "ev upd" on public.events;
create policy "ev upd" on public.events for update to authenticated
  using (public.rrp_is_mgmt() or (public.rrp_role()='leader' and team_id = public.rrp_team()) or created_by = auth.uid())
  with check (true);
drop policy if exists "ev del" on public.events;
create policy "ev del" on public.events for delete to authenticated
  using (public.rrp_is_mgmt() or (public.rrp_role()='leader' and team_id = public.rrp_team()) or created_by = auth.uid());

-- categories (read all; admin manages)
drop policy if exists "cat sel" on public.categories;
create policy "cat sel" on public.categories for select to authenticated using (true);
drop policy if exists "cat ins" on public.categories;
create policy "cat ins" on public.categories for insert to authenticated with check (public.rrp_role()='admin');
drop policy if exists "cat upd" on public.categories;
create policy "cat upd" on public.categories for update to authenticated using (public.rrp_role()='admin') with check (true);
drop policy if exists "cat del" on public.categories;
create policy "cat del" on public.categories for delete to authenticated using (public.rrp_role()='admin');

-- ============================================================================
--  STORAGE  (public bucket for property / avatar / team image uploads)
-- ============================================================================
insert into storage.buckets (id, name, public)
values ('platform-images','platform-images', true)
on conflict (id) do nothing;

drop policy if exists "rrp read"   on storage.objects;
create policy "rrp read"   on storage.objects for select using (bucket_id='platform-images');
drop policy if exists "rrp insert" on storage.objects;
create policy "rrp insert" on storage.objects for insert to authenticated with check (bucket_id='platform-images');
drop policy if exists "rrp update" on storage.objects;
create policy "rrp update" on storage.objects for update to authenticated using (bucket_id='platform-images');
drop policy if exists "rrp delete" on storage.objects;
create policy "rrp delete" on storage.objects for delete to authenticated using (bucket_id='platform-images');
