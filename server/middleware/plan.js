const User = require('../models/User');
const { FREE_LIMITS } = require('../config/plans');
const { isPremium, USAGE } = require('../utils/plan');

async function loadUser(req, res) {
  if (req.user) return req.user;
  const user = await User.findById(req.userId);
  if (!user) {
    res.status(404).json({ message: 'User not found' });
    return null;
  }
  req.user = user;
  return user;
}

async function requirePremium(req, res, next) {
  try {
    const user = await loadUser(req, res);
    if (!user) return;
    if (!isPremium(user)) {
      return res.status(403).json({ message: 'This feature is part of Premium.', code: 'PREMIUM_REQUIRED' });
    }
    next();
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

async function consumeUsage(user, kind) {
  if (isPremium(user)) return true;

  const { period, periodKey, countKey } = USAGE[kind];
  const periodField = `usage.${periodKey}`;
  const countField = `usage.${countKey}`;

  const current = period();
  await User.updateOne(
    { _id: user._id, [periodField]: { $ne: current } },
    { $set: { [periodField]: current, [countField]: 0 } }
  );

  const updated = await User.findOneAndUpdate(
    { _id: user._id, [countField]: { $lt: FREE_LIMITS[kind] } },
    { $inc: { [countField]: 1 } },
    { returnDocument: 'after' }
  );
  return Boolean(updated);
}

async function refundUsage(user, kind) {
  if (isPremium(user)) return;
  const { period, periodKey, countKey } = USAGE[kind];
  await User.updateOne(
    { _id: user._id, [`usage.${periodKey}`]: period(), [`usage.${countKey}`]: { $gt: 0 } },
    { $inc: { [`usage.${countKey}`]: -1 } }
  );
}

function limitReached(kind) {
  const limit = FREE_LIMITS[kind];
  const resetText = kind === 'searches' ? 'tomorrow' : 'next month';
  return {
    message: `You have used all ${limit} free ${kind} – they reset ${resetText}. Upgrade to Premium for unlimited ${kind}.`,
    code: 'LIMIT_REACHED',
    kind,
    limit,
  };
}

function usageLimit(kind) {
  return async (req, res, next) => {
    try {
      const user = await loadUser(req, res);
      if (!user) return;
      if (!(await consumeUsage(user, kind))) return res.status(429).json(limitReached(kind));
      next();
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  };
}

module.exports = { requirePremium, usageLimit, consumeUsage, refundUsage, limitReached };
