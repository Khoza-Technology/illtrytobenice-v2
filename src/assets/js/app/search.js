import './common.js';
import { initBrowse } from './browse.js';

initBrowse({ categoryTabs: true });
const input = document.querySelector('[data-search-input]');
// autofocus is unreliable after client navigation / bfcache; focus explicitly on wide screens
if (input && document.activeElement !== input && matchMedia('(min-width: 900px)').matches) input.focus();
