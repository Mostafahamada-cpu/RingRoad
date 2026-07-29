-- ============================================================================
--  Ring Roads Platform — RBAC tightening (2026-07-29)
--  Aligns server-side RLS DELETE policies with the documented role matrix and
--  the UI capability model in platform/js/lib/perms.js.
--
--  WHAT CHANGES (deletes only — SELECT/INSERT/UPDATE are untouched):
--    • clients  : delete → Management/Admin only        (was: agent-own + leader-team)
--    • deals    : delete → Management/Admin only        (was: leader-team allowed)
--    • followups: delete → Leader(own team)/Mgmt/Admin  (was: agent-own allowed)
--    • events   : delete → Leader(own team)/Mgmt/Admin  (was: creator allowed)
--    • profiles : delete → Admin only                   (was: management could delete non-admins)
--
--  Matches the spec:
--    Agent       → cannot delete records
--    Team Leader → cannot delete core data (clients/deals/properties); may delete
--                  own-team operational items (tasks/followups/events)
--    Management  → deletes data, but NOT user accounts
--    Admin       → everything
--
--  SAFE TO RE-RUN: every statement is drop-if-exists + create (idempotent).
--  Run this in the Supabase SQL editor AFTER platform-schema.sql.
--  Uses the existing helpers: rrp_role(), rrp_team(), rrp_is_mgmt().
-- ============================================================================

-- clients: only management/admin may hard-delete
drop policy if exists "cli del" on public.clients;
create policy "cli del" on public.clients for delete to authenticated
  using (public.rrp_is_mgmt());

-- deals: only management/admin may hard-delete
drop policy if exists "deal del" on public.deals;
create policy "deal del" on public.deals for delete to authenticated
  using (public.rrp_is_mgmt());

-- followups: leaders (own team) + management/admin; agents cannot delete
drop policy if exists "fu del" on public.followups;
create policy "fu del" on public.followups for delete to authenticated
  using (public.rrp_is_mgmt() or (public.rrp_role() = 'leader' and team_id = public.rrp_team()));

-- events: leaders (own team) + management/admin; agents/creators cannot delete
drop policy if exists "ev del" on public.events;
create policy "ev del" on public.events for delete to authenticated
  using (public.rrp_is_mgmt() or (public.rrp_role() = 'leader' and team_id = public.rrp_team()));

-- profiles: only admins delete user accounts (management may not)
drop policy if exists "prof del" on public.profiles;
create policy "prof del" on public.profiles for delete to authenticated
  using (public.rrp_role() = 'admin');

-- ----------------------------------------------------------------------------
-- OPTIONAL (recommended): block Management from changing anyone's role.
-- The spec says only Admin may change roles. The base schema already has a
-- guard trigger against self-escalation; this makes it explicit for management
-- editing OTHER users. Uncomment if you want it enforced at the DB level.
-- ----------------------------------------------------------------------------
-- create or replace function public.rrp_guard_role_change() returns trigger
--   language plpgsql security definer set search_path = public as $$
-- begin
--   if NEW.role is distinct from OLD.role and public.rrp_role() <> 'admin' then
--     raise exception 'Only an administrator may change a user role';
--   end if;
--   return NEW;
-- end $$;
-- drop trigger if exists rrp_guard_role on public.profiles;
-- create trigger rrp_guard_role before update on public.profiles
--   for each row execute function public.rrp_guard_role_change();

-- ============================================================================
--  VERIFY (optional): list the delete policies after running
-- ============================================================================
-- select tablename, policyname, cmd, qual
-- from pg_policies
-- where schemaname = 'public' and cmd = 'DELETE'
-- order by tablename;
