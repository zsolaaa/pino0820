# Design

<!-- impeccable:design-schema 1 -->

## World

Bold, condensed poster typography, reskinned from the user's pinned reference image ("TONDO"-style pizzeria landing page) with Pinocchio Pizza & Pasta's own content, palette, and menu. Warm cream is the base for nearly every section; only two full-bleed color bands remain (near-black for the process section and footer, brick red for the closing CTA) — reduced from an earlier version with 5 full-bleed bands after user feedback that alternating saturated section backgrounds while scrolling read as "stacked banners" rather than a coherent page. Forest green and marigold, previously full-section backgrounds (menu preview, FAQ), now live as accent borders/badges on cream cards instead.

## Color

Full-palette strategy, 4 named roles plus the cream/paper base:

- `--cream` `#F6EFE2` / `--paper` `#FBF7EE` — base ground, review cards, story/ingredients/gallery sections
- `--ink` `#1C140E` / `--ink-soft` `#2A1F16` — header ticker, process section, footer
- `--red` `#C4291E` / `--red-deep` `#9C1F17` — primary accent, CTA buttons, review avatar circles, closing CTA band
- `--green` `#1F5C3D` / `--green-deep` `#163F2A` — full-bleed on the real menu page (`etlap.html`) only; on `index.html` it's a top-border accent on the cream menu-preview card
- `--marigold` `#F0B32B` — accent only: top-border on the cream FAQ card, ticker odd words, "csípős" tags, price tags on dark surfaces (never a full-bleed section background)

Secondary text on colored surfaces is tinted from that surface's hue family (e.g. `--text-on-green-soft`), never plain gray. `--text-on-green-soft` was lightened from `#A9C4AF` to `#B3CDBA` (WCAG AA fix from the /impeccable critique run — was ~4.2:1, now ~4.65:1 against `--green`).

## Type

- Display: **Big Shoulders Display** (700/800/900), uppercase, tight tracking (`-0.02em`), used for all headings, logo, and step numbers.
- Labels/UI: **Big Shoulders Text** (600/700), uppercase, wider tracking, used for nav, buttons, tags, prices, footer headings.
- Body/serif: **Literata**, used for paragraph copy, menu item names, and descriptive text — warm, readable counterweight to the condensed display face.

## Components

- **Buttons**: `.btn-primary` (solid red, hard 4px offset shadow), `.btn-ghost` (outline, inverts to ink on hover), `.btn-call` (compact ink pill in header).
- **Review cards**: `.review-card`, flat paper background, drawn 5-star SVG rating, initial-letter avatar circle, oversized typographic quote mark. Content is 3 real Google reviews the owner supplied verbatim (names, star counts, text) — not fabricated testimonials.
- **Menu rows**: `.menu-row`, dotted leader between name and price (hidden on mobile in favor of wrapped stacking), `em` inline tag for "csípős".
- **Menu jump nav**: `.menu-jumpnav`, sticky pill row on `etlap.html` pinned under the header, jumps to each of the 7 category anchors (`scroll-margin-top` accounts for the sticky header + nav stack).
- **Menu subcategories**: `.menu-subcat`, a small marigold label grouping items within one `.menu-cat` (used to split "Extra feltétek" into Sajtok / Húsok / Zöldségek) — not a decorative kicker, it carries real grouping information.
- **Ticker**: infinite horizontal marquee strip, ink background, marigold accent on alternating words.
- **Placeholder images**: `.ph-image`, diagonal-stripe pattern with a labeled tag naming the expected filename (see `IMAGE_PROMPTS.md`); replaced automatically once a real file lands at that path. Supports an optional `data-ph-pos` attribute (`background-position` value) for crops where the default center anchor cuts off the subject — used on the four widest/shortest gallery cells (`g2`, `g4`, `g5`, `g6`, aspect ratio up to 3.6:1) since their portrait source photos only keep ~21–43% of their vertical extent under a plain center crop, which was cropping the actual dish out of frame on desktop.
- **FAQ accordion**: `.faq-item` (native `<details>`/`<summary>`) inside `.faq-card`, a paper card with a marigold top-border on cream, grouped into two labeled columns (`.faq-group-title`: Rendelés & szállítás / Étel & étrend). Plus/minus icon built from two CSS pseudo-elements that rotate on `[open]`. Copy grounded in confirmed product facts (hours, address, phone-only ordering, delivery, payment methods, dough, spice tags, pasta substitution) plus owner-confirmed answers on parking, payment methods, dietary options, and delivery minimum/fee — no fabricated claims.
- **Menu preview card**: `.menu-preview-card`, the same paper-card-on-cream pattern as the FAQ card, with a green top-border instead of marigold — reuses the real menu's `.menu-row`/`.menu-list` markup but with cream-context text colors instead of the green page's light-on-dark palette.
- **Contact card rows**: `.cta-row`, icon + small label + value rows on the CTA card (replaced an earlier flowing-sentence layout that let the phone number wrap mid-string).
- **Legal page components**: `.legal-card` (paper card, reused on `adatkezelesi-tajekoztato.html`), `.legal-def-row` (definition-list label/value rows, same visual language as `.cta-row`), `.legal-note` (cream-deep callout box, no colored side-border per the site's anti-pattern list — a bold red uppercase label instead).
- **Cookie consent banner**: `.cookie-banner`, fixed ink card bottom-right on desktop (avoids the bottom-left `.grant-badge`), full-width bar on mobile (where the funding badge moves under the header instead). Gates Google Analytics (GA4, `G-GFPRWQK6D2`) behind explicit accept/reject, stored in `localStorage` (`pinocchio-cookie-consent`); a "Süti-beállítások" footer link reopens it. Logic lives in `js/main.js`.

## Responsive rules

Single breakpoint at 980px collapses nav to a hamburger/full-screen list, stacks hero/story/CTA grids, and reduces menu/gallery/ingredient grids to fewer columns. A second breakpoint at 560px stacks menu rows (name wraps, dotted leader hidden, price stays right-aligned) and full-widths hero CTA buttons.

## Pages

- `index.html` — landing page: hero, Google reviews (`#reviews`), a compact menu preview with a link to the full menu, story, ingredients, process, gallery, FAQ accordion (`#faq`), CTA/contact, footer.
- `etlap.html` — standalone full menu page (all pizzas + pasta + salad/extras/drinks/coffee/dessert with prices), reusing the same header/footer and the `.menu-full` green section; linked from the header nav, hero CTA, menu preview, and footer on every page.

## Known gaps / next steps

- Hero, 5 ingredient photos, and the 6-image gallery are filled with real/generated photography. The gallery uses 6 authentic photos the owner supplied from the actual pizzeria (real Baja terrace, real dishes), selected for a pizza/pasta mix and visual variety. `images/signature-*.jpg` are now unused since the signature-pizza cards were replaced by the reviews section.
- `story-oven.jpg` is temporarily a duplicate of the bar-counter photo used for `gallery-2.jpg` (5 pizzas lined up), reused as a stopgap after the /impeccable critique run flagged the section shipping a broken placeholder. Replace with a dedicated kitchen/founders photo per the prompt in `IMAGE_PROMPTS.md` when one is available.
- The owner's supplied photos also included a pizza box bearing a real hand-drawn **Pinocchio mascot logo** (green/red cartoon boy with a pizza), not currently used anywhere on the page since no logo asset was scoped into this build — worth a follow-up to incorporate as an actual brand mark instead of the current wordmark-only header/footer.
- No online ordering/reservation system is wired up — CTAs route to `tel:` and a Google Maps search link only, per confirmed product scope.
- `/impeccable audit` (2026-08-23) found and fixed: nav-toggle touch target under 44px, the FAQ section missing from all nav (header/mobile/footer, both pages), all `.ph-image` photos loading eagerly regardless of viewport position, a stale `.usp-cta` class name left over from the pre-FAQ "Miért Pinocchio?" band, and the mechanical detector's `border-accent-on-rounded` flag on `.faq-card`/`.menu-preview-card` (squared off the top corners under the accent border so it no longer fights the card's rounded shape).
- A full `/seo audit` (2026-08-23, `claude-seo` plugin, 10 parallel subagents) found and 3 critical items were fixed the same day: (1) added `Restaurant` and `FAQPage` JSON-LD to `index.html` — the site had zero structured data anywhere; (2) converted the hero photo from a JS-only `.ph-image` background-fill `<div>` to a real `<img fetchpriority="high">` with native `width`/`height`/`alt`, so it's indexable by Google Images and visible to the browser's preload scanner (the other `.ph-image` blocks — gallery, ingredients, story — stay JS-lazy-loaded by design, since they're below the fold); (3) compacted the mobile `.cookie-banner` (shorter copy, tighter padding, `min-height:44px` buttons instead of full-width stacked ones) after DOM measurement confirmed it fully covered both hero CTA buttons on a 375×812 viewport on first load. The domain is confirmed as `pinocchiobaja.hu`; `sitemap.xml`, `robots.txt`, and the privacy-policy intro reference it (2026-08-24). On 2026-08-26: fixed a leftover domain inconsistency (the `Restaurant` JSON-LD's `image`/`url`/`hasMenu` still pointed at the old `zsolaaa.github.io/pino0820` GitHub Pages URL); added `rel="canonical"` plus full Open Graph and Twitter Card meta tags to all 4 pages, sharing one site-wide `images/og-image.jpg` (1200×630, ffmpeg-cropped from the real `gallery-6.jpg` terrace/pasta photo — no per-page image exists yet). Still open: image compression pass, GEO/`llms.txt`.
- This DESIGN.md was authored in-thread rather than by the dedicated documenter subagent, and the finish check was a self-review (screenshot pass + the mechanical `detect.mjs` scan) rather than the full multi-agent finish-reviewer pipeline, since the visual direction was pinned directly by the user's reference image and the build stayed code-led (no image generation available in this session). Disclosed per the skill's substitution rule.
