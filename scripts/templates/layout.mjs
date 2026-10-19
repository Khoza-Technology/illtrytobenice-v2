// Shared page shell. Every generated page goes through layout().
import { esc, icon } from '../../src/assets/js/app/markup.js';

export { esc, icon };

/** JSON for embedding inside <script> — never lets "</script>" or "<!--" through. */
export function jsonForScript(value) {
  return JSON.stringify(value).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
}

const NAV = [
  { id: 'home', label: 'Recipes', icon: 'book', path: '' },
  { id: 'search', label: 'Search', icon: 'search', path: 'search/' },
  { id: 'favorites', label: 'Favorites', icon: 'heart', path: 'favorites/' },
  { id: 'list', label: 'List', icon: 'cart', path: 'list/' },
];

// List count badge: decorative; the count reaches assistive tech through the visually-hidden span placed
// right after the label, so the link's name is "List 10 unchecked items" (label-in-name). See ds/index.js.
const BADGE = '<span class="tabbar__badge" data-list-count aria-hidden="true" hidden>0</span>';
const BADGE_SR = '<span class="visually-hidden" data-list-count-sr></span>';

/**
 * @param {object} o
 * @param {object} o.ctx    build context { cfg, base, absBase, themeBoot, contributors, counts }
 * @param {string} o.page   data-page value (also the page module name)
 * @param {string} o.title  page title (site title appended unless home)
 * @param {string} o.path   path relative to base, e.g. "recipes/banana-bread/"
 * @param {string} o.body   inner HTML of <main>
 * @param {string} [o.nav]  active tab id
 * @param {string} [o.after] HTML placed after </main> (action bars, dialogs)
 * @param {string} [o.head] extra head HTML (JSON-LD…)
 * @param {string} [o.description]
 * @param {string} [o.ogImage] path relative to base
 * @param {string} [o.ogType]
 */
export function layout(o) {
  const { ctx } = o;
  const { cfg, base, absBase } = ctx;
  const fullTitle = o.page === 'home' ? `${cfg.title} — family recipe box` : `${o.title} · ${cfg.title}`;
  const description = o.description || cfg.description;
  const canonical = absBase + (o.path || '');
  const ogImage = absBase + (o.ogImage || 'assets/img/favicon.svg');
  const active = o.nav ?? o.page;
  const navLinks = NAV.map((n) => {
    const current = n.id === active ? ' aria-current="page"' : '';
    const badge = n.id === 'list' ? BADGE : '';
    return `<a href="${base}${n.path}" data-nav="${n.id}"${current}>${icon(n.icon, base)}<span data-label>${esc(n.label)}</span>${n.id === 'list' ? BADGE_SR : ''}${badge}</a>`;
  }).join('');
  const tabItems = NAV.map((n) => {
    const current = n.id === active ? ' aria-current="page"' : '';
    const badge = n.id === 'list' ? BADGE : '';
    return `<a class="tabbar__item" href="${base}${n.path}" data-nav="${n.id}"${current}><span class="tabbar__icon">${icon(n.icon, base)}${badge}</span><span class="tabbar__label">${esc(n.label)}</span>${n.id === 'list' ? BADGE_SR : ''}</a>`;
  }).join('');

  return `<!doctype html>
<html lang="en" data-base="${esc(base)}" data-page="${esc(o.page)}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(fullTitle)}</title>
<meta name="description" content="${esc(description)}">
<meta name="theme-color" content="#FBF6EE" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#1C1612" media="(prefers-color-scheme: dark)">
<meta name="color-scheme" content="light dark">
<link rel="canonical" href="${esc(canonical)}">
<meta property="og:site_name" content="${esc(cfg.title)}">
<meta property="og:type" content="${esc(o.ogType || 'website')}">
<meta property="og:title" content="${esc(o.page === 'home' ? cfg.title : o.title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${esc(canonical)}">
<meta property="og:image" content="${esc(ogImage)}">
<meta name="twitter:card" content="summary">
<link rel="icon" href="${base}assets/img/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="${base}assets/img/favicon.svg">
<script>document.documentElement.classList.add('js');${ctx.themeBoot}</script>
<link rel="stylesheet" href="${base}assets/css/site.css">
${o.head || ''}
</head>
<body>
<a class="skip-link" href="#main">Skip to content</a>
<header class="app-header">
  <a class="app-header__brand" href="${base}" aria-label="${esc(cfg.title)} — home"><span class="app-header__mark">${icon('utensils', base)}</span><span class="app-header__name">${esc(cfg.title)}</span></a>
  <nav class="app-header__nav hide-mobile" aria-label="Main">${navLinks}</nav>
  <div class="app-header__actions">
    <button type="button" class="btn btn--icon btn--ghost" data-theme-toggle data-requires-js aria-label="Theme: match system">${icon('auto', base)}</button>
  </div>
</header>
<main id="main" tabindex="-1">
${o.body}
</main>
${o.after || ''}
<footer class="site-footer">
  <div class="container stack">
    <p>Recipes from ${ctx.contributors.map((c) => `<a href="${base}by/${esc(c.id)}/">${esc(c.name)}</a>`).join(', ').replace(/, ([^,]*)$/, ' and $1')}.</p>
    <p class="text-muted">Recipes archived from the family WordPress site. <a href="${base}styleguide/">Style guide</a> · <a href="${base}api/recipes.json">Recipe data (JSON)</a></p>
  </div>
</footer>
<nav class="tabbar" aria-label="Tabs">${tabItems}</nav>
<div class="toast-region" role="status" aria-live="polite"></div>
<script type="module" src="${base}assets/js/app/${esc(o.page)}.js"></script>
</body>
</html>
`;
}
