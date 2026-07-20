-- ============================================================================
-- Ring Roads PLATFORM — schema (runs alongside the existing app's tables).
-- Idempotent: safe to re-run. Creates: profiles, teams, listings, tasks,
-- events, categories + role helpers, RLS, storage bucket 'platform-images'.
-- ============================================================================

-- ── 0. shared helpers ────────────────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

-- ── 1. profiles (mirror of auth.users with role/team) ────────────────────────
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  name text,
  phone text,
  photo text,                              -- storage path in platform-images
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

-- role/team lookup helpers (security definer so RLS policies can use them)
create or replace function public.rrp_role() returns text
language sql stable security definer set search_path = public as
$$ select role from public.profiles where id = auth.uid() $$;

create or replace function public.rrp_team() returns uuid
language sql stable security definer set search_path = public as
$$ select team_id from public.profiles where id = auth.uid() $$;

-- auto-create a profile whenever an auth user is created
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

-- backfill profiles for users that already exist
insert into public.profiles (id, email, name)
select u.id, u.email, split_part(coalesce(u.email,'user'), '@', 1)
from auth.users u
on conflict (id) do nothing;

-- non-admins cannot change roles (guards against self-escalation)
create or replace function public.rrp_guard_profile() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.role is distinct from old.role and public.rrp_role() not in ('admin','management') then
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
  logo text,                               -- storage path
  leader_id uuid references public.profiles(id) on delete set null,
  monthly_goal numeric,
  kpis jsonb not null default '{}'::jsonb, -- {response, satisfaction, lead_conversion}
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
drop trigger if exists trg_teams_updated_at on public.teams;
create trigger trg_teams_updated_at
before update on public.teams for each row execute function public.set_updated_at();

-- profiles.team_id → teams (added after teams exists)
do $$ begin
  alter table public.profiles
    add constraint profiles_team_fk foreign key (team_id) references public.teams(id) on delete set null;
exception when duplicate_object then null; end $$;

-- ── 3. listings (platform properties) ────────────────────────────────────────
create table if not exists public.listings (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  ptype text not null default 'apartment',
  price numeric not null,
  area numeric not null,
  bedrooms integer not null default 0,
  bathrooms integer not null default 0,
  floor integer,
  address text,
  city text,
  governorate text,
  description text,
  status text not null default 'available'
    check (status in ('available','reserved','sold','archived')),
  approval text not null default 'pending'
    check (approval in ('pending','approved','rejected')),
  agent_id uuid references public.profiles(id) on delete set null,
  team_id uuid references public.teams(id) on delete set null,
  year_built integer,
  parking integer not null default 0,
  furnished boolean not null default false,
  lat numeric, lng numeric,
  amenities jsonb not null default '[]'::jsonb,
  featured boolean not null default false,
  images jsonb not null default '[]'::jsonb,  -- ordered storage paths (real uploads)
  sold_date date, buyer_name text, sold_price numeric, commission numeric,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
drop trigger if exists trg_listings_updated_at on public.listings;
create trigger trg_listings_updated_at
before update on public.listings for each row execute function public.set_updated_at();

-- ── 4. tasks ────────────────────────────────────────────────────────────────
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  title text not null,
  notes text,
  assignee_id uuid references public.profiles(id) on delete set null,
  due date not null,
  priority text not null default 'normal' check (priority in ('low','normal','high')),
  done boolean not null default false,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);

-- ── 5. events (team calendar) ────────────────────────────────────────────────
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  title text not null,
  kind text not null default 'meeting' check (kind in ('meeting','visit','followup','other')),
  starts_at timestamptz not null,
  notes text,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);

-- ── 6. categories (admin-managed property types) ─────────────────────────────
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  kind text not null default 'ptype',
  slug text not null,
  name_en text not null,
  name_ar text,
  sort integer not null default 0,
  unique (kind, slug)
);

-- ── 7. Row Level Security ────────────────────────────────────────────────────
alter table public.profiles   enable row level security;
alter table public.teams      enable row level security;
alter table public.listings   enable row level security;
alter table public.tasks      enable row level security;
alter table public.events     enable row level security;
alter table public.categories enable row level security;

-- drop existing platform policies so re-runs stay clean
do $$
declare pol record;
begin
  for pol in select tablename, policyname from pg_policies
             where schemaname='public'
               and tablename in ('profiles','teams','listings','tasks','events','categories')
  loop
    execute format('drop policy %I on public.%I', pol.policyname, pol.tablename);
  end loop;
end $$;

-- profiles: everyone signed-in can read; self/mgmt edit; hierarchy-aware delete
create policy "p sel" on public.profiles for select to authenticated using (true);
create policy "p ins" on public.profiles for insert to authenticated
  with check (id = auth.uid() or public.rrp_role() in ('admin','management'));
create policy "p upd" on public.profiles for update to authenticated
  using (id = auth.uid()
      or public.rrp_role() in ('admin','management')
      or (public.rrp_role() = 'leader' and role = 'agent'))
  with check (true);
create policy "p del" on public.profiles for delete to authenticated
  using (public.rrp_role() = 'admin'
      or (public.rrp_role() = 'management' and role <> 'admin'));

-- teams: read all; mgmt writes; leaders may update their own team (goal/kpis)
create policy "t sel" on public.teams for select to authenticated using (true);
create policy "t ins" on public.teams for insert to authenticated
  with check (public.rrp_role() in ('admin','management'));
create policy "t upd" on public.teams for update to authenticated
  using (public.rrp_role() in ('admin','management')
      or (public.rrp_role() = 'leader' and id = public.rrp_team()))
  with check (true);
create policy "t del" on public.teams for delete to authenticated
  using (public.rrp_role() in ('admin','management'));

-- listings: read all; anyone signed-in may create; edit = mgmt / own / team-leader
create policy "l sel" on public.listings for select to authenticated using (true);
create policy "l ins" on public.listings for insert to authenticated with check (true);
create policy "l upd" on public.listings for update to authenticated
  using (public.rrp_role() in ('admin','management')
      or agent_id = auth.uid()
      or (public.rrp_role() = 'leader' and team_id = public.rrp_team()))
  with check (true);
create policy "l del" on public.listings for delete to authenticated
  using (public.rrp_role() in ('admin','management'));

-- tasks: visible to mgmt + own team; managed by mgmt/leader; assignee can update
create policy "k sel" on public.tasks for select to authenticated
  using (public.rrp_role() in ('admin','management') or team_id = public.rrp_team());
create policy "k ins" on public.tasks for insert to authenticated
  with check (public.rrp_role() in ('admin','management')
      or (public.rrp_role() = 'leader' and team_id = public.rrp_team()));
create policy "k upd" on public.tasks for update to authenticated
  using (public.rrp_role() in ('admin','management')
      or (public.rrp_role() = 'leader' and team_id = public.rrp_team())
      or assignee_id = auth.uid())
  with check (true);
create policy "k del" on public.tasks for delete to authenticated
  using (public.rrp_role() in ('admin','management')
      or (public.rrp_role() = 'leader' and team_id = public.rrp_team()));

-- events: same shape as tasks
create policy "e sel" on public.events for select to authenticated
  using (public.rrp_role() in ('admin','management') or team_id = public.rrp_team());
create policy "e ins" on public.events for insert to authenticated
  with check (public.rrp_role() in ('admin','management')
      or (public.rrp_role() = 'leader' and team_id = public.rrp_team()));
create policy "e upd" on public.events for update to authenticated
  using (public.rrp_role() in ('admin','management')
      or (public.rrp_role() = 'leader' and team_id = public.rrp_team())
      or created_by = auth.uid())
  with check (true);
create policy "e del" on public.events for delete to authenticated
  using (public.rrp_role() in ('admin','management')
      or (public.rrp_role() = 'leader' and team_id = public.rrp_team())
      or created_by = auth.uid());

-- categories: read all; admin manages
create policy "c sel" on public.categories for select to authenticated using (true);
create policy "c ins" on public.categories for insert to authenticated
  with check (public.rrp_role() = 'admin');
create policy "c upd" on public.categories for update to authenticated
  using (public.rrp_role() = 'admin') with check (true);
create policy "c del" on public.categories for delete to authenticated
  using (public.rrp_role() = 'admin');

-- ── 8. Storage: public bucket for real image uploads ─────────────────────────
insert into storage.buckets (id, name, public)
values ('platform-images', 'platform-images', true)
on conflict (id) do nothing;

do $$
declare pol record;
begin
  for pol in select policyname from pg_policies
             where schemaname='storage' and tablename='objects'
               and policyname like 'rrp %'
  loop
    execute format('drop policy %I on storage.objects', pol.policyname);
  end loop;
end $$;

create policy "rrp read"   on storage.objects for select
  using (bucket_id = 'platform-images');
create policy "rrp insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'platform-images');
create policy "rrp update" on storage.objects for update to authenticated
  using (bucket_id = 'platform-images');
create policy "rrp delete" on storage.objects for delete to authenticated
  using (bucket_id = 'platform-images');

-- ── 9. Bootstrap: promote the owner account to admin ─────────────────────────
-- Change the email if your admin signs in with a different address.
update public.profiles set role = 'admin'
where email = 'ringroad.re@gmail.com';
