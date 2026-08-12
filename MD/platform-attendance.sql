-- ============================================================================
--  Ring Roads Platform — ATTENDANCE feature migration.
--  Idempotent add-on to platform-schema.sql. Run AFTER the base schema exists.
--  Reuses the existing helpers: public.rrp_role() / rrp_team() / rrp_is_mgmt()
--  and public.set_updated_at(). Does NOT touch or replace any existing object.
-- ============================================================================

-- 1. table ────────────────────────────────────────────────────────────────────
create table if not exists public.attendance (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references public.profiles(id) on delete cascade,
  work_date        date not null default current_date,
  clock_in         timestamptz,
  clock_out        timestamptz,
  working_minutes  integer not null default 0,
  status           text not null default 'working'
                     check (status in ('working','completed')),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  -- one attendance record per user per day → blocks duplicate clock-ins
  unique (user_id, work_date)
);

-- 2. keep updated_at fresh (same trigger fn the rest of the schema uses) ────────
drop trigger if exists trg_attendance_updated_at on public.attendance;
create trigger trg_attendance_updated_at before update on public.attendance
  for each row execute function public.set_updated_at();

-- 3. indexes ──────────────────────────────────────────────────────────────────
create index if not exists idx_attendance_user on public.attendance(user_id);
create index if not exists idx_attendance_date on public.attendance(work_date);

-- 4. row level security ───────────────────────────────────────────────────────
--    Mirrors the platform's model (defence in depth with lib/perms.js):
--      • agent   → own records only
--      • leader  → own records + read team members' records (no edits)
--      • mgmt    → all records (read + write)
--      • admin   → all records (read + write + delete)
alter table public.attendance enable row level security;

-- SELECT: self, or management, or a leader viewing their own team's members.
drop policy if exists "attn sel" on public.attendance;
create policy "attn sel" on public.attendance for select to authenticated
  using (
    user_id = auth.uid()
    or public.rrp_is_mgmt()
    or (public.rrp_role() = 'leader'
        and (select p.team_id from public.profiles p where p.id = attendance.user_id) = public.rrp_team())
  );

-- INSERT: you may only clock in for yourself (management/admin may insert for others).
drop policy if exists "attn ins" on public.attendance;
create policy "attn ins" on public.attendance for insert to authenticated
  with check (user_id = auth.uid() or public.rrp_is_mgmt());

-- UPDATE: only your own record, or management/admin. Leaders CANNOT edit others.
drop policy if exists "attn upd" on public.attendance;
create policy "attn upd" on public.attendance for update to authenticated
  using (user_id = auth.uid() or public.rrp_is_mgmt())
  with check (user_id = auth.uid() or public.rrp_is_mgmt());

-- DELETE: management / admin only.
drop policy if exists "attn del" on public.attendance;
create policy "attn del" on public.attendance for delete to authenticated
  using (public.rrp_is_mgmt());

-- ============================================================================
--  USERS & ROLES (optional convenience)
--  The 14 people below are managed through the existing user system. Create the
--  auth accounts the normal way (admin → Users → Add user, or the Supabase
--  dashboard), then this block aligns their roles. It matches by email and is a
--  no-op for anyone who doesn't exist yet, so it is safe to run repeatedly.
--  Adjust the emails to whatever you actually used when creating the accounts.
-- ============================================================================
update public.profiles set role = 'admin'      where lower(email) = 'mohamed.ayman@ringroad.re';
update public.profiles set role = 'management'  where lower(email) = 'ayman.madbouly@ringroad.re';
update public.profiles set role = 'leader'      where lower(email) = 'mr.sayed@ringroad.re';
update public.profiles set role = 'agent'
  where lower(email) in (
    'omar@ringroad.re','kareem@ringroad.re','mayar@ringroad.re','shefaa@ringroad.re',
    'hasnaa@ringroad.re','hend@ringroad.re','mohamed.rouq@ringroad.re','mohamed.atta@ringroad.re',
    'fatma@ringroad.re','nada@ringroad.re','abobakr@ringroad.re'
  );
