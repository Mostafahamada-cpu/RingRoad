# Ring Roads Platform — Luxury Real-Estate Management

A premium, bilingual (EN/AR, full RTL) real-estate CRM in **`platform/`** — role-based
(Admin → Management → Team Leader → Agent), with real image uploads, archive & sold modules,
a full Teams module (dashboards, approvals, tasks, calendar), analytics and exports.

**Brand identity:** Primary Orange `#F97316` · Secondary Burgundy `#6A003C` · white surfaces,
warm burgundy-tinted neutrals, soft shadows, rounded geometry, Manrope + IBM Plex Sans Arabic.
No colors outside this system (statuses, semantics and charts are all derived from it).

> Note: no logo file was provided — the wordmark is a typographic "RR" gradient tile built from
> the brand colors. Drop a real logo into `platform/` and swap `.logo-mark` when ready.

## Architecture

```
platform/
  index.html               shell (fonts, css, #app, module entry)
  css/
    tokens.css             brand design tokens (single source of truth)
    base.css               reset, type, utilities, skeletons, motion
    components.css         buttons/cards/forms/table/modal/toast/uploader/gallery…
    layout.css             sidebar, glass topbar, auth screen, responsive
  js/
    config.js              Supabase keys + domain constants
    lib/                   supabase (GoTrue/PostgREST/Storage via fetch),
                           i18n (EN/AR), router (hash + role guards), store,
                           utils (validation/CSV/print), toast, charts (SVG),
                           listings (domain logic: visibility, lifecycle)
    components/            layout shell, DataTable, modal/confirm, form fields,
                           image uploader (drag&drop/preview/reorder/delete),
                           gallery + lightbox, stat/property cards
    pages/                 login, dashboard, listings, listing-form, listing-detail,
                           sold, archive, users, agents, teams, team-detail,
                           tasks, calendar, analytics, settings
```

No build step — plain ES modules. Serve statically (Vercel zero-config, or locally via
`.claude/serve.ps1` → `http://localhost:8123/platform/index.html`).

## Public client view (`client/`)

A separate, login-free property site for clients — Properties / Favorites / Compare, a
public `/property/RR-1024` page per listing, WhatsApp deep links to the assigned agent and a
"Request details" form that files a lead into this CRM. It is its own Vercel project (Root
Directory `MD/client`), so it ships a synced copy of the design-system CSS and has its own
router, state and data layer; the admin workspace is unchanged by it. Run
`platform-client-view.sql`, then see **CLIENT-VIEW.md**.

Inside the platform this adds one page — **Leads** (`#/leads`) — listing the enquiries that
arrive from the public site; each one also creates a normal `clients` row so it flows through
the existing pipeline. (The backing table is still `property_requests`; `#/requests` remains
as a redirect so older links keep working.)

## Videos

A shared video library at **Videos** (`#/videos`). Everyone signed in can browse and play;
management and admin can add, edit and delete (`can('videos:manage')`, mirrored by RLS in
`platform-videos.sql`).

Each video has a title, description, optional thumbnail, and a source that is either an
external link (YouTube / Vimeo / a direct file URL) or a file uploaded to the existing
`platform-images` bucket under `videos/{id}/`. The player picks the right renderer from the
source — a privacy-friendly `youtube-nocookie` embed, a Vimeo embed, or a native `<video>`
element. YouTube links fall back to YouTube's own still when no thumbnail is uploaded.
Deleting a video also removes the storage objects it owned.

## Telesales assignment

Apartments can be assigned to telesales employees — manually, or distributed evenly across
the active team in one click — and each employee gets a dashboard of just their own book.
"Telesales" is a **department** (`profiles.department`), so the four-role RBAC below is
unchanged. Run `platform-telesales.sql`, then see **TELESALES.md**.

Adds two pages: **Telesales Management** (`#/telesales`, management/admin) and
**My Apartments** (`#/my-apartments`, telesales only).

## Roles & permissions (enforced by RLS + UI)

| Capability | Admin | Management | Team Leader | Agent |
|---|---|---|---|---|
| Manage users / roles | ✅ | ✅ (not admins) | — | — |
| Create/edit/delete/archive teams | ✅ | ✅ | — | — |
| Manage own team members & KPIs | ✅ | ✅ | ✅ | — |
| Approve pending listings | ✅ | ✅ | own team | — |
| Add property | ✅ | ✅ | ✅ | ✅ (goes to *pending*) |
| Edit property | any | any | own team | own only |
| Archive / restore / delete property | ✅ | ✅ | archive own team | — |
| Mark sold | any | any | own team | own |
| Assign properties to agents | ✅ | ✅ | own team | — |
| Tasks / calendar create | ✅ | ✅ | own team | complete own tasks |
| Analytics / agents directory | ✅ | ✅ | team tab | — |

Property assignment flows down the hierarchy: Admin → Management → Team Leader → Agent;
leaders assign only within their team; agents edit only what's theirs.

## Database (see `platform-setup.sql`)

`profiles` (role, team, rating, active) · `teams` (leader, color, logo, goal, kpis) ·
`listings` (20+ fields: type/price/area/beds/baths/floor/address/city/governorate/description/
status/approval/agent/team/year/parking/furnished/lat/lng/amenities/featured/images + sold
fields: sold_date/buyer_name/sold_price/commission) · `tasks` · `events` · `categories`.

- A trigger on `auth.users` auto-creates a profile (role `agent`) for every new account.
- `rrp_role()` / `rrp_team()` security-definer helpers drive all RLS policies.
- A guard trigger blocks role self-escalation by non-admins.
- `platform-client-view.sql` adds the public read surface: unique `RR-####` property codes,
  `properties.finishing/developer`, `profiles.whatsapp`, the `public_listings` view granted to
  `anon`, `property_requests` and the `rr_submit_property_request()` RPC.
- `platform-telesales.sql` adds `profiles.department`, the `properties.assigned_telesales_id`
  columns, `telesales_assignment_history`, and the `rr_assign_telesales()` /
  `rr_distribute_apartments()` RPCs.
- `platform-videos.sql` adds the `videos` table behind the **Videos** page: everyone signed in
  may read it, management + admin may write (mirrors `can('videos:manage')`).
- `platform-users-import.sql` provisions the 18 accounts from `Attendance-Credentials.pdf`
  (creates only what is missing; never changes an existing password).
- **Images are real uploads** to the public Storage bucket `platform-images`
  (`listings/{id}/…`, `avatars/{uid}/…`, `teams/{id}/…`); `listings.images` stores the ordered
  path list. Upload/reorder/delete happens in the drag-&-drop uploader.

## Setup

1. Run `platform-setup.sql` in the Supabase SQL editor (idempotent).
2. It promotes `ringroad.re@gmail.com` to **admin** — edit §9 first if needed.
3. Run any feature migrations you want: `platform-client-view.sql`, `platform-telesales.sql`,
   `platform-videos.sql`. Each is idempotent and additive.
4. Open `platform/index.html` (locally: `http://localhost:8123/platform/index.html`).
5. Sign in; create teams and users from the Users/Teams pages (new users get a temp password
   and can reset via email).

## Design system notes

- Statuses: Available (orange), Reserved (burnt orange), Sold (solid burgundy), Archived (neutral).
- Charts use `--chart-1 #E4560A` / `--chart-2 #A81D64` — brand-hue variants tuned to pass
  lightness/chroma/contrast checks against white cards (validated with the dataviz palette
  validator; keep chart marks on these tokens).
- Glassmorphism is limited to the topbar (blur + translucency) per the brief.
- Animations: page fade-up, card hover lift, modal pop, skeleton shimmer, image fade-in;
  all disabled under `prefers-reduced-motion`.
