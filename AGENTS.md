# AGENTS.md

Guidance for AI agents and humans changing this repo. Read this file fully before editing.

## What this is
"I'll Try To Be Nice" — a static family recipe site (archived from the old WordPress site at khoza.com/recipes) deployed to GitHub Pages. Vanilla HTML, CSS and JavaScript.

## Hard rules
1. **Zero dependencies.** No npm packages, no CDNs, no external fonts, scripts, analytics or images. Scripts use Node ≥20 built-ins only. The site must make no network requests to other hosts (the only outbound link is the Keep export opening keep.google.com).
2. **Use the global design system for every UI change.** Read `docs/DESIGN-SYSTEM.md` first.
   - Colors, type, spacing, radii, shadows, motion: use the tokens in `src/assets/css/ds/tokens.css` (`var(--color-*)`, `var(--step-*)`, `var(--space-*)`, …). Never hardcode hex values, px font sizes or ad-hoc shadows outside `tokens.css`.
   - Markup: compose existing components (`.btn`, `.chip`, `.card`, `.recipe-table` via `recipeTableHTML()`, `.sheet`, `.checklist`, `.steps`, `.segmented`, …). Do not create parallel one-off versions.
   - Behavior: use the DS JS modules from `src/assets/js/ds/index.js` (`store`, `toast`, `openSheet`, `shareText`, `keepAwake`, `$`, `h`, `url`, …) instead of re-implementing them.
   - Icons come from the sprite `src/assets/img/icons.svg`; add new symbols there in the same stroke style.
   - If something generic is missing, **extend the design system** (tokens/components/JS module + `docs/DESIGN-SYSTEM.md` + `/styleguide/` demo) rather than styling it locally. `src/assets/css/app.css` is only for page-specific layout glue.
3. **Data is JSON.** `data/` is the source of truth (see schema in `docs/CONTRACT.md`). The build republishes it as a read-only JSON API under `/api/`. Browser state lives in one versioned JSON object (`itbn:state`, via `store`); bump `schemaVersion` and add a migration in `store.js` when its shape changes.
4. **Never hardcode the base path.** Templates use `config.basePath`; static HTML uses `{{BASE}}`; JS uses `url()` / `base()` from `ds/dom.js`.
5. **Mobile first, both themes.** Every change must look right at 360px wide and in light and dark mode, keep tap targets ≥44px, respect safe areas and `prefers-reduced-motion`, and stay keyboard and screen-reader accessible.
6. Pages must remain readable without JavaScript (pre-rendered HTML); JS only enhances.
7. No illustrations or decorative artwork. Recipes are browsed in the recipe table; a real photo renders only when a recipe has `images[0]`.

## Layout
| Path | Purpose |
| --- | --- |
| `site.config.json` | title, `basePath`, `siteUrl` |
| `data/` | canonical recipe/category/contributor JSON |
| `scripts/build.mjs`, `scripts/templates/` | static site generator → `dist/` |
| `scripts/scrape.mjs` | re-import from the WordPress REST API |
| `scripts/serve.mjs` | local server mounted at `basePath` |
| `scripts/test-ingredients.mjs` | ingredient parse/scale/merge tests |
| `src/assets/css/ds/`, `src/assets/js/ds/` | **global design system** |
| `src/assets/js/app/` | page features (home, recipe, list, …) |
| `src/styleguide/` | living style guide at `/styleguide/` |
| `docs/DESIGN-SYSTEM.md` | design system reference |
| `docs/CONTRACT.md` | architecture, schema, routes, state shape |

## Workflow
```sh
npm run dev                 # build + serve at http://localhost:4173/illtrytobenice-v2/
node scripts/test-ingredients.mjs
node scripts/build.mjs
```
- Adding or editing a recipe: edit `data/recipes.json` **and** `data/recipes/<slug>.json` (keep them in sync), then build.
- Pushing to `main` deploys via `.github/workflows/pages.yml`.
- Before finishing UI work: build, view the affected pages at 375px and desktop in both themes, check `/styleguide/` still renders, and confirm there are no console errors.
