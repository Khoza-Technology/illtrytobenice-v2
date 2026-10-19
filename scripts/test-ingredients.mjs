// Self-test for src/assets/js/app/ingredients.js — `node scripts/test-ingredients.mjs`
import assert from 'node:assert/strict';
import { parseIngredient, scaleIngredient, mergeItems, formatQty, normalizeName, countNoun, listCounts, tidyIngredient } from '../src/assets/js/app/ingredients.js';

let passed = 0;
const failures = [];
function t(name, fn) {
  try { fn(); passed++; } catch (err) { failures.push([name, err]); }
}
const near = (a, b) => Math.abs(a - b) < 1e-6;

// ---- parse
t('unicode fraction + Cup(s)', () => {
  const p = parseIngredient('¼ Cup(s) olive oil');
  assert.ok(near(p.qty, 0.25)); assert.equal(p.unit, 'cup'); assert.equal(p.name, 'olive oil');
});
t('glued glyph 2½', () => { const p = parseIngredient('2½ teaspoons coconut flour'); assert.ok(near(p.qty, 2.5)); assert.equal(p.unit, 'tsp'); });
t('mixed number 1 1/2', () => { const p = parseIngredient('1 1/2 cups milk'); assert.ok(near(p.qty, 1.5)); assert.equal(p.unit, 'cup'); });
t('fraction slash 1 1⁄2', () => { const p = parseIngredient('1 1⁄2 pounds peeled shrimp'); assert.ok(near(p.qty, 1.5)); assert.equal(p.unit, 'lb'); });
t('range 2-3', () => { const p = parseIngredient('2-3 cloves garlic'); assert.equal(p.qty, 2); assert.equal(p.qtyMax, 3); assert.equal(p.unit, 'clove'); });
t('range "to"', () => { const p = parseIngredient('6 to 8 slices bacon'); assert.equal(p.qty, 6); assert.equal(p.qtyMax, 8); assert.equal(p.unit, 'slice'); });
t('parenthetical grams', () => { const p = parseIngredient('¼ cup (45g) palm shortening, melted'); assert.equal(p.unit, 'cup'); assert.equal(p.name, 'palm shortening'); assert.equal(p.note, 'melted'); });
t('size descriptor', () => { const p = parseIngredient('1 (15 ounce) can black beans, rinsed'); assert.equal(p.qty, 1); assert.equal(p.unit, 'can'); assert.equal(p.name, 'black beans'); });
t('glued grams', () => { const p = parseIngredient('75g palm shortening'); assert.equal(p.qty, 75); assert.equal(p.unit, 'g'); });
t('abbrev tbsp/tsp/c', () => {
  assert.equal(parseIngredient('1 tbsp vanilla').unit, 'tbsp');
  assert.equal(parseIngredient('1½ tsp baking powder').unit, 'tsp');
  assert.equal(parseIngredient('¾ c butter, cut into cubes').unit, 'cup');
});
t('oz. abbreviation', () => { const p = parseIngredient('10 oz. mushrooms'); assert.equal(p.unit, 'oz'); assert.equal(p.name, 'mushrooms'); });
t('no unit', () => { const p = parseIngredient('2 eggs, beaten'); assert.equal(p.qty, 2); assert.equal(p.unit, null); assert.equal(p.name, 'eggs'); });
t('no false unit on "large"/"lime"', () => {
  assert.equal(parseIngredient('1 large egg').unit, null);
  assert.equal(parseIngredient('1 lime, juiced').unit, null);
  assert.equal(parseIngredient('1 cucumber').unit, null);
});
t('unparseable', () => { const p = parseIngredient('Salt and freshly ground black pepper'); assert.equal(p.qty, null); });
t('pinch of', () => { const p = parseIngredient('Pinch of salt'); assert.equal(p.unit, 'pinch'); assert.equal(p.name, 'salt'); });
t('object replacement chars stripped', () => { const p = parseIngredient('￼1 (16 ounce) container sour cream'); assert.equal(p.qty, 1); assert.equal(p.unit, 'container'); });

// ---- format
t('formatQty glyphs', () => {
  assert.equal(formatQty(1.5), '1½'); assert.equal(formatQty(0.25), '¼'); assert.equal(formatQty(1 / 3), '⅓');
  assert.equal(formatQty(2), '2'); assert.equal(formatQty(0.125), '⅛'); assert.equal(formatQty(2.6667), '2⅔');
});
t('formatQty rounds grams', () => assert.equal(formatQty(90.4, 'g'), '90'));

// ---- scale
t('scale double', () => assert.equal(scaleIngredient('¼ Cup(s) olive oil', 2), '½ Cup(s) olive oil'));
t('scale half mixed', () => assert.equal(scaleIngredient('1 1/2 cups milk', 0.5), '¾ cup milk'));
t('scale plurals unit', () => assert.equal(scaleIngredient('1 cup white sugar', 3), '3 cups white sugar'));
t('scale range', () => assert.equal(scaleIngredient('2-3 cloves garlic', 2), '4–6 cloves garlic'));
t('scale equivalent grams', () => assert.equal(scaleIngredient('¼ cup (45g) palm shortening', 2), '½ cup (90g) palm shortening'));
t('scale keeps size descriptor', () => assert.equal(scaleIngredient('1 (15 ounce) can black beans', 2), '2 (15 ounce) cans black beans'));
t('scale unparseable unchanged', () => assert.equal(scaleIngredient('Salt to taste', 2), 'Salt to taste'));
t('scale factor 1 unchanged', () => assert.equal(scaleIngredient('2 eggs', 1), '2 eggs'));
t('scale thirds', () => assert.equal(scaleIngredient('⅓ Cup(s) butter', 3), '1 Cup(s) butter'));
t('scale eggs half', () => assert.equal(scaleIngredient('3 eggs', 0.5), '1½ eggs'));
t('parse "1 and ¼ cups"', () => { const p = parseIngredient('1 and ¼ cups (225g) white chocolate chips'); assert.ok(near(p.qty, 1.25)); assert.equal(p.unit, 'cup'); });

// ---- scale: count nouns
t('scale pluralises count noun', () => assert.equal(scaleIngredient('1 large egg, room temperature', 2), '2 large eggs, room temperature'));
t('scale singularises count noun', () => assert.equal(scaleIngredient('2 eggs', 0.5), '1 egg'));
t('scale count noun head word only', () => assert.equal(scaleIngredient('1 hard-boiled egg, minced', 3), '3 hard-boiled eggs, minced'));
t('scale leaves mass nouns alone', () => assert.equal(scaleIngredient('1 butter', 2), '2 butter'));
t('countNoun', () => { assert.equal(countNoun('Tomato', 2), 'Tomatoes'); assert.equal(countNoun('leaves', 0.5), 'leaf'); assert.equal(countNoun('flour', 3), 'flour'); });

// ---- scale: parentheticals and compound amounts
t('scale parenthetical volume after grams', () => assert.equal(
  scaleIngredient('75g palm shortening (about ⅓ cup plus 1 tablespoon)', 2),
  '150g palm shortening (about ⅔ cup plus 2 tablespoons)'));
t('scale trailing parenthetical with count noun', () => assert.equal(
  scaleIngredient('1 medium onion (about 6 ounces), cut into ¼-inch dice', 2),
  '2 medium onions (about 12 ounces), cut into ¼-inch dice'));
t('scale parenthetical range', () => assert.equal(scaleIngredient('1 can unsweetened coconut milk (1½ to 2 cups)', 2), '2 cans unsweetened coconut milk (3 to 4 cups)'));
t('scale parenthetical singular unit', () => assert.equal(scaleIngredient('½ pound (2 sticks) unsalted butter', 0.5), '¼ pound (1 stick) unsalted butter'));
t('scale leaves package sizes alone', () => assert.equal(scaleIngredient('32 Ounce(s) italian-style tomatoes (2 16 oz cans)', 2), '64 Ounce(s) italian-style tomatoes (2 16 oz cans)'));
t('scale leaves bare-number parenthetical alone', () => assert.equal(scaleIngredient('1 (9 inch) pastry for a pie', 2), '2 (9 inch) pastry for a pie'));
t('scale compound amount', () => assert.equal(scaleIngredient('½ cup + 2 Tablespoons (53g) cocoa powder', 2), '1 cup + 4 Tablespoons (106g) cocoa powder'));
t('scale "1 and ¼ cups"', () => assert.equal(scaleIngredient('1 and ¼ cups (225g) white chocolate chips', 2), '2½ cups (450g) white chocolate chips'));

// ---- merge
t('normalizeName', () => {
  assert.equal(normalizeName('Eggs, beaten'), 'egg');
  assert.equal(normalizeName('Cherry Tomatoes'), 'cherry tomato');
});
t('merge volume tsp+tbsp', () => {
  const m = mergeItems([
    { id: 'a', text: '1 tbsp salt', recipeTitle: 'A' },
    { id: 'b', text: '3 tsp salt', recipeTitle: 'B' },
  ]);
  assert.equal(m.length, 1); assert.equal(m[0].display, '2 tablespoons salt'); assert.deepEqual(m[0].ids, ['a', 'b']);
  assert.deepEqual(m[0].sources, ['A', 'B']);
});
t('merge cups', () => {
  const m = mergeItems([{ id: 1, text: '½ cup butter, melted' }, { id: 2, text: '1 Cup(s) butter' }]);
  assert.equal(m[0].display, '1½ cups butter');
});
t('merge weight oz→lb', () => {
  const m = mergeItems([{ id: 1, text: '12 oz bacon' }, { id: 2, text: '1 Pound(s) bacon' }]);
  assert.equal(m[0].display, '1¾ lb bacon');
});
t('merge incompatible units joined', () => {
  const m = mergeItems([{ id: 1, text: '1 cup flour' }, { id: 2, text: '100 g flour' }]);
  assert.equal(m[0].display, '1 cup + 100 g flour');
});
t('merge counts + checked', () => {
  const m = mergeItems([{ id: 1, text: '2 eggs', checked: true }, { id: 2, text: '1 egg', checked: true }, { id: 3, text: '1 onion' }]);
  assert.equal(m.length, 2); assert.equal(m[0].display, '3 eggs'); assert.equal(m[0].checked, true); assert.equal(m[1].checked, false);
});
t('merge keeps awkward volumes in tsp', () => {
  assert.equal(mergeItems([{ id: 1, text: '4 Teaspoon(s) salt' }, { id: 2, text: '¼ teaspoon salt' }])[0].display, '4¼ teaspoons salt');
  assert.equal(mergeItems([{ id: 1, text: '½ cup butter' }, { id: 2, text: '2 Tablespoon(s) butter' }])[0].display, '10 tablespoons butter');
});
t('merge pluralises counts', () => assert.equal(mergeItems([{ id: 1, text: '4 egg' }, { id: 2, text: '1 egg' }])[0].display, '5 eggs'));
t('merge keeps unmerged item text verbatim', () => {
  const m = mergeItems([
    { id: 1, text: '¾ cup (100g) maple sugar', recipeTitle: 'A' },
    { id: 2, text: '1 packet yeast', recipeTitle: 'B' },
    { id: 3, text: '2 tablespoons olive oil', recipeTitle: 'B' },
  ]);
  assert.deepEqual(m.map((x) => x.display), ['¾ cup (100g) maple sugar', '1 packet yeast', '2 tablespoons olive oil']);
});
t('merge keeps gram total when every amount has one', () => {
  const m = mergeItems([{ id: 1, text: '1 cup (125g) all-purpose flour' }, { id: 2, text: '¼ cup (30g) all-purpose flour' }]);
  assert.equal(m[0].display, '1¼ cups (155g) all-purpose flour');
});
t('merge drops gram total when one amount lacks it', () => {
  const m = mergeItems([{ id: 1, text: '1 cup (125g) flour' }, { id: 2, text: '1 cup flour' }]);
  assert.equal(m[0].display, '2 cups flour');
});
t('merge loose items', () => {
  const m = mergeItems([{ id: 1, text: 'Salt' }, { id: 2, text: 'salt' }]);
  assert.equal(m.length, 1); assert.equal(m[0].display, 'Salt');
});

// ---- display tidy (unscaled lines)
t('tidy mixed glyph/ascii range', () => assert.equal(tidyIngredient('⅛-1/4 teaspoon cayenne pepper'), '⅛–¼ teaspoon cayenne pepper'));
t('tidy leaves plain ranges alone', () => { assert.equal(tidyIngredient('2-3 cloves garlic'), '2-3 cloves garlic'); assert.equal(tidyIngredient('1 1/2 cups milk'), '1 1/2 cups milk'); });
t('scale 1× applies the tidy', () => assert.equal(scaleIngredient('⅛-1/4 teaspoon cayenne', 1), '⅛–¼ teaspoon cayenne'));

// ---- list counts (summary, clear-all sheet and nav badge use the same numbers)
const LIST = [
  { id: 'a', text: '¼ teaspoon salt', recipeTitle: 'Brookies' },
  { id: 'b', text: '1 teaspoon salt', recipeTitle: 'Pizza Dough' },
  { id: 'c', text: '3 eggs', recipeTitle: 'Brookies', checked: true },
  { id: 'd', text: '2 cups flour', recipeTitle: 'Pizza Dough' },
];
// one counting rule for badge, summary and clear-all sheet: raw items, whatever the view
t('listCounts counts raw items', () => assert.deepEqual(listCounts(LIST), { open: 3, done: 1, total: 4 }));
t('listCounts ignores the view (Combine merges rows, not counts)', () => {
  assert.equal(mergeItems(LIST).length, 3); // the two salt lines merge on screen…
  assert.deepEqual(listCounts(LIST, 'combined'), listCounts(LIST, 'grouped')); // …but the numbers do not change
});
t('listCounts partially checked merged items count individually', () => {
  const items = [{ id: 1, text: '1 egg', checked: true }, { id: 2, text: '2 eggs' }];
  assert.deepEqual(listCounts(items), { open: 1, done: 1, total: 2 });
});
t('listCounts badge open + summary checked = sheet total', () => {
  const { open, done, total } = listCounts(LIST);
  assert.equal(open + done, total);
});
t('listCounts empty / bad input', () => {
  assert.deepEqual(listCounts([]), { open: 0, done: 0, total: 0 });
  assert.deepEqual(listCounts(undefined), { open: 0, done: 0, total: 0 });
});

if (failures.length) {
  for (const [name, err] of failures) console.error(`✗ ${name}\n   ${err.message.split('\n').join('\n   ')}`);
  console.error(`\n${failures.length} failed, ${passed} passed`);
  process.exit(1);
}
console.log(`✓ ingredients: ${passed} tests passed`);
