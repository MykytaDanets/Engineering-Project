const express = require('express');
const ShoppingList = require('../models/ShoppingList');
const MealPlan = require('../models/MealPlan');
const Pantry = require('../models/Pantry');
const authMiddleware = require('../middleware/auth');
const { requirePremium } = require('../middleware/plan');
const { getRecipes, spoonacularError } = require('../utils/spoonacular');
const { buildShoppingItems } = require('../utils/shopping');
const { validateItem, capitalize } = require('../utils/pantryItem');
const { weekStart } = require('../utils/week');
const { UNITS } = require('../config/pantry');

const router = express.Router();
router.use(authMiddleware, requirePremium);

const MAX_ITEMS = 300;

async function findList(userId) {
  return (await ShoppingList.findOne({ userId })) ?? new ShoppingList({ userId, items: [] });
}

// GET /api/shopping
router.get('/', async (req, res) => {
  try {
    res.json(await findList(req.userId));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/shopping/generate
router.post('/generate', async (req, res) => {
  const week = weekStart(req.body.week);
  if (!week) return res.status(400).json({ message: 'Invalid week' });

  try {
    const plan = await MealPlan.findOne({ userId: req.userId, weekStart: week });
    if (!plan?.entries.length) return res.status(400).json({ message: 'Plan some meals for this week first.' });

    const [recipes, pantry, list] = await Promise.all([
      getRecipes(plan.entries.map((e) => e.recipeId)),
      Pantry.findOne({ userId: req.userId }),
      findList(req.userId),
    ]);

    const generated = buildShoppingItems(plan, recipes, pantry?.items ?? []);
    list.items = [...generated, ...list.items.filter((i) => i.manual)];
    list.weekStart = week;
    list.generatedAt = new Date();
    await list.save();
    res.json(list);
  } catch (err) {
    const { status, message } = spoonacularError(err);
    res.status(status).json({ message });
  }
});

// POST /api/shopping/items
router.post('/items', async (req, res) => {
  const name = String(req.body.name ?? '').trim();
  const quantity = Number(req.body.quantity ?? 1);
  const unit = req.body.unit ?? 'pcs';
  if (!name) return res.status(400).json({ message: 'Name is required' });
  if (!(quantity > 0)) return res.status(400).json({ message: 'Enter a valid quantity' });
  if (!UNITS.includes(unit)) return res.status(400).json({ message: 'Invalid unit' });

  try {
    const list = await findList(req.userId);
    if (list.items.length >= MAX_ITEMS) return res.status(400).json({ message: `At most ${MAX_ITEMS} items` });
    list.items.push({ name, quantity, unit, aisle: 'Added by you', manual: true });
    await list.save();
    res.status(201).json(list);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PATCH /api/shopping/items/:itemId
router.patch('/items/:itemId', async (req, res) => {
  try {
    const list = await ShoppingList.findOne({ userId: req.userId });
    const item = list?.items.id(req.params.itemId);
    if (!item) return res.status(404).json({ message: 'Item not found' });

    if (req.body.checked != null) item.checked = Boolean(req.body.checked);
    if (req.body.quantity != null) {
      const quantity = Number(req.body.quantity);
      if (!(quantity > 0)) return res.status(400).json({ message: 'Enter a valid quantity' });
      item.quantity = quantity;
    }

    await list.save();
    res.json(list);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/shopping/items/:itemId
router.delete('/items/:itemId', async (req, res) => {
  try {
    const list = await ShoppingList.findOne({ userId: req.userId });
    const item = list?.items.id(req.params.itemId);
    if (!item) return res.status(404).json({ message: 'Item not found' });
    item.deleteOne();
    await list.save();
    res.json(list);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/shopping/to-pantry
router.post('/to-pantry', async (req, res) => {
  const { items } = req.body;
  if (!Array.isArray(items) || !items.length) return res.status(400).json({ message: 'Tick the items you bought first.' });
  const toAdd = items.filter((i) => i.add);
  for (const item of toAdd) {
    const error = validateItem(item);
    if (error) return res.status(400).json({ message: error });
  }

  try {
    const list = await ShoppingList.findOne({ userId: req.userId });
    if (!list) return res.status(404).json({ message: 'Shopping list not found' });

    const pantry = (await Pantry.findOne({ userId: req.userId })) ?? new Pantry({ userId: req.userId, items: [] });
    for (const item of toAdd) {
      pantry.items.push({
        name: capitalize(item.name.trim()),
        quantity: Number(item.quantity),
        unit: item.unit,
        category: item.category,
        expiryDate: item.expiryDate ? new Date(item.expiryDate) : null,
      });
    }

    const done = new Set(items.map((i) => String(i.id)));
    list.items = list.items.filter((i) => !done.has(i._id.toString()));
    await Promise.all([pantry.save(), list.save()]);
    res.json({ list, moved: toAdd.length });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/shopping/clear-checked
router.post('/clear-checked', async (req, res) => {
  try {
    const list = await findList(req.userId);
    list.items = list.items.filter((i) => !i.checked);
    await list.save();
    res.json(list);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
