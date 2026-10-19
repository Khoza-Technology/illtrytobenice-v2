#!/usr/bin/env node
// Static site build: data/ + scripts/templates + src/ → dist/. Node ≥ 20, built-ins only.
// Usage: node scripts/build.mjs
import { readFileSync, writeFileSync, mkdirSync, rmSync, cpSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, relative, extname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { layout } from './templates/layout.mjs';
import { recipeTemplate, publicRecipe } from './templates/recipe.mjs';
import {
  homeTemplate, listingTemplate, searchTemplate, favoritesTemplate, listTemplate, notFoundTemplate,
} from './templates/pages.mjs';
import { primaryCategory } from '../src/assets/js/app/markup.js';

const t0 = Date.now();
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'src');
const DIST = join(ROOT, 'dist');
const DATA = join(ROOT, 'data');
const readJSON = (p) => JSON.parse(readFileSync(p, 'utf8'));
const warn = (msg) => console.warn(`  ⚠ ${msg}`);

const cfg = readJSON(join(ROOT, 'site.config.json'));
const base = cfg.basePath.endsWith('/') ? cfg.basePath : `${cfg.basePath}/`;
const absBase = cfg.siteUrl.replace(/\/$/, '') + base;
const recipesDoc = readJSON(join(DATA, 'recipes.json'));
const { categories } = readJSON(join(DATA, 'categories.json'));
const { contributors } = readJSON(join(DATA, 'contributors.json'));
const recipes = recipesDoc.recipes;
const generatedAt = new Date().toISOString();

// ---------------------------------------------------------------- theme boot snippet
const FALLBACK_THEME_BOOT = `(function(){try{var s=JSON.parse(localStorage.getItem('itbn:state')||'{}');var t=s&&s.theme;if(t==='light'||t==='dark'){document.documentElement.dataset.theme=t;}}catch(e){}})();`;
let themeBoot = FALLBACK_THEME_BOOT;
const themeModule = join(SRC, 'assets/js/ds/theme.js');
if (existsSync(themeModule)) {
  try {
    const mod = await import(pathToFileURL(themeModule).href);
    if (typeof mod.THEME_BOOT === 'string' && mod.THEME_BOOT.trim()) themeBoot = mod.THEME_BOOT.trim();
    else warn('ds/theme.js has no THEME_BOOT export; using fallback snippet');
  } catch (err) {
    warn(`could not import ds/theme.js (${err.message}); using fallback snippet`);
  }
} else {
  warn('src/assets/js/ds/theme.js missing; using fallback theme boot snippet');
}
themeBoot = themeBoot.replace(/<\/script/gi, '<\\/script').replace(/^<script[^>]*>|<\/script>$/g, '');

// ---------------------------------------------------------------- helpers
const catNames = Object.fromEntries(categories.map((c) => [c.id, c.name]));
const contribNames = Object.fromEntries(contributors.map((c) => [c.id, c.name]));

/** First recipe image whose file actually exists in src/ (scraped image refs may be missing). */
const missingImages = new Set();
function imageFor(r) {
  const img = (r.images || [])[0];
  if (!img?.src) return null;
  if (existsSync(join(SRC, img.src))) return img;
  missingImages.add(img.src);
  return null;
}

function totalMinutes(r) {
  const t = r.times || {};
  if (t.total?.minutes) return t.total.minutes;
  const sum = (t.prep?.minutes || 0) + (t.cook?.minutes || 0);
  return sum || null;
}

function indexEntry(r) {
  const img = imageFor(r);
  return {
    slug: r.slug,
    title: r.title,
    contributor: r.contributor,
    categories: r.categories,
    cuisine: r.cuisine,
    totalMinutes: totalMinutes(r),
    published: r.published,
    ingredients: r.ingredients.filter((i) => i.type === 'item').map((i) => i.text).join(' | ').toLowerCase(),
    url: `${base}recipes/${r.slug}/`,
    ...(img ? { image: img } : {}),
  };
}

const ctx = {
  cfg, base, absBase, themeBoot, categories, contributors,
  categoryName: (id) => catNames[id] ?? 'Recipes',
  contributorName: (id) => contribNames[id] ?? id,
  imageFor,
  tableOpts: { base, categories: catNames, contributors: contribNames },
};

function write(rel, content) {
  const file = join(DIST, rel);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, content);
}
function writePage(rel, page, tpl, extra = {}) {
  const path = rel.replace(/index\.html$/, '').replace(/^404\.html$/, '404.html');
  write(rel, layout({ ctx, page, path, ...tpl, ...extra }));
}
function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

// ---------------------------------------------------------------- 1. clean + copy src
rmSync(DIST, { recursive: true, force: true });
mkdirSync(DIST, { recursive: true });
cpSync(SRC, DIST, { recursive: true, filter: (p) => !/\/\.DS_Store$/.test(p) });
for (const file of walk(DIST)) {
  if (extname(file) === '.html') {
    const html = readFileSync(file, 'utf8');
    if (html.includes('{{BASE}}')) writeFileSync(file, html.replaceAll('{{BASE}}', base));
  }
}

// ---------------------------------------------------------------- 2. site.css
const CSS_ORDER = ['ds/fonts.css', 'ds/tokens.css', 'ds/base.css', 'ds/layout.css', 'ds/components.css', 'ds/utilities.css', 'ds/print.css', 'app.css'];
let css = `/* ${cfg.title} — generated ${generatedAt}. Do not edit; see src/assets/css/. */\n`;
for (const f of CSS_ORDER) {
  const p = join(SRC, 'assets/css', f);
  if (!existsSync(p)) { warn(`missing CSS ${f}`); continue; }
  const text = readFileSync(p, 'utf8');
  // url()s in every CSS file are written relative to assets/css/site.css (the bundle), per DS convention.
  css += `\n/* ---- ${f} ---- */\n${text}\n`;
}
write('assets/css/site.css', css);

// ---------------------------------------------------------------- 3. API
const entries = recipes.map(indexEntry);
const entryBySlug = new Map(entries.map((e) => [e.slug, e]));
const counts = { recipes: recipes.length, categories: categories.length, contributors: contributors.length };
write('api/recipes.json', JSON.stringify({ ...recipesDoc, generatedAt: recipesDoc.generatedAt, count: recipes.length, recipes: recipes.map(publicRecipe) }));
for (const r of recipes) write(`api/recipes/${r.slug}.json`, JSON.stringify({ schemaVersion: recipesDoc.schemaVersion ?? 1, recipe: publicRecipe(r) }));
write('api/categories.json', JSON.stringify(readJSON(join(DATA, 'categories.json'))));
write('api/contributors.json', JSON.stringify(readJSON(join(DATA, 'contributors.json'))));
write('api/index.json', JSON.stringify({
  schemaVersion: 1,
  recipes: entries,
  // convenience for client renderers (markup.js recipe table) — saves two requests
  categories: categories.map(({ id, name }) => ({ id, name })),
  contributors: contributors.map(({ id, name }) => ({ id, name })),
}));
write('api/site.json', JSON.stringify({ title: cfg.title, basePath: base, generatedAt, counts }, null, 2));

// ---------------------------------------------------------------- 4. pages
writePage('index.html', 'home', homeTemplate(ctx, entries));

const azEntries = [...entries].sort((a, b) => a.title.localeCompare(b.title));
for (const r of recipes) {
  const cat = primaryCategory(r.categories);
  writePage(`recipes/${r.slug}/index.html`, 'recipe', recipeTemplate(r, ctx, relatedFor(r, cat)), { nav: 'home' });
}

/**
 * "More from <category>": up to RELATED_MAX unique recipes (by slug and title) sharing the primary category,
 * never the current one — the recipes alphabetically after this one, wrapping around. Fewer when the
 * category is small.
 */
function relatedFor(r, cat) {
  const RELATED_MAX = 4;
  const pos = azEntries.findIndex((e) => e.slug === r.slug);
  const rotated = [...azEntries.slice(pos + 1), ...azEntries.slice(0, Math.max(pos, 0))];
  // also skip same-title twins in the data (e.g. "mexican-beef" / "mexican-beef-2"), which read as duplicates
  const titleKey = (t) => String(t).trim().toLowerCase();
  const seen = new Set([r.slug, titleKey(r.title)]);
  const related = [];
  for (const e of rotated) {
    if (related.length >= RELATED_MAX) break;
    if (seen.has(e.slug) || seen.has(titleKey(e.title)) || primaryCategory(e.categories) !== cat) continue;
    seen.add(e.slug);
    seen.add(titleKey(e.title));
    related.push(e);
  }
  return related;
}

for (const c of categories) {
  const list = entries.filter((e) => e.categories.includes(c.id));
  writePage(`category/${c.id}/index.html`, 'category', listingTemplate(ctx, {
    kind: 'category', id: c.id, name: c.name, entries: list,
    intro: `Everything filed under ${c.name.toLowerCase()} in the family recipe box.`,
  }), { nav: 'home', description: `${c.name} recipes from ${cfg.title}.` });
}
// uncategorised recipes are only reachable via home/search; no /category/misc/ route in the contract.

for (const p of contributors) {
  const list = entries.filter((e) => e.contributor === p.id);
  writePage(`by/${p.id}/index.html`, 'contributor', listingTemplate(ctx, {
    kind: 'contributor', id: p.id, name: p.name, entries: list,
    intro: `Recipes from ${p.name.split(' ')[0]}’s kitchen.`,
  }), { nav: 'home', description: `Recipes from ${p.name}.` });
}

writePage('search/index.html', 'search', searchTemplate(ctx, entries));
writePage('favorites/index.html', 'favorites', favoritesTemplate(ctx));
writePage('list/index.html', 'list', listTemplate(ctx));
writePage('404.html', '404', notFoundTemplate(ctx), { nav: '' });

// ---------------------------------------------------------------- 5. sitemap, robots, .nojekyll
const urls = [
  '', 'search/',
  ...categories.map((c) => `category/${c.id}/`),
  ...contributors.map((c) => `by/${c.id}/`),
  ...recipes.map((r) => `recipes/${r.slug}/`),
];
const lastmod = new Map(recipes.map((r) => [`recipes/${r.slug}/`, (r.modified || r.published || '').slice(0, 10)]));
write('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${absBase}${u}</loc>${lastmod.get(u) ? `<lastmod>${lastmod.get(u)}</lastmod>` : ''}</url>`).join('\n')}
</urlset>
`);
write('robots.txt', `User-agent: *\nAllow: /\n\nSitemap: ${absBase}sitemap.xml\n`);
write('.nojekyll', '');

// ---------------------------------------------------------------- report
if (missingImages.size) warn(`${missingImages.size} recipe image(s) referenced in data but not present in src/ — rendering without a photo`);
const pageCount = walk(DIST).filter((f) => f.endsWith('.html')).length;
console.log(`✓ built ${recipes.length} recipes, ${pageCount} HTML pages → ${relative(ROOT, DIST)}/ in ${Date.now() - t0}ms (base ${base})`);
