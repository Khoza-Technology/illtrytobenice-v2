# Build Contract (shared by all contributors / agents)

Static recipe site "I'll Try To Be Nice". Vanilla HTML/CSS/JS, **zero dependencies** (no npm packages, no CDNs, no external fonts). Node ≥20 built-ins only for scripts. Served from GitHub Pages at `basePath` from `site.config.json` (currently `/illtrytobenice-v2/`).

## Product decisions (locked)
- Aesthetic: **Recipe Box** — warm index cards, paper texture feel, tabbed category dividers, and a calm table-focused recipe index (no illustrations). Poppins (self-hosted, 400/500/600/700 + 400 italic in `src/assets/fonts/`).
- Palette — Light: bg `#FBF6EE`, surface `#FFFFFF`, ink `#2B2118`, accent terracotta `#C8553D`. Dark: bg `#1C1612`, surface `#27201A`, ink `#F3EADF`, accent `#E07A5F`. Theme defaults to `prefers-color-scheme`; user toggle cycles system → light → dark, persisted.
- Mobile first: bottom tab bar (Recipes · Search · Favorites · List w/ count badge); becomes top header nav ≥ 900px. Recipe pages get a sticky bottom action bar (Add to list · Cook · Favorite).
- Home: search-first — big search field, "Surprise me", category tab-dividers, then the recipe table ("All recipes") with result count, sort (A–Z / Newest / Quickest; column headers on desktop) and contributor filter chips. "Recently added" is the table's **Newest** sort and **Added** column, not a separate section. `/search/` uses the same search field, divider tabs (filtering in place) and browse section.
- Features: instant search (title, ingredients, contributor, category, cuisine), category & contributor pages, favorites, serving scaler (½×,1×,2×,3× and ± servings when known), ingredient checkboxes, cook mode (fullscreen steps, big text, Wake Lock, tap step to complete, prev/next), print stylesheet, shopping list (grouped-by-recipe default + "Combine" toggle that merges like items), export via Web Share API (Keep on phones) with fallback copy-to-clipboard + open https://keep.google.com + toast.
- No photos survive from the source, and recipes have **no illustrations**: browsing is the recipe table, recipe pages open with a typographic header. Category identity is a small tint only (divider tabs, category badges, a thin rule on each table row). Recipes may gain `images[]` later — when `images[0]` exists (and the file is in `src/`), the table row shows a small thumbnail and the recipe header a photo column; otherwise nothing renders.
- No offline/service worker in v1.

## Repo layout & ownership
```
site.config.json            site title, basePath, siteUrl
data/                       CANONICAL DATA (source of truth, hand-editable JSON)
  recipes.json              { schemaVersion, generatedAt, count, recipes: Recipe[] }
  recipes/<slug>.json       { schemaVersion, recipe: Recipe }
  categories.json           { schemaVersion, categories: [{id,name,count}] }
  contributors.json         { schemaVersion, contributors: [{id,name,count}] }
scripts/scrape.mjs          (done) re-scrape WordPress → data/
scripts/build.mjs           data + templates → dist/            [Agent: site]
scripts/templates/*.mjs     page templates (template literals)    [Agent: site]
scripts/serve.mjs           local static server for dist/        [lead]
src/assets/css/ds/*.css     GLOBAL DESIGN SYSTEM CSS             [Agent: design-system]
src/assets/js/ds/*.js       GLOBAL DESIGN SYSTEM JS (ES modules) [Agent: design-system]
src/assets/img/icons.svg    SVG sprite                           [Agent: design-system]
src/styleguide/index.html   living style guide page              [Agent: design-system]
src/assets/css/app.css      page-specific CSS (small; prefer DS) [Agent: site]
src/assets/js/app/*.js      page feature modules                 [Agent: site]
src/assets/js/app/markup.js shared pure markup (recipe table) for build AND browser
src/assets/js/app/ingredients.js  parse/scale/merge logic         [Agent: site]
.github/workflows/pages.yml, AGENTS.md, README.md                [lead]
```
Build copies `src/` → `dist/` verbatim (except `.html` files get `{{BASE}}` replaced with basePath), then writes generated pages and `dist/api/`.

## Recipe schema (data/recipes.json → recipes[])
```jsonc
{
  "id": "banana-bread", "slug": "banana-bread", "title": "Banana Bread",
  "summary": null | "string",
  "contributor": "amy",                 // → contributors.json id
  "categories": ["bread"],              // → categories.json ids; may be []
  "cuisine": null | "American",
  "times": { "prep"?: T, "cook"?: T, "total"?: T },   // T = { iso:"PT50M", minutes:50, label:"50 mins" }
  "servings": null | { "label": "14", "count": 14 | null },
  "ingredients": [{ "type": "item" | "heading", "text": "¼ cup maple syrup" }],
  "instructions": [{ "type": "step" | "heading", "text": "..." }],   // may be []
  "notes": null | "string",
  "images": [{ "src": "assets/img/recipes/x.jpg", "alt": "..." }],   // currently all []
  "published": ISO, "modified": ISO,
  "source": { "wpId": 585, "url": "...", "html": "...", "lostImages"?: [url] }
}
```
Recipes with no category use the `misc` tint. Category ids: bread, breakfast, dessert, dinner, lunch, sauce, sides.

## Public JSON API (generated into dist/api/, mirrors data/)
- `api/recipes.json` — full list **without** `source.html`
- `api/recipes/<slug>.json` — `{ schemaVersion, recipe }` without `source.html`
- `api/categories.json`, `api/contributors.json`
- `api/index.json` — lightweight search index: `{ schemaVersion, recipes: [{ slug, title, contributor, categories, cuisine, totalMinutes, published, ingredients: "lowercased joined text", url }] }`
- `api/site.json` — `{ title, basePath, generatedAt, counts }`

## Routes (all under basePath, trailing-slash dirs with index.html)
`/` home · `/recipes/<slug>/` · `/category/<id>/` · `/by/<contributor>/` · `/search/` (same UI as home search, focused, reads `?q=`) · `/favorites/` · `/list/` · `/styleguide/` · `/404.html`, plus `sitemap.xml`, `robots.txt`, `.nojekyll`.

Every page: `<html lang="en" data-base="{{BASE}}" data-page="home|recipe|category|contributor|search|favorites|list|styleguide|404">`.
An inline `<head>` script (from DS: `ds/theme-boot` snippet, inlined by build) sets `data-theme` before paint to avoid flash.

## Design system API (must exist; others build on it)
CSS load order (build concatenates into `assets/css/site.css`): `ds/fonts.css, ds/tokens.css, ds/base.css, ds/layout.css, ds/components.css, ds/utilities.css, ds/print.css, app.css`.

Tokens: CSS custom properties on `:root`, overridden for dark via `[data-theme="dark"]` AND `@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) {...} }`. Names: `--color-bg, --color-surface, --color-surface-2, --color-ink, --color-ink-muted, --color-line, --color-accent, --color-accent-ink, --color-accent-soft, --color-success, --color-danger`, category tints `--cat-bread, --cat-breakfast, --cat-dessert, --cat-dinner, --cat-lunch, --cat-sauce, --cat-sides, --cat-misc`; `--font-sans`; type scale `--step--1 … --step-5` (fluid clamp); space `--space-3xs … --space-3xl`; `--radius-s|m|l|pill`; `--shadow-1|2|3`; `--ease-out`, `--dur-fast|base|slow`; `--tabbar-h`, `--header-h`, `--safe-bottom: env(safe-area-inset-bottom)`.

Component classes (BEM-ish). Agents must use these, not invent parallel ones:
- Layout: `.container`, `.page`, `.stack` (`--gap` var), `.cluster`, `.section`, `.section__head`, `.section__title`, `.page__head` (`__back`, `__title`, `__meta`, `__intro`) on every top-level page
- Chrome: `.app-header` (`.app-header__brand`, `.app-header__nav`, `.app-header__actions`), `.tabbar` (`.tabbar__item[aria-current="page"]`, `.tabbar__badge`), `.action-bar` (sticky bottom, sits above tabbar on mobile)
- Controls: `.btn` + `.btn--primary|--secondary|--ghost|--icon|--sm|--lg|--block`; `.button-row` (even row of equal-width buttons); `.chip` (toggle via `aria-pressed="true"`), `.chip-row` (horizontal scroll on mobile); `.segmented` (`.segmented__option[aria-pressed]`); `.stepper` (`.stepper__btn`, `.stepper__value`); `.search-field` (`.search-field__input`, `.search-field__icon`, `.search-field__clear`); `.switch`; `.input`
- Content: `.card`; `.recipe-table` — the recipe index, rendered ONLY by `recipeTableHTML()` in `src/assets/js/app/markup.js` (build and browser share it): a semantic `<table>` with columns Recipe · From · Category · Time · Added (≥900px) · favorite heart, sortable headers (`aria-sort`), stretched title link; below 640px and with `--compact` the same markup shows list rows (title + `.dot-list` meta + heart); `.divider-tabs` (`.divider-tab[aria-current]`, index-card tab look, horizontal scroll); `.badge`; `.meta-list` (`.meta-list__item` icon+label); `.checklist` (`.check-item`, `.check-item__box`, `.check-item__label`, `.check-item--done`; also `.check-item--heading`); `.steps` (`.step`, `.step__num`, `.step--done`, `.steps__heading`); `.facts` (label/value `<dl>`); `.empty-state` (`__icon`, `__title`, `__text`); `.recipe-hero` (`__photo` only with a photo, `__kicker`, `__title`, `__summary`, `__facts`)
- Overlays: `.sheet` (bottom sheet on mobile / centered dialog desktop, built on `<dialog>`), `.toast-region`/`.toast`, `.cook-mode` (fullscreen overlay)
- Utilities: `.visually-hidden`, `.hide-mobile`, `.hide-desktop`, `.text-muted`, `.truncate`
- Icons: `<svg class="icon" aria-hidden="true"><use href="{{BASE}}assets/img/icons.svg#i-NAME"/></svg>`. Required ids: `i-book i-search i-heart i-heart-fill i-cart i-sun i-moon i-auto i-plus i-minus i-check i-x i-share i-copy i-chef i-clock i-users i-shuffle i-print i-trash i-arrow-left i-arrow-right i-chevron-right i-chevron-down i-filter i-list i-merge i-sparkle i-utensils`

DS JavaScript (`src/assets/js/ds/index.js` re-exports all):
- `dom.js`: `$`, `$$`, `on(el, evt, selectorOrHandler, handler?)` (delegation), `h(tag, attrs, ...children)`, `base()` → `document.documentElement.dataset.base`, `url(path)` → base + path
- `store.js`: JSON state in localStorage key `itbn:state`, versioned, migration hook, cross-tab sync via `storage` event, try/catch everywhere with in-memory fallback. API: `store.get(path)`, `store.set(path, value)`, `store.update(path, fn)`, `store.subscribe(path, cb) → unsubscribe`, `store.export() → JSON string`, `store.import(json)`. Paths are dot strings.
- `theme.js`: `initTheme()`, `cycleTheme()`, `getTheme()`; binds any `[data-theme-toggle]` button, swaps its icon (`i-auto|i-sun|i-moon`) and `aria-label`; updates `<meta name="theme-color">`. Exports `THEME_BOOT` string (inline head snippet).
- `toast.js`: `toast(message, { action?: {label, onClick}, duration?, icon? })` — favorite toggles always offer Undo; desktop toasts align to the container edge
- `sheet.js`: `openSheet({ title, content: Node|string, actions? }) → { close }`, also auto-binds `[data-sheet-open="#id"]` for prebuilt `<dialog class="sheet">`
- `share.js`: `shareText({ title, text })` → tries `navigator.share`, else copies via `navigator.clipboard` (with execCommand fallback); returns `'shared'|'copied'|'failed'`
- `wakelock.js`: `keepAwake() → release()`
- `motion.js`: `prefersReducedMotion()`, `viewTransition(fn)` (uses `document.startViewTransition` when available)
- `index.js`: `initDS()` — inits theme, sheets, active tabbar item, toast region; called by every page.

## App state shape (`itbn:state`)
```jsonc
{
  "schemaVersion": 1,
  "theme": "system" | "light" | "dark",
  "favorites": ["slug", ...],
  "list": {
    "view": "grouped" | "combined",
    "items": [{ "id": "uuid", "text": "1 ½ cups flour", "recipe": "slug" | null, "recipeTitle": "..." | null,
                "scale": 1, "checked": false, "addedAt": ISO }]
  },
  "checks": { "<slug>": [ingredientIndex, ...] },
  "servings": { "<slug>": 2 }        // chosen multiplier
}
```
This shape is the future sync/API payload — keep it plain JSON, no class instances, no functions.

## Quality bar
- Mobile first at 360–430px; tap targets ≥ 44px; respects safe areas; no horizontal page scroll.
- Works without JS for reading recipes (pre-rendered HTML); JS enhances.
- Accessible: semantic landmarks, labels, focus-visible rings, `aria-pressed/current`, keyboard everything, `prefers-reduced-motion`.
- Light + dark both polished; contrast ≥ 4.5:1 for text.
- No console errors. No external network requests at all.
