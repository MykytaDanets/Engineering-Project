const { singular } = require('./text');

const UNITS = {
  g: ['mass', 1], gram: ['mass', 1], gr: ['mass', 1],
  kg: ['mass', 1000], kilogram: ['mass', 1000],
  oz: ['mass', 28.35], ounce: ['mass', 28.35],
  lb: ['mass', 453.6], pound: ['mass', 453.6],
  ml: ['volume', 1], milliliter: ['volume', 1], millilitre: ['volume', 1],
  l: ['volume', 1000], liter: ['volume', 1000], litre: ['volume', 1000],
  tsp: ['volume', 4.93], teaspoon: ['volume', 4.93],
  tbsp: ['volume', 14.79], tablespoon: ['volume', 14.79],
  cup: ['volume', 240], c: ['volume', 240],
  'fl oz': ['volume', 29.57], pint: ['volume', 473], quart: ['volume', 946],
  pinch: ['tiny', 0], dash: ['tiny', 0], 'to taste': ['tiny', 0],
  small: ['count', 0.7], medium: ['count', 1], large: ['count', 1.3], 'extra large': ['count', 1.5],
};

const DENSITY = {//g per ml, everything else counts as 1
  flour: 0.53, sugar: 0.85, 'brown sugar': 0.83, 'powdered sugar': 0.5, butter: 0.96,
  rice: 0.85, oat: 0.4, 'rolled oat': 0.4, milk: 1.03, oil: 0.92, honey: 1.42,
  salt: 1.2, 'baking powder': 0.9, 'baking soda': 0.9, cocoa: 0.42, 'cocoa powder': 0.42,
  cheese: 0.45, parmesan: 0.4, yogurt: 1.03, breadcrumb: 0.45, cornstarch: 0.55,
  onion: 0.65, carrot: 0.55, 'bell pepper': 0.5, mushroom: 0.3, spinach: 0.13, kale: 0.15,
};

const PIECE_WEIGHT = {//g per medium piece
  potato: 170, 'sweet potato': 150, onion: 110, 'red onion': 110, shallot: 40, tomato: 120,
  'cherry tomato': 15, egg: 50, carrot: 60, apple: 180, banana: 120, lemon: 100, lime: 65,
  orange: 150, garlic: 5, 'garlic clove': 5, clove: 5, 'bell pepper': 150, cucumber: 300,
  zucchini: 200, courgette: 200, avocado: 170, mushroom: 18, pear: 180, peach: 150,
  eggplant: 450, aubergine: 450, leek: 150, 'chicken breast': 200, 'bread roll': 60,
};

const round = (n, places = 3) => Math.round(n * 10 ** places) / 10 ** places;

function unitInfo(unit = '') {
  const key = unit.toLowerCase().trim().replace(/\.$/, '');
  const [dim, factor] = UNITS[key] ?? UNITS[key.replace(/s$/, '')] ?? UNITS[key.replace(/es$/, '')] ?? ['count', 1];
  return { dim, factor };
}

function toBase(amount, unit) {
  const { dim, factor } = unitInfo(unit);
  return { dim, value: (Number(amount) || 0) * factor };
}

function lookup(table, name = '') {
  const key = singular(name);
  return table[key] ?? table[singular(key.split(/\s+/).pop())];
}

function toMass({ dim, value }, name) {
  if (dim === 'mass') return value;
  if (dim === 'volume') return value * (lookup(DENSITY, name) ?? 1);
  if (dim === 'count') {
    const weight = lookup(PIECE_WEIGHT, name);
    return weight ? value * weight : null;
  }
  return null;
}

function fromMass(mass, dim, name) {
  if (dim === 'mass') return mass;
  if (dim === 'volume') return mass / (lookup(DENSITY, name) ?? 1);
  if (dim === 'count') {
    const weight = lookup(PIECE_WEIGHT, name);
    return weight ? mass / weight : null;
  }
  return null;
}

function convertTo(dim, amount, unit, name) {
  const base = toBase(amount, unit);
  if (base.dim === dim) return base.value;
  const mass = toMass(base, name);
  return mass === null ? null : fromMass(mass, dim, name);
}

function friendly(dim, value) {
  if (dim === 'mass') return value >= 1000 ? { quantity: round(value / 1000, 2), unit: 'kg' } : { quantity: Math.ceil(value), unit: 'g' };
  if (dim === 'volume') {
    if (value >= 1000) return { quantity: round(value / 1000, 2), unit: 'L' };
    if (value < 15) return { quantity: Math.ceil((value / 4.93) * 2) / 2, unit: 'tsp' };
    if (value < 60) return { quantity: Math.ceil((value / 14.79) * 2) / 2, unit: 'tbsp' };
    return { quantity: Math.ceil(value), unit: 'ml' };
  }
  return { quantity: Math.ceil(value), unit: 'pcs' };
}

function roundForUnit(quantity, unit) {
  if (['kg', 'L'].includes(unit)) return round(quantity, 3);
  if (['g', 'ml'].includes(unit)) return round(quantity, quantity >= 10 ? 0 : 1);
  return round(quantity, 2);
}

function display(dim, value) {
  const small = (v) => (v >= 10 ? Math.round(v) : round(v, 1));
  if (dim === 'mass') return value >= 1000 ? { amount: round(value / 1000, 2), unit: 'kg' } : { amount: small(value), unit: 'g' };
  if (dim === 'volume') return value >= 1000 ? { amount: round(value / 1000, 2), unit: 'L' } : { amount: small(value), unit: 'ml' };
  return { amount: round(value, 2), unit: 'pcs' };
}

module.exports = { toBase, convertTo, friendly, display, roundForUnit, round };
