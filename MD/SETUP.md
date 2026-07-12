# Ring Roads — Setup & Deployment

A single-file bilingual (EN/AR) real-estate broker CRM. Everything is in **`index.html`** — no
build step, no npm, no framework. It talks to **Supabase** (auth + database) directly over the
REST API with `fetch()`, and uses **html2canvas** (CDN) to export a client quote as a PNG.

Modules: Dashboard · Properties · Clients CRM · Follow-ups · Deals pipeline (Kanban) ·
Commission calculator · Commission history (CSV/PDF export) · Analytics · AI matching · Dark mode.

> Architecture, screen designs and user flows are documented in **`ARCHITECTURE.md`**.

---

## 1. Create the Supabase project

1. Go to [supabase.com](https://supabase.com) → **New project**. Pick a name/region, set a DB password.
2. Once it's ready, open **Settings → API** and copy:
   - **Project URL** — e.g. `https://abcdefgh.supabase.co`
   - **`anon` `public` API key** — the long key under "Project API keys".

> The `anon` key is meant to live in client-side code. It's safe because Row Level Security (below)
> blocks all access without a valid logged-in session.

## 2. Create the database tables (run the SQL)

Open **SQL Editor → New query**, paste the following, and click **Run**.

### 2a. Fresh install (all four tables)

```sql
-- ── shared updated_at trigger ────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

-- ── properties ───────────────────────────────────────────────────────────
create table public.properties (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  icon text not null default '🏠',
  status text not null default 'available'
    check (status in ('available','reserved','sold','rented')),
  address_en text not null, address_ar text not null,
  price numeric not null,
  type text not null check (type in ('sale','rent')),
  beds integer not null default 0, baths integer not null default 0,
  area numeric,
  project text,           -- project / compound name
  developer text,         -- developer name
  unit_type text,         -- apartment | villa | townhouse | duplex | penthouse | studio | chalet | office | retail
  delivery date,          -- delivery date
  payment_plan text,      -- e.g. '10% down / 8 years'
  images jsonb not null default '[]'::jsonb,  -- array of image URLs
  map_url text,           -- Google Maps link
  finish_en text, finish_ar text,
  unit_en text,   unit_ar text,
  agent_en text,  agent_ar text,
  registered date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) default auth.uid()
);
create trigger trg_properties_updated_at
before update on public.properties
for each row execute function public.set_updated_at();

-- ── clients (CRM) ────────────────────────────────────────────────────────
create table public.clients (
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
create trigger trg_clients_updated_at
before update on public.clients
for each row execute function public.set_updated_at();

-- ── followups (reminders / daily tasks) ──────────────────────────────────
create table public.followups (
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

-- ── deals (pipeline; closed deals ARE the commission history) ────────────
create table public.deals (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.clients(id) on delete set null,
  property_id uuid references public.properties(id) on delete set null,
  agent text,                       -- agent name credited with the deal
  stage text not null default 'lead'
    check (stage in ('lead','contacted','visit','negotiation','reservation','closed')),
  value numeric not null default 0,             -- deal value (EGP)
  commission_pct numeric not null default 2.5,  -- % of value
  agent_share_pct numeric not null default 40,  -- % of the commission
  company_share_pct numeric not null default 60,
  closed_at date,                   -- set when the deal reaches 'closed'
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) default auth.uid()
);
create trigger trg_deals_updated_at
before update on public.deals
for each row execute function public.set_updated_at();

-- ── Row Level Security: only logged-in users can read/write ─────────────
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
```

### 2b. Upgrading from the earlier (properties-only) version

If you already have the `properties` table from a previous build, **don't** re-create it.
Run this migration instead, then run the `clients` / `followups` / `deals` blocks (and their
triggers + RLS statements) from section 2a:

```sql
alter table public.properties
  add column if not exists project text,
  add column if not exists developer text,
  add column if not exists unit_type text,
  add column if not exists delivery date,
  add column if not exists payment_plan text,
  add column if not exists images jsonb not null default '[]'::jsonb,
  add column if not exists map_url text,
  add column if not exists area numeric;

-- allow the new 'reserved' status
alter table public.properties drop constraint if exists properties_status_check;
alter table public.properties add constraint properties_status_check
  check (status in ('available','reserved','sold','rented'));
```

### 2c. (Optional) seed sample data

```sql
insert into public.properties (code, icon, status, address_en, address_ar, price, type, beds, baths, area, project, developer, unit_type, delivery, payment_plan, finish_en, finish_ar, agent_en, agent_ar, registered) values
('A-101','🏠','available','Sheikh Zayed, Giza','الشيخ زايد، الجيزة',2500000,'sale',3,2,150,'Zayed Greens','Palm Hills','apartment','2027-06-01','10% / 8 yrs','Luxury','فاخر','M. Ahmed','محمد أحمد','2024-01-15'),
('B-202','🏢','reserved','New Cairo','القاهرة الجديدة',3200000,'sale',4,3,210,'Fifth Square','Al Marasem','duplex','2026-12-01','15% / 7 yrs','Core & shell','خام','F. Mahmoud','فاطمة محمود','2024-02-10'),
('C-303','🏘️','sold','North Coast','الساحل الشمالي',1800000,'sale',2,1,95,'Marassi','Emaar','chalet',null,'20% / 5 yrs','Classic','كلاسيكي','A. Khalil','علي خليل','2023-11-20'),
('D-404','🏙️','available','Maadi, Cairo','المعادي، القاهرة',45000,'rent',3,2,140,null,null,'apartment',null,null,'Modern','حديث','S. Ali','سارة علي','2024-03-01');

insert into public.clients (name, phone, email, budget, preferred_area, preferred_unit_type, stage, notes) values
('Omar Hassan','+201001234567','omar@example.com',2600000,'Sheikh Zayed','apartment','negotiating','Prefers high floors'),
('Nour El-Din','+201112345678',null,3500000,'New Cairo','duplex','contacted',null),
('Laila Samir','+201223456789','laila@example.com',1900000,'North Coast','chalet','new_lead','Summer home');

-- a closed deal so the dashboard/analytics/history have data
insert into public.deals (client_id, property_id, agent, stage, value, commission_pct, agent_share_pct, company_share_pct, closed_at)
select c.id, p.id, 'M. Ahmed', 'closed', 1800000, 2.5, 40, 60, current_date - 10
from public.clients c, public.properties p
where c.name = 'Laila Samir' and p.code = 'C-303';

insert into public.followups (client_id, title, kind, due_at)
select id, 'Call about Zayed Greens payment plan', 'call', now() + interval '3 hours'
from public.clients where name = 'Omar Hassan';
```

## 3. Enable email auth

1. **Authentication → Providers → Email** — make sure it's enabled.
2. **Authentication → Sign In / Providers** → **Confirm email**:
   - For a fast internal tool, **turn this OFF** so agents can sign up and use the app immediately.
   - If you leave it ON, new signups must click a confirmation link before they can sign in
     (the app handles this — it shows a "check your email" message and returns to the login form).

You can also create agent accounts manually under **Authentication → Users → Add user**.

## 4. Wire the keys into the app

Open **`index.html`**, find the `CONFIG` section near the top of the `<script>` block,
and set the two constants:

```js
const SUPABASE_URL      = "https://YOUR-PROJECT-REF.supabase.co"; // <-- your Project URL
const SUPABASE_ANON_KEY = "YOUR-ANON-PUBLIC-KEY";                 // <-- your anon public key
```

Save. Until these are set, the login screen shows a hint banner and no network calls are made.

## 5. Run it

Just open `index.html` in a browser (double-click, or `file://…`). Sign up / sign in, and you're in.

> **Local preview helper (optional):** this folder includes `.claude/launch.json` + `.claude/serve.ps1`,
> a tiny PowerShell static server used during development. You don't need it — but if you prefer
> `http://localhost` over `file://`, run:
> `powershell -ExecutionPolicy Bypass -File .claude/serve.ps1` then visit `http://localhost:8123`.

> **Notifications note:** follow-up reminders use the browser Notification API — they fire while
> the app is open in a tab (foreground or background). True push-when-closed requires a service
> worker + a push provider, which a single-file app deliberately skips.

## 6. Deploy to Vercel (auto-deploy from GitHub)

Because it's a single static file, Vercel needs **zero build configuration**.

1. **Create a GitHub repo** and push this folder. Minimum required file is `index.html`.
   ```bash
   git init
   git add index.html SETUP.md ARCHITECTURE.md
   git commit -m "Ring Roads broker CRM"
   git branch -M main
   git remote add origin https://github.com/<you>/<repo>.git
   git push -u origin main
   ```
2. Go to [vercel.com](https://vercel.com) → **Add New… → Project** → import the GitHub repo.
3. In the import screen: **Framework Preset:** `Other`, no build command, output directory `.` (root).
4. **Deploy.** Every future `git push` to `main` auto-redeploys.

> **Note on keys in a public repo:** the `anon` key is designed to be public and is protected by RLS,
> so committing it is fine. Never commit your Supabase **service_role** key or DB password — this app
> doesn't use them.

---

## What's in the app

- **Login / sign-up gate** — the whole app sits behind Supabase Auth (email + password), session
  persisted in `localStorage` with automatic token refresh.
- **Dashboard** — sales / commissions / active clients / booked visits this month, a 6-month sales
  chart, today's task list, top-agent ranking and the most-sold project.
- **Properties** — full CRUD with project, developer, unit type, delivery date, payment plan,
  image gallery (URL-based) and a Google Maps link; searchable and filterable by status
  (available / reserved / sold / rented).
- **Clients CRM** — leads with phone / WhatsApp shortcuts, budget & preferences, notes, and a
  six-stage funnel (new lead → … → contract signed) with quick stage changes.
- **Follow-ups** — calls / meetings / site visits with due times, grouped into overdue / today /
  upcoming, checkbox completion, and browser notifications for items coming due.
- **Deals pipeline** — Kanban board (lead → contacted → visit → negotiation → reservation → closed);
  moving a deal to *closed* stamps `closed_at` and feeds history + analytics.
- **Commission calculator** — price × commission % split into agent / company shares, with a
  branded PNG quote export (html2canvas).
- **Commission history** — closed deals filtered by month / agent / project, with CSV (Excel)
  and PDF (print) export.
- **Analytics** — 12-month sales chart, lead→deal conversion rate, pipeline funnel, revenue by
  project, top developers and best locations.
- **AI features** — client↔property matching with reasons, similar-property suggestions, and a
  heuristic value-growth forecast (clearly labeled as an estimate).
- **Bilingual EN/AR** (full RTL mirroring) and **dark/light mode**, both persisted per device.
