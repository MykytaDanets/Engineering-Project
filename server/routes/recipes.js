const express = require('express');
const axios = require('axios');
const Pantry = require('../models/Pantry');
const authMiddleware = require('../middleware/auth');
const cache = require('../utils/cache');

const router = express.Router();
router.use(authMiddleware);

const SPOONACULAR = 'https://api.spoonacular.com';

function levenshtein(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, (_, i) => [i]);
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    dp[i][0] = i;
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

function ingredientMatches(ingredientName, pantryItem) {
  const normalize = (s) => s.toLowerCase().trim().replace(/s$/, '');
  const words = ingredientName.toLowerCase().trim().split(/\s+/);
  const lastWord = normalize(words[words.length - 1]);
  const pantry = normalize(pantryItem);

  if (lastWord === pantry || normalize(ingredientName) === pantry) return true;

  if (lastWord.length >= 5 && pantry.length >= 5 && levenshtein(lastWord, pantry) <= 1) return true;

  return false;
}

function spoonacularKey() {
  const key = process.env.SPOONACULAR_API_KEY;
  if (!key || key === 'your_spoonacular_api_key_here') {
    throw new Error('SPOONACULAR_API_KEY is not configured in .env');
  }
  return key;
}

// GET /api/recipes  – find recipes by pantry ingredients
router.get('/', async (req, res) => {
  try {
    const apiKey = spoonacularKey();

    const pantry = await Pantry.findOne({ userId: req.userId });
    const items = pantry?.items ?? [];

    if (items.length === 0) {
      return res.json({ recipes: [], message: 'Add ingredients to your pantry first.' });
    }

    const ingredientNames = items.map((i) => i.name).sort();
    const cacheKey = `recipes:${ingredientNames.join(',')}`;

    const cached = cache.get(cacheKey);
    if (cached) return res.json({ recipes: cached, fromCache: true });

    const { data } = await axios.get(`${SPOONACULAR}/recipes/findByIngredients`, {
      params: {
        apiKey,
        ingredients: ingredientNames.join(','),
        number: 12,
        ranking: 2,
        ignorePantry: false,
      },
    });

    const recipes = data.map((r) => {
      const missedIngredientNames = r.missedIngredients.map((i) => i.name);

      const matchedPantryItems = ingredientNames.filter((pantryItem) =>
        r.usedIngredients.some((used) => ingredientMatches(used.name, pantryItem))
      );

      const used = matchedPantryItems.length;
      const missed = r.missedIngredientCount;
      const total = used + missed;

      return {
        id: r.id,
        title: r.title,
        image: r.image,
        usedIngredientCount: used,
        missedIngredientCount: missed,
        matchPercent: total > 0 ? Math.round((used / total) * 100) : 0,
        missedIngredients: missedIngredientNames,
        usedIngredients: matchedPantryItems,
      };
    });

    recipes.sort((a, b) => b.matchPercent - a.matchPercent);

    cache.set(cacheKey, recipes);
    res.json({ recipes });
  } catch (err) {
    if (err.message.includes('SPOONACULAR_API_KEY')) {
      return res.status(503).json({ message: err.message });
    }
    if (err.response?.status === 401 || err.response?.status === 402) {
      return res.status(503).json({ message: 'Invalid or exhausted Spoonacular API key.' });
    }
    res.status(500).json({ message: err.message });
  }
});

// GET /api/recipes/:id/info  – full recipe detail
router.get('/:id/info', async (req, res) => {
  try {
    const apiKey = spoonacularKey();
    const { id } = req.params;
    const cacheKey = `recipe-info:${id}`;

    const cached = cache.get(cacheKey);
    if (cached) return res.json(cached);

    const { data } = await axios.get(`${SPOONACULAR}/recipes/${id}/information`, {
      params: { apiKey, includeNutrition: false },
    });

    const info = {
      id: data.id,
      title: data.title,
      image: data.image,
      readyInMinutes: data.readyInMinutes,
      servings: data.servings,
      sourceUrl: data.sourceUrl,
      summary: data.summary?.replace(/<[^>]*>/g, '') ?? '',
      ingredients: data.extendedIngredients?.map((i) => i.original) ?? [],
      instructions: data.instructions?.replace(/<[^>]*>/g, '') ?? '',
    };

    cache.set(cacheKey, info);
    res.json(info);
  } catch (err) {
    if (err.message.includes('SPOONACULAR_API_KEY')) {
      return res.status(503).json({ message: err.message });
    }
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
