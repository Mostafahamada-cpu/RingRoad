-- ============================================================================
--  Ring Roads — IMPORT THE 18 ACCOUNTS FROM Attendance-Credentials.pdf
--  ---------------------------------------------------------------------------
--  Run in the Supabase SQL editor (server-side, as the project owner). This is
--  the same mechanism attendance-app/db/provision-users.sql already uses on this
--  project, so NO service-role key is needed and none is ever placed in any
--  frontend file.
--
--  PREREQUISITES: platform-schema.sql, platform-client-view.sql (adds
--  profiles.whatsapp) and platform-telesales.sql (adds profiles.department).
--
--  SAFE & IDEMPOTENT — re-runnable:
--    * An auth account is created ONLY when the email does not already exist.
--    * An EXISTING account's password is NEVER touched. The roster below records
--      the passwords exactly as printed in the PDF; for the 14 accounts the PDF
--      marks as pre-existing those are simply their current passwords, so the
--      document stays accurate either way.
--    * Profile name/role/department/active are set for all 18. A name, phone or
--      whatsapp value that is ALREADY stored is kept — this script never
--      overwrites contact details a user has entered themselves.
--
--  NOT IN THE PDF: no phone numbers and no WhatsApp numbers are listed for any
--  of the 18 people, so those columns are left NULL rather than invented. Each
--  telesales employee fills their own in under Settings → My profile (or an
--  admin does it from Users → edit). The final report flags who is still missing
--  a WhatsApp number, because the public "Contact on WhatsApp" button stays
--  hidden until it is filled in.
--
--  ROLE MAPPING (PDF "Department / Role" → this platform's four-role RBAC):
--    Admin • ADMIN       → role admin       , department management
--    Management • ADMIN  → role management  , department management
--    Team Leader         → role leader      , department telesales
--    TeleSales           → role agent       , department telesales   ← assignable
--    Engineer            → role agent       , department engineering ← NOT assignable
--  Only department = 'telesales' accounts can receive apartments, so engineers
--  are never included in a distribution.
-- ============================================================================

set search_path = public, extensions;   -- pgcrypto (crypt/gen_salt) lives in extensions

-- ── the roster, exactly as printed in the PDF ────────────────────────────────
drop table if exists _rr_roster;
create temporary table _rr_roster (
  seq        int,
  email      text,
  full_name  text,
  pdf_password text,
  app_role   text,
  department text,
  pdf_label  text
);

insert into _rr_roster (seq, email, full_name, pdf_password, app_role, department, pdf_label) values
  ( 1, 'omar@ringroad.re',           'Omar Mahmoud',   '%6PhzZwb8=N%R7',   'agent',      'telesales',   'TeleSales'),
  ( 2, 'kareem@ringroad.re',         'Kareem',         'jva3wTV$u5+UU*g',  'agent',      'telesales',   'TeleSales'),
  ( 3, 'mayar@ringroad.re',          'Mayar',          'n?a8c!Qg5HBJEV8i', 'agent',      'telesales',   'TeleSales'),
  ( 4, 'shefaa@ringroad.re',         'Shefaa',         'Lf9+NbG7?pz5q',    'agent',      'telesales',   'TeleSales'),
  ( 5, 'hasnaa@ringroad.re',         'Hasnaa',         '3Grv!M67pu2A',     'agent',      'telesales',   'TeleSales'),
  ( 6, 'sayed@ringroad.re',          'Mr. Sayed',      'U!Xi*SV6n3i@g?',   'leader',     'telesales',   'Team Leader'),
  ( 7, 'hend@ringroad.re',           'Hend',           'uV+dNHeFBsL295x',  'agent',      'telesales',   'TeleSales'),
  ( 8, 'mohamed.rouq@ringroad.re',   'Mohamed Rouq',   '$%@=8AiuceJ@',     'agent',      'telesales',   'TeleSales'),
  ( 9, 'mohamed.atta@ringroad.re',   'Mohamed Atta',   'cGC=H*u+uS5HLQ',   'agent',      'telesales',   'TeleSales'),
  (10, 'mohamed.ayman@ringroad.re',  'Mohamed Ayman',  '%P_d4Q9#tdRs7W4',  'admin',      'management',  'Admin'),
  (11, 'ayman.madbouly@ringroad.re', 'Ayman Madbouly', 'L9@+_34Qf_y$y',    'management', 'management',  'Management'),
  (12, 'fatma@ringroad.re',          'Fatma',          'jkAtsiFk!qKi69W',  'agent',      'telesales',   'TeleSales'),
  (13, 'nada@ringroad.re',           'Nada',           'c3$N8WmPp7Uk%',    'agent',      'telesales',   'TeleSales'),
  (14, 'abobakr@ringroad.re',        'AboBakr',        'QhU%?@pfK!6K6njh', 'agent',      'telesales',   'TeleSales'),
  (15, 'ahmed.shaaban@ringroad.re',  'Ahmed Shaaban',  'Vertex*223!PG',    'agent',      'engineering', 'Engineer'),
  (16, 'nada.eng@ringroad.re',       'Nada',           'Onyx&707#ZK',      'agent',      'engineering', 'Engineer'),
  (17, 'aya@ringroad.re',            'Aya',            'Cobalt*489!YT',    'agent',      'engineering', 'Engineer'),
  (18, 'eslam@ringroad.re',          'Eslam',          'Zephyr&416%AQ',    'agent',      'engineering', 'Engineer');

-- remember who already existed BEFORE we touch anything, for the report
drop table if exists _rr_before;
create temporary table _rr_before as
select r.email, exists (select 1 from auth.users u where lower(u.email) = lower(r.email)) as existed
  from _rr_roster r;


-- ── 1. create ONLY the accounts that do not exist yet ────────────────────────
--     Existing accounts are skipped entirely: password, metadata and id are
--     left exactly as they are.
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
)
select
  '00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
  lower(r.email), crypt(r.pdf_password, gen_salt('bf')), now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  jsonb_build_object('full_name', r.full_name, 'role', r.app_role),
  now(), now(), '', '', '', ''
from _rr_roster r
where not exists (select 1 from auth.users u where lower(u.email) = lower(r.email));


-- ── 2. every roster account needs an email identity to sign in ───────────────
insert into auth.identities (provider_id, user_id, identity_data, provider,
                             last_sign_in_at, created_at, updated_at)
select u.id::text, u.id,
       jsonb_build_object('sub', u.id::text, 'email', u.email,
                          'email_verified', true, 'phone_verified', false),
       'email', now(), now(), now()
from auth.users u
join _rr_roster r on lower(r.email) = lower(u.email)
where not exists (
  select 1 from auth.identities i where i.user_id = u.id and i.provider = 'email');


-- ── 3. make sure every account is confirmed, so login works immediately ──────
update auth.users u
   set email_confirmed_at = coalesce(u.email_confirmed_at, now())
  from _rr_roster r
 where lower(u.email) = lower(r.email)
   and u.email_confirmed_at is null;


-- ── 4. profiles: create the row if the trigger did not, then set role/dept ───
--     COALESCE keeps anything the person already entered: an existing name,
--     phone or whatsapp is never overwritten by this import.
--     `active` is set only on insert, so an account an admin has deliberately
--     deactivated is not silently switched back on by re-running this.
insert into public.profiles (id, email, name, role, department, active)
select u.id, u.email, r.full_name, r.app_role, r.department, true
from auth.users u
join _rr_roster r on lower(r.email) = lower(u.email)
on conflict (id) do update
  set email      = excluded.email,
      role       = excluded.role,
      department = excluded.department;

-- The insert above leaves an existing name alone, but a profile auto-created by
-- the rrp_handle_new_user() trigger is named after the email local part
-- ("mohamed.rouq"). Replace only those placeholders with the PDF's real name;
-- a name the person has actually set is left untouched.
update public.profiles p
   set name = r.full_name
  from _rr_roster r
 where lower(p.email) = lower(r.email)
   and (p.name is null
        or btrim(p.name) = ''
        or lower(btrim(p.name)) = lower(split_part(p.email, '@', 1)));


-- ── 5. REPORT ────────────────────────────────────────────────────────────────
select
  r.seq                                             as "#",
  p.name                                            as "name",
  r.pdf_label                                       as "pdf role",
  p.role                                            as "platform role",
  p.department                                      as "department",
  p.email                                           as "email",
  case when b.existed then 'existing - password unchanged'
       else 'CREATED - use the PDF password' end    as "account",
  case when public.rr_is_telesales(p.id) then 'yes' else 'no' end
                                                    as "can receive apartments",
  coalesce(nullif(btrim(p.whatsapp), ''), '— none yet —') as "whatsapp",
  coalesce(nullif(btrim(p.phone), ''),    '— none in PDF —') as "phone"
from _rr_roster r
join public.profiles p on lower(p.email) = lower(r.email)
join _rr_before   b on lower(b.email) = lower(r.email)
order by r.seq;

-- headline counts
select
  (select count(*) from _rr_roster)                                  as "in pdf",
  (select count(*) from _rr_before where existed)                    as "already existed",
  (select count(*) from _rr_before where not existed)                as "created now",
  (select count(*) from public.profiles p join _rr_roster r
     on lower(p.email) = lower(r.email) where public.rr_is_telesales(p.id))
                                                                     as "assignable telesales",
  (select count(*) from public.profiles p join _rr_roster r
     on lower(p.email) = lower(r.email)
    where nullif(btrim(coalesce(p.whatsapp, '')), '') is null)       as "still need whatsapp";

drop table if exists _rr_roster;
drop table if exists _rr_before;

-- ============================================================================
--  NOTE ON Mr. Sayed
--  attendance-app/db/provision-users.sql provisioned the team leader as
--  'mr.sayed@ringroad.re', while the PDF (and its source CSV) print
--  'sayed@ringroad.re'. This script follows the PDF. If both addresses exist in
--  auth.users you now have two accounts for the same person — check with:
--      select email, created_at from auth.users
--       where email in ('sayed@ringroad.re', 'mr.sayed@ringroad.re');
--  and delete whichever one is unused. This script deliberately does not guess
--  which is correct or delete anything.
-- ============================================================================
