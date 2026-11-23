const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  quantity: { type: Number, required: true, min: 0 },
  unit: { type: String, required: true, trim: true },
  category: { type: String, required: true, trim: true },
  expiryDate: { type: Date, default: null },
  fromListItem: { type: String },//shopping list item id
});

const pantrySchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    items: [itemSchema],
  },
  { timestamps: true }
);

module.exports = mongoose.model('Pantry', pantrySchema);
