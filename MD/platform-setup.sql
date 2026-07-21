-- ============================================================================
-- Ring Roads PLATFORM — UNIFIED schema (production CRM).
-- Runs on the SAME Supabase project as the original app and REUSES its real
-- tables: properties, clients, deals, followups. It ADDS the role/team layer
-- (profiles, teams, categories) and extends the existing tables with
-- agent_id / team_id ownership + role-based Row Level Security.
--
-- Idempotent: safe to re-run. Order: run THIS file, then platform-seed.sql.
--
-- ROLES (stored in profiles.role):
--   admin       full access to everything; only role that can delete admins / manage settings
--   management  company-wide read + analytics + reports; cannot change settings or delete admin
--   leader      sees ONLY their own team (agents, clients, deals, follow-ups, properties)
--   agent       sees ONLY their own clients, deals, follow-ups, tasks, properties
-- ============================================================================

-- ── 0. helper: updated_at ────────────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

-- ── 1. profiles (mirror of auth.users with role + team) ──────────────────────
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  name text,
  phone text,
  photo text,                    -- storage path in platform-images
  nationality text,
  role text not null default 'agent' check (role in ('admin','management','leader','agent')),
  team_id uuid,
  performance_rating numeric not null default 0,
  active boolean not null default true,
  joined date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
before update on public.profiles for each row execute function public.set_updated_at();

-- role/team lookups (security definer so RLS can call them without recursion)
create or replace function public.rrp_role() returns text
language sql stable security definer set search_path = public as
$$ select role from public.profiles where id = auth.uid() $$;

create or replace function public.rrp_team() returns uuid
language sql stable security definer set search_path = public as
$$ select team_id from public.profiles where id = auth.uid() $$;

create or replace function public.rrp_is_mgmt() returns boolean
language sql stable security definer set search_path = public as
$$ select coalesce(public.rrp_role() in ('admin','management'), false) $$;

-- auto-create a profile for every new auth user
create or replace function public.rrp_handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, name)
  values (new.id, new.email, split_part(coalesce(new.email,'user'), '@', 1))
  on conflict (id) do nothing;
  return new;
end $$;
drop trigger if exists rrp_on_auth_user_created on auth.users;
create trigger rrp_on_auth_user_created
after insert on auth.users for each row execute function public.rrp_handle_new_user();

-- backfill profiles for pre-existing auth users
insert into public.profiles (id, email, name)
select u.id, u.email, split_part(coalesce(u.email,'user'), '@', 1)
from auth.users u
on conflict (id) do nothing;

-- block role self-escalation by non-managers
create or replace function public.rrp_guard_profile() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.role is distinct from old.role and not public.rrp_is_mgmt() then
    new.role := old.role;
  end if;
  return new;
end $$;
drop trigger if exists trg_profiles_guard on public.profiles;
create trigger trg_profiles_guard
before update on public.profiles for each row execute function public.rrp_guard_profile();

-- ── 2. teams ─────────────────────────────────────────────────────────────────
create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  color text,
  logo text,
  leader_id uuid references public.profiles(id) on delete set null,
  monthly_goal numeric,
  kpis jsonb not null default '{}'::jsonb,
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
drop trigger if exists trg_teams_updated_at on public.teams;
create trigger trg_teams_updated_at
before update on public.teams for each row execute function public.set_updated_at();

do $$ begin
  alter table public.profiles
    add constraint profiles_team_fk foreign key (team_id) references public.teams(id) on delete set null;
exception when duplicate_object then null; end $$;

-- ── 3. properties: extend the EXISTING table into a platform superset ────────
alter table public.properties
  add column if not exists title text,
  add column if not exists ptype text,
  add column if not exists bedrooms integer,
  add column if not exists bathrooms integer,
  add column if not exists floor integer,
  add column if not exists year_built integer,
  add column if not exists parking integer default 0,
  add column if not exists furnished boolean default false,
  add column if not exists featured boolean default false,
  add column if not exists address text,
  add column if not exists city text,
  add column if not exists governorate text,
  add column if not exists description text,
  add column if not exists approval text default 'approved' check (approval in ('pending','approved','rejected')),
  add column if not exists agent_id uuid references public.profiles(id) on delete set null,
  add column if not exists team_id uuid references public.teams(id) on delete set null,
  add column if not exists lat numeric,
  add column if not exists lng numeric,
  add column if not exists amenities jsonb not null default '[]'::jsonb,
  add column if not exists sold_date date,
  add column if not exists buyer_name text,
  add column if not exists sold_price numeric,
  add column if not exists commission numeric;

-- allow 'archived' alongside available/reserved/sold/rented
alter table public.properties drop constraint if exists properties_status_check;
alter table public.properties add constraint properties_status_check
  check (status in ('available','reserved','sold','archived','rented'));

-- relax the original app's NOT NULLs so platform-created rows (which populate
-- the platform columns) insert cleanly; give `type` a default
do $$ begin
  alter table public.properties alter column code drop not null;
  alter table public.properties alter column address_en drop not null;
  alter table public.properties alter column address_ar drop not null;
  alter table public.properties alter column type set default 'sale';
exception when others then null; end $$;

-- backfill platform fields from the original app's columns so legacy rows show well
update public.properties set
  title       = coalesce(title, nullif(trim(coalesce(address_en,'')),''), code),
  ptype       = coalesce(ptype, unit_type, 'apartment'),
  bedrooms    = coalesce(bedrooms, beds, 0),
  bathrooms   = coalesce(bathrooms, baths, 0),
  address     = coalesce(address, address_en),
  city        = coalesce(city, split_part(coalesce(address_en,''), ',', 1)),
  description = coalesce(description, finish_en)
where title is null or ptype is null or bedrooms is null;

-- ── 4. clients: add ownership + nationality ──────────────────────────────────
alter table public.clients
  add column if not exists agent_id uuid references public.profiles(id) on delete set null,
  add column if not exists team_id uuid references public.teams(id) on delete set null,
  add column if not exists nationality text;

-- ── 5. deals: add ownership + won/lost pipeline stages ───────────────────────
alter table public.deals
  add column if not exists agent_id uuid references public.profiles(id) on delete set null,
  add column if not exists team_id uuid references public.teams(id) on delete set null;
alter table public.deals drop constraint if exists deals_stage_check;
alter table public.deals add constraint deals_stage_check
  check (stage in ('lead','contacted','visit','negotiation','reservation','won','lost','closed'));

-- ── 6. followups: add ownership ──────────────────────────────────────────────
alter table public.followups
  add column if not exists agent_id uuid references public.profiles(id) on delete set null,
  add column if not exists team_id uuid references public.teams(id) on delete set null;

-- ── 7. categories (admin-managed property types) ─────────────────────────────
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  kind text not null default 'ptype',
  slug text not null,
  name_en text not null,
  name_ar text,
  sort integer not null default 0,
  unique (kind, slug)
);

-- ── 8. tasks (team to-dos) + events (team calendar) ──────────────────────────
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  team_id uuid references public.teams(id) on delete cascade,
  title text not null,
  notes text,
  assignee_id uuid references public.profiles(id) on delete set null,
  due date not null,
  priority text not null default 'normal' check (priority in ('low','normal','high')),
  done boolean not null default false,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  team_id uuid references public.teams(id) on delete cascade,
  title text not null,
  kind text not null default 'meeting' check (kind in ('meeting','visit','followup','other')),
  starts_at timestamptz not null,
  notes text,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);

-- ── 9. Row Level Security (role hierarchy enforced in the database) ──────────
alter table public.profiles   enable row level security;
alter table public.teams      enable row level security;
alter table public.properties enable row level security;
alter table public.clients    enable row level security;
alter table public.deals      enable row level security;
alter table public.followups  enable row level security;
alter table public.tasks      enable row level security;
alter table public.events     enable row level security;
alter table public.categories enable row level security;

-- clear any prior policies on these tables so re-runs stay clean
do $$
declare pol record;
begin
  for pol in select tablename, policyname from pg_policies
             where schemaname='public'
               and tablename in ('profiles','teams','properties','clients','deals','followups','tasks','events','categories')
  loop execute format('drop policy %I on public.%I', pol.policyname, pol.tablename); end loop;
end $$;

-- profiles
create policy "prof sel" on public.profiles for select to authenticated using (true);
create policy "prof ins" on public.profiles for insert to authenticated
  with check (id = auth.uid() or public.rrp_is_mgmt());
create policy "prof upd" on public.profiles for update to authenticated
  using (id = auth.uid() or public.rrp_is_mgmt() or (public.rrp_role()='leader' and team_id = public.rrp_team()))
  with check (true);
create policy "prof del" on public.profiles for delete to authenticated
  using (public.rrp_role()='admin' or (public.rrp_role()='management' and role <> 'admin'));

-- teams
create policy "team sel" on public.teams for select to authenticated
  using (public.rrp_is_mgmt() or id = public.rrp_team());
create policy "team ins" on public.teams for insert to authenticated with check (public.rrp_is_mgmt());
create policy "team upd" on public.teams for update to authenticated
  using (public.rrp_is_mgmt() or (public.rrp_role()='leader' and id = public.rrp_team())) with check (true);
create policy "team del" on public.teams for delete to authenticated using (public.rrp_is_mgmt());

-- reusable ownership predicate: admin/mgmt = all, leader = own team, agent = own rows
-- properties
create policy "prop sel" on public.properties for select to authenticated using (
  public.rrp_is_mgmt() or agent_id = auth.uid()
  or (public.rrp_role()='leader' and team_id = public.rrp_team())
);
create policy "prop ins" on public.properties for insert to authenticated with check (true);
create policy "prop upd" on public.properties for update to authenticated using (
  public.rrp_is_mgmt() or agent_id = auth.uid()
  or (public.rrp_role()='leader' and team_id = public.rrp_team())
) with check (true);
create policy "prop del" on public.properties for delete to authenticated using (public.rrp_is_mgmt());

-- clients
create policy "cli sel" on public.clients for select to authenticated using (
  public.rrp_is_mgmt() or agent_id = auth.uid()
  or (public.rrp_role()='leader' and team_id = public.rrp_team())
);
create policy "cli ins" on public.clients for insert to authenticated with check (true);
create policy "cli upd" on public.clients for update to authenticated using (
  public.rrp_is_mgmt() or agent_id = auth.uid()
  or (public.rrp_role()='leader' and team_id = public.rrp_team())
) with check (true);
create policy "cli del" on public.clients for delete to authenticated using (
  public.rrp_is_mgmt() or agent_id = auth.uid()
  or (public.rrp_role()='leader' and team_id = public.rrp_team())
);

-- deals
create policy "deal sel" on public.deals for select to authenticated using (
  public.rrp_is_mgmt() or agent_id = auth.uid()
  or (public.rrp_role()='leader' and team_id = public.rrp_team())
);
create policy "deal ins" on public.deals for insert to authenticated with check (true);
create policy "deal upd" on public.deals for update to authenticated using (
  public.rrp_is_mgmt() or agent_id = auth.uid()
  or (public.rrp_role()='leader' and team_id = public.rrp_team())
) with check (true);
create policy "deal del" on public.deals for delete to authenticated using (
  public.rrp_is_mgmt() or (public.rrp_role()='leader' and team_id = public.rrp_team())
);

-- followups
create policy "fu sel" on public.followups for select to authenticated using (
  public.rrp_is_mgmt() or agent_id = auth.uid()
  or (public.rrp_role()='leader' and team_id = public.rrp_team())
);
create policy "fu ins" on public.followups for insert to authenticated with check (true);
create policy "fu upd" on public.followups for update to authenticated using (
  public.rrp_is_mgmt() or agent_id = auth.uid()
  or (public.rrp_role()='leader' and team_id = public.rrp_team())
) with check (true);
create policy "fu del" on public.followups for delete to authenticated using (
  public.rrp_is_mgmt() or agent_id = auth.uid()
  or (public.rrp_role()='leader' and team_id = public.rrp_team())
);

-- tasks (team-scoped; assignee can update own)
create policy "task sel" on public.tasks for select to authenticated
  using (public.rrp_is_mgmt() or team_id = public.rrp_team() or assignee_id = auth.uid());
create policy "task ins" on public.tasks for insert to authenticated
  with check (public.rrp_is_mgmt() or (public.rrp_role()='leader' and team_id = public.rrp_team()));
create policy "task upd" on public.tasks for update to authenticated
  using (public.rrp_is_mgmt() or (public.rrp_role()='leader' and team_id = public.rrp_team()) or assignee_id = auth.uid())
  with check (true);
create policy "task del" on public.tasks for delete to authenticated
  using (public.rrp_is_mgmt() or (public.rrp_role()='leader' and team_id = public.rrp_team()));

-- events (team-scoped)
create policy "ev sel" on public.events for select to authenticated
  using (public.rrp_is_mgmt() or team_id = public.rrp_team());
create policy "ev ins" on public.events for insert to authenticated
  with check (public.rrp_is_mgmt() or (public.rrp_role()='leader' and team_id = public.rrp_team()));
create policy "ev upd" on public.events for update to authenticated
  using (public.rrp_is_mgmt() or (public.rrp_role()='leader' and team_id = public.rrp_team()) or created_by = auth.uid())
  with check (true);
create policy "ev del" on public.events for delete to authenticated
  using (public.rrp_is_mgmt() or (public.rrp_role()='leader' and team_id = public.rrp_team()) or created_by = auth.uid());

-- categories (read all; admin manages)
create policy "cat sel" on public.categories for select to authenticated using (true);
create policy "cat ins" on public.categories for insert to authenticated with check (public.rrp_role()='admin');
create policy "cat upd" on public.categories for update to authenticated using (public.rrp_role()='admin') with check (true);
create policy "cat del" on public.categories for delete to authenticated using (public.rrp_role()='admin');

-- ── 10. Storage: public bucket for real image uploads ───────────────────────
insert into storage.buckets (id, name, public)
values ('platform-images','platform-images', true)
on conflict (id) do nothing;

do $$
declare pol record;
begin
  for pol in select policyname from pg_policies
             where schemaname='storage' and tablename='objects' and policyname like 'rrp %'
  loop execute format('drop policy %I on storage.objects', pol.policyname); end loop;
end $$;
create policy "rrp read"   on storage.objects for select using (bucket_id='platform-images');
create policy "rrp insert" on storage.objects for insert to authenticated with check (bucket_id='platform-images');
create policy "rrp update" on storage.objects for update to authenticated using (bucket_id='platform-images');
create policy "rrp delete" on storage.objects for delete to authenticated using (bucket_id='platform-images');

-- ── 11. Bootstrap: make the owner an admin ──────────────────────────────────
update public.profiles set role = 'admin' where email = 'ringroad.re@gmail.com';
