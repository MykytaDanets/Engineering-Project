const cache = require('./cache');
const { consumeUsage, limitReached } = require('../middleware/plan');
const { searchRecipes } = require('./spoonacular');
const { expiresSoon } = require('./matching');

const EXPIRING_RESULTS = 8;

class LimitError extends Error {
  constructor(body) {
    super(body.message);
    this.body = body;
  }
}

const uniqueNames = (items) => [...new Set(items.map((i) => i.name.toLowerCase().trim()))].sort();

function searchKey(names, expiring, prefs) {
  const intolerances = [...(prefs.intolerances ?? [])].sort().join(',');
  return `search:${names.join(',')}|exp:${expiring.join(',')}|${prefs.diet ?? ''}|${intolerances}`;
}

async function candidateRecipes(user, pantryItems) {
  const names = uniqueNames(pantryItems);
  const expiring = uniqueNames(pantryItems.filter((i) => expiresSoon(i)));
  const prefs = user.preferences ?? {};
  const key = searchKey(names, expiring, prefs);

  const cached = cache.get(key);
  if (cached) return { recipes: cached, fromCache: true };

  if (!(await consumeUsage(user, 'searches'))) throw new LimitError(limitReached('searches'));

  const [main, focused] = await Promise.all([
    searchRecipes(names, prefs),
    expiring.length ? searchRecipes(expiring, prefs, EXPIRING_RESULTS) : [],
  ]);
  const recipes = [...new Map([...focused, ...main].map((r) => [r.id, r])).values()];
  cache.set(key, recipes);
  return { recipes, fromCache: false };
}

module.exports = { candidateRecipes, LimitError };
