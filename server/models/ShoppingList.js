const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  quantity: { type: Number, required: true, min: 0 },
  unit: { type: String, required: true },
  aisle: { type: String, default: 'Other' },
  category: { type: String, default: 'Other' },
  checked: { type: Boolean, default: false },
  manual: { type: Boolean, default: false },
  recipes: { type: [String], default: [] },
  note: { type: String, default: '' },
});

const shoppingListSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    weekStart: { type: String, default: '' },
    generatedAt: { type: Date },
    items: [itemSchema],
  },
  { timestamps: true, optimisticConcurrency: true }
);

module.exports = mongoose.model('ShoppingList', shoppingListSchema);
