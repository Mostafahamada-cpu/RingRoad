# Ring Roads — Application Architecture

Bilingual (EN/AR) mobile-first CRM for real-estate brokers and sales agents.
This document covers the architecture, database schema, screen designs and user flows.
Setup and SQL live in `SETUP.md`.

---

## 1. Architecture overview

```
┌────────────────────────────────────────────────────────────┐
│  index.html  (single file — no build step)                 │
│                                                            │
│  CSS custom properties ──► design tokens (light + dark)    │
│  Vanilla JS state object ──► render functions (innerHTML)  │
│  Delegated events on #app-root (click/submit/input/change) │
│  html2canvas (CDN) ──► PNG quote export                    │
└──────────────┬─────────────────────────────────────────────┘
               │ fetch() — plain REST, no SDK
     ┌─────────┴──────────┐
     │      Supabase      │
     │  GoTrue  /auth/v1  │  email+password, refresh tokens
     │  PostgREST /rest/v1│  properties · clients · followups · deals
     │  Row Level Security│  all tables: authenticated-only
     └────────────────────┘
     Hosting: Vercel static (auto-deploy from GitHub main)
```

Principles:

- **One file, zero dependencies** (besides html2canvas). Open it in a browser and it works.
- **State → render**: a single `state` object; `renderRoot()` re-renders the visible tree.
  Hot inputs (calculator fields, search boxes) re-render only their result subtree to keep the caret.
- **Optimistic mutations** for quick actions (kanban moves, follow-up check-off, stage changes)
  with rollback + toast on failure.
- **Bilingual by construction**: every string goes through `t(key)`; `dir` flips to RTL for Arabic;
  logical CSS properties handle mirroring.
- **Theming by tokens**: dark mode overrides only semantic CSS variables
  (`--surface-*`, `--text-*`, `--border-*`, `--chart-*`); the quote template re-pins light values
  so exported PNGs are always print-friendly.

## 2. Database schema (4 tables)

```
properties                      clients
├─ id (uuid pk)                 ├─ id (uuid pk)
├─ code, icon, status¹          ├─ name, phone, email
├─ address_en / address_ar      ├─ budget (numeric)
├─ price, type (sale|rent)      ├─ preferred_area
├─ beds, baths, area            ├─ preferred_unit_type
├─ project, developer           ├─ notes
├─ unit_type²                   ├─ stage³
├─ delivery (date)              └─ created_at / updated_at / created_by
├─ payment_plan
├─ images (jsonb array)         followups
├─ map_url                      ├─ id (uuid pk)
├─ finish/unit/agent _en/_ar    ├─ client_id ─► clients (cascade)
├─ registered                   ├─ title, kind (call|meeting|visit|other)
└─ created/updated/created_by   ├─ due_at (timestamptz), done (bool)
                                └─ notes, created_at, created_by
deals   (closed rows = commission history)
├─ id (uuid pk)
├─ client_id   ─► clients (set null)
├─ property_id ─► properties (set null)
├─ agent (text)
├─ stage⁴, value
├─ commission_pct, agent_share_pct, company_share_pct
├─ closed_at (date; stamped when stage → closed)
└─ created_at / updated_at / created_by

¹ status: available | reserved | sold | rented
² unit_type: apartment | villa | townhouse | duplex | penthouse | studio | chalet | office | retail
³ client stage: new_lead → contacted → visit_scheduled → negotiating → reservation → contract_signed
⁴ deal stage: lead → contacted → visit → negotiation → reservation → closed
```

Design decisions:

- **Commission history is derived, not duplicated** — a "commission record" is simply a deal in
  `closed` stage; totals are computed as
  `total = value × commission_pct%`, `agent = total × agent_share%`, `company = total × company_share%`.
- **Joins happen client-side** (`clientById` / `propById` maps) — the whole dataset for a brokerage
  is small, and it keeps the REST layer to four flat `select=*` calls loaded in parallel.
- **RLS**: every table is `authenticated`-only for select/insert/update/delete; the anon key alone
  can read nothing.

## 3. Screens & navigation

Bottom tab bar (5 tabs): **Home · Properties · Clients · Deals · More**.
The More tab opens a menu of sub-screens: **Follow-ups · Calculator · History · Analytics**.
Context FAB (+) on Properties / Clients / Deals / Follow-ups.

| Screen | Contents |
|---|---|
| **Dashboard** | 4 stat cards (sales this month, commissions this month, active clients, booked visits) · 6-month sales bar chart · today's tasks with check-off · top-agents ranking (by commission) · most-sold project |
| **Properties** | stat row · search + status filter chips · expandable cards (gallery, developer, delivery, payment plan, maps link) · actions: AI similar, value forecast, quote, edit, delete |
| **Clients** | search + stage filter chips (with counts) · cards with avatar, phone, budget, stage chip · expanded: email/notes/preferences, quick stage select, call / WhatsApp, AI matches, add follow-up, edit, delete |
| **Deals** | Kanban board, 6 columns with count + value sum per column · cards move with ◀ ▶ (persisted) · tap a card to edit · closing stamps `closed_at` |
| **Follow-ups** | enable-notifications banner · groups: overdue / today / upcoming (+ collapsed completed) · circle checkbox completes a task |
| **Calculator** | optional property picker (autofills price) · price, commission %, agent share %, company share % · results: total / agent / company commission · PNG quote |
| **History** | month / agent / project filters · summary stat cards · closed-deal rows · export CSV (Excel, UTF-8 BOM) and PDF (print window) |
| **Analytics** | 12-month sales chart · conversion-rate hero number · pipeline funnel · revenue by project · top developers · best locations |

Design language: blue header sheet (#0f4c81), 4px accent-bar cards, Cairo font, EGP with Western
digits, bottom tab bar, green/amber/red/gray status badges, smooth fade/slide animations
(disabled under `prefers-reduced-motion`).

## 4. User flows

**Lead to closed deal (happy path)**
1. Clients → + → save lead (stage: New lead).
2. Client card → ✨ AI matches → shortlist properties within budget/area/type.
3. Client card → ⏰ Add follow-up (call) → notification fires when due → call → stage: Contacted.
4. Schedule site visit (follow-up kind: visit — counts as "booked visit" on the dashboard).
5. Deals → + → link client + property (value autofills from price), set commission split.
6. Drag the deal ▶ through Visit → Negotiation → Reservation → Closed.
7. Closing stamps `closed_at` → dashboard sales/commissions, history and analytics all update.
8. Mark the property Reserved/Sold; client stage → Contract signed.

**Quote a client in 30 seconds**
Property card → 🧾 Generate quote (price prefills the calculator) → adjust % if needed →
Download PNG → send via WhatsApp.

**Monthly payout report**
More → History → filter month + agent → Excel (CSV) for accounting or PDF to print/share.

## 5. AI features (client-side heuristics)

All three run locally over portfolio data — deterministic, explainable, no external calls:

- **Property ↔ client matching** — scores every property for a client: within budget (closeness-
  weighted, up to 40), preferred area text match (25), preferred unit type (20), available now (15).
  Shows top 5 with match % and reason chips.
- **Similar properties** — same unit type (30), same project (25) / same developer (15), price
  within ±20% (up to 30), same area (15). Top 4.
- **Value growth forecast** — base market growth 5%/yr, + under-construction premium (3), + client
  demand for the area from your own CRM (up to 4), + developer sold-units track record (2).
  Presents a low–high annual range and a 5-year projection, explicitly labeled a heuristic estimate.

## 6. Notifications

Browser Notification API: permission requested from the Follow-ups screen; a 60-second interval
checks pending follow-ups and fires once per item within a window of 15 minutes before to 60 minutes
after the due time (de-duplicated in `localStorage`). Works while the app is open in any tab; true
push-when-closed would need a service worker + push provider, deliberately out of scope for the
single-file architecture.

## 7. Exports

- **Excel** — CSV with UTF-8 BOM so Arabic text opens correctly in Excel; quoted/escaped cells.
- **PDF** — a print-styled report window (brand header, table, totals row) that auto-invokes
  `window.print()`; users save as PDF from the print dialog.
- **Quote PNG** — html2canvas renders the light-locked quote template at 2× scale.
