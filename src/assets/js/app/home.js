import { url } from './common.js';
import { initBrowse } from './browse.js';

const greeting = document.querySelector('[data-greeting]');

const browse = initBrowse({ categoryTabs: true });

if (greeting) {
  const h = new Date().getHours();
  const hello = h < 5 ? 'Up late?' : h < 11 ? 'Good morning.' : h < 16 ? 'Good afternoon.' : h < 21 ? 'Good evening.' : 'Late-night snack?';
  greeting.textContent = `${hello} ${greeting.textContent}`;
}

document.querySelector('[data-surprise]')?.addEventListener('click', (e) => {
  if (!browse) return;
  const pool = browse.visibleSlugs();
  const all = pool.length ? pool : [...document.querySelectorAll('[data-recipe-rows] [data-slug]')].map((r) => r.dataset.slug);
  if (!all.length) return;
  e.preventDefault();
  const slug = all[Math.floor(Math.random() * all.length)];
  location.href = url(`recipes/${slug}/`);
});
