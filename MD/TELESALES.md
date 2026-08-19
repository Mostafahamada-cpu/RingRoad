# Ring Roads — Telesales apartment assignment

Every apartment can be handed to a telesales employee, who then sees it on their own
dashboard and receives the client's WhatsApp messages about it.

Built on the existing tables and the existing four-role RBAC — nothing was duplicated:

| Need | What it uses |
|---|---|
| apartments | the existing `public.properties` rows (no second table) |
| WhatsApp number | the existing `profiles.whatsapp` column (no `whatsapp_number`) |
| who is "telesales" | new `profiles.department` — the `role` column is untouched |
| assignment | new `properties.assigned_telesales_id` (+ `assigned_at`, `assignment_status`, `assigned_by`) |
| audit trail | new `telesales_assignment_history` |

## Setup

Run in the Supabase SQL editor, in this order:

1. `platform-schema.sql` (already run)
2. `platform-client-view.sql` — adds `profiles.whatsapp`, the `RR-####` codes, `public_listings`
3. **`platform-telesales.sql`** — everything in the table above
4. **`platform-users-import.sql`** — the 18 accounts from `Attendance-Credentials.pdf`

If you already ran an earlier copy of `platform-telesales.sql`, run
**`platform-telesales-fix.sql`** as well: the first version of
`rr_distribute_apartments()` aborted on an unqualified `DELETE` (Supabase's safeupdate
guard) and `rr_assign_telesales()` violated the `assignment_status` CHECK, so nothing was
ever assigned. That file replaces the three functions and explains both faults.

## Roles vs departments

`role` stays `admin | management | leader | agent` — every existing policy, guard and
permission check keeps working exactly as before. "Telesales" is a **department**, so
someone can be a telesales *agent* or a telesales *team leader* without inventing a fifth
role — and only the agents receive apartments.

An account may receive apartments only when **all** of these hold (`rr_is_telesales()`):

- `active = true`
- `lower(btrim(department)) = 'telesales'`
- `role = 'agent'`

Engineers, admins, management, deactivated accounts **and telesales team leaders** are
therefore never assigned anything, by construction rather than by remembering to filter in
the UI. A team leader supervises the book rather than carrying one, so Mr. Sayed
(`role = 'leader'`, `department = 'telesales'`) is correctly excluded.

## Assigning

**Telesales Management** (`#/telesales`, management/admin only) shows workable stock,
how many each person is carrying, and a per-row dropdown to assign or reassign. You can
filter to one employee or to *Unassigned only*, and the dropdown lists **only active
telesales**. A single apartment can also be assigned from its detail page.

Sold, rented and archived apartments are excluded everywhere here — handing someone a
quota of dead rows helps nobody.

### Distribute Apartments

Hands out **only the currently unassigned** apartments. Existing assignments are never
touched. Each apartment goes to whoever has the fewest at that moment (ties broken by
name, so a run is reproducible), which levels up whoever is behind rather than blindly
cycling.

### Redistribute All

Clears every current assignment first, then deals the whole book again from zero. Behind
a confirmation because it cannot be undone.

From an empty book both are a plain even split, and a remainder is spread one-per-person:

| Apartments | Telesales | Result |
|---|---|---|
| 100 | 4 | 25 · 25 · 25 · 25 |
| 102 | 4 | 26 · 26 · 25 · 25 |

Every change — manual or automatic — writes a `telesales_assignment_history` row recording
who moved what, from whom, to whom, and when.

## The telesales dashboard

**My Apartments** (`#/my-apartments`) appears in the sidebar only for telesales accounts.
It shows their totals (assigned / available / reserved / sold) and their list, and nags
them to save a WhatsApp number until they do.

The list is fetched with `assigned_telesales_id = eq.<their id>`, but that filter is not
what protects it — the `prop sel` RLS policy does. A telesales employee can only ever read
rows where they are the assigned telesales, the listing agent, or (for leaders) on their
team. Editing an id in the URL, or calling PostgREST directly with their own token,
returns nothing for anyone else's apartments.

## Security (RLS)

| | Admin / Management | Telesales | Anonymous client |
|---|---|---|---|
| read apartments | all | own assigned + own listings | `public_listings` only |
| assign / reassign | yes (`rr_assign_telesales`) | no | no |
| distribute | yes (`rr_distribute_apartments`) | no | no |
| edit assignment columns | yes | **silently reverted** by `rr_guard_assignment` | n/a |
| own WhatsApp / profile | yes | yes | n/a |
| change own role / department / active | yes | **silently reverted** by `rrp_guard_profile` | n/a |
| assignment history | all | only rows about their own apartments | none |

Both RPCs re-check `rrp_is_mgmt()` server-side, so a telesales user calling them directly
gets `not_authorised` regardless of what the UI shows — verified against the live database.
RLS is never disabled.

> **Check RLS is actually on.** The table above only holds while row level security is
> enforced. It was found switched off on this database (an agent could read every property,
> client and deal), which section 4 of `platform-telesales-fix.sql` re-asserts. Confirm with:
> `select relname, relrowsecurity from pg_class where relnamespace='public'::regnamespace;`

## WhatsApp contact

Each employee saves their own number under **Settings → My profile** (an admin can also
set it from **Users → edit**). It is validated — 7–15 digits, `+`, spaces, dashes and
parentheses allowed — and stored in `profiles.whatsapp` in Supabase. Nothing about it
lives in localStorage.

On the public site, `public_listings.agent_whatsapp` resolves to the **assigned telesales
employee's** saved number, so the client reaches the person actually working that
apartment. The button opens `wa.me/<number>` with the message already written:

```
Hello, I am interested in Apartment RR-1024 in Mivida.
```

followed by the price, area, bedrooms, bathrooms, location and the direct property link —
all generated from the property row, so the client never types or remembers an ID.

If that employee has not saved a number, the button is **disabled** and the page says
*"WhatsApp contact is not available."* A phone number is never silently used as a WhatsApp
number, so a dead `wa.me` link is never produced.
