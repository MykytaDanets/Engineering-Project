const trim = (n, places = 2) => String(Number(n.toFixed(places)));

const small = (n) => (n >= 10 ? String(Math.round(n)) : trim(n, 1));

export function formatQuantity(quantity, unit) {
  const q = Number(quantity) || 0;
  if (unit === 'kg') return q < 1 ? `${small(q * 1000)} g` : `${trim(q)} kg`;
  if (unit === 'L') return q < 1 ? `${small(q * 1000)} ml` : `${trim(q)} L`;
  if (unit === 'g') return q >= 1000 ? `${trim(q / 1000)} kg` : `${small(q)} g`;
  if (unit === 'ml') return q >= 1000 ? `${trim(q / 1000)} L` : `${small(q)} ml`;
  return `${trim(q)} ${unit}`;
}

export const capitalize = (s = '') => s.charAt(0).toUpperCase() + s.slice(1);

const DAY_MS = 24 * 60 * 60 * 1000;

export function daysUntil(date) {
  const now = new Date();
  const todayUtc = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((new Date(date).getTime() - todayUtc) / DAY_MS);
}
