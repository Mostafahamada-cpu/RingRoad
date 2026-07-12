-- ============================================================================
-- Ring Roads corrective migration — for the LIVE ringroads-demo project.
-- The live properties table differs from SETUP.md (PK on code bigint, no id,
-- no timestamps, RLS disabled). This script adapts it IN PLACE — the 4
-- existing rows are preserved — then creates the three CRM tables.
-- ============================================================================

-- 1. properties: make column types app-compatible
alter table public.properties alter column code drop identity if exists;
alter table public.properties alter column code drop default;
alter table public.properties alter column code type text using code::text;
alter table public.properties alter column price type numeric using price::numeric;
alter table public.properties alter column area type numeric using area::numeric;
alter table public.properties alter column beds type integer using beds::integer;
alter table public.properties alter column baths type integer using baths::integer;
alter table public.properties alter column registered type date using registered::date;

-- 2. proper uuid primary key (the app updates/deletes rows by id)
alter table public.properties add column if not exists id uuid not null default gen_random_uuid();
alter table public.properties drop constraint if exists properties_pkey;
alter table public.properties add constraint properties_pkey primary key (id);

-- 3. bookkeeping + new CRM columns
alter table public.properties
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists created_by uuid references auth.users(id) default auth.uid(),
  add column if not exists project text,
  add column if not exists developer text,
  add column if not exists unit_type text,
  add column if not exists delivery date,
  add column if not exists payment_plan text,
  add column if not exists images jsonb not null default '[]'::jsonb,
  add column if not exists map_url text;

alter table public.properties drop constraint if exists properties_status_check;
alter table public.properties add constraint properties_status_check
  check (status in ('available','reserved','sold','rented'));

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

drop trigger if exists trg_properties_updated_at on public.properties;
create trigger trg_properties_updated_at
before update on public.properties
for each row execute function public.set_updated_at();

-- 4. clients
create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  email text,
  budget numeric,
  preferred_area text,
  preferred_unit_type text,
  notes text,
  stage text not null default 'new_lead'
    check (stage in ('new_lead','contacted','visit_scheduled','negotiating','reservation','contract_signed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) default auth.uid()
);
drop trigger if exists trg_clients_updated_at on public.clients;
create trigger trg_clients_updated_at
before update on public.clients
for each row execute function public.set_updated_at();

-- 5. followups
create table if not exists public.followups (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.clients(id) on delete cascade,
  title text not null,
  kind text not null default 'call' check (kind in ('call','meeting','visit','other')),
  due_at timestamptz not null,
  done boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) default auth.uid()
);

-- 6. deals
create table if not exists public.deals (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.clients(id) on delete set null,
  property_id uuid references public.properties(id) on delete set null,
  agent text,
  stage text not null default 'lead'
    check (stage in ('lead','contacted','visit','negotiation','reservation','closed')),
  value numeric not null default 0,
  commission_pct numeric not null default 2.5,
  agent_share_pct numeric not null default 40,
  company_share_pct numeric not null default 60,
  closed_at date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) default auth.uid()
);
drop trigger if exists trg_deals_updated_at on public.deals;
create trigger trg_deals_updated_at
before update on public.deals
for each row execute function public.set_updated_at();

-- 7. RLS everywhere: reset old/inactive policies, then authenticated-only
do $$
declare pol record;
begin
  for pol in select tablename, policyname from pg_policies
             where schemaname='public' and tablename in ('properties','clients','followups','deals') loop
    execute format('drop policy %I on public.%I', pol.policyname, pol.tablename);
  end loop;
end $$;

alter table public.properties enable row level security;
alter table public.clients    enable row level security;
alter table public.followups  enable row level security;
alter table public.deals      enable row level security;

do $$
declare tbl text;
begin
  foreach tbl in array array['properties','clients','followups','deals'] loop
    execute format('create policy "auth select" on public.%I for select to authenticated using (true)', tbl);
    execute format('create policy "auth insert" on public.%I for insert to authenticated with check (true)', tbl);
    execute format('create policy "auth update" on public.%I for update to authenticated using (true) with check (true)', tbl);
    execute format('create policy "auth delete" on public.%I for delete to authenticated using (true)', tbl);
  end loop;
end $$;
