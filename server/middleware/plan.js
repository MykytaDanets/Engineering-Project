const User = require('../models/User');
const Household = require('../models/Household');
const { FREE_LIMITS } = require('../config/plans');
const { isPremium, ownPremium, USAGE } = require('../utils/plan');

async function loadUser(req, res) {
  if (req.user) return req.user;
  const user = await User.findById(req.userId);
  if (!user) {
    res.status(404).json({ message: 'User not found' });
    return null;
  }

  const household = user.householdId ? await Household.findById(user.householdId) : null;
  if (household && !ownPremium(user)) {
    const others = await User.find({ _id: { $in: household.members.map((m) => m.userId) } })
      .select('subscriptionStatus graceUntil');
    user.$locals.householdPremium = others.some(ownPremium);
  }

  req.user = user;
  req.household = household;
  req.dataId = household?._id ?? user._id;
  return user;
}

async function loadScope(req, res, next) {
  try {
    if (await loadUser(req, res)) next();
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
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

module.exports = { loadUser, loadScope, requirePremium, consumeUsage, refundUsage, limitReached };
