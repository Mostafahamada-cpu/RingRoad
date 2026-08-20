-- ============================================================================
--  Ring Roads Platform — VIDEOS  ::  SUPERSEDED, DO NOT RUN
--  ---------------------------------------------------------------------------
--  This file used to create the `videos` table for the CRM's standalone Videos
--  library page. That page was removed on 2026-08-20: videos now belong to a
--  property and are managed from the Videos section on the Edit Property page.
--
--  EVERYTHING IT USED TO DO NOW LIVES IN  platform-client-portal.sql,  which:
--    • creates public.videos (same columns) if it does not already exist
--    • adds videos.property_id  -> properties(id) ON DELETE CASCADE
--    • adds videos.is_public
--    • publishes public_property_videos for the client portal
--    • sets the RLS the app actually needs
--
--  WHY THIS FILE IS DELIBERATELY EMPTY OF DDL
--  ------------------------------------------
--  Its RLS block granted write access to management/admin ONLY. The Edit
--  Property page is also used by AGENTS on their own listings, so re-running
--  that block after platform-client-portal.sql would silently overwrite the
--  wider policies with the narrow ones and leave agents unable to add a video
--  to a property they are allowed to edit — a failure that only shows up later,
--  as a permission error, with no obvious cause.
--
--  Nothing was dropped from your database. The table, its rows, its policies
--  and the storage objects are all untouched; only this now-redundant script
--  was retired so it cannot be run by mistake.
--
--  ==> Run  platform-client-portal.sql  instead.
-- ============================================================================

do $$
begin
  raise notice
    'platform-videos.sql is superseded and intentionally does nothing. Run platform-client-portal.sql instead.';
end $$;
