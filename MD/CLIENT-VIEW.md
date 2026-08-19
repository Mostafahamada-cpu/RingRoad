# Ring Roads — Client View (public, no login)

A separate, mobile-first property browsing site in **`client/`**. Visitors never sign in,
never register and never create a password: they browse, save, compare, share and contact
the assigned agent.

The admin & agent workspace in **`platform/`** is untouched — same routes, same roles, same
CRM. The two are deployed as separate Vercel projects, so `client/` carries its own copy of
the shared design system and its own copy of the Supabase keys (see *Files* below).

```
Properties → Search / Filter / Sort → Property card → Property details
                                                        ↓
                            ❤️ Favorite · ⚖️ Compare · 📤 Share · 💬 WhatsApp · 📩 Request details
```

## Setup (one time)

1. Run **`platform-client-view.sql`** in the Supabase SQL editor. It is idempotent and only
   adds objects — no existing table, column or policy is modified. It creates:
   - `properties.finishing` / `properties.developer` (and `project` if missing)
   - `profiles.whatsapp`
   - the `RR-####` code sequence, insert trigger, backfill and unique index
   - the `public_listings` view (the only thing `anon` can read)
   - the `property_requests` table + RLS
   - `rr_submit_property_request()` (the only thing `anon` can write)
2. Deploy. **`client/` is the Vercel project's Root Directory** — the project
   `ring-road-client` is configured that way, so `https://<host>/` serves
   `client/index.html` directly. `client/vercel.json` (which must live in that root to be
   read at all) rewrites the four public routes onto it.
3. Give each agent a WhatsApp number — **Settings → My profile** (their own) or
   **Users → edit** (an admin doing it for them). If left blank the agent's phone number is
   used instead.

## URLs

| Route | Page |
|---|---|
| `/properties` | listing with search, filters and sort |
| `/property/RR-1024` | property details — what every shared link opens |
| `/favorites` | saved on this device |
| `/compare` | up to 4 properties side by side |

The router works in two styles and picks one from the entry URL:

- **path mode** — the deployed site, thanks to the rewrites in `client/vercel.json`.
- **hash mode** — `/client/#/property/RR-1024`, used automatically when the app is opened
  directly at `/client/` (no rewrites, e.g. plain static hosting or a local `http.server`).

Share links, the WhatsApp message and every in-app link are all built from the same helper,
so whichever mode is active, a shared link always reopens **that exact property**.

## Property IDs

Every property gets a unique `RR-####` code from a Postgres sequence
(`property_code_seq`, starting at 1024) assigned by the `trg_properties_code` insert
trigger. Existing rows are backfilled and duplicates are re-issued, then a unique index
locks it in. The admin property page shows the code and its public link with a copy button.

## What the public can reach

`anon` has **no** grant on `properties`, `profiles`, `clients` or anything else. It sees only:

- `public_listings` — a view over approved, non-sold, non-archived stock, exposing the
  marketing columns plus the assigned agent's name, photo, phone and WhatsApp. `sold_price`,
  `commission`, `buyer_name`, `created_by` and the rest never leave the database.
- `rr_submit_property_request(...)` — a `security definer` function that validates the input,
  confirms the property is publicly visible, collapses duplicate submits, rate-limits by
  phone, then writes one `property_requests` row **and** one `clients` row (`stage =
  new_lead`, assigned to the property's agent).

## Where the leads land

**Requests** in the platform sidebar (`#/requests`) — searchable, exportable, with
`new → contacted → closed`. Each row links to the property and to the CRM client that was
created alongside it, so the lead is also visible on the existing **Clients** page and flows
through the normal pipeline. Visibility follows the usual roles: agents see their own,
leaders see their team, management/admin see everything.

## Favorites & compare

Both live in `localStorage`, keyed by property code:

- `rr_client_favorites` — unlimited, survives refresh and later visits on the same device.
- `rr_client_compare` — capped at 4; a 5th attempt shows a notice instead of replacing one.

Open tabs stay in sync through the `storage` event. If storage is unavailable (private
browsing) the lists fall back to memory for the session instead of breaking.

## WhatsApp

`💬 WhatsApp Agent` opens `wa.me/<agent number>` with the message already written:

```
Hi, I'm interested in this property.

Property: Fifth Settlement Apartment
Property ID: RR-1024
Price: 4,500,000 EGP
Area: 180 m²
Bedrooms: 3
Bathrooms: 2
Location: New Cairo, Cairo
Project: Mivida
Type: Apartment · For Sale

Property Link:
https://<host>/property/RR-1024
```

Every line comes from the property row, so the client types nothing and never has to
remember the ID. Numbers are normalised for `wa.me` (`01001234567` → `201001234567`,
dial code in `client/js/config.js`). The destination is **that property's** agent — there is
no shared number. If an agent has neither WhatsApp nor phone, the button is hidden and
`📩 Request Details` becomes the primary CTA (set `OFFICE_WHATSAPP` in
`client/js/config.js` to route those to a company number instead).

## Price per m²

Shown on the details page and in the comparison table, and only when the price **and** the
area are both real numbers greater than zero — a missing area never produces a bogus figure.
The "best value" marker in the comparison appears only when every column is the same deal
type, so a monthly rent is never ranked against sale prices.

## Files

Because `client/` is its own deploy root, nothing outside it is served: every asset path is
absolute from this folder (`/css/…`, `/js/…`, `/assets/…`) and no file here may import from
`../platform`. `tokens.css`, `base.css`, `components.css` and `assets/logo.svg` are therefore
**synced copies** of the platform originals — if you edit the platform's, copy them over again.

```
client/
  index.html                shell (assets absolute from this root — see the note in the file)
  vercel.json               rewrites + cache headers (must sit in the deploy root)
  assets/logo.svg           synced copy of platform/assets/logo.svg
  css/tokens.css            synced copy of platform/css/tokens.css
  css/base.css              synced copy of platform/css/base.css
  css/components.css        synced copy of platform/css/components.css
  css/client.css            public-view components on top of that design system
  js/
    config.js               Supabase keys (mirrored from platform/js/config.js) + constants
    main.js                 boot: router → shell → route
    lib/
      api.js                public_listings reads + the request RPC (anon only)
      catalog.js            one fetch of the feed, cached and indexed by code + uuid
      router.js             path/hash dual routing, shareable URL builder
      store.js              localStorage favorites + compare
      contact.js            share sheet / clipboard + the generated WhatsApp message
      format.js             money, area, price per m², domain labels
      ui.js                 toasts, modal, bottom sheet, skeletons, empty states
    components/             shell (header/tab bar/compare tray), card, filters, gallery
    pages/                  properties, property, favorites, compare
```
