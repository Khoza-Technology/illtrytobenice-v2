#!/usr/bin/env node
// Scrapes the legacy WordPress recipe site (EasyRecipe plugin) via its REST API
// and writes normalized JSON into /data plus local copies of recipe photos.
// Zero dependencies. Usage: node scripts/scrape.mjs [--no-images]
import { mkdir, writeFile, readFile, access } from 'node:fs/promises';
import { join, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const config = JSON.parse(await readFile(join(ROOT, 'site.config.json'), 'utf8'));
const API = new URL('wp-json/wp/v2/', config.source).href;
const DATA = join(ROOT, 'data');
const IMG_DIR = join(ROOT, 'src/assets/img/recipes');
const SKIP_IMAGES = process.argv.includes('--no-images');
const UA = { 'User-Agent': 'Mozilla/5.0 (recipe-archive-scraper)' };

async function getAll(type, params = '') {
  const out = [];
  for (let page = 1; ; page++) {
    const res = await fetch(`${API}${type}?per_page=100&page=${page}${params}`, { headers: UA });
    if (!res.ok) break;
    const batch = await res.json();
    out.push(...batch);
    if (page >= Number(res.headers.get('x-wp-totalpages') || 1)) break;
  }
  return out;
}

// ---------- text helpers ----------
const ENTITIES = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', frac14: '¼', frac12: '½', frac34: '¾',
  deg: '°', hellip: '…', ndash: '–', mdash: '—', lsquo: '‘', rsquo: '’', ldquo: '“', rdquo: '”',
  eacute: 'é', egrave: 'è', ntilde: 'ñ', times: '×', reg: '®', trade: '™', copy: '©', frasl: '⁄',
};
const decode = (s) => s
  .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
  .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
  .replace(/&([a-z0-9]+);/gi, (m, n) => ENTITIES[n.toLowerCase()] ?? m);
const stripTags = (s) => s.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '');
const clean = (s) => decode(stripTags(s))
  .replace(/\[\/?et_pb_[^\]]*\]/g, '')      // stray Divi shortcodes
  .replace(/[ \t ]+/g, ' ')
  .replace(/\s*\n\s*/g, '\n')
  .trim();
const slugify = (s) => s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '')
  .replace(/&/g, ' and ').replace(/['’]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

const pick = (html, re) => { const m = html.match(re); return m ? clean(m[1]) : null; };
const pickAll = (html, re) => [...html.matchAll(re)].map((m) => clean(m[1])).filter(Boolean);

// EasyRecipe renders section headers as ordinary list items ("Cookie Layer", "Brownie Batter:").
const SECTION_WORDS = /\b(layer|dough|batter|sauce|filling|topping|frosting|icing|glaze|crust|dressing|marinade|rub|garnish|assembly|base|streusel|syrup|for the|to serve|optional)\b/i;
function isHeading(text, next) {
  if (!text || /\d|[¼½¾⅓⅔⅛]/.test(text)) return false;
  if (/\b(ounces?|cups?|tsp|tbsp|teaspoons?|tablespoons?|pounds?|lbs?|oz)\b|\(s\)/i.test(text)) return false;
  if (/:$/.test(text) && text.split(' ').length <= 6) return true;
  const words = text.split(/\s+/);
  if (words.length > 4) return false;
  const titleCase = words.every((w) => /^[A-Z(&]/.test(w) || /^(and|or|of|the|for|to|with|a)$/.test(w));
  if (!titleCase) return false;
  if (SECTION_WORDS.test(text)) return true;
  // Title-cased short line immediately followed by a measured line reads as a header.
  return Boolean(next && /^[\d¼½¾⅓⅔⅛]/.test(next) && words.length >= 2);
}
const toItems = (lines, itemType) => lines.map((text, i) => isHeading(text, lines[i + 1])
  ? { type: 'heading', text: text.replace(/\(\s*required\s*\)/i, '').replace(/:$/, '').trim() }
  : { type: itemType, text });

function parseDuration(iso) {
  const m = iso && iso.match(/P(?:\d+D)?T?(?:(\d+)H)?(?:(\d+)M)?/);
  return m ? (Number(m[1] || 0) * 60 + Number(m[2] || 0)) || null : null;
}

// ---------- main ----------
console.log(`Scraping ${API}`);
const [posts, categories, tags, users] = await Promise.all([
  getAll('posts'), getAll('categories'), getAll('tags'), getAll('users'),
]);
console.log(`posts=${posts.length} categories=${categories.length} tags=${tags.length} users=${users.length}`);

const CATCH_ALL = new Set(['all-recipies', 'all-recipes', 'uncategorized']);
const catById = new Map(categories.map((c) => [c.id, c]));
const tagById = new Map(tags.map((t) => [t.id, t]));
const userById = new Map(users.map((u) => [u.id, u]));

// Contributors: "Recipes By" tags merge duplicates by first name (e.g. genevieve / genevieve-hammil).
const contributors = new Map();
function contributor(name) {
  const display = clean(name);
  const id = slugify(display.split(' ')[0]);
  const existing = contributors.get(id);
  if (!existing) contributors.set(id, { id, name: display, count: 0 });
  else if (display.length > existing.name.length) existing.name = display;
  return contributors.get(id);
}

const used = new Set();
const recipes = [];
const images = [];

for (const post of posts.sort((a, b) => a.date.localeCompare(b.date))) {
  const html = post.content.rendered;
  if (!/class="easyrecipe"/.test(html)) continue;

  const title = pick(html, /class="ERSName"[^>]*>([\s\S]*?)<\/div>/) || clean(post.title.rendered);
  let slug = slugify(title) || `recipe-${post.id}`;
  for (let n = 2; used.has(slug); n++) slug = `${slugify(title)}-${n}`;
  used.add(slug);

  const ingredients = toItems(pickAll(html, /<li[^>]*class="ingredient"[^>]*>([\s\S]*?)<\/li>/g), 'item');
  const instructions = toItems(pickAll(html, /<li[^>]*class="instruction"[^>]*>([\s\S]*?)<\/li>/g), 'step');

  const times = {};
  for (const m of html.matchAll(/<time itemprop="(prepTime|cookTime|totalTime)" datetime="([^"]*)">([\s\S]*?)<\/time>/g)) {
    times[m[1].replace('Time', '')] = { iso: m[2], minutes: parseDuration(m[2]), label: clean(m[3]) };
  }
  const servesRaw = pick(html, /itemprop="recipeYield"[^>]*>([\s\S]*?)<\/span>/);
  const servings = servesRaw ? { label: servesRaw, count: Number(servesRaw.match(/\d+/)?.[0]) || null } : null;

  const tagNames = post.tags.map((id) => tagById.get(id)).filter(Boolean);
  const authorText = pick(html, /itemprop="author"[^>]*>([\s\S]*?)<\/span>/);
  const who = contributor(tagNames[0]?.name || authorText || userById.get(post.author)?.name || 'Family');
  who.count++;

  const cats = post.categories.map((id) => catById.get(id)).filter((c) => c && !CATCH_ALL.has(c.slug));
  const erCategory = pick(html, /itemprop="recipeCategory"[^>]*>([\s\S]*?)<\/span>/);
  if (!cats.length && erCategory) {
    const match = categories.find((c) => slugify(c.name) === slugify(erCategory) || c.slug === slugify(erCategory));
    if (match && !CATCH_ALL.has(match.slug)) cats.push(match);
  }

  const imgs = [];
  const seen = new Set();
  for (const m of html.matchAll(/<img[^>]*>/g)) {
    const tag = m[0];
    const srcset = tag.match(/srcset="([^"]*)"/)?.[1];
    let src = tag.match(/src="([^"]*)"/)?.[1];
    if (srcset) src = srcset.split(',').map((s) => s.trim().split(/\s+/)).sort((a, b) => parseInt(b[1]) - parseInt(a[1]))[0][0];
    if (!src) continue;
    const base = src.replace(/-\d+x\d+(\.\w+)$/, '$1');
    if (seen.has(base)) continue;
    seen.add(base);
    const file = `${slug}-${imgs.length + 1}${extname(new URL(base).pathname).toLowerCase() || '.jpg'}`;
    imgs.push({ src: `assets/img/recipes/${file}`, alt: clean(tag.match(/alt="([^"]*)"/)?.[1] || '') || title });
    images.push({ url: base, fallback: src, file, slug });
  }

  const summary = pick(html, /class="ERSSummary[^"]*"[^>]*>([\s\S]*?)<\/div>/);
  const notes = pick(html, /class="ERSNotes[^"]*"[^>]*>([\s\S]*?)<\/div>/);

  recipes.push({
    id: slug,
    slug,
    title,
    summary: summary || null,
    contributor: who.id,
    categories: cats.map((c) => c.slug),
    cuisine: pick(html, /itemprop="recipeCuisine"[^>]*>([\s\S]*?)<\/span>/),
    times,
    servings,
    ingredients,
    instructions,
    notes: notes || null,
    images: imgs,
    published: post.date_gmt + 'Z',
    modified: post.modified_gmt + 'Z',
    source: { wpId: post.id, url: post.link, html },
  });
}

const categoryList = categories
  .filter((c) => !CATCH_ALL.has(c.slug))
  .map((c) => ({ id: c.slug, name: decode(c.name), count: recipes.filter((r) => r.categories.includes(c.slug)).length }))
  .filter((c) => c.count)
  .sort((a, b) => a.name.localeCompare(b.name));

const contributorList = [...contributors.values()].filter((c) => c.count).sort((a, b) => b.count - a.count);

if (!SKIP_IMAGES) {
  await mkdir(IMG_DIR, { recursive: true });
  let fetched = 0;
  for (const img of images) {
    const dest = join(IMG_DIR, img.file);
    if (await access(dest).then(() => true, () => false)) { img.ok = true; continue; }
    let res = await fetch(img.url, { headers: UA });
    if (!res.ok) res = await fetch(img.fallback, { headers: UA });
    if (!res.ok) { console.warn(`  ! ${img.url} ${res.status}`); continue; }
    img.ok = true;
    await writeFile(dest, Buffer.from(await res.arrayBuffer()));
    // Downscale large originals when macOS `sips` is available; harmless no-op elsewhere.
    try { execFileSync('sips', ['-Z', '1400', dest], { stdio: 'ignore' }); } catch {}
    fetched++;
  }
  console.log(`downloaded ${fetched} images (${images.length} referenced)`);
}

// Keep only images that exist locally; remember lost originals so they can be restored later.
for (const r of recipes) {
  const mine = images.filter((i) => i.slug === r.slug);
  r.images = r.images.filter((_, i) => SKIP_IMAGES || mine[i]?.ok);
  const lost = mine.filter((i) => !i.ok).map((i) => i.url);
  if (lost.length && !SKIP_IMAGES) r.source.lostImages = lost;
}

// ---------- write ----------
await mkdir(join(DATA, 'recipes'), { recursive: true });
const json = (o) => JSON.stringify(o, null, 2) + '\n';
const generatedAt = new Date().toISOString();
recipes.sort((a, b) => a.title.localeCompare(b.title));
await writeFile(join(DATA, 'recipes.json'), json({ schemaVersion: 1, generatedAt, count: recipes.length, recipes }));
await writeFile(join(DATA, 'categories.json'), json({ schemaVersion: 1, categories: categoryList }));
await writeFile(join(DATA, 'contributors.json'), json({ schemaVersion: 1, contributors: contributorList }));
for (const r of recipes) await writeFile(join(DATA, 'recipes', `${r.slug}.json`), json({ schemaVersion: 1, recipe: r }));
console.log(`wrote ${recipes.length} recipes, ${categoryList.length} categories, ${contributorList.length} contributors`);

