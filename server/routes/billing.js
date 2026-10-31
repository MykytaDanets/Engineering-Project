const express = require('express');
const User = require('../models/User');
const authMiddleware = require('../middleware/auth');
const stripe = require('../utils/stripe');
const { isPremium, planSummary } = require('../utils/plan');

const router = express.Router();
router.use(authMiddleware);

const clientUrl = () => process.env.CLIENT_URL || 'http://localhost:5173';

function sendError(res, err) {
  if (err.message.includes('STRIPE_') || err.message.includes('test-mode')) {
    return res.status(503).json({ message: err.message });
  }
  res.status(500).json({ message: err.message });
}

// GET /api/billing/status
router.get('/status', async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(planSummary(user));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/billing/checkout
router.post('/checkout', async (req, res) => {
  try {
    const priceId = process.env.STRIPE_PRICE_ID;
    if (!priceId) throw new Error('STRIPE_PRICE_ID is not configured in .env');

    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (isPremium(user)) {
      return res.status(400).json({ message: 'You already have Premium.' });
    }

    if (!user.stripeCustomerId) {
      const customer = await stripe().customers.create({
        email: user.email,
        name: user.name,
        metadata: { userId: user._id.toString() },
      });
      user.stripeCustomerId = customer.id;
      await user.save();
    }

    const session = await stripe().checkout.sessions.create({
      mode: 'subscription',
      customer: user.stripeCustomerId,
      client_reference_id: user._id.toString(),
      line_items: [{ price: priceId, quantity: 1 }],
      subscription_data: { metadata: { userId: user._id.toString() } },
      success_url: `${clientUrl()}/billing/success`,
      cancel_url: `${clientUrl()}/pricing?canceled=1`,
    });

    res.json({ url: session.url });
  } catch (err) {
    sendError(res, err);
  }
});

// POST /api/billing/portal
router.post('/portal', async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (!user.stripeCustomerId) {
      return res.status(400).json({ message: 'No billing account yet — upgrade first.' });
    }

    const params = {
      customer: user.stripeCustomerId,
      return_url: `${clientUrl()}/pricing`,
    };

    if (req.body?.flow === 'cancel') {
      if (!user.stripeSubscriptionId || user.cancelAtPeriodEnd) {
        return res.status(400).json({ message: 'There is no active subscription to cancel.' });
      }
      params.flow_data = {
        type: 'subscription_cancel',
        subscription_cancel: { subscription: user.stripeSubscriptionId },
        after_completion: {
          type: 'redirect',
          redirect: { return_url: `${clientUrl()}/pricing?subscription=canceled` },
        },
      };
    }

    const session = await stripe().billingPortal.sessions.create(params);

    res.json({ url: session.url });
  } catch (err) {
    sendError(res, err);
  }
});

module.exports = router;
