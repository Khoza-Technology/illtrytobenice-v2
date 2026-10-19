// Shared, PURE markup helpers. Imported by scripts/build.mjs (Node) AND by browser page modules,
// so the recipe table rendered at build time and the one rendered by JS are byte-identical.

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ESC[c]);

export const CATEGORY_IDS = ['bread', 'breakfast', 'dessert', 'dinner', 'lunch', 'sauce', 'sides'];

/** Primary tint key for a recipe (first known category, else "misc"). */
export function primaryCategory(categories) {
  const c = (categories || []).find((id) => CATEGORY_IDS.includes(id));
  return c || 'misc';
}

export function icon(name, base, cls = 'icon') {
  return `<svg class="${cls}" aria-hidden="true" focusable="false"><use href="${esc(base)}assets/img/icons.svg#i-${name}"/></svg>`;
}

/** "45 min", "1 hr", "1 hr 15 min" */
export function minutesLabel(min) {
  if (!min || !Number.isFinite(min)) return '';
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  if (!h) return `${m} min`;
  return m ? `${h} hr ${m} min` : `${h} hr`;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
/** "2025-02-11…" → "Feb 2025" (no Intl: identical output in Node and every browser). */
export function monthLabel(iso) {
  const m = /^(\d{4})-(\d{2})/.exec(String(iso || ''));
  return m ? `${MONTHS[Number(m[2]) - 1]} ${m[1]}` : '';
}

function nameOf(lookup, id) {
  if (!lookup || id == null) return id ?? '';
  if (lookup instanceof Map) return lookup.get(id) ?? id;
  if (Array.isArray(lookup)) return lookup.find((x) => x.id === id)?.name ?? id;
  return lookup[id] ?? id;
}

/** Heart toggle; favorites are browser state, so it is hidden without JS. */
export function favButtonHTML(slug, title, base, cls = 'btn btn--icon btn--ghost') {
  return `<button type="button" class="${cls}" data-fav="${esc(slug)}" aria-pressed="false" aria-label="Favorite ${esc(title)}" data-requires-js>${icon('heart', base, 'icon icon--off')}${icon('heart-fill', base, 'icon icon--on')}</button>`;
}

// ---------------------------------------------------------------- recipe table
/** Sort keys and the one direction each column sorts in. */
export const SORT_DIRECTION = { az: 'ascending', quick: 'ascending', new: 'descending' };

/**
 * `col` is the column's public name: it names the <col> (recipe-table__col--<col>), the mobile meta
 * piece ([data-col]) and the value accepted by `hideCols` / [data-hide-col].
 */
const COLUMNS = [
  { cls: 'title', col: 'title', label: 'Recipe', sort: 'az' },
  { cls: 'by', col: 'from', label: 'From' },
  { cls: 'cat', col: 'category', label: 'Category' },
  { cls: 'time', col: 'time', label: 'Time', sort: 'quick' },
  { cls: 'added', col: 'added', label: 'Added', sort: 'new' },
  { cls: 'fav', col: 'fav', label: 'Favorite', hidden: true },
];
/** Columns a page may hide because its filter makes them redundant (category / contributor pages). */
export const HIDEABLE_COLUMNS = ['from', 'category'];

/** Muted dash for an empty cell; screen readers hear "Not listed" instead of "dash". */
const NONE = '<span class="recipe-table__none" aria-hidden="true">—</span><span class="visually-hidden">Not listed</span>';

/**
 * One recipe row.
 * entry: api/index.json recipe ({ slug, title, contributor, categories, cuisine, totalMinutes, published, image? })
 * opts:  { base, categories: {id:name}|Map|[{id,name}], contributors: same }
 */
export function recipeRowHTML(entry, { base = '/', categories, contributors } = {}) {
  const cats = entry.categories || [];
  const cat = primaryCategory(cats);
  const href = `${base}recipes/${entry.slug}/`;
  const by = entry.contributor ? nameOf(contributors, entry.contributor) : '';
  const catLabel = cats.map((c) => nameOf(categories, c)).join(', ');
  const time = minutesLabel(entry.totalMinutes);
  const published = entry.published ? String(entry.published).slice(0, 10) : '';
  // each meta piece names its column so a table with [data-hide-col] hides it on phones too
  const meta = [['from', by], ['category', catLabel], ['time', time]]
    .filter(([, t]) => t).map(([col, t]) => `<li data-col="${col}">${esc(t)}</li>`).join('');
  const thumb = entry.image?.src
    ? `<img class="recipe-table__thumb" src="${esc(base)}${esc(entry.image.src)}" alt="" loading="lazy" decoding="async">`
    : '';
  return `<tr class="recipe-table__row" style="--cat: var(--cat-${cat})" data-slug="${esc(entry.slug)}" data-categories="${esc(cats.join(' '))}" data-contributor="${esc(entry.contributor || '')}" data-published="${esc(published)}" data-minutes="${entry.totalMinutes || ''}" data-cuisine="${esc(entry.cuisine || '')}">`
    + `<th scope="row" class="recipe-table__title">${thumb}<span class="recipe-table__name">`
    + `<a class="recipe-table__link" href="${esc(href)}">${esc(entry.title)}</a>`
    + (meta ? `<ul class="dot-list recipe-table__meta">${meta}</ul>` : '')
    + `</span></th>`
    + `<td class="recipe-table__by">${by ? esc(by) : NONE}</td>`
    + `<td class="recipe-table__cat">${catLabel ? esc(catLabel) : NONE}</td>`
    + `<td class="recipe-table__time">${time ? esc(time) : NONE}</td>`
    + `<td class="recipe-table__added">${published ? `<time datetime="${esc(published)}">${esc(monthLabel(published))}</time>` : NONE}</td>`
    + `<td class="recipe-table__fav">${favButtonHTML(entry.slug, entry.title, base)}</td>`
    + `</tr>`;
}

function headCell(col, { base, sortable, sort }) {
  const cls = `recipe-table__${col.cls}`;
  if (col.hidden) return `<th scope="col" class="${cls}"><span class="visually-hidden">${esc(col.label)}</span></th>`;
  if (!sortable || !col.sort) return `<th scope="col" class="${cls}">${esc(col.label)}</th>`;
  const ariaSort = col.sort === sort ? ` aria-sort="${SORT_DIRECTION[col.sort]}"` : '';
  return `<th scope="col" class="${cls}"${ariaSort}><button type="button" class="recipe-table__sort" data-sort="${col.sort}">${esc(col.label)}${icon('chevron-down', base, 'icon recipe-table__sort-icon')}</button></th>`;
}

/**
 * The recipe index: a semantic <table> on wide screens that reflows to compact list rows below 640px
 * (and at every width with `compact`). See docs/DESIGN-SYSTEM.md → Recipe table.
 * opts: row opts + { sortable?: boolean, sort?: 'az'|'new'|'quick'|'' ('' = no header marked, e.g.
 *                    best match while searching), compact?: boolean, caption?: string, labelledby?: id,
 *                    hideCols?: 'from'|'category'|Array — columns made redundant by the page's filter;
 *                    emitted as [data-hide-col] so CSS hides the cells, the <col> and the meta piece }
 */
export function recipeTableHTML(entries, opts = {}) {
  const { compact = false, sortable = false, sort = 'az', caption = '', labelledby = '', hideCols = [] } = opts;
  const cls = `recipe-table${compact ? ' recipe-table--compact' : ''}`;
  const label = labelledby ? ` aria-labelledby="${esc(labelledby)}"` : '';
  const hide = [].concat(hideCols).filter((c) => HIDEABLE_COLUMNS.includes(c));
  const hideAttr = hide.length ? ` data-hide-col="${hide.join(' ')}"` : '';
  const cap = caption ? `<caption class="visually-hidden">${esc(caption)}</caption>` : '';
  const cols = `<colgroup>${COLUMNS.map((c) => `<col class="recipe-table__col recipe-table__col--${c.col}">`).join('')}</colgroup>`;
  const head = compact ? '' : `<thead><tr>${COLUMNS.map((c) => headCell(c, { base: opts.base || '/', sortable, sort })).join('')}</tr></thead>`;
  return `<table class="${cls}"${label}${hideAttr} data-recipe-table>${cap}${cols}${head}<tbody data-recipe-rows>${entries.map((e) => recipeRowHTML(e, opts)).join('')}</tbody></table>`;
}
