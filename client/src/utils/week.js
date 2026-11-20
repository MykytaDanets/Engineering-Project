const pad = (n) => String(n).padStart(2, '0');

const toIso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

function fromIso(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function mondayOf(date = new Date()) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return toIso(d);
}

export function addDays(iso, days) {
  const d = fromIso(iso);
  d.setDate(d.getDate() + days);
  return toIso(d);
}

export const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export const shortDate = (iso) => fromIso(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
