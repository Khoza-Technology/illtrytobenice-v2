// Ingredient parsing, scaling and merging. PURE functions — no DOM, no globals.
// Runs unchanged in Node (scripts/test-ingredients.mjs) and in the browser.

const GLYPHS = {
  '¼': 1 / 4, '½': 1 / 2, '¾': 3 / 4, '⅓': 1 / 3, '⅔': 2 / 3,
  '⅛': 1 / 8, '⅜': 3 / 8, '⅝': 5 / 8, '⅞': 7 / 8, '⅕': 1 / 5, '⅖': 2 / 5, '⅗': 3 / 5, '⅘': 4 / 5, '⅙': 1 / 6, '⅚': 5 / 6,
};
const GLYPH_CLASS = '¼½¾⅓⅔⅛⅜⅝⅞⅕⅖⅗⅘⅙⅚';

// Number atom: "1 and ¼" | "1 1/2" | "2½" | "½" | "1/2" | "1.5" | "2"
const NUM = `(?:\\d+\\s+and\\s+(?:[${GLYPH_CLASS}]|\\d+\\/\\d+)|\\d+\\s+\\d+\\/\\d+|\\d+\\s*[${GLYPH_CLASS}]|[${GLYPH_CLASS}]|\\d+\\/\\d+|\\d*\\.\\d+|\\d+)`;
const QTY_RE = new RegExp(`^(${NUM})(?:\\s*(?:-|–|—|to)\\s*(${NUM}))?`);

// canonical unit → spellings (lowercase, matched as whole words; "(s)" suffix handled separately)
const UNIT_TABLE = {
  tsp: ['tsp', 'tsps', 'tsp.', 'teaspoon', 'teaspoons', 't'],
  tbsp: ['tbsp', 'tbsps', 'tbsp.', 'tbs', 'tbl', 'tablespoon', 'tablespoons'],
  cup: ['cup', 'cups', 'c', 'c.'],
  floz: ['fl oz', 'fl. oz.', 'fluid ounce', 'fluid ounces'],
  oz: ['oz', 'oz.', 'ounce', 'ounces'],
  lb: ['lb', 'lbs', 'lb.', 'lbs.', 'pound', 'pounds'],
  g: ['g', 'gr', 'gram', 'grams'],
  kg: ['kg', 'kgs', 'kilogram', 'kilograms'],
  ml: ['ml', 'milliliter', 'milliliters', 'millilitre', 'millilitres'],
  l: ['l', 'liter', 'liters', 'litre', 'litres'],
  pint: ['pint', 'pints', 'pt'],
  quart: ['quart', 'quarts', 'qt'],
  gallon: ['gallon', 'gallons', 'gal'],
  pinch: ['pinch', 'pinches'],
  dash: ['dash', 'dashes'],
  clove: ['clove', 'cloves'],
  can: ['can', 'cans'],
  package: ['package', 'packages', 'pkg', 'pkgs', 'packet', 'packets', 'envelope', 'envelopes'],
  stick: ['stick', 'sticks'],
  slice: ['slice', 'slices'],
  piece: ['piece', 'pieces'],
  bunch: ['bunch', 'bunches'],
  head: ['head', 'heads'],
  sprig: ['sprig', 'sprigs'],
  jar: ['jar', 'jars'],
  container: ['container', 'containers'],
  bag: ['bag', 'bags'],
  box: ['box', 'boxes'],
  loaf: ['loaf', 'loaves'],
  capful: ['capful', 'capfuls'],
  recipe: ['recipe', 'recipes'],
};
const UNIT_LOOKUP = new Map();
for (const [canon, forms] of Object.entries(UNIT_TABLE)) for (const f of forms) UNIT_LOOKUP.set(f, canon);
// longest spellings first so "fl oz" beats "fl"
const UNIT_FORMS = [...UNIT_LOOKUP.keys()].sort((a, b) => b.length - a.length);
const escRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const UNIT_RE = new RegExp(`^(${UNIT_FORMS.map(escRe).join('|')})(?:\\(s\\)|\\(es\\))?(?![a-z])`, 'i');

/** Convert one number atom ("1 1/2", "2½", "⅓", "0.5") to a number. */
export function parseNumber(str) {
  const s = String(str).trim();
  let m;
  if ((m = s.match(/^(\d+)\s+and\s+(.+)$/))) {
    const frac = parseNumber(m[2]);
    return frac == null ? null : +m[1] + frac;
  }
  if ((m = s.match(/^(\d+)\s+(\d+)\/(\d+)$/))) return +m[1] + +m[2] / +m[3];
  if ((m = s.match(new RegExp(`^(\\d+)\\s*([${GLYPH_CLASS}])$`)))) return +m[1] + GLYPHS[m[2]];
  if (GLYPHS[s] != null) return GLYPHS[s];
  if ((m = s.match(/^(\d+)\/(\d+)$/))) return +m[2] ? +m[1] / +m[2] : null;
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : null;
}

function clean(text) {
  return String(text ?? '')
    .replace(/[￼​]/g, '')
    .replace(/⁄/g, '/')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Parse "1 ½ Cup(s) flour, sifted" → { qty: 1.5, unit: 'cup', name: 'flour', note: 'sifted', raw }.
 * Extra (internal, used by scaleIngredient): _qtySpan [start,end], _unitSpan, _unitText, _equiv.
 */
export function parseIngredient(text) {
  const raw = String(text ?? '');
  const s = clean(raw);
  const out = { qty: null, unit: null, name: s, note: '', raw };
  const m = s.match(QTY_RE);
  if (!m) return splitNote(out, s);
  const qty = parseNumber(m[1]);
  if (qty == null) return splitNote(out, s);
  out.qty = qty;
  if (m[2]) {
    const mx = parseNumber(m[2]);
    if (mx != null && mx > qty) out.qtyMax = mx;
  }
  out._clean = s;
  out._qtySpan = [0, m[0].length];
  let i = m[0].length;
  let rest = s.slice(i);
  // size descriptor before unit: "1 (15 ounce) can beans" — never scaled
  let size = '';
  const sm = rest.match(/^\s*(\([^)]*\))/);
  if (sm) {
    size = sm[1];
    i += sm[0].length;
    rest = s.slice(i);
  }
  out._sizeEnd = i;
  const lead = rest.match(/^\s*/)[0];
  const um = rest.slice(lead.length).match(UNIT_RE);
  if (um) {
    const word = um[1];
    let canon = UNIT_LOOKUP.get(word.toLowerCase());
    if (word === 'T') canon = 'tbsp';
    const nextChar = rest.slice(lead.length + um[0].length).charAt(0);
    let ok = true;
    if (word.length === 1) {
      // single letters must end at a separator; only g/l may be glued to the number ("75g")
      ok = nextChar === '' || /[\s.,)]/.test(nextChar);
      if (lead.length === 0 && !/^[gl]$/i.test(word)) ok = false;
    }
    if (ok) {
      out.unit = canon;
      out._unitSpan = [i + lead.length, i + lead.length + um[0].length];
      out._unitText = um[0];
      i += lead.length + um[0].length;
      rest = s.slice(i);
    }
  }
  // equivalent measure after unit: "¼ cup (45g) shortening" — scaled with the line
  if (out.unit) {
    const em = rest.match(/^\s*(\([^)]*\d[^)]*\))/);
    if (em) {
      out._equiv = [i + em[0].indexOf('('), i + em[0].length];
      i += em[0].length;
      rest = s.slice(i);
    }
  }
  rest = rest.replace(/^\s*of\s+/i, '').trim();
  if (size) out.size = size;
  return splitNote(out, rest);
}

function splitNote(out, rest) {
  let name = rest;
  let note = '';
  const comma = name.indexOf(',');
  if (comma > 0) {
    note = name.slice(comma + 1).trim();
    name = name.slice(0, comma).trim();
  }
  const paren = name.match(/\s*(\([^)]*\)?)\s*$/);
  if (paren && paren.index > 0) {
    note = [paren[1], note].filter(Boolean).join(', ');
    name = name.slice(0, paren.index).trim();
  }
  // "Pinch of salt" style
  if (out.qty == null) {
    const um = name.match(/^(pinch|dash)\s+of\s+/i);
    if (um) {
      out.unit = um[1].toLowerCase();
      name = name.slice(um[0].length);
    }
  }
  out.name = name.replace(/\s+-\s*$/, '').trim();
  out.note = note;
  return out;
}

const NICE = [
  [0, ''], [1 / 8, '⅛'], [1 / 4, '¼'], [1 / 3, '⅓'], [3 / 8, '⅜'], [1 / 2, '½'],
  [5 / 8, '⅝'], [2 / 3, '⅔'], [3 / 4, '¾'], [7 / 8, '⅞'], [1, ''],
];
const PREFERRED = new Set(['', '⅛', '¼', '⅓', '½', '⅔', '¾']);

/** Format a quantity with fraction glyphs: 1.5 → "1½", 0.333 → "⅓", 12.4 → "12". */
export function formatQty(n, unit = null) {
  if (n == null || !Number.isFinite(n)) return '';
  if (n <= 0) return '0';
  if (unit === 'g' || unit === 'ml') return String(Math.round(n));
  if (n >= 20) return String(Math.round(n));
  let whole = Math.floor(n);
  const frac = n - whole;
  // pick nearest fraction, preferring the common glyphs when nearly tied
  let best = null;
  for (const [v, g] of NICE) {
    const err = Math.abs(frac - v) + (PREFERRED.has(g) ? 0 : 0.02);
    if (!best || err < best.err) best = { v, g, err };
  }
  if (best.err > 0.07) {
    const r = Math.round(n * 10) / 10;
    return String(r);
  }
  if (best.v === 1) { whole += 1; best.g = ''; }
  if (whole === 0) return best.g || '0';
  return `${whole}${best.g}`;
}

const PLURAL_WORDS = {
  cup: 'cups', teaspoon: 'teaspoons', tablespoon: 'tablespoons', pound: 'pounds', ounce: 'ounces',
  clove: 'cloves', can: 'cans', package: 'packages', stick: 'sticks', slice: 'slices', piece: 'pieces',
  pinch: 'pinches', dash: 'dashes', jar: 'jars', bag: 'bags', box: 'boxes', loaf: 'loaves', sprig: 'sprigs',
  bunch: 'bunches', head: 'heads', gallon: 'gallons', quart: 'quarts', pint: 'pints', gram: 'grams',
  container: 'containers', envelope: 'envelopes', packet: 'packets',
};
const SINGULAR_WORDS = Object.fromEntries(Object.entries(PLURAL_WORDS).map(([a, b]) => [b, a]));

function matchCase(src, word) {
  if (src === src.toUpperCase() && src.length > 1) return word.toUpperCase();
  if (src[0] === src[0].toUpperCase()) return word[0].toUpperCase() + word.slice(1);
  return word;
}

function fixUnitNumber(unitText, qty) {
  if (/\(s\)$/i.test(unitText)) return unitText;
  const lower = unitText.toLowerCase();
  if (qty > 1 && PLURAL_WORDS[lower]) return matchCase(unitText, PLURAL_WORDS[lower]);
  if (qty <= 1 && SINGULAR_WORDS[lower]) return matchCase(unitText, SINGULAR_WORDS[lower]);
  return unitText;
}

// Count nouns that take a plural after a unitless quantity ("2 large eggs"). A whitelist on purpose:
// recipe data has lines like "1 butter" or "1 heavy whipping cream" that must not become "butters".
const COUNT_NOUNS = {
  egg: 'eggs', yolk: 'yolks', white: 'whites', onion: 'onions', carrot: 'carrots', potato: 'potatoes',
  tomato: 'tomatoes', apple: 'apples', lemon: 'lemons', lime: 'limes', orange: 'oranges', banana: 'bananas',
  avocado: 'avocados', cucumber: 'cucumbers', pepper: 'peppers', jalapeno: 'jalapenos', jalepano: 'jalepanos',
  chipotle: 'chipotles', shallot: 'shallots', scallion: 'scallions', stalk: 'stalks', leaf: 'leaves',
  steak: 'steaks', breast: 'breasts', thigh: 'thighs', tortilla: 'tortillas', round: 'rounds', crust: 'crusts',
  sausage: 'sausages', cube: 'cubes', square: 'squares', bean: 'beans', clove: 'cloves', stick: 'sticks',
  peach: 'peaches', pear: 'pears', tenderloin: 'tenderloins', roast: 'roasts',
};
const COUNT_SINGULAR = Object.fromEntries(Object.entries(COUNT_NOUNS).map(([a, b]) => [b, a]));

/** "egg" → "eggs" for qty > 1, "eggs" → "egg" for qty ≤ 1; unknown words unchanged. */
export function countNoun(word, qty) {
  const lower = String(word).toLowerCase();
  if (qty > 1 && COUNT_NOUNS[lower]) return matchCase(word, COUNT_NOUNS[lower]);
  if (qty <= 1 && COUNT_SINGULAR[lower]) return matchCase(word, COUNT_SINGULAR[lower]);
  return word;
}

// "⅓ cup", "1 tablespoon", "45g", "1½ to 2 cups" inside a parenthetical
const MEASURE_RE = new RegExp(`(${NUM})(\\s*(?:-|–|—|to)\\s*(${NUM}))?(\\s*)(${UNIT_FORMS.map(escRe).join('|')})(?![a-z])`, 'gi');

/**
 * Scale every measurement ("number + unit") inside parentheticals of `str`, fixing unit plurals:
 * "(about ⅓ cup plus 1 tablespoon)" ×2 → "(about ⅔ cup plus 2 tablespoons)". Bare numbers ("(9 inch)")
 * and a number right after another number ("(2 16 oz cans)" — a package size) are left alone.
 */
function scaleMeasures(str, f) {
  return str.replace(MEASURE_RE, (m, a, rng, b, sp, unitText, offset, whole) => {
    if (/\d\s*$/.test(whole.slice(0, offset))) return m;
    if (unitText.length === 1) {
      const next = whole.charAt(offset + m.length);
      if (next && !/[\s.,)]/.test(next)) return m;
      if (!sp && !/^[gl]$/i.test(unitText)) return m;
    }
    const canon = unitText === 'T' ? 'tbsp' : UNIT_LOOKUP.get(unitText.toLowerCase());
    const qa = parseNumber(a);
    if (qa == null) return m;
    const qb = b != null ? parseNumber(b) : null;
    let out = formatQty(qa * f, canon);
    if (qb != null) out += rng.slice(0, rng.length - b.length) + formatQty(qb * f, canon);
    return out + sp + fixUnitNumber(unitText, (qb ?? qa) * f);
  });
}
function scaleParentheticals(str, f) {
  return str.replace(/\([^)]*\)/g, (paren) => scaleMeasures(paren, f));
}
/** A compound amount right after the unit: "½ cup + 2 Tablespoons …", "1 tbsp plus 2 tsp. salt". */
function scaleCompound(str, f) {
  const m = str.match(new RegExp(`^\\s*(?:\\+|plus|and)\\s*${NUM}\\s*[a-z]+\\.?`, 'i'));
  if (!m) return str;
  const scaled = scaleMeasures(m[0], f);
  return scaled + str.slice(m[0].length);
}

/**
 * Scale an ingredient line. Unparseable lines are returned unchanged.
 * Rules: the leading quantity scales (with unit plural fixed); a unitless count noun follows the new
 * quantity ("1 large egg" ×2 → "2 large eggs"); measurements inside parentheticals after the unit scale
 * too ("75g palm shortening (about ⅓ cup plus 1 tablespoon)" ×2 → "150g … (about ⅔ cup plus 2 tablespoons)");
 * a size descriptor between quantity and unit ("1 (15 ounce) can") never scales.
 */
const ASCII_FRACTIONS = { '1/8': '⅛', '1/4': '¼', '1/3': '⅓', '3/8': '⅜', '1/2': '½', '5/8': '⅝', '2/3': '⅔', '3/4': '¾', '7/8': '⅞' };
const RANGE_SIDE = `(?:[${GLYPH_CLASS}]|\\d+\\/\\d+)`;
const MIXED_RANGE_RE = new RegExp(`^(\\s*)(${RANGE_SIDE})\\s*-\\s*(${RANGE_SIDE})(?=\\s|$)`);

/**
 * Display tidy for an ingredient line as written: a leading range that mixes a fraction glyph with an
 * ASCII fraction ("⅛-1/4 tsp") is written with glyphs on both sides and an en dash ("⅛–¼ tsp"), the
 * same form scaleIngredient() produces. Anything else is returned unchanged.
 */
export function tidyIngredient(text) {
  const s = String(text ?? '');
  const m = MIXED_RANGE_RE.exec(s);
  if (!m) return s;
  const glyph = (x) => ASCII_FRACTIONS[x] || x;
  const [a, b] = [glyph(m[2]), glyph(m[3])];
  const isGlyph = (x) => x.length === 1 && GLYPH_CLASS.includes(x);
  if (!(isGlyph(m[2]) || isGlyph(m[3])) || !isGlyph(a) || !isGlyph(b)) return s;
  return `${m[1]}${a}–${b}${s.slice(m[0].length)}`;
}

export function scaleIngredient(text, factor) {
  const f = Number(factor);
  if (!Number.isFinite(f) || f <= 0 || f === 1) return tidyIngredient(text);
  const p = parseIngredient(text);
  if (p.qty == null || !p._qtySpan) return String(text ?? '');
  const s = p._clean;
  const unit = p.unit;
  const newQty = p.qty * f;
  const effQty = p.qtyMax != null ? p.qtyMax * f : newQty;
  let qtyStr = formatQty(newQty, unit);
  if (p.qtyMax != null) qtyStr += `–${formatQty(p.qtyMax * f, unit)}`;
  const [qs, qe] = p._qtySpan;
  let middle;
  let unitStr = '';
  let after;
  if (p._unitSpan) {
    middle = s.slice(qe, p._unitSpan[0]);
    unitStr = fixUnitNumber(p._unitText, effQty);
    after = scaleCompound(s.slice(p._unitSpan[1]), f);
  } else {
    const sizeEnd = p._sizeEnd ?? qe;
    middle = s.slice(qe, sizeEnd);
    after = s.slice(sizeEnd);
    // unitless count noun: pluralise / singularise the head word of the name
    const at = p.name ? after.indexOf(p.name) : -1;
    const head = p.name && p.name.replace(/\s+-\s.*$/, '').match(/([A-Za-z]+)\s*$/);
    if (at >= 0 && head) {
      const pos = at + head.index;
      after = after.slice(0, pos) + countNoun(head[1], effQty) + after.slice(pos + head[1].length);
    }
  }
  after = scaleParentheticals(after, f);
  return s.slice(0, qs) + qtyStr + middle + unitStr + after;
}

// ---------------------------------------------------------------- merging

const VOLUME_TSP = { tsp: 1, tbsp: 3, cup: 48, floz: 6, pint: 96, quart: 192, gallon: 768 };
const WEIGHT_IMPERIAL_OZ = { oz: 1, lb: 16 };
const WEIGHT_METRIC_G = { g: 1, kg: 1000 };
const VOLUME_METRIC_ML = { ml: 1, l: 1000 };

function singularize(w) {
  if (w.length <= 3) return w;
  if (/ies$/.test(w)) return w.slice(0, -3) + 'y';
  if (/(ch|sh|x|ss)es$/.test(w)) return w.slice(0, -2);
  if (/oes$/.test(w)) return w.slice(0, -2);
  if (/ves$/.test(w) && w !== 'olives' && w !== 'chives') return w.slice(0, -3) + 'f';
  if (/[^su]s$/.test(w)) return w.slice(0, -1);
  return w;
}

/** Normalised key for grouping like ingredients. */
export function normalizeName(name) {
  return String(name ?? '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\([^)]*\)?/g, ' ')
    .split(',')[0]
    .replace(/[^a-z\s-]/g, ' ')
    .replace(/-/g, ' ')
    .split(/\s+/).filter(Boolean).map(singularize).join(' ')
    .trim();
}

function unitFamily(unit) {
  if (unit == null) return { fam: 'count', factor: 1 };
  if (VOLUME_TSP[unit]) return { fam: 'vol', factor: VOLUME_TSP[unit] };
  if (WEIGHT_IMPERIAL_OZ[unit]) return { fam: 'oz', factor: WEIGHT_IMPERIAL_OZ[unit] };
  if (WEIGHT_METRIC_G[unit]) return { fam: 'g', factor: WEIGHT_METRIC_G[unit] };
  if (VOLUME_METRIC_ML[unit]) return { fam: 'ml', factor: VOLUME_METRIC_ML[unit] };
  return { fam: `u:${unit}`, factor: 1 };
}

const UNIT_LABEL = {
  tsp: ['teaspoon', 'teaspoons'], tbsp: ['tablespoon', 'tablespoons'], cup: ['cup', 'cups'], oz: ['oz', 'oz'], lb: ['lb', 'lb'],
  g: ['g', 'g'], kg: ['kg', 'kg'], ml: ['ml', 'ml'], l: ['l', 'l'], floz: ['fl oz', 'fl oz'],
};
function unitLabel(unit, qty) {
  if (!unit) return '';
  if (UNIT_LABEL[unit]) return UNIT_LABEL[unit][qty > 1 ? 1 : 0];
  return qty > 1 ? (PLURAL_WORDS[unit] || `${unit}s`) : unit;
}

const multipleOf = (v, step) => Math.abs(v / step - Math.round(v / step)) < 0.02;

function bestUnit(fam, base) {
  if (fam === 'vol') {
    // largest unit that both reads naturally and lands on a friendly fraction
    if (base >= 12 && (multipleOf(base / 48, 1 / 4) || multipleOf(base / 48, 1 / 3))) return ['cup', base / 48];
    if (base >= 3 && multipleOf(base / 3, 1 / 2)) return ['tbsp', base / 3];
    if (base >= 48) return ['cup', base / 48];
    return ['tsp', base];
  }
  if (fam === 'oz') return base >= 16 ? ['lb', base / 16] : ['oz', base];
  if (fam === 'g') return base >= 1000 ? ['kg', base / 1000] : ['g', base];
  if (fam === 'ml') return base >= 1000 ? ['l', base / 1000] : ['ml', base];
  return [fam.startsWith('u:') ? fam.slice(2) : null, base];
}

function fmtPart(unit, min, max) {
  const q = formatQty(min, unit) + (max != null && max > min ? `–${formatQty(max, unit)}` : '');
  const u = unitLabel(unit, max ?? min);
  return u ? `${q} ${u}` : q;
}

/** Grams stated in an equivalent-measure parenthetical: "¾ cup (100g) maple sugar" → 100. */
function equivGrams(p) {
  if (!p._equiv || !p._clean) return null;
  const m = p._clean.slice(p._equiv[0], p._equiv[1]).match(/(\d+(?:\.\d+)?)\s*(?:g|grams?)\b/i);
  return m ? parseFloat(m[1]) : null;
}

/**
 * Merge shopping-list items for the "Combine" view.
 * Presentation rule (shared with the grouped view): an item that has nothing to merge with keeps its
 * own (already scaled) text verbatim. Only rows that really combine several items get a computed
 * display; it spells units like recipes do ("2 tablespoons") and keeps a gram total in parentheses
 * when every merged amount stated one ("1¼ cups (150g) flour").
 * items: [{ id, text, recipeTitle?, checked? }]
 * → [{ name, display, sources: [recipeTitle], ids: [id], checked }]
 */
export function mergeItems(items) {
  const groups = new Map();
  for (const item of items || []) {
    const p = parseIngredient(item.text);
    const key = normalizeName(p.name) || clean(item.text).toLowerCase();
    let g = groups.get(key);
    if (!g) {
      g = { key, name: p.name || clean(item.text), names: [], total: 0, fams: new Map(), loose: [], sources: [], ids: [], checks: [], texts: [], grams: 0, gramsN: 0, qtyN: 0 };
      groups.set(key, g);
    }
    g.ids.push(item.id);
    g.texts.push(clean(item.text));
    if (p.name && !g.names.includes(p.name)) g.names.push(p.name);
    g.checks.push(!!item.checked);
    const src = item.recipeTitle || 'My items';
    if (!g.sources.includes(src)) g.sources.push(src);
    if (p.qty == null) {
      g.loose.push(clean(item.text));
      continue;
    }
    g.qtyN += 1;
    const grams = equivGrams(p);
    if (grams != null) { g.grams += grams; g.gramsN += 1; }
    const { fam, factor } = unitFamily(p.unit);
    const famKey = fam;
    let acc = g.fams.get(famKey);
    if (!acc) { acc = { fam, min: 0, max: 0, unit: p.unit }; g.fams.set(famKey, acc); }
    acc.min += p.qty * factor;
    if (fam === 'count') g.total += p.qty;
    acc.max += (p.qtyMax ?? p.qty) * factor;
  }
  const out = [];
  for (const g of groups.values()) {
    const parts = [];
    for (const acc of g.fams.values()) {
      const [unit, min] = bestUnit(acc.fam, acc.min);
      const max = acc.max > acc.min ? bestUnitValue(acc.fam, acc.max, unit) : null;
      parts.push(fmtPart(unit, min, max));
    }
    let display;
    if (g.texts.length === 1) display = g.texts[0];
    else if (!parts.length) display = g.loose.length === 1 ? g.loose[0] : g.name;
    else {
      // "6 eggs", not "6 egg": with a unitless count above one, prefer a plural spelling seen in the group
      let name = g.name;
      if (g.total > 1 && g.fams.size === 1 && g.fams.has('count')) {
        name = g.names.find((n) => /s$/i.test(n)) || (/[^s]$/.test(name) && !/\s/.test(name) ? `${name}s` : name);
      }
      const grams = g.gramsN && g.gramsN === g.qtyN && !g.loose.length && g.fams.size === 1 ? ` (${Math.round(g.grams)}g)` : '';
      display = `${parts.join(' + ')}${grams} ${name}`;
    }
    out.push({
      name: g.name,
      display,
      sources: g.sources,
      ids: g.ids,
      checked: g.checks.length > 0 && g.checks.every(Boolean),
    });
  }
  return out;
}

function bestUnitValue(fam, base, unit) {
  const tables = { vol: VOLUME_TSP, oz: WEIGHT_IMPERIAL_OZ, g: WEIGHT_METRIC_G, ml: VOLUME_METRIC_ML };
  const t = tables[fam];
  return t && t[unit] ? base / t[unit] : base;
}

/**
 * Shopping-list counts. THE RULE: every number about the list counts raw list ITEMS (entries in
 * `list.items`), never displayed rows — so the nav badge (`open`), the page summary ("N items to get ·
 * M checked") and the clear-all sheet ("removes all `total` items") agree in every view. Switching to
 * "Combine" merges rows on screen but never changes a count.
 * @param {Array<{id, text, checked?}>} items
 * @returns {{ open: number, done: number, total: number }}
 */
export function listCounts(items) {
  const list = Array.isArray(items) ? items.filter(Boolean) : [];
  const done = list.filter((i) => i.checked).length;
  return { open: list.length - done, done, total: list.length };
}
