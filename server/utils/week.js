const DATE = /^\d{4}-\d{2}-\d{2}$/;

function weekStart(value) {
  if (value && !DATE.test(value)) return null;
  const date = value ? new Date(`${value}T00:00:00Z`) : new Date();
  if (isNaN(date)) return null;
  const monday = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  monday.setUTCDate(monday.getUTCDate() - ((monday.getUTCDay() + 6) % 7));
  return monday.toISOString().slice(0, 10);
}

module.exports = { weekStart };
