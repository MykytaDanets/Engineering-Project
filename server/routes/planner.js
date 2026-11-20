const express = require('express');
const MealPlan = require('../models/MealPlan');
const Pantry = require('../models/Pantry');
const authMiddleware = require('../middleware/auth');
const { requirePremium } = require('../middleware/plan');
const { candidateRecipes, LimitError } = require('../utils/recipeSearch');
const { rankRecipes } = require('../utils/matching');
const { spoonacularError } = require('../utils/spoonacular');
const { weekStart } = require('../utils/week');
const { DIETS, INTOLERANCES } = require('../config/diets');

const router = express.Router();
router.use(authMiddleware, requirePremium);

const MAX_PER_DAY = 6;
const MAX_SERVINGS = 20;

function sendError(res, err) {
  if (err instanceof LimitError) return res.status(429).json(err.body);
  const { status, message } = spoonacularError(err);
  res.status(status).json({ message });
}

async function findPlan(userId, week) {
  return (await MealPlan.findOne({ userId, weekStart: week })) ?? new MealPlan({ userId, weekStart: week, entries: [] });
}

const validDay = (d) => Number.isInteger(d) && d >= 0 && d <= 6;
const validServings = (s) => Number.isInteger(s) && s >= 1 && s <= MAX_SERVINGS;
const perDay = (plan, day) => plan.entries.filter((e) => e.day === day).length;

function readWeek(req, res) {
  const week = weekStart(req.query.week ?? req.body?.week);
  if (!week) res.status(400).json({ message: 'Invalid week' });
  return week;
}

// GET /api/planner/preferences
router.get('/preferences', (req, res) => {
  res.json({ preferences: req.user.preferences, diets: DIETS, intolerances: INTOLERANCES });
});

// PUT /api/planner/preferences
router.put('/preferences', async (req, res) => {
  const { diet = '', intolerances = [], servings = 2 } = req.body;
  if (!DIETS.includes(diet)) return res.status(400).json({ message: 'Unknown diet' });
  if (!Array.isArray(intolerances) || !intolerances.every((i) => INTOLERANCES.includes(i))) {
    return res.status(400).json({ message: 'Unknown intolerance' });
  }
  if (!validServings(Number(servings))) return res.status(400).json({ message: `Servings must be 1–${MAX_SERVINGS}` });

  try {
    req.user.preferences = { diet, intolerances, servings: Number(servings) };
    await req.user.save();
    res.json({ preferences: req.user.preferences });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/planner
router.get('/', async (req, res) => {
  const week = readWeek(req, res);
  if (!week) return;
  try {
    res.json(await findPlan(req.userId, week));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/planner/entries
router.post('/entries', async (req, res) => {
  const week = readWeek(req, res);
  if (!week) return;
  const { recipeId, title, image = '', readyInMinutes } = req.body;
  const day = Number(req.body.day);
  const servings = Number(req.body.servings ?? req.user.preferences.servings);

  if (!validDay(day)) return res.status(400).json({ message: 'Invalid day' });
  if (!validServings(servings)) return res.status(400).json({ message: `Servings must be 1–${MAX_SERVINGS}` });
  if (!Number.isInteger(Number(recipeId)) || !title) return res.status(400).json({ message: 'Recipe id and title are required' });

  try {
    const plan = await findPlan(req.userId, week);
    if (perDay(plan, day) >= MAX_PER_DAY) return res.status(400).json({ message: `At most ${MAX_PER_DAY} meals per day` });
    plan.entries.push({ day, recipeId: Number(recipeId), title, image, servings, readyInMinutes });
    await plan.save();
    res.status(201).json(plan);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PATCH /api/planner/entries/:entryId
router.patch('/entries/:entryId', async (req, res) => {
  const week = readWeek(req, res);
  if (!week) return;
  try {
    const plan = await MealPlan.findOne({ userId: req.userId, weekStart: week });
    const entry = plan?.entries.id(req.params.entryId);
    if (!entry) return res.status(404).json({ message: 'Meal not found' });

    if (req.body.day != null) {
      const day = Number(req.body.day);
      if (!validDay(day)) return res.status(400).json({ message: 'Invalid day' });
      if (day !== entry.day && perDay(plan, day) >= MAX_PER_DAY) {
        return res.status(400).json({ message: `At most ${MAX_PER_DAY} meals per day` });
      }
      entry.day = day;
    }
    if (req.body.servings != null) {
      const servings = Number(req.body.servings);
      if (!validServings(servings)) return res.status(400).json({ message: `Servings must be 1–${MAX_SERVINGS}` });
      entry.servings = servings;
    }

    await plan.save();
    res.json(plan);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/planner/entries/:entryId
router.delete('/entries/:entryId', async (req, res) => {
  const week = readWeek(req, res);
  if (!week) return;
  try {
    const plan = await MealPlan.findOne({ userId: req.userId, weekStart: week });
    const entry = plan?.entries.id(req.params.entryId);
    if (!entry) return res.status(404).json({ message: 'Meal not found' });
    entry.deleteOne();
    await plan.save();
    res.json(plan);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/planner/autofill
router.post('/autofill', async (req, res) => {
  const week = readWeek(req, res);
  if (!week) return;

  try {
    const pantry = await Pantry.findOne({ userId: req.userId });
    const items = pantry?.items ?? [];
    if (!items.length) return res.status(400).json({ message: 'Add ingredients to your pantry first.' });

    const plan = await findPlan(req.userId, week);
    const emptyDays = [0, 1, 2, 3, 4, 5, 6].filter((d) => perDay(plan, d) === 0);
    if (!emptyDays.length) return res.status(400).json({ message: 'Every day already has a meal.' });

    const { recipes } = await candidateRecipes(req.user, items);
    const planned = new Set(plan.entries.map((e) => e.recipeId));
    const ranked = rankRecipes(recipes, items)
      .filter((r) => !planned.has(r.id))
      .sort((a, b) => b.expiring.length - a.expiring.length || b.score - a.score);

    const servings = req.user.preferences.servings;
    emptyDays.slice(0, ranked.length).forEach((day, i) => {
      const r = ranked[i];
      plan.entries.push({ day, recipeId: r.id, title: r.title, image: r.image, servings, readyInMinutes: r.readyInMinutes });
    });

    await plan.save();
    res.json({ plan, filled: Math.min(emptyDays.length, ranked.length), emptyDays: emptyDays.length });
  } catch (err) {
    sendError(res, err);
  }
});

module.exports = router;
