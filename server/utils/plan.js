const { FREE_LIMITS } = require('../config/plans');

const ACTIVE_STATUSES = ['active', 'trialing'];

function isPremium(user) {
  if (ACTIVE_STATUSES.includes(user.subscriptionStatus)) return true;
  return Boolean(user.graceUntil && user.graceUntil > new Date());
}

const today = () => new Date().toISOString().slice(0, 10);
const thisMonth = () => new Date().toISOString().slice(0, 7);

const USAGE = {
  searches: { period: today, periodKey: 'searchesDay', countKey: 'searchesCount' },
  receipts: { period: thisMonth, periodKey: 'receiptsMonth', countKey: 'receiptsCount' },
};

function remaining(user, kind) {
  if (isPremium(user)) return null;
  const { period, periodKey, countKey } = USAGE[kind];
  const used = user.usage?.[periodKey] === period() ? user.usage[countKey] : 0;
  return Math.max(FREE_LIMITS[kind] - used, 0);
}

function planSummary(user) {
  return {
    plan: isPremium(user) ? 'premium' : 'free',
    subscriptionStatus: user.subscriptionStatus,
    currentPeriodEnd: user.currentPeriodEnd ?? null,
    cancelAtPeriodEnd: user.cancelAtPeriodEnd,
    graceUntil: user.graceUntil ?? null,
    hasBillingAccount: Boolean(user.stripeCustomerId),
    limits: FREE_LIMITS,
    remaining: {
      searches: remaining(user, 'searches'),
      receipts: remaining(user, 'receipts'),
    },
  };
}

module.exports = { isPremium, planSummary, USAGE };
