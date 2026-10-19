import { store, getFavorites, loadIndex, renderRecipeTable, paintFavButtons, plural } from './common.js';

const grid = document.querySelector('[data-fav-grid]');
const empty = document.querySelector('[data-fav-empty]');
const count = document.querySelector('[data-fav-count]');
let index = null;
let shown = [];

function draw(slugs, bySlug) {
  grid.innerHTML = renderRecipeTable(slugs.map((s) => bySlug.get(s)), index, { caption: 'Favorite recipes' });
  shown = slugs;
}

function render() {
  if (!index) return;
  const bySlug = new Map(index.recipes.map((r) => [r.slug, r]));
  const favs = getFavorites().filter((s) => bySlug.has(s));
  // Keep un-favorited rows in place until reload so an accidental tap can be undone in context.
  const visible = [...favs.filter((s) => !shown.includes(s)), ...shown];
  if (visible.join() !== shown.join()) draw(visible, bySlug);
  paintFavButtons(grid);
  empty.hidden = favs.length > 0;
  grid.hidden = favs.length === 0;
  count.textContent = favs.length ? plural(favs.length, 'recipe') : '';
}

loadIndex().then((idx) => {
  index = idx;
  const bySlug = new Map(idx.recipes.map((r) => [r.slug, r]));
  draw(getFavorites().filter((s) => bySlug.has(s)), bySlug);
  render();
}).catch(() => {
  count.textContent = 'Couldn’t load recipes. Check your connection and refresh.';
});

store.subscribe('favorites', render);
