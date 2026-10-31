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

function usageLimit(kind) {
  const { period, periodKey, countKey } = USAGE[kind];
  const periodField = `usage.${periodKey}`;
  const countField = `usage.${countKey}`;
  const limit = FREE_LIMITS[kind];

  return async (req, res, next) => {
    try {
      const user = await loadUser(req, res);
      if (!user) return;
      if (isPremium(user)) return next();

      const current = period();
      await User.updateOne(
        { _id: user._id, [periodField]: { $ne: current } },
        { $set: { [periodField]: current, [countField]: 0 } }
      );

      const updated = await User.findOneAndUpdate(
        { _id: user._id, [countField]: { $lt: limit } },
        { $inc: { [countField]: 1 } },
        { returnDocument: 'after' }
      );

      if (!updated) {
        const resetText = kind === 'searches' ? 'tomorrow' : 'next month';
        return res.status(429).json({
          message: `You have used all ${limit} free ${kind} — they reset ${resetText}. Upgrade to Premium for unlimited ${kind}.`,
          code: 'LIMIT_REACHED',
          kind,
          limit,
        });
      }

      req.user = updated;
      next();
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  };
}

module.exports = { requirePremium, usageLimit };
