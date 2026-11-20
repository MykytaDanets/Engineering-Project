const { toBase, convertTo, friendly } = require('./units');
const { isStaple, pantryFor } = require('./matching');

const BASE_UNIT = { mass: 'g', volume: 'ml', count: 'pcs' };

const AISLE_CATEGORIES = [
  [/produce|fruit|vegetable/i, 'Fruits & Vegetables'],
  [/milk|egg|dairy|cheese/i, 'Dairy'],
  [/meat|seafood|fish/i, 'Meat & Fish'],
  [/bread|bakery|pasta|rice|cereal|grain/i, 'Bread & Grains'],
  [/spice|seasoning|condiment|oil|vinegar|dressing|sauce/i, 'Sauces & Spices'],
  [/beverage|drink|tea|coffee|juice|wine|beer/i, 'Drinks'],
  [/canned|jarred|baking|nut|dried|snack|frozen|ethnic/i, 'Canned & Dry Goods'],
];

function aisleToCategory(aisle = '') {
  return AISLE_CATEGORIES.find(([pattern]) => pattern.test(aisle))?.[1] ?? 'Other';
}

function mergeIngredients(plan, recipes) {
  const merged = new Map();

  for (const entry of plan.entries) {
    const recipe = recipes.get(entry.recipeId);
    if (!recipe) continue;
    const factor = entry.servings / recipe.servings;

    for (const ingredient of recipe.ingredients) {
      if (isStaple(ingredient.name)) continue;
      const { dim, value } = toBase(ingredient.amount * factor, ingredient.unit);
      if (dim === 'tiny') continue;

      const item = merged.get(ingredient.name) ?? { name: ingredient.name, aisle: ingredient.aisle || 'Other', amounts: {}, recipes: new Set() };
      const bucket = Object.keys(item.amounts).find((d) => convertTo(d, 1, BASE_UNIT[dim], ingredient.name) !== null) ?? dim;
      const amount = bucket === dim ? value : convertTo(bucket, value, BASE_UNIT[dim], ingredient.name);
      item.amounts[bucket] = (item.amounts[bucket] ?? 0) + amount;
      item.recipes.add(recipe.title);
      merged.set(ingredient.name, item);
    }
  }
  return [...merged.values()];
}

function subtractPantry(items, pantryItems) {
  const result = [];

  for (const item of items) {
    const stock = pantryFor(item.name, pantryItems);

    for (const [dim, needed] of Object.entries(item.amounts)) {
      const have = stock
        .map((p) => convertTo(dim, p.quantity, p.unit, item.name))
        .filter((v) => v !== null)
        .reduce((sum, v) => sum + v, 0);
      const toBuy = needed - have;
      if (toBuy <= 0.001) continue;

      const otherUnits = stock.filter((p) => convertTo(dim, 1, p.unit, item.name) === null);
      result.push({
        name: item.name,
        ...friendly(dim, toBuy),
        aisle: item.aisle,
        category: aisleToCategory(item.aisle),
        recipes: [...item.recipes],
        note: otherUnits.length ? `In pantry: ${otherUnits.map((p) => `${p.quantity} ${p.unit}`).join(', ')}` : '',
      });
    }
  }
  return result;
}

function buildShoppingItems(plan, recipes, pantryItems) {
  return subtractPantry(mergeIngredients(plan, recipes), pantryItems)
    .sort((a, b) => a.aisle.localeCompare(b.aisle) || a.name.localeCompare(b.name));
}

module.exports = { buildShoppingItems };
