const { CATEGORIES, UNITS } = require('../config/pantry');

function validateItem(item) {
  const name = String(item.name ?? '').trim();
  const quantity = Number(item.quantity);
  if (!name) return 'Every item needs a name';
  if (!(quantity >= 0)) return `Invalid quantity for "${name}"`;
  if (!UNITS.includes(item.unit)) return `Invalid unit for "${name}"`;
  if (!CATEGORIES.includes(item.category)) return `Invalid category for "${name}"`;
  if (item.expiryDate && isNaN(new Date(item.expiryDate))) return `Invalid expiry date for "${name}"`;
  return null;
}

const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1);

module.exports = { validateItem, capitalize };
