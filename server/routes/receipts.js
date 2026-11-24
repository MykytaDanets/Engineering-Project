const express = require('express');
const multer = require('multer');
const Pantry = require('../models/Pantry');
const authMiddleware = require('../middleware/auth');
const { loadScope, consumeUsage, refundUsage } = require('../middleware/plan');
const { notifyChange } = require('../utils/realtime');
const { readReceipt, prepareReceipt, learnCorrections } = require('../utils/receipt');
const { validateItem } = require('../utils/pantryItem');

const router = express.Router();
router.use(authMiddleware, loadScope);

const MAX_PHOTO_MB = 8;
const MAX_ITEMS = 100;
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_PHOTO_MB * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => cb(null, IMAGE_TYPES.includes(file.mimetype)),
});

function uploadPhoto(req, res, next) {
  upload.single('photo')(req, res, (err) => {
    if (err) {
      const message = err.code === 'LIMIT_FILE_SIZE' ? `Photo is too large (max ${MAX_PHOTO_MB} MB)` : err.message;
      return res.status(400).json({ message });
    }
    next();
  });
}

// POST /api/receipts/scan
router.post('/scan', uploadPhoto, async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'Upload a JPEG, PNG or WebP photo of the receipt.' });
  }

  const { user } = req;
  let useAi;
  try {
    useAi = await consumeUsage(user, 'receipts');
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }

  let receipt;
  try {
    receipt = await readReceipt(req.file.buffer, req.file.mimetype, { useAi });
  } catch (err) {
    if (useAi) await refundUsage(user, 'receipts');
    return res.status(502).json({ message: `Could not read the receipt: ${err.message}` });
  } finally {
    req.file.buffer = null;
  }

  if (useAi && receipt.reader !== 'ai') await refundUsage(user, 'receipts');

  if (!receipt.lines.length) {
    return res.status(422).json({ message: 'No products found on this photo. Try again with the whole receipt in good light.' });
  }

  try {
    res.json({ ...(await prepareReceipt(receipt)), basic: !useAi });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/receipts/confirm
router.post('/confirm', async (req, res) => {
  const { store = '', items } = req.body;
  if (!Array.isArray(items) || !items.length) {
    return res.status(400).json({ message: 'Select at least one item to add.' });
  }
  if (items.length > MAX_ITEMS) {
    return res.status(400).json({ message: `A receipt can have at most ${MAX_ITEMS} items.` });
  }
  for (const item of items) {
    const error = validateItem(item);
    if (error) return res.status(400).json({ message: error });
  }

  try {
    let pantry = await Pantry.findOne({ userId: req.dataId });
    if (!pantry) pantry = new Pantry({ userId: req.dataId, items: [] });

    let merged = 0;
    for (const item of items) {
      const name = item.name.trim();
      const expiryDate = item.expiryDate ? new Date(item.expiryDate) : null;
      const existing = pantry.items.find((p) =>
        p.name.toLowerCase() === name.toLowerCase() &&
        p.unit === item.unit &&
        (p.expiryDate?.getTime() ?? null) === (expiryDate?.getTime() ?? null)
      );

      if (existing) {
        existing.quantity = Math.round((existing.quantity + Number(item.quantity)) * 1000) / 1000;
        merged++;
      } else {
        pantry.items.push({ name, quantity: Number(item.quantity), unit: item.unit, category: item.category, expiryDate });
      }
    }
    await pantry.save();
    notifyChange(req, 'pantry');

    const learned = await learnCorrections(store, items, req.userId);
    res.json({ added: items.length - merged, merged, learned });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
