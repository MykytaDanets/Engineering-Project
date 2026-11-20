const mongoose = require('mongoose');

const entrySchema = new mongoose.Schema({
  day: { type: Number, required: true, min: 0, max: 6 },//0 = Monday
  recipeId: { type: Number, required: true },
  title: { type: String, required: true },
  image: { type: String, default: '' },
  servings: { type: Number, required: true, min: 1, max: 20 },
  readyInMinutes: { type: Number },
});

const mealPlanSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    weekStart: { type: String, required: true },//Monday, YYYY-MM-DD
    entries: [entrySchema],
  },
  { timestamps: true }
);

mealPlanSchema.index({ userId: 1, weekStart: 1 }, { unique: true });

module.exports = mongoose.model('MealPlan', mealPlanSchema);
