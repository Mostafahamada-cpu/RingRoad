# Ring Roads Design System

A blue-and-white, bilingual (English + Arabic / RTL) design system for **Ring Roads**, a real-estate management mobile app. It reinterprets the original green/gold React Native prototype into a professional blue palette and adds full English + Arabic support.

## Product context

Ring Roads is a mobile app for a real-estate brokerage. It has two core surfaces:

1. **Property Dashboard** — a scrollable list of listings as expandable cards (building code, address, price, status, beds/baths, finish, agent, registration date) with a top stats row (total / available / for-sale counts).
2. **Commission Calculator** — inputs for buyer & seller transaction amounts and four commission rates (buyer agent, seller agent, inspection, deal manager), producing a live breakdown and grand total.

Currency is Egyptian Pounds (EGP / جنيه). The original app was Arabic-only (RTL); this system is bilingual — every string ships in both languages and layout mirrors for Arabic.

### Sources given
- `uploads/RingRoads_RealEstate_App.jsx` — the original React Native app (single file, ~790 lines). **Ground truth** for structure, components, spacing, and data model.
- `uploads/README.md`, `uploads/QUICK_START.md` — Arabic product docs describing features, the commission formula, and sample data.

> The React Native source uses `react-native` primitives, which the in-browser bundler can't resolve; it's kept in `uploads/` for reference only and is not part of the shipped system.

## Deviations from source (please confirm)
- **Palette:** original was green `#1a472a` + gold `#d4a574`. Per request, reinterpreted to **blue + white** (`--blue-700 #0f4c81` primary, `--blue-500 #2e7cd6` accent). Semantic status colors (green/red/amber) kept.
- **Language:** original Arabic-only → now **bilingual EN/AR** with an in-app language toggle and RTL mirroring.
- **Font:** original used platform system fonts. Substituted **Cairo** (Google Fonts) for matched Latin + Arabic glyphs. Send a licensed brand typeface to swap.
- **Logo:** none supplied. The brand is set as a plain Cairo-Bold wordmark ("Ring Roads · رينج رودز") with a 🏢 glyph placeholder. No mark was invented — send a real logo to drop in.

---

## Content fundamentals

**Bilingual, parallel copy.** Every user-facing string exists in English and Arabic. In UI where space allows, the two are shown together separated by a middle dot: `متاح · Available`. In the running app they swap by language toggle rather than stacking.

**Tone:** plain, functional, task-focused — this is a working tool for agents, not marketing. Short noun phrases for labels ("Buyer amount", "مبلغ المشتري"), imperative for actions ("Calculate", "احسب"). No exclamation, no hype.

**Voice:** neutral/system, not first- or second-person. Labels name the thing ("Total commission") rather than addressing the user ("Your commission").

**Casing:** English uses Sentence case for labels and titles ("Transaction amounts"), not Title Case. Arabic has no case.

**Numbers:** grouped with commas, currency suffixed as a word — `2,500,000 EGP` / `2,500,000 جنيه`. Rent shows `/mo` · `/شهر`. Percentages as whole numbers with `%`.

**Emoji:** used sparingly and functionally as category/nav glyphs (🏠🏢🏘️🏙️ for property types, 📊 dashboard, 💰 commission) — inherited from the source app. Not decorative. See Iconography.

Examples: screen titles "Ring Roads" / "رينج رودز"; section headers "Commission rates" / "النسب المئوية"; status pills "Sold" / "مباع".

---

## Visual foundations

**Color & vibe.** Blue + white, clean and trustworthy. `--blue-700` anchors headers, the brand wordmark, and key values; `--blue-500` is the interactive/accent blue (focus rings, accent bars, active tab). Backgrounds are near-white: app canvas `--gray-50 #f5f8fc`, cards pure white, an occasional `--blue-50` tint for inset boxes. Deep `--blue-900` is reserved for the status bar. Cool, calm, high-legibility — no warm tones except the semantic amber.

**Status semantics** are the only non-blue accents: green = available, red = sold, amber = rented — each as a soft pill (tinted bg + saturated text).

**Typography.** Single family — **Cairo** — carrying both scripts at matched weight and rhythm. Scale mirrors the app: 28 display (screen titles), 18 (result totals), 16 (section titles), 14 body/inputs, 13 secondary, 11–12 labels/badges. Weights 400/500/600/700/800; headings and values are 600–800 blue, body is 400 near-black `--gray-900`, secondary text is `--gray-500`. Sentence case, tight-to-snug line heights on headings, ~1.55 on body.

**Spacing.** 4px base grid: 4 / 8 / 12 / 16 / 24 / 32. Default screen and card padding is 16px; header padding 16–24px; card gaps 12–16px.

**Corners.** 6px badges/chips, 8px inputs & buttons, 12px cards/panels/stat tiles, 16px on the header sheet's bottom corners, pill for the language toggle. Consistent and moderate — nothing fully sharp, nothing very round except pills.

**Cards.** White fill, 12px radius, a soft blue-tinted shadow (`--shadow-card` = `0 2px 6px rgba(15,76,129,.10)`), and — the signature motif from the source — a **4px colored accent bar on the leading edge** (blue by default; success/warning for result panels). Property cards use a 1px border that thickens to 2px blue when expanded, rather than a heavy shadow.

**Shadows.** Soft, low-contrast, blue-tinted (never neutral gray): `--shadow-sm/-card/-stat/-lg`. Elevation is gentle — this is a flat, paper-like UI, not a heavily floating one.

**Backgrounds.** Flat solid fills only. No gradients, no photographic hero imagery, no textures or patterns. The brand header is a solid `--blue-700` sheet with rounded bottom corners.

**Borders.** 1px `--gray-200` for dividers and card outlines; accent borders use `--blue-500`. Dividers separate list rows and detail rows inside cards.

**Animation.** Minimal and functional: 0.15s ease color/background transitions on interactive elements; a subtle `scale(0.98)` press on buttons; expand/collapse on property cards is an instant show/hide (no height animation in source). No bounces, no decorative motion, respect reduced-motion by default.

**Hover / press.** Hover: slight background/color shift (tint, or filter). Press: `scale(0.98)`. Active tab: fills solid blue with white text; inactive tabs sit on a light tint with muted text.

**Focus.** Inputs get a `--blue-500` border plus a 3px `--blue-100` ring.

**Transparency / blur.** Essentially none — the app is opaque and flat. The only translucency is the language-toggle track (`rgba(255,255,255,.15)`) on the blue header.

**Layout rules.** Mobile-first, single column. Fixed brand header at top (rounded bottom sheet), scrollable content in the middle, fixed bottom tab bar. RTL mirrors horizontal padding, accent-bar side, text alignment, and tab order.

---

## Iconography

The source app has **no icon library** — it uses **emoji as glyphs**, and this system preserves that approach:
- **Property types / list markers:** 🏠 🏢 🏘️ 🏙️ (per-listing, from the data).
- **Navigation:** 📊 Dashboard, 💰 Commission (in the tab bar).
- Emoji are used functionally (category + nav), never as decorative filler.

There are **no SVG icons, no icon font, and no PNG icon assets** in the source, so none were copied in. If Ring Roads adopts a proper icon set later, the recommended substitute is a thin-stroke open-source set (e.g. Lucide via CDN) applied at 1.5–2px stroke to match the clean, light UI — **flag any such addition**. Unicode symbols (·, ═) appear only in the docs' ASCII diagrams, not the UI.

**Logo/assets:** none were provided, so `assets/` holds no logo — the brand renders as a Cairo-Bold wordmark. Do not reconstruct a Ring Roads logo from memory; request the real files.

---

## Index / manifest

**Root**
- `styles.css` — global entry point (import this). `@import`s only.
- `tokens/` — `fonts.css`, `colors.css`, `typography.css`, `spacing.css`, `radius.css`, `shadows.css`.
- `readme.md` — this file. `SKILL.md` — Agent-Skills entry point.
- `guidelines/` — foundation specimen cards (Colors, Type, Spacing, Brand).

**Components** (`components/<group>/` — namespace `window.RingRoadsDesignSystem_ef90d6`)
- `actions/` — **Button** (primary / secondary / ghost; sm/md/lg; icon, fullWidth, disabled)
- `forms/` — **Input** (labeled field, focus ring, unit suffix, RTL)
- `navigation/` — **TabBar** (bottom nav, active pill, RTL)
- `layout/` — **Panel** (accent-bar sectioning card), **StatCard** (dashboard metric tile)
- `property/` — **PropertyCard** (expandable listing), **StatusBadge** (available/sold/rented pill)
- `finance/` — **CommissionRow** (breakdown line / subtotal / total variants)

**UI kits** (`ui_kits/`)
- `mobile-app/` — interactive bilingual app: property dashboard + commission calculator, EN/AR toggle, phone frame. `index.html` composes the components; `Dashboard.jsx`, `Commission.jsx`, `data.js`.

**Generated (do not edit):** `_ds_bundle.js`, `_ds_manifest.json`, `_adherence.oxlintrc.json`.
