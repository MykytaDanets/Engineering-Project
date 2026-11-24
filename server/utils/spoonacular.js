const axios = require('axios');
const cache = require('./cache');

const BASE_URL = 'https://api.spoonacular.com';
const SEARCH_RESULTS = 12;
const TIMEOUT_MS = 20000;

function apiKey() {
  const key = process.env.SPOONACULAR_API_KEY;
  if (!key || key === 'your_spoonacular_api_key_here') {
    throw new Error('SPOONACULAR_API_KEY is not configured in .env');
  }
  return key;
}

const stripHtml = (s) => s?.replace(/<[^>]*>/g, '') ?? '';

function mapRecipe(raw) {
  return {
    id: raw.id,
    title: raw.title,
    image: raw.image,
    servings: raw.servings || 1,
    readyInMinutes: raw.readyInMinutes,
    sourceUrl: raw.sourceUrl,
    summary: stripHtml(raw.summary),
    instructions: stripHtml(raw.instructions),
    ingredients: (raw.extendedIngredients ?? []).map((i) => ({
      name: (i.name || i.originalName || '').toLowerCase(),
      amount: i.measures?.metric?.amount ?? i.amount ?? 0,
      unit: i.measures?.metric?.unitShort ?? i.unit ?? '',
      aisle: (i.aisle || 'Other').split(';')[0],
      original: i.original,
    })),
  };
}

async function searchRecipes(ingredientNames, { diet = '', intolerances = [] } = {}, number = SEARCH_RESULTS) {
  const { data } = await axios.get(`${BASE_URL}/recipes/complexSearch`, {
    params: {
      apiKey: apiKey(),
      includeIngredients: ingredientNames.join(','),
      sort: 'max-used-ingredients',
      fillIngredients: true,
      addRecipeInformation: true,
      instructionsRequired: true,
      number,
      diet: diet || undefined,
      intolerances: intolerances.length ? intolerances.join(',') : undefined,
    },
    timeout: TIMEOUT_MS,
  });
  const recipes = data.results.map(mapRecipe);
  recipes.forEach((r) => cache.set(`recipe:${r.id}`, r));
  return recipes;
}

async function getRecipes(ids) {
  const unique = [...new Set(ids.map(Number))];
  const found = new Map(unique.map((id) => [id, cache.get(`recipe:${id}`)]).filter(([, r]) => r));
  const missing = unique.filter((id) => !found.has(id));

  if (missing.length) {
    const { data } = await axios.get(`${BASE_URL}/recipes/informationBulk`, {
      params: { apiKey: apiKey(), ids: missing.join(','), includeNutrition: false },
      timeout: TIMEOUT_MS,
    });
    data.map(mapRecipe).forEach((r) => {
      cache.set(`recipe:${r.id}`, r);
      found.set(r.id, r);
    });
  }
  return found;
}

async function getRecipe(id) {
  const recipe = (await getRecipes([id])).get(Number(id));
  if (!recipe) throw Object.assign(new Error('Recipe not found'), { status: 404 });
  return recipe;
}

function spoonacularError(err) {
  if (err.message.includes('SPOONACULAR_API_KEY')) return { status: 503, message: err.message };
  if (err.code === 'ECONNABORTED') return { status: 504, message: 'Recipe search is slow right now. Try again in a minute.' };
  if ([401, 402].includes(err.response?.status)) return { status: 503, message: 'Invalid or exhausted Spoonacular API key.' };
  if (err.status === 404 || err.response?.status === 404) return { status: 404, message: 'Recipe not found' };
  return { status: 500, message: err.message };
}

module.exports = { searchRecipes, getRecipes, getRecipe, spoonacularError };
