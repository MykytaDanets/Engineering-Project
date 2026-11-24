const express = require('express');
const Household = require('../models/Household');
const User = require('../models/User');
const authMiddleware = require('../middleware/auth');
const { loadScope } = require('../middleware/plan');
const { isPremium } = require('../utils/plan');
const { newInviteCode, moveData, deleteData } = require('../utils/household');
const { moveUserSockets, notifyHousehold } = require('../utils/realtime');

const router = express.Router();
router.use(authMiddleware, loadScope);

const MAX_MEMBERS = 6;
const MAX_CODE_TRIES = 5;

async function view(household, userId) {
  if (!household) return { household: null };
  const users = await User.find({ _id: { $in: household.members.map((m) => m.userId) } }).select('name email');
  const byId = new Map(users.map((u) => [u._id.toString(), u]));
  return {
    household: {
      id: household._id,
      name: household.name,
      inviteCode: household.inviteCode,
      isOwner: household.ownerId.equals(userId),
      maxMembers: MAX_MEMBERS,
      members: household.members.map((m) => {
        const user = byId.get(m.userId.toString());
        return {
          id: m.userId,
          name: user?.name ?? 'Deleted user',
          email: user?.email ?? '',
          isOwner: household.ownerId.equals(m.userId),
          isYou: m.userId.equals(userId),
          joinedAt: m.joinedAt,
        };
      }),
    },
  };
}

async function saveWithNewCode(household) {
  for (let i = 0; i < MAX_CODE_TRIES; i++) {
    household.inviteCode = newInviteCode();
    try {
      return await household.save();
    } catch (err) {
      if (err.code !== 11000) throw err;
    }
  }
  throw new Error('Could not create an invite code, try again');
}

async function removeMember(household, userId) {
  const remaining = household.members.filter((m) => !m.userId.equals(userId));
  await User.updateOne({ _id: userId }, { $set: { householdId: null } });
  moveUserSockets(userId, household._id, null);

  if (!remaining.length) {
    await deleteData(userId);
    await moveData(household._id, userId);
    await household.deleteOne();
    notifyHousehold(null, [userId]);
    return;
  }

  household.members = remaining;
  if (household.ownerId.equals(userId)) household.ownerId = remaining[0].userId;
  await household.save();
  notifyHousehold(household._id, [userId]);
}

// GET /api/household
router.get('/', async (req, res) => {
  try {
    res.json(await view(req.household, req.user._id));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/household
router.post('/', async (req, res) => {
  const name = String(req.body.name ?? '').trim();
  if (!name || name.length > 40) return res.status(400).json({ message: 'Give the household a name (up to 40 characters)' });
  if (req.household) return res.status(400).json({ message: 'Leave your household first' });
  if (!isPremium(req.user)) {
    return res.status(403).json({ message: 'Households are part of Premium.', code: 'PREMIUM_REQUIRED' });
  }

  try {
    const household = await saveWithNewCode(new Household({
      name,
      ownerId: req.user._id,
      members: [{ userId: req.user._id }],
    }));
    await moveData(req.user._id, household._id);
    req.user.householdId = household._id;
    await req.user.save();
    moveUserSockets(req.user._id, null, household._id);
    notifyHousehold(household._id);
    res.status(201).json(await view(household, req.user._id));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/household/join
router.post('/join', async (req, res) => {
  const code = String(req.body.code ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (!code) return res.status(400).json({ message: 'Enter an invite code' });
  if (req.household) return res.status(400).json({ message: 'Leave your household first' });

  try {
    const household = await Household.findOneAndUpdate(
      { inviteCode: code, [`members.${MAX_MEMBERS - 1}`]: { $exists: false } },
      { $push: { members: { userId: req.user._id } } },
      { returnDocument: 'after' }
    );
    if (!household) {
      const exists = await Household.exists({ inviteCode: code });
      return res.status(exists ? 400 : 404).json({
        message: exists ? `This household is full (${MAX_MEMBERS} members)` : 'No household with this code',
      });
    }

    req.user.householdId = household._id;
    await req.user.save();
    moveUserSockets(req.user._id, null, household._id);
    notifyHousehold(household._id);
    res.json(await view(household, req.user._id));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/household/leave
router.post('/leave', async (req, res) => {
  if (!req.household) return res.status(400).json({ message: 'You are not in a household' });
  try {
    await removeMember(req.household, req.user._id);
    res.json({ household: null });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/household/members/:userId
router.delete('/members/:userId', async (req, res) => {
  const { household } = req;
  if (!household?.ownerId.equals(req.user._id)) return res.status(403).json({ message: 'Only the owner can remove members' });
  if (req.params.userId === req.user._id.toString()) return res.status(400).json({ message: 'Use Leave to leave the household' });
  if (!household.members.some((m) => m.userId.toString() === req.params.userId)) {
    return res.status(404).json({ message: 'Member not found' });
  }

  try {
    await removeMember(household, req.params.userId);
    res.json(await view(household, req.user._id));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/household/invite
router.post('/invite', async (req, res) => {
  const { household } = req;
  if (!household?.ownerId.equals(req.user._id)) return res.status(403).json({ message: 'Only the owner can change the invite code' });
  try {
    await saveWithNewCode(household);
    notifyHousehold(household._id);
    res.json(await view(household, req.user._id));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
