const express = require('express');
const Pantry = require('../models/Pantry');
const authMiddleware = require('../middleware/auth');
const { loadScope } = require('../middleware/plan');
const { notifyChange } = require('../utils/realtime');

const router = express.Router();
router.use(authMiddleware, loadScope);

async function getOrCreatePantry(userId) {
  let pantry = await Pantry.findOne({ userId });
  if (!pantry) pantry = await Pantry.create({ userId, items: [] });
  return pantry;
}

// GET /api/pantry
router.get('/', async (req, res) => {
  try {
    const pantry = await getOrCreatePantry(req.dataId);
    res.json(pantry.items);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

function parseExpiry(value) {
  if (value === '' || value == null) return null;
  const date = new Date(value);
  return isNaN(date) ? undefined : date;
}

// POST /api/pantry/items
router.post('/items', async (req, res) => {
  const { name, quantity, unit, category } = req.body;
  if (!name || quantity == null || !unit || !category) {
    return res.status(400).json({ message: 'All fields are required' });
  }
  const expiryDate = parseExpiry(req.body.expiryDate);
  if (expiryDate === undefined) {
    return res.status(400).json({ message: 'Invalid expiry date' });
  }
  try {
    const pantry = await getOrCreatePantry(req.dataId);
    pantry.items.push({ name, quantity, unit, category, expiryDate });
    await pantry.save();
    notifyChange(req, 'pantry');
    const added = pantry.items[pantry.items.length - 1];
    res.status(201).json(added);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/pantry/items/:itemId
router.put('/items/:itemId', async (req, res) => {
  const { name, quantity, unit, category } = req.body;
  try {
    const pantry = await Pantry.findOne({ userId: req.dataId });
    if (!pantry) return res.status(404).json({ message: 'Pantry not found' });

    const item = pantry.items.id(req.params.itemId);
    if (!item) return res.status(404).json({ message: 'Item not found' });

    if (name != null) item.name = name;
    if (quantity != null) item.quantity = quantity;
    if (unit != null) item.unit = unit;
    if (category != null) item.category = category;
    if (req.body.expiryDate !== undefined) {
      const expiryDate = parseExpiry(req.body.expiryDate);
      if (expiryDate === undefined) return res.status(400).json({ message: 'Invalid expiry date' });
      if (expiryDate?.getTime() !== item.expiryDate?.getTime()) item.reminded = false;
      item.expiryDate = expiryDate;
    }

    await pantry.save();
    notifyChange(req, 'pantry');
    res.json(item);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/pantry/items/remove
router.post('/items/remove', async (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids) || !ids.length) return res.status(400).json({ message: 'No items selected' });
  try {
    const pantry = await Pantry.findOne({ userId: req.dataId });
    if (!pantry) return res.status(404).json({ message: 'Pantry not found' });

    const remove = new Set(ids.map(String));
    const before = pantry.items.length;
    pantry.items = pantry.items.filter((i) => !remove.has(i._id.toString()));
    await pantry.save();
    notifyChange(req, 'pantry');
    res.json({ removed: before - pantry.items.length });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/pantry/items/:itemId
router.delete('/items/:itemId', async (req, res) => {
  try {
    const pantry = await Pantry.findOne({ userId: req.dataId });
    if (!pantry) return res.status(404).json({ message: 'Pantry not found' });

    const item = pantry.items.id(req.params.itemId);
    if (!item) return res.status(404).json({ message: 'Item not found' });

    item.deleteOne();
    await pantry.save();
    notifyChange(req, 'pantry');
    res.json({ message: 'Item removed' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
