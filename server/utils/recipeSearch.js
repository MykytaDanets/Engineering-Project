const cache = require('./cache');
const { consumeUsage, refundUsage, limitReached } = require('../middleware/plan');
const { searchRecipes } = require('./spoonacular');
const { expiresSoon } = require('./matching');

const EXPIRING_RESULTS = 8;
const EXPIRING_WAIT_MS = 3000;//after that finishes in the background and lands in the cache

class LimitError extends Error {
  constructor(body) {
    super(body.message);
    this.body = body;
  }
}

const merge = (focused, main) => [...new Map([...focused, ...main].map((r) => [r.id, r])).values()];

const uniqueNames =(items) => [...new Set(items.map((i) => i.name.toLowerCase().trim()))].sort();

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

  const focusedSearch = expiring.length ? searchRecipes(expiring, prefs, EXPIRING_RESULTS) : Promise.resolve([]);
  focusedSearch.catch(() => {});

  let main;
  try {
    main = await searchRecipes(names, prefs);
  } catch (err) {
    await refundUsage(user, 'searches');
    throw err;
  }

  const timeout = new Promise((resolve) => setTimeout(resolve, EXPIRING_WAIT_MS, null));
  const focused = await Promise.race([focusedSearch.catch(() => []), timeout]);
  if (focused) {
    const recipes = merge(focused, main);
    cache.set(key, recipes);
    return { recipes, fromCache: false };
  }

  cache.set(key, main);
  focusedSearch.then((late) => cache.set(key, merge(late, main))).catch(() => {});
  return { recipes: main, fromCache: false, partial: true };
}

module.exports = { candidateRecipes, LimitError };
