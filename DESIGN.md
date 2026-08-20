# Design

<!-- impeccable:design-schema 1 -->

## World

Bold, condensed poster typography over full-bleed color-block sections, reskinned from the user's pinned reference image ("TONDO"-style pizzeria landing page) with Pinocchio Pizza & Pasta's own content, palette, and menu. Warm cream base punctuated by committed color bands per section (forest green for the menu, near-black for process, marigold for USPs, brick red for hero accents and the closing CTA).

## Color

Full-palette strategy, 4 named roles plus the cream/paper base:

- `--cream` `#F6EFE2` / `--paper` `#FBF7EE` — base ground, review cards, story/ingredients/gallery sections
- `--ink` `#1C140E` / `--ink-soft` `#2A1F16` — header ticker, process section, footer
- `--red` `#C4291E` / `--red-deep` `#9C1F17` — primary accent, CTA buttons, review avatar circles, closing CTA band
- `--green` `#1F5C3D` / `--green-deep` `#163F2A` — full menu section
- `--marigold` `#F0B32B` — USP band, accent highlights (ticker odd words, "csípős" tags, price tags on dark)

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
- **Placeholder images**: `.ph-image`, diagonal-stripe pattern with a labeled tag naming the expected filename (see `IMAGE_PROMPTS.md`); replaced automatically once a real file lands at that path.

## Responsive rules

Single breakpoint at 980px collapses nav to a hamburger/full-screen list, stacks hero/story/CTA grids, and reduces menu/gallery/ingredient grids to fewer columns. A second breakpoint at 560px stacks menu rows (name wraps, dotted leader hidden, price stays right-aligned) and full-widths hero CTA buttons.

## Pages

- `index.html` — landing page: hero, Google reviews (`#reviews`), a compact menu preview with a link to the full menu, story, ingredients, process, gallery, USP band, CTA/contact, footer.
- `etlap.html` — standalone full menu page (all pizzas + pasta + salad/extras/drinks/coffee/dessert with prices), reusing the same header/footer and the `.menu-full` green section; linked from the header nav, hero CTA, menu preview, and footer on every page.

## Known gaps / next steps

- Hero, 5 ingredient photos, and the 6-image gallery are filled with real/generated photography. The gallery uses 6 authentic photos the owner supplied from the actual pizzeria (real Baja terrace, real dishes), selected for a pizza/pasta mix and visual variety. `images/signature-*.jpg` are now unused since the signature-pizza cards were replaced by the reviews section.
- `story-oven.jpg` is temporarily a duplicate of the bar-counter photo used for `gallery-2.jpg` (5 pizzas lined up), reused as a stopgap after the /impeccable critique run flagged the section shipping a broken placeholder. Replace with a dedicated kitchen/founders photo per the prompt in `IMAGE_PROMPTS.md` when one is available.
- The owner's supplied photos also included a pizza box bearing a real hand-drawn **Pinocchio mascot logo** (green/red cartoon boy with a pizza), not currently used anywhere on the page since no logo asset was scoped into this build — worth a follow-up to incorporate as an actual brand mark instead of the current wordmark-only header/footer.
- No online ordering/reservation system is wired up — CTAs route to `tel:` and a Google Maps search link only, per confirmed product scope.
- This DESIGN.md was authored in-thread rather than by the dedicated documenter subagent, and the finish check was a self-review (screenshot pass + the mechanical `detect.mjs` scan) rather than the full multi-agent finish-reviewer pipeline, since the visual direction was pinned directly by the user's reference image and the build stayed code-led (no image generation available in this session). Disclosed per the skill's substitution rule.
