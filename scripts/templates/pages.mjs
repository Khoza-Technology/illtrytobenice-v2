// Home, listing (category / contributor), search, favorites, list and 404 pages.
import { esc, icon } from './layout.mjs';
import { recipeTableHTML } from '../../src/assets/js/app/markup.js';

const SORTS = [['az', 'A–Z'], ['new', 'Newest'], ['quick', 'Quickest']];

export function searchField(ctx, { autofocus = false, id = 'q', label = 'Search recipes', large = false } = {}) {
  const { base } = ctx;
  return `<form class="search-field${large ? ' search-field--lg' : ''}" role="search" action="${base}search/" method="get" data-search-form>
    ${icon('search', base, 'icon search-field__icon')}
    <label class="visually-hidden" for="${id}">${esc(label)}</label>
    <input class="search-field__input" id="${id}" name="q" type="search" placeholder="Search recipes" autocomplete="off" autocapitalize="off" spellcheck="false" enterkeyhint="search"${autofocus ? ' autofocus' : ''} data-search-input>
    <button type="button" class="search-field__clear" data-search-clear aria-label="Clear search" hidden>${icon('x', base)}</button>
  </form>`;
}

/**
 * Sort control for phones/tablets; ≥900px the table's column headers sort instead (they include "Added").
 * "Best match" (data-sort="best") is the ordering while a search query is active and no sort was picked;
 * browse.js shows it only then, so the control always has exactly one selected option.
 */
function sortControl({ search = false } = {}) {
  const best = search ? '<button type="button" class="segmented__option" data-sort="best" aria-pressed="false" hidden>Best match</button>' : '';
  return `<div class="segmented hide-desktop" role="group" aria-label="Sort recipes" data-requires-js>${best}${SORTS.map(([v, l]) => `<button type="button" class="segmented__option" data-sort="${v}" aria-pressed="${v === 'az'}">${l}</button>`).join('')}</div>`;
}

/** First name on every contributor chip (the table's From column carries the full name). */
const chipName = (c) => c.name.split(' ')[0];

/** Contributor filter chips (buttons) for browse sections. */
function contributorChips(ctx) {
  return `<div class="chip-row" role="group" aria-label="Filter by cook" data-requires-js>${ctx.contributors.map((c) => `<button type="button" class="chip" data-by="${esc(c.id)}" aria-pressed="false">${esc(chipName(c))}</button>`).join('')}</div>`;
}

/** Contributor chips as links (contributor pages): same chip, same labels, aria-current = selected. */
function contributorLinkChips(ctx, current) {
  return `<nav class="chip-row" aria-label="Cooks">${ctx.contributors.map((c) => `<a class="chip" href="${ctx.base}by/${esc(c.id)}/"${c.id === current ? ' aria-current="page"' : ''}>${esc(chipName(c))}</a>`).join('')}</nav>`;
}

/**
 * Category divider tabs. `allHref` is where "All" goes; `current` is the selected id ('' = All).
 * With JS, home and search intercept the links and filter in place (browse.js).
 */
function categoryTabs(ctx, { current = '', allHref = ctx.base } = {}) {
  const { base } = ctx;
  return `<nav class="divider-tabs container" aria-label="Categories">
    <a class="divider-tab" href="${allHref}" data-cat=""${current ? '' : ' aria-current="page"'}>All</a>
    ${ctx.categories.map((c) => `<a class="divider-tab" href="${base}category/${esc(c.id)}/" data-cat="${esc(c.id)}"${c.id === current ? ' aria-current="page"' : ''}>${esc(c.name)}</a>`).join('')}
  </nav>`;
}

/** Empty state; `level` is the heading level that fits the outline where it is placed (no skipped levels). */
export function emptyState(ctx, { title, text, action = '', level = 2, iconName = 'utensils' }) {
  return `<div class="empty-state">
    <div class="empty-state__icon">${icon(iconName, ctx.base)}</div>
    <h${level} class="empty-state__title">${title}</h${level}>
    <p class="empty-state__text">${text}</p>
    ${action ? `<div class="cluster">${action}</div>` : ''}
  </div>`;
}

/**
 * Recipe table with result count, sort + contributor filter and empty state, driven by browse.js.
 * `filters: false` (category / contributor pages) keeps only sorting. `hideCols` hides the table column
 * that the page itself filters on (Category on a category page, From on a contributor page).
 * Sections with filters also have the search field, so they get the "best match" ordering state:
 * a "Best match" sort option on phones and a quiet "Sorted by best match" note on desktop, where no
 * column header is marked while results are ranked by relevance.
 */
function browseSection(ctx, recipes, { heading, id = 'all', filters = true, visibleHeading = true, hideCols = [] }) {
  const head = visibleHeading
    ? `<div class="section__head">
      <h2 class="section__title" id="${id}-h" data-browse-heading>${esc(heading)}</h2>
      <p class="text-muted browse__count" aria-live="polite"><span data-result-count>${recipes.length} recipes</span><span class="browse__sort-note hide-mobile" data-sort-note hidden> · Sorted by best match</span></p>
    </div>`
    : `<h2 class="visually-hidden" id="${id}-h">${esc(heading)}</h2>`;
  return `<section class="section browse" id="${id}" data-browse aria-labelledby="${id}-h">
    ${head}
    <div class="browse__controls cluster"${filters ? '' : ' data-sort-only'}>
      ${sortControl({ search: filters })}
      ${filters ? contributorChips(ctx) : ''}
    </div>
    ${recipeTableHTML(recipes, { ...ctx.tableOpts, sortable: true, sort: 'az', labelledby: `${id}-h`, hideCols })}
    <div data-browse-empty hidden>${emptyState(ctx, {
      level: 3,
      iconName: 'search',
      title: 'Nothing in the box for that',
      // browse.js rewrites the text and button label to mention filters only when filters are active
      text: '<span data-browse-empty-text>Try fewer words or a different spelling.</span>',
      action: `<button type="button" class="btn btn--secondary" data-browse-reset>Clear search</button>`,
    })}</div>
  </section>`;
}

export function homeTemplate(ctx, entries) {
  const { base } = ctx;
  const az = [...entries].sort((a, b) => a.title.localeCompare(b.title));
  const surprise = az[Math.floor(az.length / 2)];
  const body = `
<div class="page home">
  <section class="home-hero container">
    <p class="home-hero__greeting text-muted" data-greeting>${entries.length} family recipes, one search away.</p>
    <h1 class="home-hero__title">What are we cooking?</h1>
    ${searchField(ctx, { large: true })}
    <div class="cluster home-hero__actions">
      <a class="btn btn--secondary" href="${base}recipes/${esc(surprise.slug)}/" data-surprise>${icon('shuffle', base)}<span>Surprise me</span></a>
      <a class="btn btn--secondary" href="${base}favorites/">${icon('heart', base)}<span>Favorites</span></a>
    </div>
  </section>
  ${categoryTabs(ctx)}
  <div class="container">
    ${browseSection(ctx, az, { heading: 'All recipes' })}
  </div>
</div>`;
  return { title: ctx.cfg.title, body };
}

export function listingTemplate(ctx, { kind, id, name, entries, intro }) {
  const { base } = ctx;
  const az = [...entries].sort((a, b) => a.title.localeCompare(b.title));
  const count = `${az.length} ${az.length === 1 ? 'recipe' : 'recipes'}`;
  const body = `
<div class="page listing listing--${kind}">
  ${kind === 'category' ? categoryTabs(ctx, { current: id }) : ''}
  <div class="container">
    <header class="page__head">
      <p class="page__back"><a href="${base}">${icon('arrow-left', base)}<span>All recipes</span></a></p>
      <h1 class="page__title">${esc(name)}</h1>
      <p class="page__meta">${count}</p>
      <p class="page__intro">${esc(intro)}</p>
      ${kind === 'contributor' ? contributorLinkChips(ctx, id) : ''}
    </header>
    ${browseSection(ctx, az, { heading: `${name} recipes`, id: 'listing', filters: false, visibleHeading: false, hideCols: kind === 'category' ? 'category' : 'from' })}
  </div>
</div>`;
  return { title: name, body };
}

export function searchTemplate(ctx, entries) {
  const { base } = ctx;
  const az = [...entries].sort((a, b) => a.title.localeCompare(b.title));
  const body = `
<div class="page search-page">
  <header class="container search-page__head">
    <h1 class="visually-hidden">Search recipes</h1>
    ${searchField(ctx, { autofocus: true, large: true })}
  </header>
  ${categoryTabs(ctx, { allHref: `${base}search/` })}
  <div class="container">
    ${browseSection(ctx, az, { heading: 'All recipes', id: 'results' })}
  </div>
</div>`;
  return { title: 'Search', description: `Search ${entries.length} family recipes by name, ingredient, cook or category.`, body };
}

export function favoritesTemplate(ctx) {
  const { base } = ctx;
  const body = `
<div class="page favorites container">
  <header class="page__head">
    <h1 class="page__title">Favorites</h1>
    <p class="page__meta" data-fav-count aria-live="polite"></p>
  </header>
  <div data-fav-grid></div>
  <div data-fav-empty hidden>${emptyState(ctx, {
    iconName: 'heart',
    title: 'No favorites yet',
    text: "Tap the heart on any recipe to keep it here — they’re saved on this device.",
    action: `<a class="btn btn--primary" href="${base}">${icon('book', base)}<span>Browse recipes</span></a>`,
  })}</div>
  <noscript><p class="text-muted">Favorites are saved in your browser and need JavaScript.</p></noscript>
</div>`;
  return { title: 'Favorites', description: 'Your saved recipes.', body };
}

export function listTemplate(ctx) {
  const { base } = ctx;
  const body = `
<div class="page shopping-list container">
  <header class="page__head">
    <h1 class="page__title">Shopping list</h1>
    <p class="page__meta" data-list-summary aria-live="polite"></p>
  </header>
  <div class="list-toolbar cluster" data-requires-js>
    <div class="segmented" role="group" aria-label="List view">
      <button type="button" class="segmented__option" data-view="grouped" aria-pressed="true">${icon('list', base)}<span>By recipe</span></button>
      <button type="button" class="segmented__option" data-view="combined" aria-pressed="false">${icon('merge', base)}<span>Combine</span></button>
    </div>
  </div>
  <form class="list-add cluster" data-list-add data-requires-js>
    <label class="visually-hidden" for="list-add-input">Add an item</label>
    <input class="input" id="list-add-input" name="item" type="text" placeholder="Add your own item" autocomplete="off" enterkeyhint="done">
    <button type="submit" class="btn btn--secondary">${icon('plus', base)}<span>Add</span></button>
  </form>
  <div data-list-root></div>
  <div data-list-empty hidden>${emptyState(ctx, {
    iconName: 'cart',
    title: 'Your list is empty',
    text: 'Open a recipe and tap “Add to list” — or add your own items above.',
    action: `<a class="btn btn--primary" href="${base}">${icon('book', base)}<span>Browse recipes</span></a>`,
  })}</div>
  <div class="list-actions stack" data-list-actions hidden>
    <button type="button" class="btn btn--primary btn--block btn--lg" data-export-keep>${icon('share', base)}<span>Send to Google Keep</span></button>
    <div class="button-row">
      <button type="button" class="btn btn--secondary" data-export-copy>${icon('copy', base)}<span>Copy list</span></button>
      <button type="button" class="btn btn--secondary" data-clear-checked>${icon('check', base)}<span>Clear checked</span></button>
      <button type="button" class="btn btn--secondary" data-clear-all>${icon('trash', base)}<span>Clear all</span></button>
    </div>
  </div>
  <noscript><p class="text-muted">The shopping list is saved in your browser and needs JavaScript.</p></noscript>
</div>`;
  return { title: 'Shopping list', description: 'Your shopping list.', body };
}

export function notFoundTemplate(ctx) {
  const { base } = ctx;
  const body = `
<div class="page not-found container stack">
  ${emptyState(ctx, {
    level: 1,
    title: 'That recipe card fell behind the stove',
    text: 'We couldn’t find that page. It may have moved when the recipes came over from the old site.',
    action: `<a class="btn btn--primary" href="${base}">${icon('book', base)}<span>All recipes</span></a>`,
  })}
  ${searchField(ctx, { id: 'q404', large: true })}
</div>`;
  return { title: 'Page not found', body };
}
