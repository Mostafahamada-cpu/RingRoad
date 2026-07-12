---
name: ring-roads-design
description: Use this skill to generate well-branded interfaces and assets for Ring Roads (a bilingual EN/AR real-estate management app), either for production or throwaway prototypes/mocks/etc. Contains essential design guidelines, colors, type, fonts, assets, and UI kit components for prototyping.
user-invocable: true
---

Read the README.md file within this skill, and explore the other available files.
If creating visual artifacts (slides, mocks, throwaway prototypes, etc), copy assets out and create static HTML files for the user to view. If working on production code, you can copy assets and read the rules here to become an expert in designing with this brand.
If the user invokes this skill without any other guidance, ask them what they want to build or design, ask some questions, and act as an expert designer who outputs HTML artifacts _or_ production code, depending on the need.

Key notes for Ring Roads specifically:
- **Blue + white**, professional and flat. Primary `#0f4c81`, accent `#2e7cd6`. Semantic status: green=available, red=sold, amber=rented.
- **Bilingual (English + Arabic / RTL).** Provide both languages; mirror layout for Arabic. Font is **Cairo** (Google Fonts) for both scripts.
- Signature motif: white cards with a **4px colored accent bar on the leading edge**; soft blue-tinted shadows; 12px card radius.
- Currency is EGP (جنيه). Icons are functional **emoji** (🏠🏢 nav 📊💰), no icon library.
- No logo supplied — use the "Ring Roads · رينج رودز" wordmark; do not invent a mark.
- Link `styles.css` for tokens; components live under `window.RingRoadsDesignSystem_ef90d6` via `_ds_bundle.js`.
