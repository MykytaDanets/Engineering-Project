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
const MAX_OPS = 500;
const MANUAL_AISLE = 'Added by you';
const OBJECT_ID = /^[a-f\d]{24}$/i;

async function findList(userId) {
  return (await ShoppingList.findOne({ userId })) ?? new ShoppingList({ userId, items: [] });
}

function newItem(body) {
  const name = String(body.name ?? '').trim();
  const quantity = Number(body.quantity ?? 1);
  const unit = body.unit ?? 'pcs';
  if (!name) return { error: 'Name is required' };
  if (!(quantity > 0)) return { error: 'Enter a valid quantity' };
  if (!UNITS.includes(unit)) return { error: 'Invalid unit' };
  return { item: { name, quantity, unit, aisle: MANUAL_AISLE, manual: true } };
}

const findItem = (list, id) => (OBJECT_ID.test(id) ? list.items.id(id) : null);

function moveToPantry(list, pantry, items) {
  let moved = 0;
  for (const item of items) {
    const id = String(item.id);
    if (!item.add || validateItem(item) || pantry.items.some((p) => p.fromListItem === id)) continue;
    pantry.items.push({
      name: capitalize(item.name.trim()),
      quantity: Number(item.quantity),
      unit: item.unit,
      category: item.category,
      expiryDate: item.expiryDate ? new Date(item.expiryDate) : null,
      fromListItem: id,
    });
    moved++;
  }
  const done = new Set(items.map((i) => String(i.id)));
  list.items = list.items.filter((i) => !done.has(i._id.toString()));
  return moved;
}

function applyOp(list, op, pantry) {
  switch (op?.type) {
    case 'add': {
      const id = op.item?._id;
      if (!OBJECT_ID.test(id) || list.items.id(id) || list.items.length >= MAX_ITEMS) return;
      const { item } = newItem(op.item);
      if (item) list.items.push({ ...item, _id: id });
      return;
    }
    case 'check': {
      const item = findItem(list, op.id);
      if (item) item.checked = Boolean(op.checked);
      return;
    }
    case 'remove':
      findItem(list, op.id)?.deleteOne();
      return;
    case 'clearChecked':
      list.items = list.items.filter((i) => !i.checked);
      return;
    case 'toPantry':
      if (Array.isArray(op.items)) moveToPantry(list, pantry, op.items.slice(0, MAX_ITEMS));
  }
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
  const { item, error } = newItem(req.body);
  if (error) return res.status(400).json({ message: error });

  try {
    const list = await findList(req.userId);
    if (list.items.length >= MAX_ITEMS) return res.status(400).json({ message: `At most ${MAX_ITEMS} items` });
    list.items.push(item);
    await list.save();
    res.status(201).json(list);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/shopping/sync
router.post('/sync', async (req, res) => {
  const { ops } = req.body;
  if (!Array.isArray(ops) || ops.length > MAX_OPS) return res.status(400).json({ message: 'Invalid changes' });

  try {
    const list = await findList(req.userId);
    const pantry = ops.some((op) => op?.type === 'toPantry')
      ? (await Pantry.findOne({ userId: req.userId })) ?? new Pantry({ userId: req.userId, items: [] })
      : null;
    ops.forEach((op) => applyOp(list, op, pantry));
    await Promise.all([list.save(), pantry?.save()]);
    res.json(list);
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
    const moved = moveToPantry(list, pantry, items);
    await Promise.all([pantry.save(), list.save()]);
    res.json({ list, moved });
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
