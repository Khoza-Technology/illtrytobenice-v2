// Recipe detail page.
import { esc, icon, jsonForScript } from './layout.mjs';
import { recipeTableHTML, primaryCategory, favButtonHTML, minutesLabel } from '../../src/assets/js/app/markup.js';
import { tidyIngredient } from '../../src/assets/js/app/ingredients.js';
import { emptyState } from './pages.mjs';

const SCALES = [[0.5, '½×'], [1, '1×'], [2, '2×'], [3, '3×']];

/** Strip source.html from a recipe (public shape). */
export function publicRecipe(r) {
  const { html, ...source } = r.source || {};
  return { ...r, source };
}

/** Recipe without source at all — what the page embeds for its scripts. */
function embedRecipe(r) {
  const { source, ...rest } = r;
  return rest;
}

function paragraphs(text) {
  return String(text).split(/\n{2,}|\r?\n/).map((p) => p.trim()).filter(Boolean).map((p) => `<p>${esc(p)}</p>`).join('');
}

/**
 * The recipe's yield for the facts strip. `servings.label` when present; otherwise a summary that is
 * only a yield line ("Makes 3 medium-sized pizzas") becomes the yield and stops being the subtitle.
 */
function yieldOf(r) {
  if (r.servings?.label) return { yieldLabel: r.servings.label, summaryText: r.summary || '' };
  const m = /^\s*(?:makes|yields?)\s*:?\s+(.{1,60}?)\.?\s*$/i.exec(r.summary || '');
  if (m) return { yieldLabel: m[1], summaryText: '' };
  return { yieldLabel: '', summaryText: r.summary || '' };
}

function jsonLd(r, ctx, imageUrl) {
  const { absBase } = ctx;
  const data = {
    '@context': 'https://schema.org',
    '@type': 'Recipe',
    name: r.title,
    url: `${absBase}recipes/${r.slug}/`,
    ...(imageUrl ? { image: [imageUrl] } : {}),
    author: { '@type': 'Person', name: ctx.contributorName(r.contributor) },
    datePublished: r.published,
    dateModified: r.modified,
    description: r.summary || `${r.title} — a family recipe from ${ctx.contributorName(r.contributor)}.`,
    recipeCategory: r.categories.map((c) => ctx.categoryName(c)),
    recipeIngredient: r.ingredients.filter((i) => i.type === 'item').map((i) => i.text),
  };
  if (r.cuisine) data.recipeCuisine = r.cuisine;
  const { yieldLabel } = yieldOf(r);
  if (yieldLabel) data.recipeYield = yieldLabel;
  for (const k of ['prep', 'cook', 'total']) if (r.times?.[k]?.iso) data[`${k}Time`] = r.times[k].iso;
  const steps = [];
  let section = null;
  for (const s of r.instructions) {
    if (s.type === 'heading') {
      section = { '@type': 'HowToSection', name: s.text, itemListElement: [] };
      steps.push(section);
    } else {
      const step = { '@type': 'HowToStep', text: s.text };
      (section ? section.itemListElement : steps).push(step);
    }
  }
  if (steps.length) data.recipeInstructions = steps;
  return `<script type="application/ld+json">${jsonForScript(data)}</script>`;
}

export function recipeTemplate(r, ctx, related) {
  const { base } = ctx;
  const cat = primaryCategory(r.categories);
  const image = ctx.imageFor(r);
  const imageAbs = image ? ctx.absBase + image.src : null;
  const items = r.ingredients;
  const hasSteps = r.instructions.some((s) => s.type === 'step');
  const servCount = r.servings?.count || null;

  // ---- facts strip (label over value, like one row of the recipe index)
  const T = r.times || {};
  const facts = [['From', `<a href="${base}by/${esc(r.contributor)}/">${esc(ctx.contributorName(r.contributor))}</a>`]];
  if (T.prep) facts.push(['Prep', esc(T.prep.label)]);
  if (T.cook) facts.push(['Cook', esc(T.cook.label)]);
  if (T.total) facts.push(['Total', esc(T.total.label)]);
  // Yield always lives in the facts strip: "Serves" for a head count ("4", "6 to 8"), "Makes" for any
  // other yield. [data-servings-meta] follows the scaler / servings stepper (recipe.js).
  const { yieldLabel, summaryText } = yieldOf(r);
  if (yieldLabel) {
    const numeric = /^\d+$/.test(yieldLabel);
    facts.push([/^\d+(\s*(-|–|to)\s*\d+)?$/.test(yieldLabel) ? 'Serves' : 'Makes', `<span data-servings-meta data-label="${esc(yieldLabel)}"${numeric ? ` data-base-servings="${esc(yieldLabel)}"` : ''}>${esc(yieldLabel)}</span>`]);
  }
  if (r.cuisine) facts.push(['Cuisine', esc(r.cuisine)]);
  const factsHTML = `<dl class="facts recipe-hero__facts">${facts.map(([k, v]) => `<div class="facts__item"><dt class="facts__label">${k}</dt><dd class="facts__value">${v}</dd></div>`).join('')}</dl>`;

  const chips = r.categories.length
    ? `<p class="recipe-hero__kicker">${r.categories.map((c) => `<a class="badge badge--cat" href="${base}category/${esc(c)}/" data-cat="${esc(c)}">${esc(ctx.categoryName(c))}</a>`).join('')}</p>`
    : '';

  // ---- ingredients
  let ingHTML;
  if (items.length) {
    ingHTML = `<ul class="checklist" data-ingredients>${items.map((it, idx) => {
      if (it.type === 'heading') return `<li class="check-item check-item--heading"><h3>${esc(it.text)}</h3></li>`;
      return `<li><label class="check-item"><input type="checkbox" class="check-item__input" data-index="${idx}"><span class="check-item__box" aria-hidden="true"></span><span class="check-item__label" data-text="${esc(it.text)}">${esc(tidyIngredient(it.text))}</span></label></li>`;
    }).join('')}</ul>`;
  } else {
    ingHTML = `<p class="text-muted">No ingredient list was saved for this recipe.</p>`;
  }

  // ---- steps
  let stepsHTML;
  if (hasSteps) {
    let n = 0;
    stepsHTML = `<ol class="steps" data-steps>${r.instructions.map((s) => {
      if (s.type === 'heading') return `<li class="steps__heading"><h3>${esc(s.text)}</h3></li>`;
      n += 1;
      return `<li class="step" data-step="${n - 1}"><span class="step__num" aria-hidden="true">${n}</span><p class="step__text">${esc(s.text)}</p></li>`;
    }).join('')}</ol>`;
  } else {
    // the standard DS empty state, same as every other "nothing here" spot
    stepsHTML = emptyState(ctx, {
      level: 3,
      iconName: 'chef',
      title: 'No steps needed',
      text: 'This one was written down as just a list — measure everything into a bowl, mix it together, and you’re done.',
    });
  }

  // ---- scaler
  const scaler = `<div class="recipe-scaler cluster" data-requires-js>
      <div class="segmented" role="group" aria-label="Scale recipe">${SCALES.map(([v, l]) => `<button type="button" class="segmented__option" data-scale="${v}" aria-pressed="${v === 1}">${l}</button>`).join('')}</div>
      ${servCount ? `<div class="stepper" role="group" aria-label="Servings">
        <button type="button" class="stepper__btn" data-servings-step="-1" aria-label="Fewer servings">${icon('minus', base)}</button>
        <output class="stepper__value" data-servings-value data-base-servings="${servCount}" aria-live="polite">${servCount} servings</output>
        <button type="button" class="stepper__btn" data-servings-step="1" aria-label="More servings">${icon('plus', base)}</button>
      </div>` : ''}
    </div>`;

  const summary = summaryText ? `<p class="recipe-hero__summary">${esc(summaryText)}</p>` : '';
  const notesBlock = r.notes ? `<section class="section recipe-notes card" aria-labelledby="notes-h"><h2 class="section__title" id="notes-h">Notes</h2>${paragraphs(r.notes)}</section>` : '';

  const catName = ctx.categoryName(cat === 'misc' ? null : cat);
  // uncategorized recipes have no category page: "See all" goes to the full index instead
  const seeAll = cat === 'misc' ? `${base}#all` : `${base}category/${cat}/`;
  const relatedHTML = related.length ? `<section class="section container recipe-related" aria-labelledby="related-h">
    <div class="section__head"><h2 class="section__title" id="related-h">More ${cat === 'misc' ? 'recipes' : `from ${esc(catName)}`}</h2><a class="section__link" href="${seeAll}">See all ${icon('chevron-right', base)}</a></div>
    ${recipeTableHTML(related, { ...ctx.tableOpts, compact: true, labelledby: 'related-h' })}
  </section>` : '';

  const actionBar = `<div class="action-bar" data-requires-js>
  <button type="button" class="btn btn--primary" data-add-to-list${items.some((i) => i.type === 'item') ? '' : ' disabled'}>${icon('cart', base)}<span class="btn__label">Add to list</span></button>
  ${hasSteps ? `<button type="button" class="btn btn--secondary" data-cook>${icon('chef', base)}<span class="btn__label">Cook</span></button>` : ''}
  ${favButtonHTML(r.slug, r.title, base, 'btn btn--icon btn--ghost')}
  <button type="button" class="btn btn--icon btn--ghost" data-share aria-label="Share recipe">${icon('share', base)}</button>
  <button type="button" class="btn btn--icon btn--ghost hide-mobile" data-print aria-label="Print recipe">${icon('print', base)}</button>
</div>`;

  const body = `
<article class="recipe page" data-slug="${esc(r.slug)}">
  <div class="container">
    <header class="recipe-hero">
      ${image ? `<figure class="recipe-hero__photo"><img src="${base}${esc(image.src)}" alt="${esc(image.alt || '')}" decoding="async"></figure>` : ''}
      <div class="recipe-hero__body">
        ${chips}
        <h1 class="recipe-hero__title">${esc(r.title)}</h1>
        ${summary}
        ${factsHTML}
        ${actionBar}
      </div>
    </header>
  </div>
  <div class="container recipe-body">
    <section class="section recipe-ingredients" aria-labelledby="ing-h">
      <div class="section__head">
        <h2 class="section__title" id="ing-h">Ingredients</h2>
        ${items.length ? `<button type="button" class="btn btn--ghost btn--sm" data-reset-checks data-requires-js disabled>${icon('x', base)}<span>Reset scale &amp; checks</span></button>` : ''}
      </div>
      ${items.length ? scaler : ''}
      ${ingHTML}
    </section>
    <section class="section recipe-steps" aria-labelledby="steps-h">
      <div class="section__head">
        <h2 class="section__title" id="steps-h">Instructions</h2>
      </div>
      ${stepsHTML}
    </section>
    ${notesBlock}
  </div>
</article>
${relatedHTML}
<script type="application/json" id="recipe-data">${jsonForScript(embedRecipe({ ...r, images: image ? [image] : [] }))}</script>`;



  const description = r.summary
    || `${r.title} from ${ctx.contributorName(r.contributor)}. ${r.ingredients.filter((i) => i.type === 'item').length} ingredients${T.total ? `, ${minutesLabel(T.total.minutes)}` : ''}.`;

  return {
    title: r.title,
    description,
    body,
    head: jsonLd(r, ctx, imageAbs),
    ...(image ? { ogImage: image.src } : {}),
    ogType: 'article',
  };
}
