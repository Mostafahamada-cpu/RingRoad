-- ============================================================================
--  Ring Roads — FIX: apartment distribution was silently assigning nothing.
--
--  Run this in the Supabase SQL editor.
--
--  Sections 1-3 replace three functions and touch nothing else: no table, no
--  column, no trigger, no data. They are already folded into
--  platform-telesales.sql, so a fresh install does not need them.
--
--  Section 4 is a SEPARATE, pre-existing problem found while verifying the fix:
--  row level security is not being enforced on the CRM tables, so any agent can
--  read the whole company's data. Read its notes before running it — it is the
--  only part of this file with a blast radius beyond telesales.
--
--  ── WHAT WAS BROKEN (both diagnosed against the live database) ──────────────
--
--  1. rr_distribute_apartments() → SQLSTATE 21000 "DELETE requires a WHERE clause"
--
--     It staged the per-agent workload in a temp table and reset it with an
--     unqualified `delete from _rr_load;`. Supabase preloads the safeupdate
--     module for the `authenticated` role, which rejects any UPDATE or DELETE
--     without a WHERE clause. SECURITY DEFINER does NOT help: safeupdate is a
--     session-level hook, so it fires no matter whose rights the body runs with.
--     The exception aborted the whole call before a single row was assigned and
--     rolled the transaction back, which is why every property stayed
--     assigned_telesales_id = NULL / assignment_status = 'unassigned'.
--
--     Fix: the temp table is gone entirely. The workload now lives in plpgsql
--     arrays, so there is no unqualified statement left — and, as a bonus, no
--     temp-table plan caching hazard on pooled PostgREST connections either.
--
--  2. rr_assign_telesales() → check constraint "properties_assignment_status_chk"
--
--     It wrote the ACTION VERB into the STATUS column:
--         assignment_status := 'assign' | 'reassign'
--     but the column's CHECK only allows the past participles
--         'unassigned' | 'assigned' | 'reassigned' | 'released'
--     so every single assignment and reassignment failed. This blocked the
--     admin dropdowns on the Telesales page and the property detail page too.
--
--     Fix: map the verb to the status vocabulary. The history table keeps the
--     verb, which is what its own CHECK expects.
--
--  ── ALSO CORRECTED ─────────────────────────────────────────────────────────
--
--  3. rr_is_telesales() excluded admins and management but still allowed
--     role = 'leader', so the telesales Team Leader (Mr. Sayed) was eligible.
--     Eligibility is now exactly: active + department 'telesales' + role 'agent'.
--     No new role is introduced — this uses the roles that already exist.
-- ============================================================================


-- ── 1. Eligibility: active telesales AGENTS only ─────────────────────────────
--     Leaders, admins, management, engineers and inactive accounts are excluded.
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


-- ── 2. Assign / reassign / unassign one apartment ────────────────────────────
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
grant execute on function public.rr_assign_telesales(uuid, uuid) to authenticated;


-- ── 3. Even distribution, with no unqualified statement anywhere ─────────────
--
--     p_redistribute = false → hand out only the UNASSIGNED apartments, leaving
--                              every existing assignment alone.
--     p_redistribute = true  → clear the workable book first, then deal it all
--                              again from zero.
--
--     Each apartment goes to whoever currently holds the fewest, ties broken by
--     name so a run is reproducible. Sold, rented and archived stock is skipped.
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
grant execute on function public.rr_distribute_apartments(boolean) to authenticated;


-- ============================================================================
--  VERIFY (read-only — run these right after applying the file)
-- ============================================================================

-- Who is eligible? Expect 11 agents, and Mr. Sayed absent.
select p.name, p.role, p.department, p.active, public.rr_is_telesales(p.id) as eligible
  from public.profiles p
 where lower(btrim(coalesce(p.department, ''))) = 'telesales'
 order by eligible desc, p.name;

-- How many apartments qualify? Expect 11 of 14 (the 3 sold ones are skipped).
select count(*) filter (where assigned_telesales_id is null
                          and coalesce(status,'available') not in ('sold','rented','archived')) as distributable,
       count(*) filter (where coalesce(status,'available') in ('sold','rented','archived'))     as skipped,
       count(*)                                                                                 as total
  from public.properties;

-- Then click "Distribute Apartments" in the Admin Dashboard, or run it as an
-- admin. NOTE: calling it here in the SQL editor raises `not_authorised`,
-- because auth.uid() is NULL for the editor session and the RPC refuses anyone
-- who is not management — that guard is working as intended, not a bug.
--     select public.rr_distribute_apartments(false);

-- Afterwards: the per-agent split, Mr. Sayed included so you can see his zero.
select p.name, p.role, count(pr.id) as apartments
  from public.profiles p
  left join public.properties pr on pr.assigned_telesales_id = p.id
 where lower(btrim(coalesce(p.department, ''))) = 'telesales'
 group by p.name, p.role
 order by apartments desc, p.name;

-- Nothing sold/rented/archived may ever be assigned. Expect 0 rows.
select code, status, assignment_status
  from public.properties
 where assigned_telesales_id is not null
   and coalesce(status,'available') in ('sold','rented','archived');


-- ============================================================================
--  4. ROW LEVEL SECURITY IS NOT BEING ENFORCED  (separate, pre-existing issue)
--
--  Found while verifying requirement "telesales see only their own apartments":
--  signed in as Omar Mahmoud (role 'agent', department 'telesales', assigned
--  nothing, listing agent on nothing) PostgREST returned
--       properties 14/14 · clients 14/14 · deals 12/12 · tasks 10
--  even though rrp_is_mgmt() is demonstrably FALSE for him — both RPCs refused
--  him with 'not_authorised', and the assignment guard correctly reverted his
--  attempt to assign a property to himself.
--
--  The policies themselves are fine. With RLS actually enforced, that same
--  query returns 0 rows. So row level security is switched off on these tables
--  (an `alter table … disable row level security` at some point, or the enable
--  statements in platform-schema.sql §RLS never ran on this database).
--
--  This is NOT caused by the telesales work — clients, deals and tasks are
--  untouched by it — but it does mean the telesales isolation requirement
--  cannot hold until RLS is back on, so the re-assert belongs here.
--
--  ── LOOK FIRST ─────────────────────────────────────────────────────────────
--  Run this before the fix to see the current state and to spot any extra
--  permissive policy that may have been added outside the migration files:
--
--      select relname, relrowsecurity as rls_on, relforcerowsecurity as forced
--        from pg_class
--       where relnamespace = 'public'::regnamespace
--         and relname in ('properties','clients','deals','followups','tasks',
--                         'events','profiles','teams','categories',
--                         'property_requests','telesales_assignment_history')
--       order by relname;
--
--      select tablename, policyname, cmd, qual
--        from pg_policies
--       where schemaname = 'public' and tablename = 'properties'
--       order by policyname;
--
--  ── IMPACT BEFORE YOU RUN IT ───────────────────────────────────────────────
--  Turning RLS back on restores the access model already documented in
--  PLATFORM.md, so agents stop seeing the whole company's data:
--    • admin / management  → unchanged, still see everything
--    • team leader         → their own team
--    • agent / telesales   → their own rows + apartments assigned to them
--  If any part of the app currently depends on an agent reading other people's
--  records, that will (correctly) stop working. Nothing is dropped or deleted —
--  this only re-asserts the intended state.
-- ============================================================================

alter table public.properties enable row level security;
alter table public.clients    enable row level security;
alter table public.deals      enable row level security;
alter table public.followups  enable row level security;
alter table public.tasks      enable row level security;
alter table public.events     enable row level security;
alter table public.profiles   enable row level security;
alter table public.teams      enable row level security;
alter table public.categories enable row level security;

-- Re-assert the two property policies by name, so that if either was edited in
-- the dashboard it goes back to the intended definition. Identical to
-- platform-telesales.sql — management/admin everything, leaders their team,
-- and an agent only their own listings plus apartments assigned to them.
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

-- Verify the isolation afterwards: sign in as a telesales agent and count.
-- Expect only their own assigned apartments, never the whole table.
