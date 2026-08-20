-- ============================================================================
--  Ring Roads Platform — VIDEOS feature migration.
--  Idempotent add-on to platform-schema.sql. Run AFTER the base schema exists.
--  Reuses the existing helpers: public.rrp_is_mgmt() and public.set_updated_at().
--  Does NOT touch or replace any existing object.
--
--  Model: a small shared video library.
--    • Everyone signed in can VIEW / play videos.
--    • Only management + admin can add, edit or delete them.
--  That mirrors lib/perms.js → can('videos:manage') (defence in depth: the UI
--  hides the controls, the database is what actually enforces it).
--
--  A video carries a title, description, thumbnail and its source. The source
--  is either an external URL (YouTube / Vimeo / a direct .mp4 link) in
--  `video_url`, or a file uploaded to the existing storage bucket, whose object
--  path is kept in `video_path`. At least one of the two must be present.
-- ============================================================================

-- 1. table ────────────────────────────────────────────────────────────────────
create table if not exists public.videos (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  description  text,
  -- object path inside the platform storage bucket (same convention as
  -- listings.images / teams.logo — a path, never a full URL)
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

-- 2. keep updated_at fresh (same trigger fn the rest of the schema uses) ───────
drop trigger if exists trg_videos_updated_at on public.videos;
create trigger trg_videos_updated_at before update on public.videos
  for each row execute function public.set_updated_at();

-- 3. indexes ──────────────────────────────────────────────────────────────────
create index if not exists idx_videos_sort    on public.videos(sort_order, created_at desc);
create index if not exists idx_videos_creator on public.videos(created_by);

-- 4. row level security ───────────────────────────────────────────────────────
alter table public.videos enable row level security;

-- SELECT: every signed-in user may browse and play the library.
drop policy if exists "videos sel" on public.videos;
create policy "videos sel" on public.videos for select to authenticated
  using (true);

-- INSERT / UPDATE / DELETE: management + admin only.
drop policy if exists "videos ins" on public.videos;
create policy "videos ins" on public.videos for insert to authenticated
  with check (public.rrp_is_mgmt());

drop policy if exists "videos upd" on public.videos;
create policy "videos upd" on public.videos for update to authenticated
  using (public.rrp_is_mgmt()) with check (public.rrp_is_mgmt());

drop policy if exists "videos del" on public.videos;
create policy "videos del" on public.videos for delete to authenticated
  using (public.rrp_is_mgmt());

-- 5. grants ───────────────────────────────────────────────────────────────────
--    RLS is the row-level gate, but the role still needs table access or
--    Postgres raises 42501 before any policy is evaluated.
grant select, insert, update, delete on public.videos to authenticated;

-- ============================================================================
--  DONE. Verify:
--    select id, title, coalesce(video_url, video_path) as source, sort_order
--      from public.videos order by sort_order, created_at desc;
-- ============================================================================
