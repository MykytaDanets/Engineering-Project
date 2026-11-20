const { levenshtein, singular } = require('./text');
const { toBase, convertTo, display, roundForUnit, round } = require('./units');

const STAPLES = ['water', 'salt', 'pepper', 'black pepper', 'salt and pepper', 'ice', 'ice cubes'];
const EXPIRY_DAYS = 3;
const EXPIRY_BONUS = 25;//score points per expiring item a recipe uses
const UNKNOWN_COVERAGE = 0.75;//have it in the pantry, but units are not matchable and can't be compared (1 pcs cheese vs 200 g)
const DAY_MS = 24 * 60 * 60 * 1000;

const lastWord = (s) => singular(s.split(/\s+/).pop());

function ingredientMatches(ingredientName, pantryName) {
  const ingredient = singular(ingredientName);
  const pantry = singular(pantryName);
  if (ingredient === pantry) return true;

  const a = lastWord(ingredientName);
  const b = lastWord(pantryName);
  if (a === pantry || b === ingredient || a === b) return true;

  return a.length >= 5 && b.length >= 5 && levenshtein(a, b) <= 1;
}

const isStaple = (name) => STAPLES.includes(name.toLowerCase().trim());

function expiresSoon(item, now = new Date()) {
  if (!item.expiryDate) return false;
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const daysLeft = Math.floor((new Date(item.expiryDate).getTime() - today) / DAY_MS);
  return daysLeft >= 0 && daysLeft <= EXPIRY_DAYS;
}

function pantryFor(ingredientName, pantryItems) {
  return pantryItems.filter((p) => ingredientMatches(ingredientName, p.name));
}

function coverage(ingredient, items) {
  if (isStaple(ingredient.name)) return 1;
  if (!items.length) return 0;

  const need = toBase(ingredient.amount, ingredient.unit);
  if (need.dim === 'tiny' || need.value <= 0) return 1;

  const have = items
    .map((p) => convertTo(need.dim, p.quantity, p.unit, ingredient.name))
    .filter((v) => v !== null)
    .reduce((sum, v) => sum + v, 0);

  if (have > 0) return Math.min(1, have / need.value);
  return items.some((p) => p.quantity > 0) ? UNKNOWN_COVERAGE : 0;
}

function scoreRecipe(recipe, pantryItems) {
  const have = [], partial = [], missing = [], expiring = new Set();
  let total = 0;

  for (const ingredient of recipe.ingredients) {
    const items = pantryFor(ingredient.name, pantryItems);
    const c = coverage(ingredient, items);
    total += c;
    if (isStaple(ingredient.name)) continue;

    if (c >= 1) have.push(ingredient.name);
    else if (c > 0) partial.push(ingredient.name);
    else missing.push(ingredient.name);
    items.filter((p) => expiresSoon(p)).forEach((p) => expiring.add(p.name));
  }

  const matchPercent = recipe.ingredients.length ? Math.round((total / recipe.ingredients.length) * 100) : 0;
  return {
    matchPercent,
    score: matchPercent + EXPIRY_BONUS * expiring.size,
    have: [...new Set(have)],
    partial: [...new Set(partial)],
    missing: [...new Set(missing)],
    expiring: [...expiring],
  };
}

function rankRecipes(recipes, pantryItems) {
  return recipes
    .map((r) => ({
      id: r.id,
      title: r.title,
      image: r.image,
      servings: r.servings,
      readyInMinutes: r.readyInMinutes,
      ...scoreRecipe(r, pantryItems),
    }))
    .sort((a, b) => b.score - a.score);
}

function cookRecipe(recipe, servings, pantry) {
  const factor = servings / recipe.servings;
  const used = [], skipped = [], removed = [];

  for (const ingredient of recipe.ingredients) {
    if (isStaple(ingredient.name)) continue;
    const need = toBase(ingredient.amount * factor, ingredient.unit);
    if (need.dim === 'tiny' || need.value <= 0) continue;
    if (need.dim === 'count') need.value = Math.ceil(need.value);

    const inDim = (p) => convertTo(need.dim, p.quantity, p.unit, ingredient.name);
    const items = pantryFor(ingredient.name, pantry.items)
      .filter((p) => inDim(p) !== null)
      .sort((a, b) => (a.expiryDate?.getTime() ?? Infinity) - (b.expiryDate?.getTime() ?? Infinity));

    if (!items.length) {
      const inPantry = pantryFor(ingredient.name, pantry.items).length > 0;
      skipped.push({ name: ingredient.name, reason: inPantry ? "units don't match – update it by hand" : 'not in pantry' });
      continue;
    }

    let remaining = need.value;
    for (const item of items) {
      if (remaining <= 0) break;
      const available = inDim(item);
      if (!(available > 0)) continue;
      const take = Math.min(available, remaining);
      const before = item.quantity;
      item.quantity = roundForUnit(before * (1 - take / available), item.unit);
      remaining -= take;
      const taken = toBase(before - item.quantity, item.unit);
      used.push({ name: item.name, ...display(taken.dim, taken.value) });
      if (item.quantity <= 0) removed.push(item.name);
    }
    if (remaining > 0.001) skipped.push({ name: ingredient.name, reason: 'not enough in pantry – used what you had' });
  }

  pantry.items = pantry.items.filter((p) => p.quantity > 0);
  return { used: mergeUsed(used), removed: [...new Set(removed)], skipped: [...new Map(skipped.map((s) => [s.name, s])).values()] };
}

function mergeUsed(used) {
  const merged = new Map();
  for (const u of used) {
    const key = `${u.name}|${u.unit}`;
    const existing = merged.get(key);
    if (existing) existing.amount = round(existing.amount + u.amount, 2);
    else merged.set(key, { ...u });
  }
  return [...merged.values()];
}

module.exports = { isStaple, pantryFor, expiresSoon, rankRecipes, cookRecipe };
