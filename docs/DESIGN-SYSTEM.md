# Design System — "Recipe Box"

The single source of truth for how *I'll Try To Be Nice* looks and behaves. **Build every page from these primitives only.** If something you need is missing, add it to the design system (CSS in `src/assets/css/ds/`, JS in `src/assets/js/ds/`, a demo in `src/styleguide/index.html`, and a section in this file) — never invent a parallel class in `app.css`.

Live demo of everything below: `/styleguide/` (source `src/styleguide/index.html`).

---

## 1. Principles

1. **Index cards in a recipe box.** Cream paper page, white cards with soft warm shadows, a terracotta rule along the top edge of every card, faint blue ruling in card bodies, and category dividers that look like recipe-box tabs. The look is nostalgic; the execution stays modern and quiet.
2. **One accent.** Terracotta is the only brand color. Category tints are for *identifying* categories (divider tabs, category badges, the thin rule on recipe rows), never decoration.
3. **Mobile first.** Design at 360–430px. Bottom tab bar, thumb-reachable actions, 44px tap targets. Desktop (≥900px) moves nav to the header and actions inline.
4. **Type does the work.** Poppins only. Bold 700 titles with tight tracking, 500 labels, 400 body. No other fonts, no icon fonts.
5. **Both themes are first-class.** Every color is a token; light and dark are both tuned and every text pair meets WCAG AA (≥4.5:1). Dark mode is espresso, never pure black; tints are desaturated so they don't glow.
6. **Motion is a garnish.** Press-scale on buttons/cards, a springy sheet, a sliding toast, a short theme cross-fade. All of it disappears under `prefers-reduced-motion`.
7. **Zero dependencies, no network.** Self-hosted fonts, an SVG sprite, CSS gradients for texture. No images for chrome.
8. **Type and tables, not illustrations.** Recipes have no artwork. Browsing is a calm, scannable index (`.recipe-table`); recipe pages open with a typographic header. A real photo appears only when a recipe has `images[0]`.

---

## 2. Files & load order

| File | Purpose |
|---|---|
| `css/ds/fonts.css` | `@font-face` for Poppins 400/400i/500/600/700 (`font-display: swap`). URLs are relative to `assets/css/site.css`. |
| `css/ds/tokens.css` | All custom properties, light + dark, `[data-cat]` hooks, reduced-motion overrides. |
| `js/app/markup.js` | Pure markup helpers shared by the build (Node) and the browser: `recipeTableHTML()`, `recipeRowHTML()`, `favButtonHTML()`, `icon()`, `esc()`. |
| `css/ds/base.css` | Reset, body paper texture, headings, links, focus ring, theme transition, body bottom clearance. |
| `css/ds/layout.css` | `.container .page .stack .cluster .section* .page__head`, `.app-header`, `.tabbar`, `.action-bar`. |
| `css/ds/components.css` | Every component (buttons → cook mode). |
| `css/ds/utilities.css` | `.visually-hidden .skip-link .hide-mobile .hide-desktop .text-muted .text-accent .text-center .truncate .flow .tabular`. |
| `css/ds/print.css` | `@media print` rules. |
| `js/ds/*.js` | ES modules; import everything from `js/ds/index.js`. |
| `img/icons.svg` | Icon sprite. |

Build concatenates `fonts, tokens, base, layout, components, utilities, print, app.css` → `assets/css/site.css`.

### Page skeleton (every page)

```html
<!doctype html>
<html lang="en" data-base="{{BASE}}" data-page="recipe">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <meta name="theme-color" content="#FBF6EE">
  <script>/* THEME_BOOT from js/ds/theme.js, inlined by the build */</script>
  <link rel="stylesheet" href="{{BASE}}assets/css/site.css">
</head>
<body>
  <a class="skip-link" href="#main">Skip to content</a>
  <header class="app-header">…</header>
  <main id="main" class="page container">…</main>
  <!-- recipe pages only --> <div class="action-bar" role="toolbar" aria-label="Recipe actions">…</div>
  <nav class="tabbar" aria-label="Primary">…</nav>
  <script type="module">
    import { initDS } from '{{BASE}}assets/js/ds/index.js';
    initDS();
  </script>
</body>
</html>
```

`viewport-fit=cover` is required for the safe-area padding on the tab bar.

---

## 3. Tokens

All tokens live on `:root`. Dark values apply via `html[data-theme="dark"]` **or** `@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) }`. `data-theme="light"|"dark"` also works on any element, so a panel can force a theme (the style guide uses this to show components in both themes side by side). Never hard-code a color, size, radius, shadow or duration in page CSS — use a token.

### 3.1 Color

| Token | Light | Dark | Use |
|---|---|---|---|
| `--color-bg` | `#FBF6EE` | `#1C1612` | Page (paper) |
| `--color-surface` | `#FFFFFF` | `#27201A` | Cards, sheets, inputs |
| `--color-surface-2` | `#F5EDE1` | `#312820` | Hover fills, segmented track, recessed areas |
| `--color-ink` | `#2B2118` | `#F3EADF` | Body text, headings |
| `--color-ink-muted` | `#6B5B4D` | `#B8A897` | Secondary text, meta, placeholders |
| `--color-line` | `#E7DCCB` | `#3E342B` | Hairlines, card/section borders |
| `--color-line-strong` | `#D4C4AE` | `#54473B` | Input/chip borders, divider-tab baseline |
| `--color-rule` | `rgba(110,140,170,.14)` | `rgba(190,210,230,.06)` | Faint blue index-card ruling |
| `--color-accent` | `#C8553D` | `#E07A5F` | Brand **fill**: icons, card top rule, focus ring, borders, large text only |
| `--color-accent-strong` | `#A9432E` | `#E07A5F` | Accent **text** (links, kickers) and primary button fill |
| `--color-accent-ink` | `#FFFFFF` | `#1C1612` | Text/icons on `--color-accent-strong` |
| `--color-accent-soft` | `#F8E4DC` | `#3A251E` | Selected chip/nav pill, `::selection`, focus halo |
| `--color-success` | `#3F7D4E` | `#7FBF8E` | Success text/borders |
| `--color-danger` | `#B3261E` | `#F08A80` | Errors, destructive text |
| `--color-inverse` | `#2B2118` | `#F3EADF` | Toast surface |
| `--color-inverse-ink` | `#FBF6EE` | `#1C1612` | Toast text |
| `--color-inverse-accent` | `#F0A58E` | `#A9432E` | Toast action button |
| `--color-scrim` | `rgba(43,33,24,.45)` | `rgba(8,5,3,.62)` | Sheet backdrop |
| `--color-frost` | `rgba(255,255,255,.95)` | `rgba(39,32,26,.95)` | Tab bar / action bar surface (near-opaque so content never reads through labels; blur on top) |
| `--color-focus` | = `--color-accent` | = `--color-accent` | Focus outline |

> **Why two accents?** The locked brand terracotta `#C8553D` is only 4.05:1 on the cream page, which fails AA for normal text. Use `--color-accent` for fills/icons/borders and `--color-accent-strong` whenever the accent is *text* or the *background behind text*.

**Verified contrast (WCAG 2.1):** light — ink/bg 14.6, muted/bg 6.0, muted/surface-2 5.6, accent-strong/bg 5.5, white/accent-strong 5.9, accent-strong/accent-soft 4.85, success 4.9, danger 6.5, ink on every tint ≥10.2. Dark — ink/bg 15.0, muted/surface 6.95, accent/surface 5.4, dark ink/accent 6.1, accent/accent-soft 4.86, ink on every tint ≥8.6.

### 3.2 Category tints

| Token | Light | Dark | Category |
|---|---|---|---|
| `--cat-bread` | `#F3DDB8` | `#4A3B28` | Bread (wheat) |
| `--cat-breakfast` | `#FBE7A6` | `#4A4024` | Breakfast (yolk) |
| `--cat-dessert` | `#F6D3D8` | `#4A3036` | Dessert (strawberry milk) |
| `--cat-dinner` | `#F0CDB4` | `#4C3326` | Dinner (clay) |
| `--cat-lunch` | `#CFE0EA` | `#2E3E45` | Lunch (picnic sky) |
| `--cat-sauce` | `#F5C5BC` | `#4C2D29` | Sauce (tomato) |
| `--cat-sides` | `#CFE3D0` | `#2F4232` | Sides (sage) |
| `--cat-misc` | `#E6DDD0` | `#3B342C` | No category (kraft) |

Components read a local `--cat` property. Set it with **`data-cat="<id>"`** (preferred) or inline `style="--cat: var(--cat-bread)"` (recipe-table rows use the inline form, because `data-cat` is the category *filter* hook in browse.js). Unknown/missing → misc. A recipe row uses its **first** category; recipes with `categories: []` use `misc` (kraft).

### 3.3 Typography

`--font-sans`: Poppins, then system fallbacks. Weights: `--weight-regular 400`, `--weight-medium 500`, `--weight-semibold 600`, `--weight-bold 700`. Leading: `--leading-tight 1.15`, `--leading-snug 1.3`, `--leading-body 1.6`. Tracking: `--tracking-tight -0.022em`, `--tracking-title -0.03em`, `--tracking-label 0.01em`, `--tracking-caps 0.08em` (uppercase kickers).

Fluid scale (360px → 1280px):

| Token | Size | Default use |
|---|---|---|
| `--step-5` | 38 → 62px | Recipe title (`.recipe-hero__title`) |
| `--step-4` | 32 → 48px | `h1`, `.page__title` |
| `--step-3` | 26 → 36px | `h2`, cook-mode step (all widths) |
| `--step-2` | 22 → 27px | `.section__title`, empty-state title |
| `--step-1` | 18 → 21px | `h3`, card titles, brand, lead text |

Recipe-table titles use `--step-0` semibold; table headers and `.facts` labels use 0.75rem caps (`--tracking-caps`).
| `--step-0` | 16 → 17px | Body |
| `--step--1` | 13 → 14px | UI labels, buttons, meta, chips |

Headings use `text-wrap: balance`; paragraphs cap at `--measure` (68ch).

### 3.4 Space

`--space-3xs` 4 · `--space-2xs` 8 · `--space-xs` 12 · `--space-s` 16 · `--space-m` 24 · `--space-l` 32 · `--space-xl` 48 · `--space-2xl` 64 · `--space-3xl` 80px (each grows slightly with viewport). `--gutter` = `--space-s` (page side padding).

### 3.5 Shape, elevation, motion, chrome

| Token | Value |
|---|---|
| `--radius-s / -m / -l / -pill` | 8 / 12 / 20 / 999px |
| `--shadow-1` | Resting cards, the recipe table, secondary buttons |
| `--shadow-2` | Large search field, focus lift |
| `--shadow-3` | Hovered cards, sheets, toasts |
| `--shadow-inset-top` | 1px top highlight that lifts cards in dark mode (no-op in light) |
| `--ease-out` | `cubic-bezier(.22,1,.36,1)` — default |
| `--ease-spring` | `cubic-bezier(.34,1.4,.64,1)` — sheet/toast/toggles |
| `--ease-in` | exits |
| `--dur-fast / -base / -slow` | 120 / 220 / 380ms (1ms under reduced motion) |
| `--press-scale` | .97 (1 under reduced motion) |
| `--header-h` | 60px |
| `--tabbar-h` | 64px (plus `--safe-bottom`) |
| `--action-bar-h` | 72px |
| `--safe-bottom` / `--safe-top` | `env(safe-area-inset-*)` |
| `--tap-min` | 44px — height/width of every interactive control on touch and below 900px. `--tap` is a legacy alias. |
| `--control-md` | 40px — chip / segmented visual height, **fine pointers ≥900px only** (44px hit area kept via `::after`) |
| `--control-sm` | 36px — `.btn--sm` visual height, **fine pointers ≥900px only** (44px hit area kept via `::after`) |
| `--cook-width` | 960px — cook-mode bar / progress / nav max width |
| `--measure-cook` | 26ch — cook-mode step measure (in `ch` of the step font, so it scales with the type) |
| `--bar-shadow` | Upward shadow under the tab bar / action bar |
| `--container / --container-narrow` | 1200 / 760px (narrow = reading measure for page *content*; page titles and strips stay on `.container` edges) |
| `--z-header / -bars / -cook / -toast` | 20 / 30 / 50 / 70 |

### 3.6 Breakpoints (media queries; CSS vars can't be used in them)

| Width | Change |
|---|---|
| `640px` | `.sheet` becomes a centered dialog; `.card` padding grows; `.recipe-table` shows its header and From / Category / Time columns (list rows below); `.page__head` meta moves onto the title row; `.button-row` buttons lay icon and label side by side |
| `900px` | Tab bar hides, header nav shows; action bar goes inline; chip rows wrap; `.hide-mobile`/`.hide-desktop` switch; `.recipe-table` adds the Added column (and the browse sort control hides — headers sort); `.recipe-hero` gets a photo column only when a photo exists |

---

## 4. Layout primitives

```html
<main id="main" class="page container">            <!-- page padding + centered max width -->
  <section class="section" aria-labelledby="recent-title">
    <div class="section__head">
      <div>
        <span class="section__kicker">Fresh from the box</span>   <!-- optional eyebrow -->
        <h2 class="section__title" id="recent-title">Recently added</h2>
      </div>
      <a class="section__link" href="…">See all <svg class="icon" aria-hidden="true"><use href="{{BASE}}assets/img/icons.svg#i-chevron-right"/></svg></a>
    </div>
    <table class="recipe-table" aria-labelledby="recent-title">…rows…</table>
  </section>
</main>
```

| Class | Behavior |
|---|---|
| `.container` | `width: min(100% - 2*gutter, 1200px)`, centered. `.container--narrow` → 760px (recipe body, list). |
| `.page` | Vertical page padding; the bottom padding (`--space-xl`) is the only gap above the footer. Put on `<main>` with `.container`. |
| `.stack` | Flex column; gap from `--gap` (default `--space-s`). `style="--gap: var(--space-xs)"`. |
| `.cluster` | Wrapping flex row, centered items, gap `--gap` (default `--space-2xs`). Modifiers `--between`, `--end`, `--nowrap`. |
| `.section` | Vertical rhythm between page sections (`--space-l`). |
| `.section__head` / `__kicker` / `__title` / `__link` | Section header row (wraps: a long meta drops below the title instead of squeezing it). Kicker = uppercase accent eyebrow; use only when it says something true (e.g. a category name). |
| `.page__head` / `__back` / `__title` / `__meta` / `__intro` | The one top-of-page header (see below). |

### Page head — `.page__head`

Every top-level page (list, favorites, search results, category, contributor) uses this, inside `.container`, so titles share the container's start edge.

```html
<header class="page__head">
  <p class="page__back"><a href="{{BASE}}">…i-arrow-left… All recipes</a></p>   <!-- optional, 44px tall -->
  <h1 class="page__title">Shopping list</h1>                                      <!-- --step-4 -->
  <p class="page__meta" aria-live="polite">10 items to get · 1 checked</p>         <!-- optional, --step--1 muted -->
  <p class="page__intro">26 recipes filed under dessert.</p>                       <!-- optional -->
  <div class="chip-row">…</div>                                                   <!-- any other child spans full width -->
</header>
```

Below 640px everything stacks (title never shares a row with the meta, so neither wraps awkwardly). From 640px the meta sits on the title's baseline at the end edge. Legacy markup without the element classes still works: a bare `h1` is the title and the `p` right after it is the meta.

**Body clearance is automatic:** `body` gets bottom padding for the tab bar + safe area; pages with `.action-bar` (detected with `:has()`, and also for `html[data-page="recipe"]`) get the action bar height on top. Scrolled to the end, the footer always clears the bars. Don't add your own.

---

## 5. App chrome

### 5.1 Header — `.app-header`

```html
<header class="app-header">
  <a class="app-header__brand" href="{{BASE}}">
    <span class="app-header__mark"><svg class="icon" aria-hidden="true"><use href="{{BASE}}assets/img/icons.svg#i-card"/></svg></span>
    <span class="app-header__name">I'll Try To Be Nice</span>
  </a>
  <nav class="app-header__nav" aria-label="Main">
    <a href="{{BASE}}" data-nav="home"><svg class="icon" aria-hidden="true"><use href="{{BASE}}assets/img/icons.svg#i-book"/></svg>Recipes</a>
    <a href="{{BASE}}search/" data-nav="search">…Search</a>
    <a href="{{BASE}}favorites/" data-nav="favorites">…Favorites</a>
    <a href="{{BASE}}list/" data-nav="list">…<span data-label>List</span><span class="tabbar__badge" data-list-count hidden>0</span></a>
  </nav>
  <div class="app-header__actions">
    <button class="btn btn--icon btn--ghost" type="button" data-theme-toggle aria-label="Theme: System. Switch to light">
      <svg class="icon" aria-hidden="true"><use href="{{BASE}}assets/img/icons.svg#i-auto"/></svg>
    </button>
  </div>
</header>
```

Sticky, frosted (solid fallback). Gets `.is-scrolled` (bottom hairline) once the page scrolls — handled by `initDS()`. `.app-header__nav` is hidden <900px. `initDS()` sets `aria-current="page"` on the matching `[data-nav]`.

### 5.2 Tab bar — `.tabbar` (mobile primary nav)

```html
<nav class="tabbar" aria-label="Primary">
  <a class="tabbar__item" href="{{BASE}}" data-nav="home">
    <span class="tabbar__icon"><svg class="icon" aria-hidden="true"><use href="{{BASE}}assets/img/icons.svg#i-book"/></svg></span>
    <span class="tabbar__label">Recipes</span>
  </a>
  <a class="tabbar__item" href="{{BASE}}search/" data-nav="search">… i-search … Search</a>
  <a class="tabbar__item" href="{{BASE}}favorites/" data-nav="favorites">… i-heart … Favorites</a>
  <a class="tabbar__item" href="{{BASE}}list/" data-nav="list">
    <span class="tabbar__icon">
      <svg class="icon" aria-hidden="true"><use href="{{BASE}}assets/img/icons.svg#i-cart"/></svg>
      <span class="tabbar__badge" data-list-count hidden>0</span>
    </span>
    <span class="tabbar__label">List</span>
  </a>
</nav>
```

- Fixed bottom, `height: calc(var(--tabbar-h) + var(--safe-bottom))`, frosted.
- **Active:** `aria-current="page"` → accent text + soft pill behind the icon. Set by `initDS()` from `html[data-page]`: `home|recipe|category|contributor → home`, `search`, `favorites`, `list`; other pages (styleguide, 404) mark nothing. You may also render `aria-current` server-side.
- **Badge:** any element with `data-list-count` shows the number of *unchecked* list items, hidden at 0, with a bump animation on increase. Put the badge inside `.tabbar__icon`. The host link gets `aria-label="List, 3 unchecked items"` (label read from `.tabbar__label` or `[data-label]`).
- Hidden ≥900px.

### 5.3 Action bar — `.action-bar` (recipe pages)

```html
<div class="action-bar" role="toolbar" aria-label="Recipe actions">
  <button class="btn btn--primary" type="button">…i-cart…<span class="btn__label">Add to list</span></button>
  <button class="btn btn--secondary" type="button">…i-chef…<span class="btn__label">Cook</span></button>
  <button class="btn btn--icon btn--ghost" type="button" aria-pressed="false" aria-label="Favorite">
    <svg class="icon icon--off" aria-hidden="true"><use href="…#i-heart"/></svg>
    <svg class="icon icon--on" aria-hidden="true"><use href="…#i-heart-fill"/></svg>
  </button>
  <button class="btn btn--icon btn--ghost" type="button" aria-label="Share">…i-share…</button>
</div>
```

<900px: fixed directly above the tab bar (`bottom: calc(var(--tabbar-h) + var(--safe-bottom))`), near-opaque `--color-frost`. Order and sizing: **one** `.btn--primary` (flexes to fill), at most one labelled secondary (keeps its natural width; never squeezed under its icon), then `.btn--icon` buttons (fixed `--tap-min` square, same ghost treatment for all). Below 360px labelled secondaries collapse to icon-only — so wrap every label in `<span class="btn__label">` (clipped, not `display:none`, so it stays the accessible name). ≥900px: static inline row in `.recipe-hero__body`. One per page.

---

## 6. Controls

### 6.1 Button — `.btn`

```html
<button class="btn btn--primary" type="button">
  <svg class="icon" aria-hidden="true"><use href="{{BASE}}assets/img/icons.svg#i-cart"/></svg>
  Add to list
</button>
```

| Modifier | Look / use |
|---|---|
| `--primary` | Accent-strong fill, white text. One per view region (the main action). |
| `--secondary` | Card-white with border. Default for most actions. |
| `--ghost` | No chrome until hover. Toolbars, tertiary actions. |
| `--icon` | Square/round `--tap-min` icon-only, zero padding (wins over `--sm`/action-bar padding). **Requires `aria-label`.** |
| `--sm` | Tighter padding + `--radius-s`. Height is `--tap-min` on touch / <900px; `--control-sm` (36px) only for fine pointers ≥900px, hit area still 44px via `::after`. |
| `--lg` | 56px; cook-mode nav, hero CTAs. |
| `--block` | Full width. |

States: `:hover` (only on `(hover: hover)` devices — no sticky hover fill after a tap), `:active` (press scale), `:focus-visible` (accent ring), `:disabled` / `aria-disabled="true"` (45% opacity, no pointer). Toggle buttons use `aria-pressed`; a non-primary pressed button turns accent. Swap icons with `.icon--off` / `.icon--on` (works inside any `[aria-pressed]`). Links styled as buttons: `<a class="btn btn--secondary" href="…">`.

### 6.1b Button row — `.button-row`

```html
<div class="button-row">
  <button class="btn btn--secondary" type="button">…i-copy… <span>Copy list</span></button>
  <button class="btn btn--ghost" type="button">…i-check… <span>Clear checked</span></button>
  <button class="btn btn--ghost" type="button">…i-trash… <span>Clear all</span></button>
</div>
```

An even row of equal-width buttons (grid, one column each). Below 640px each button stacks its icon over its label so three fit side by side at 360px — no lone button wrapping onto its own line. Pair it with a full-width primary above (`.btn--primary.btn--block`), as on the shopping list.

### 6.2 Chip — `.chip` and `.chip-row`

```html
<div class="chip-row" role="group" aria-label="Filter by contributor">
  <button class="chip" type="button" aria-pressed="true">Everyone</button>
  <button class="chip" type="button" aria-pressed="false">Amy <span class="chip__count">64</span></button>
</div>
```

Pill toggles; selected = `aria-pressed="true"` (or `aria-current` when the chip is a link) — both get the same accent-soft fill. **Contributor chips use first names everywhere** (home, search, contributor pages: "Amy", "Genevieve", "Olivia", "Maddy"); full names appear in the recipe table's From column and page titles. Category filtering always uses `.divider-tabs`, never chips. `.chip-row` scrolls horizontally on mobile (full-bleed to the screen edges, scroll-snap, hidden scrollbar, edge fade) and wraps ≥900px. Put a `.chip-row` directly inside a `.container` (it bleeds by `--gutter`).

### 6.3 Segmented — `.segmented`

```html
<div class="segmented" role="group" aria-label="Scale">
  <button class="segmented__option" type="button" aria-pressed="false">½×</button>
  <button class="segmented__option" type="button" aria-pressed="true">1×</button>
  <button class="segmented__option" type="button" aria-pressed="false">2×</button>
  <button class="segmented__option" type="button" aria-pressed="false">3×</button>
</div>
```

Options are `--tap-min` tall on touch / <900px (`--control-md` on fine pointers ≥900px). Exactly one option pressed. Used for scale multipliers, sort (A–Z / Newest), list view (Grouped / Combined). Your JS keeps `aria-pressed` exclusive.

### 6.4 Stepper — `.stepper`

```html
<div class="stepper" role="group" aria-label="Servings">
  <button class="stepper__btn" type="button" aria-label="Fewer servings"><svg class="icon" aria-hidden="true"><use href="…#i-minus"/></svg></button>
  <output class="stepper__value" aria-live="polite">14</output>
  <button class="stepper__btn" type="button" aria-label="More servings"><svg class="icon" aria-hidden="true"><use href="…#i-plus"/></svg></button>
</div>
```

Disable a button at its limit (`disabled`).

### 6.5 Search field — `.search-field`

```html
<div class="search-field search-field--lg" role="search">
  <svg class="icon search-field__icon" aria-hidden="true"><use href="…#i-search"/></svg>
  <input class="search-field__input" type="search" placeholder="Search recipes, ingredients, people" aria-label="Search recipes" autocomplete="off">
  <button class="search-field__clear" type="button" aria-label="Clear search"><svg class="icon" aria-hidden="true"><use href="…#i-x"/></svg></button>
</div>
```

The input **must** have a `placeholder` — the clear button hides itself via `:placeholder-shown` when the field is empty (no JS needed for visibility; your JS clears the value and refocuses). `--lg` for the home/search hero. Native search cancel button is suppressed.

### 6.6 Input — `.input` (+ `.field`)

```html
<label class="field">
  <span class="field__label">Item</span>
  <input class="input" type="text" placeholder="e.g. 2 lemons">
  <span class="field__hint">Added to the bottom of your list.</span>
</label>
<select class="input">…</select>
<textarea class="input"></textarea>
```

Error: `aria-invalid="true"` (danger border). Selects get a drawn caret.

### 6.7 Switch — `.switch`

```html
<label class="switch">
  <input class="switch__input" type="checkbox" role="switch">
  <span>Combine like items</span>
</label>
```

Native checkbox restyled — read `.checked`, listen to `change`.

---

## 7. Content components

### 7.1 Card — `.card`

```html
<div class="card">
  <h3 class="card__title">Notes from Genevieve</h3>
  <p>Freeze overripe bananas in their skins…</p>
</div>
```

White index card, 3px terracotta rule along the top. Modifiers: `--ruled` (blue ruling aligned to a 1.75rem line grid — direct children are snapped to the grid; use for notes), `--flat` (border, no shadow, no rule), `--plain` (shadow, no rule).

### 7.2 Recipe table — `.recipe-table`

The recipe index: home ("All recipes" and filtered results), search, category, contributor and favorites pages, plus "More from <category>" on recipe pages (`--compact`). **Never hand-write it** — render it with `recipeTableHTML(entries, opts)` from `src/assets/js/app/markup.js`, which the build (Node) and JS-rendered pages (favorites, via `renderRecipeTable()` in `app/common.js`) both call, so pre-rendered and JS-rendered rows are byte-identical.

```html
<table class="recipe-table" aria-labelledby="all-h" data-recipe-table>
  <thead><tr>
    <th scope="col" class="recipe-table__title" aria-sort="ascending"><button type="button" class="recipe-table__sort" data-sort="az">Recipe …i-chevron-down…</button></th>
    <th scope="col" class="recipe-table__by">From</th>
    <th scope="col" class="recipe-table__cat">Category</th>
    <th scope="col" class="recipe-table__time"><button type="button" class="recipe-table__sort" data-sort="quick">Time …</button></th>
    <th scope="col" class="recipe-table__added"><button type="button" class="recipe-table__sort" data-sort="new">Added …</button></th>
    <th scope="col" class="recipe-table__fav"><span class="visually-hidden">Favorite</span></th>
  </tr></thead>
  <tbody data-recipe-rows>
    <tr class="recipe-table__row" style="--cat: var(--cat-bread)" data-slug="banana-bread" data-categories="bread" data-contributor="genevieve" data-published="2019-11-02" data-minutes="80" data-cuisine="">
      <th scope="row" class="recipe-table__title">
        <!-- only when the recipe has images[0]: <img class="recipe-table__thumb" src="…" alt="" loading="lazy"> -->
        <span class="recipe-table__name">
          <a class="recipe-table__link" href="{{BASE}}recipes/banana-bread/">Banana Bread</a>
          <ul class="dot-list recipe-table__meta"><li>Genevieve Hammil</li><li>Bread</li><li>1 hr 20 min</li></ul>
        </span>
      </th>
      <td class="recipe-table__by">Genevieve Hammil</td>
      <td class="recipe-table__cat">Bread</td>
      <td class="recipe-table__time">1 hr 20 min</td>
      <td class="recipe-table__added"><time datetime="2019-11-02">Nov 2019</time></td>
      <td class="recipe-table__fav"><button class="btn btn--icon btn--ghost" data-fav="banana-bread" aria-pressed="false" aria-label="Favorite Banana Bread" data-requires-js>…</button></td>
    </tr>
  </tbody>
</table>
```

- **One markup, two layouts.** ≥640px: white panel, uppercase header row, columns Recipe · From · Category · Time · ♥, plus Added ≥900px. Below 640px (and at every width with `.recipe-table--compact`): the header and the From / Category / Time / Added cells are `display:none` and the `.dot-list` meta line under the title shows instead ("From · Category · Time"), with the 44px heart on the right. Whatever is hidden at a size is `display:none`, so assistive tech never hears it twice, and the element stays a native table at every width (no `display` overrides on table parts).
- **Row** — hairlines between rows, whole-row hover tint (`--color-surface-2`), title link **stretched over the row** (one tab stop, focus ring drawn around the row). The heart is a separate button above the link; don't add other interactive elements to a row.
- **Category identity** — a 3px rule on the row's start edge, the first category's tint mixed slightly toward ink so it reads in both themes. Uncategorized = kraft (`misc`).
- **Empty cells** show a muted dash; screen readers hear "Not listed".
- **Sorting** — `opts.sortable` renders header buttons; each column sorts one way (Recipe A–Z ascending, Time quickest ascending, Added newest descending). `th[aria-sort]` marks the active column (accent chevron). browse.js wires them together with the `.segmented` sort control (shown below 900px, where the Added header isn't visible) and keeps `?sort=` in the URL. While searching with no explicit sort, results are best-match first and no column has `aria-sort`.
- `opts`: `{ base, categories, contributors, sortable, sort, compact, caption, labelledby }`. Give the table a name: `labelledby` a visible heading, or a visually-hidden `caption`.
- Hidden rows (`tr[hidden]`) are moved after the visible ones, so the first visible row never draws a top hairline.

### 7.3 Divider tabs — `.divider-tabs`

```html
<nav class="divider-tabs" aria-label="Categories">
  <a class="divider-tab" href="{{BASE}}">All<span class="divider-tab__count">116</span></a>
  <a class="divider-tab" data-cat="bread" href="{{BASE}}category/bread/">Bread<span class="divider-tab__count">7</span></a>
  <a class="divider-tab" data-cat="dessert" href="{{BASE}}category/dessert/" aria-current="page">Dessert<span class="divider-tab__count">26</span></a>
</nav>
```

Alignment: place the strip inside a `.container`, or make it the container itself (`<nav class="divider-tabs container">`). Either way the first tab sits on the content start edge, the baseline rule spans exactly the content width, and on phones the scroll area bleeds one gutter to the screen edge. Tabs are `--tap-min` tall.

The signature element: recipe-box dividers standing on a baseline, rounded top corners, tinted per category, overlapping slightly. The current one (`aria-current="page"` or `aria-current="true"`) is taller, bolder and breaks through the baseline. Scrolls horizontally with snap + edge fade at every width. Use for category navigation (home, category pages) — not for generic tabs.

### 7.4 Badge — `.badge`

```html
<span class="badge">American</span>
<span class="badge badge--accent">New</span>
<a class="badge badge--cat" data-cat="dessert" href="…">Dessert</a>
<span class="badge badge--outline">Gluten free</span>
<span class="badge badge--success"><svg class="icon" …#i-check/>Added</span>
```

Small pill labels (cuisine, category, status). Not interactive unless it's an `<a>`.

### 7.5 Meta list — `.meta-list`

```html
<ul class="meta-list">
  <li class="meta-list__item"><svg class="icon" aria-hidden="true"><use href="…#i-users"/></svg>By <a href="{{BASE}}by/genevieve/">Genevieve</a></li>
  <li class="meta-list__item"><svg class="icon" aria-hidden="true"><use href="…#i-clock"/></svg>Prep <strong>15 mins</strong></li>
  <li class="meta-list__item"><svg class="icon" aria-hidden="true"><use href="…#i-utensils"/></svg>Serves <strong>14</strong></li>
</ul>
```

Icon (accent) + muted label + `<strong>` value. Inline icon-led metadata.

### 7.5b Facts — `.facts`

```html
<dl class="facts">
  <div class="facts__item"><dt class="facts__label">From</dt><dd class="facts__value"><a href="{{BASE}}by/amy/">Amy Simonsen</a></dd></div>
  <div class="facts__item"><dt class="facts__label">Total</dt><dd class="facts__value">50 mins</dd></div>
  <div class="facts__item"><dt class="facts__label">Serves</dt><dd class="facts__value">4</dd></div>
</dl>
```

Small-caps label over a value, like one row of the recipe index; wraps freely. Used for the recipe header (From, Prep, Cook, Total, Serves/Makes, Cuisine). A link inside a value keeps a 44px hit area without changing the line height.

### 7.6 Dot list — `.dot-list`

```html
<ul class="dot-list"><li>Amy Simonsen</li><li>Dessert</li><li>…i-clock…50 min</li></ul>
```

Inline items separated by a small centred dot. Wraps freely and **a dot never starts or ends a line**: each item carries its dot in a leading gutter (`--dot-gap`, default `--space-xs`), the list is shifted left by that gutter and clipped there, so whichever item begins a line loses its dot. Inherits font size/colour from context. It is the recipe table's mobile meta line.

### 7.6 Checklist — `.checklist` (ingredients, shopping list)

```html
<ul class="checklist">
  <li class="check-item check-item--heading">For the dough</li>
  <li>
    <label class="check-item">
      <input class="check-item__input" type="checkbox" data-index="0">
      <span class="check-item__box" aria-hidden="true"></span>
      <span class="check-item__label">2 cups all-purpose flour</span>
      <span class="check-item__aside">Banana Bread</span>   <!-- optional right column -->
    </label>
  </li>
</ul>
```

- Real checkbox (keyboard/AT friendly), visually replaced by `__box`.
- Done state styles automatically when the input is `:checked`; also add `.check-item--done` from JS (for browsers without `:has`, and for restored state).
- Done = filled accent box with check, label muted with an accent strike-through.
- **Selection lists** (checked = "include", e.g. the add-to-list sheet): add `.checklist--select` (or `.check-item--select` on one item) — no strike-through, ink stays full strength. A `.checklist` inside a `.sheet` behaves this way by default.
- Headings: `<li class="check-item check-item--heading">` (uppercase accent kicker). Ingredients with `type: "heading"` render as these.
- Print: two columns, plain boxes.

### 7.7 Steps — `.steps`

```html
<ol class="steps">
  <li class="steps__heading">Bake</li>
  <li class="step" tabindex="0" role="button" aria-pressed="false">
    <span class="step__num" aria-hidden="true"></span>   <!-- empty = auto-numbered (headings skipped) -->
    <p class="step__text">Preheat oven to 350°F…</p>
  </li>
</ol>
```

Numbered circles via CSS counter (or put the number in `__num` yourself). `.step--done` (or `[data-done]`) → the number becomes a check on a filled accent disc; text muted but still AA. Make steps tappable only if the feature exists (add `tabindex="0"` and handle Enter/Space). Instructions with `type: "heading"` render as `.steps__heading`.

### 7.8 Empty state — `.empty-state`

```html
<div class="empty-state">
  <div class="empty-state__icon"><svg class="icon" aria-hidden="true"><use href="{{BASE}}assets/img/icons.svg#i-heart"/></svg></div>
  <h2 class="empty-state__title">No favorites yet</h2>
  <p class="empty-state__text">Tap the heart on any recipe to keep it here.</p>
  <div class="cluster"><a class="btn btn--primary" href="{{BASE}}">Browse recipes</a></div>
</div>
```

One sprite icon on a quiet accent-soft disc (no illustrations). Copy rule: say what to do next, not how you feel. Search empty: "No recipes match "{q}". Try an ingredient, like *butter*."

### 7.9 Recipe hero — `.recipe-hero`

```html
<header class="recipe-hero">
  <!-- only when images[0] exists: <figure class="recipe-hero__photo"><img src="…" alt="…"></figure> -->
  <div class="recipe-hero__body">
    <p class="recipe-hero__kicker"><a class="badge badge--cat" data-cat="bread" href="{{BASE}}category/bread/">Bread</a></p>
    <h1 class="recipe-hero__title">Banana Banana Bread</h1>
    <p class="recipe-hero__summary">…</p>              <!-- only if summary exists -->
    <dl class="facts recipe-hero__facts">…From · Prep · Cook · Total · Serves · Cuisine…</dl>
    <div class="action-bar" role="toolbar" aria-label="Recipe actions">…</div>
  </div>
</header>
```

A calm, typographic header on the container grid: category badge, `--step-5` title (max 22ch), optional summary, a `.facts` strip and the action bar, closed by the same 2px `--color-line-strong` rule the divider tabs stand on. No artwork. With a photo, ≥900px splits text (7fr) / photo (5fr, 4:3).

---

## 8. Overlays

### 8.1 Sheet — `<dialog class="sheet">`

Bottom sheet with grab handle on mobile; centered modal ≥640px; dimmed, lightly blurred `::backdrop`. Springs up on open, slides down on close. Esc and backdrop-click close it; focus returns to the opener. Page scroll is locked while open.

```html
<button class="btn btn--secondary" type="button" data-sheet-open="#scale-sheet">Scale</button>

<dialog class="sheet" id="scale-sheet" aria-labelledby="scale-sheet-title">
  <header class="sheet__head">
    <h2 class="sheet__title" id="scale-sheet-title">Scale this recipe</h2>
    <button class="btn btn--icon btn--ghost sheet__close" type="button" data-sheet-close aria-label="Close">…i-x…</button>
  </header>
  <div class="sheet__body">…</div>
  <footer class="sheet__actions">
    <button class="btn btn--secondary" type="button" data-sheet-close>Cancel</button>
    <button class="btn btn--primary" type="button" data-sheet-close value="apply">Apply</button>
  </footer>
</dialog>
```

`[data-sheet-open]`/`[data-sheet-close]` are wired by `initDS()`. Listen for the dialog's native `close` event (`dialog.returnValue` = the closer's `value`). For one-off sheets use `openSheet()` (§10.4).

### 8.2 Toast — `.toast-region` / `.toast`

Created by JS only — call `toast()`. Inverted surface (dark in light theme, light in dark), slides up with a spring, auto-dismisses (pauses on hover/focus), max 3 stacked. Sits above the tab bar / action bar on mobile; on desktop it sits bottom-right with its end edge on the `.container` edge (aligned to the content grid, same formula as the header padding). Favorite toggles show "Saved to favorites" / "Removed from favorites" with an **Undo** action. Lives in a polite live region. Note: a modal sheet covers toasts — show confirmation toasts after the sheet closes (`openSheet` actions close the sheet automatically).

### 8.3 Cook mode — `.cook-mode`

```html
<div class="cook-mode" role="dialog" aria-modal="true" aria-labelledby="cook-title" hidden>
  <div class="cook-mode__bar">
    <p class="cook-mode__title" id="cook-title">Banana Banana Bread</p>
    <span class="cook-mode__count">Step 2 of 5</span>
    <button class="btn btn--icon btn--ghost cook-mode__close" type="button" aria-label="Close cook mode">…i-x…</button>
  </div>
  <div class="cook-mode__progress" role="progressbar" aria-label="Progress" aria-valuemin="0" aria-valuemax="5" aria-valuenow="2" style="--progress: 40%"></div>
  <div class="cook-mode__stage">
    <p class="cook-mode__heading">Bake</p>                          <!-- optional section heading -->
    <button class="cook-mode__step" type="button" aria-pressed="false">Bake for 60 to 65 minutes…</button>
    <p class="cook-mode__hint"><svg class="icon" …#i-check/>Tap the step when it's done.</p>
  </div>
  <div class="cook-mode__nav">
    <button class="btn btn--secondary btn--lg cook-mode__prev" type="button">…i-arrow-left… Back</button>
    <button class="btn btn--primary btn--lg cook-mode__next" type="button">Next step …i-arrow-right…</button>
  </div>
</div>
```

Fullscreen (`position: fixed; inset: 0`, solid `--color-bg`) over everything (below toasts), page scroll locked while not `[hidden]`. Layout: a one-column grid whose rows are `auto auto minmax(0,1fr) auto`, so the **stage is the only scroller** — content starts at the top (never centred and clipped) and long steps scroll. The stage carries the step font (`--step-3`, weight 500, `--leading-snug`) and a `--measure-cook` (26ch) measure, so the measure scales with the type; heading and hint are visible at every width. The step button has inner padding with a matching negative margin so the focus ring (`outline-offset: 0`) never touches or clips the text. No horizontal overflow at 360px (`min-width: 0` on children, `overflow-wrap: anywhere`). Progress fill = `--progress` (percentage). Done step: `aria-pressed="true"`, `[data-done]` or `.is-done` → muted ink (AA) with a leading success check, no strike-through. JS may focus `.cook-mode__stage` (`tabindex="-1"`); it shows no outline. Add `.is-entering` to the step after changing text for a small slide-in. Feature JS owns state: show/hide via `hidden`, call `keepAwake()` on open and `release()` on close, Esc closes, ←/→ navigate, move focus into the overlay on open and back on close.

---

## 9. Icons — `img/icons.svg`

```html
<svg class="icon" aria-hidden="true"><use href="{{BASE}}assets/img/icons.svg#i-heart"/></svg>
```

24px grid, 1.75px round strokes, `currentColor`. Size defaults to `1.25em`; `.icon--sm` 18px, `.icon--md` 24px, `.icon--lg` 32px; components size their own icons. Icons are decorative (`aria-hidden="true"`) — the button/link text or `aria-label` carries meaning. In JS use `icon('heart')`.

| id | Use |
|---|---|
| `i-book` | Recipes tab / home |
| `i-search` | Search |
| `i-heart` / `i-heart-fill` | Favorite off / on |
| `i-cart` | Shopping list (a basket) |
| `i-sun` / `i-moon` / `i-auto` | Theme light / dark / system |
| `i-plus` / `i-minus` | Stepper, add |
| `i-check` | Done, success toast |
| `i-x` | Close, clear |
| `i-share` | Share / export to Keep |
| `i-copy` | Copy to clipboard |
| `i-chef` | Cook mode |
| `i-clock` | Times |
| `i-users` | Contributor / servings |
| `i-shuffle` | Surprise me |
| `i-print` | Print |
| `i-trash` | Remove / clear |
| `i-arrow-left` / `i-arrow-right` | Back / next |
| `i-chevron-right` / `i-chevron-down` | "See all", disclosure |
| `i-filter` | Filters |
| `i-list` | List view / grouped |
| `i-merge` | Combine like items |
| `i-sparkle` | New / recently added |
| `i-utensils` | Servings, generic food |
| `i-card` | Brand mark (index card) |
| `i-external` | Opens another site (Keep) |

Adding an icon: draw on the same 24px grid with `stroke-width="1.75"`, round caps/joins, no fills except `-fill` variants; add a `<symbol id="i-name">` and a row here.

## 10. JavaScript API (`assets/js/ds/index.js`)

```js
import { initDS, $, $$, on, h, icon, url, store, toast, openSheet, shareText, keepAwake, viewTransition } from '{{BASE}}assets/js/ds/index.js';
initDS();
```

Plain ES modules, no dependencies. Everything is feature-detected; storage, clipboard, share and wake-lock failures never throw.

### 10.1 `initDS()`
Call once per page (idempotent). Applies the theme and binds `[data-theme-toggle]`; wires `[data-sheet-open]`/`[data-sheet-close]`; sets `aria-current="page"` on `.tabbar`/`.app-header__nav` `[data-nav]` items from `html[data-page]` (`NAV_FOR_PAGE`); creates the toast region; keeps `[data-list-count]` badges in sync with `store` `list.items`; toggles `.app-header.is-scrolled`; adds `html.js`. Also exported: `markActiveNav(page?)`, `NAV_FOR_PAGE`.

### 10.2 `dom.js`

| Export | Signature | Notes |
|---|---|---|
| `$` | `$(selector, root = document) → Element \| null` | Never throws on bad selectors. |
| `$$` | `$$(selector, root = document) → Element[]` | Real array. |
| `on` | `on(target, events, handler) → off` / `on(target, events, selector, (e, matched) => …) → off` | `target` may be an element, `document`, `window` or a selector string. Space-separated events allowed. Returns an unsubscribe function. |
| `h` | `h(tag, attrs?, ...children) → Element` | `class`, `style` (string or object incl. `--vars`), `dataset`, `onClick`-style listeners, boolean attrs. Strings become text nodes (safe; never HTML). SVG tags get the SVG namespace. |
| `base` | `base() → string` | `html[data-base]`, always with trailing `/`. |
| `url` | `url(path) → string` | `url('recipes/x/')` → `/illtrytobenice-v2/recipes/x/`. Absolute URLs pass through. |
| `icon` | `icon(name, { class?, label? }) → SVGSVGElement` | Sprite icon; decorative unless `label`. |
| `setIcon` | `setIcon(el, name)` | Swap the sprite id of the first `<use>` in `el`. |

```js
on(document, 'click', '[data-fav]', (e, btn) => toggleFavorite(btn.dataset.fav));
const li = h('li', { class: 'check-item', dataset: { id } }, h('span', { class: 'check-item__label' }, item.text));
```

### 10.3 `store.js` — persisted app state

localStorage key `itbn:state`, shape exactly as in `docs/CONTRACT.md` (schemaVersion, theme, favorites, list{view,items}, checks, servings). Plain JSON only.

| Member | Notes |
|---|---|
| `store.get(path?)` | Dot path (`'list.items'`, `'servings.banana-bread'`); omitted = whole state. Returns a **deep copy** — mutate and `set` it back. |
| `store.set(path, value)` | Creates intermediate objects; `undefined` deletes the key; persists and notifies. |
| `store.update(path, fn)` | `fn(currentCopy) → next`. |
| `store.subscribe(path, cb, { immediate? }) → unsubscribe` | `cb(value, state)` fires only when the value at `path` changes, including from other tabs (`storage` event). `''` = any change. |
| `store.export() → string` | Pretty JSON. |
| `store.import(jsonOrObject) → boolean` | Validates, migrates, replaces, notifies. |
| `store.addMigration(fromVersion, fn)` | Upgrade hook. Register migrations **in store.js itself** (and bump `SCHEMA_VERSION`) so they run on initial load. |
| `store.reset()` | Defaults. |
| `store.persistent` | `false` when storage is blocked (state then lives in memory for the session). |
| `STORAGE_KEY`, `SCHEMA_VERSION`, `defaultState()` | Also exported. |

```js
// favorites
const isFav = (slug) => store.get('favorites').includes(slug);
store.update('favorites', (f) => (f.includes(slug) ? f.filter((s) => s !== slug) : [...f, slug]));
// react to changes (also from other tabs)
store.subscribe('favorites', (favs) => renderHearts(favs), { immediate: true });
```

### 10.4 `sheet.js`

| Export | Notes |
|---|---|
| `openSheet({ title, content, actions?, onClose? }) → { close, el }` | Builds a `<dialog class="sheet">`, opens it, removes it on close. `content`: Node or plain string (rendered as `<p>`). `actions`: `[{ label, variant?: 'primary'\|'secondary'\|'ghost', icon?, onClick?(e, close), close?: boolean }]` — an action closes the sheet after `onClick` unless `close: false` or `onClick` returns `false`. |
| `showSheet(dialogOrSelector, opener?)` | Open a prebuilt sheet. |
| `closeSheet(dialogOrSelector, returnValue?)` | Animated close (fires native `close`). |
| `initSheets()` | Delegated `[data-sheet-open]` / `[data-sheet-close]` binding (done by `initDS`). |

```js
openSheet({
  title: 'Clear your list?',
  content: 'This removes all 12 items.',
  actions: [
    { label: 'Keep list', variant: 'secondary' },
    { label: 'Clear list', variant: 'primary', icon: 'trash', onClick: () => store.set('list.items', []) },
  ],
});
```

### 10.5 `toast.js`

`toast(message, { action?: { label, onClick }, duration?, icon? }) → { dismiss, el }` — duration default 4000ms (6500ms with an action, `0` = sticky). `icon` is a sprite name. `ensureToastRegion()` is exported too.

```js
toast('Added 9 items to your list', { icon: 'check', action: { label: 'Undo', onClick: undoAdd } });
```

Copy: past-tense confirmation that matches the button ("Add to list" → "Added 9 items to your list"; "Copy" → "Copied").

### 10.6 `share.js`

`shareText({ title, text }) → Promise<'shared' | 'copied' | 'failed'>` — Web Share API when available (phones → Google Keep); otherwise copies `title + text` (Clipboard API, then `execCommand` fallback). A user cancelling the share sheet returns `'failed'` without copying. Also `copyText(text) → Promise<boolean>`.

```js
const r = await shareText({ title: 'Shopping list', text });
if (r === 'copied') toast('List copied. Paste it into a new Keep note.', {
  action: { label: 'Open Keep', onClick: () => window.open('https://keep.google.com', '_blank', 'noopener') },
});
```

### 10.7 `theme.js`

| Export | Notes |
|---|---|
| `initTheme()` | Done by `initDS`. |
| `cycleTheme() → 'system'\|'light'\|'dark'` | system → light → dark → system; persists; short cross-fade. |
| `getTheme()` | Saved preference. |
| `setTheme(t)` / `resolvedTheme()` | Explicit set / what's showing now. |
| `THEME_BOOT` | Minified inline `<head>` script; reads `itbn:state.theme`, sets or removes `html[data-theme]`, never throws. |

Toggle buttons: any `[data-theme-toggle]`; the first `<use>` is swapped to `i-auto|i-sun|i-moon`, `aria-label` becomes "Theme: Light. Switch to dark", and a child `[data-theme-label]` (optional) receives the text. `<meta name="theme-color">` follows the resolved theme (`#FBF6EE` / `#1C1612`).

### 10.8 `wakelock.js`

`keepAwake() → release()` — requests a screen wake lock, re-acquires it when the tab becomes visible again, no-op where unsupported. `wakeLockSupported()`.

### 10.9 `motion.js`

`prefersReducedMotion() → boolean`; `viewTransition(fn) → Promise<void>` — wraps a DOM update in `document.startViewTransition` when supported and motion is allowed (e.g. re-sorting the grid, switching list view).

---

## 11. Print

`print.css` turns a recipe page into a plain card: black on white, no shadows/animations, hides header, tab bar, action bar, sheets, toasts, cook mode, buttons, search, chips, segmented, stepper, switches, hero photo and the table's heart buttons; ingredients (`.checklist`) in two columns with empty boxes; steps keep their numbers. Hide anything else with `data-print="hide"`; force-show print-only content with `data-print="show"` (pair with `hidden` or `.visually-hidden` on screen).

---

## 12. Accessibility checklist

- Landmarks: `header.app-header`, `main#main`, `nav.tabbar[aria-label]`, skip link first in `<body>`.
- Every icon-only button has `aria-label`; icons are `aria-hidden="true"`.
- Toggles use `aria-pressed`; nav uses `aria-current="page"`; category tabs use `aria-current`.
- Focus is always visible (2.5px accent outline). Don't remove outlines; don't use `tabindex` > 0.
- Tap targets ≥ 44px (small visuals extend their hit area).
- Text contrast ≥ 4.5:1 — only use the documented token pairs (accent **text** = `--color-accent-strong`).
- Motion respects `prefers-reduced-motion` globally; don't add animations that bypass the tokens.
- Overlays: sheets are real modal dialogs; cook mode is `role="dialog" aria-modal="true"`, traps attention with fullscreen + scroll lock; feature JS must manage focus.

---

## 13. Do / Don't

**Do**
- Use tokens for every value; use `data-cat` for category color.
- Use `.btn--primary` once per region for the main action.
- Render recipe lists with `recipeTableHTML()`; show a real `<img>` only when `images[0]` exists.
- Prefix all asset URLs with `{{BASE}}` in HTML (or `url()` in JS).
- Keep labels short, sentence case, verbs first ("Add to list", "Start cooking", "Clear list").
- Add `.check-item--done` / `.step--done` from JS alongside native state.

**Don't**
- Don't use `--color-accent` (`#C8553D`) for body-size text on light backgrounds — use `--color-accent-strong`.
- Don't add new colors, shadows, radii, fonts, icon sets or breakpoints in `app.css`.
- Don't use pure black/white for surfaces in dark mode or reuse light tints in dark mode.
- Don't add illustrations or decorative artwork; don't put links or extra buttons inside a recipe-table row (the title link is stretched over it).
- Don't put more than three buttons in `.action-bar`, or more than four items in `.tabbar`.
- Don't build custom modals — use `openSheet()` / `<dialog class="sheet">`.
- Don't use `innerHTML` with recipe data — use `h()` (text-safe) or pre-render at build time.
- Don't add padding-bottom hacks for the bars — `body` already clears them.
- Don't use the `sg-*` classes from the style guide on real pages.
