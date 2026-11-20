const express = require('express');
const Pantry = require('../models/Pantry');
const User = require('../models/User');
const authMiddleware = require('../middleware/auth');
const { getRecipe, spoonacularError } = require('../utils/spoonacular');
const { candidateRecipes, LimitError } = require('../utils/recipeSearch');
const { rankRecipes, cookRecipe } = require('../utils/matching');

const router = express.Router();
router.use(authMiddleware);

const MAX_SERVINGS = 50;

function sendError(res, err) {
  if (err instanceof LimitError) return res.status(429).json(err.body);
  const { status, message } = spoonacularError(err);
  res.status(status).json({ message });
}

function validId(req, res) {
  if (/^\d+$/.test(req.params.id)) return true;
  res.status(400).json({ message: 'Invalid recipe id' });
  return false;
}

// GET /api/recipes
router.get('/', async (req, res) => {
  try {
    const pantry = await Pantry.findOne({ userId: req.userId });
    const items = pantry?.items ?? [];
    if (items.length === 0) {
      return res.json({ recipes: [], message: 'Add ingredients to your pantry first.' });
    }

    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const { recipes, fromCache } = await candidateRecipes(user, items);
    res.json({ recipes: rankRecipes(recipes, items), fromCache });
  } catch (err) {
    sendError(res, err);
  }
});

// GET /api/recipes/:id/info
router.get('/:id/info', async (req, res) => {
  if (!validId(req, res)) return;
  try {
    const recipe = await getRecipe(req.params.id);
    res.json({
      id: recipe.id,
      title: recipe.title,
      image: recipe.image,
      readyInMinutes: recipe.readyInMinutes,
      servings: recipe.servings,
      sourceUrl: recipe.sourceUrl,
      summary: recipe.summary,
      ingredients: recipe.ingredients.map((i) => i.original),
      instructions: recipe.instructions,
    });
  } catch (err) {
    sendError(res, err);
  }
});

// POST /api/recipes/:id/cook
router.post('/:id/cook', async (req, res) => {
  if (!validId(req, res)) return;
  const servings = Number(req.body.servings);
  if (!(servings >= 1 && servings <= MAX_SERVINGS)) {
    return res.status(400).json({ message: `Servings must be between 1 and ${MAX_SERVINGS}` });
  }

  try {
    const pantry = await Pantry.findOne({ userId: req.userId });
    if (!pantry?.items.length) return res.status(400).json({ message: 'Your pantry is empty.' });

    const recipe = await getRecipe(req.params.id);
    const result = cookRecipe(recipe, servings, pantry);
    await pantry.save();
    res.json(result);
  } catch (err) {
    sendError(res, err);
  }
});

module.exports = router;
