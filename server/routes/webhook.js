const express = require('express');
const User = require('../models/User');
const ProcessedEvent = require('../models/ProcessedEvent');
const stripe = require('../utils/stripe');
const { GRACE_DAYS } = require('../config/plans');

const router = express.Router();

const graceEnd = () => new Date(Date.now() + GRACE_DAYS * 24 * 60 * 60 * 1000);

async function findUser(customerId, userId) {
  const user = await User.findOne({ stripeCustomerId: customerId });
  if (user) return user;
  return userId ? User.findById(userId) : null;
}

async function syncSubscription(subscriptionId) {
  const sub = await stripe().subscriptions.retrieve(subscriptionId);
  const user = await findUser(sub.customer, sub.metadata?.userId);
  if (!user) return;

  const periodEnd = sub.items?.data?.[0]?.current_period_end ?? sub.current_period_end;

  user.stripeCustomerId = sub.customer;
  user.stripeSubscriptionId = sub.id;
  user.subscriptionStatus = sub.status;
  user.currentPeriodEnd = periodEnd ? new Date(periodEnd * 1000) : null;
  user.cancelAtPeriodEnd = Boolean(sub.cancel_at_period_end || sub.cancel_at);

  if (sub.status === 'active' || sub.status === 'trialing') {
    user.graceUntil = null;
  } else if (sub.status === 'past_due' && !user.graceUntil) {
    user.graceUntil = graceEnd();
  } else if (sub.status === 'canceled' || sub.status === 'unpaid') {
    user.graceUntil = null;
  }

  await user.save();
}

async function handleEvent(event) {
  const obj = event.data.object;

  switch (event.type) {
    case 'checkout.session.completed':
      if (obj.mode === 'subscription' && obj.subscription) {
        await syncSubscription(obj.subscription);
      }
      break;

    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted':
      await syncSubscription(obj.id);
      break;

    case 'invoice.payment_failed': {
      const user = await findUser(obj.customer);
      if (user && !user.graceUntil) {
        user.graceUntil = graceEnd();
        await user.save();
      }
      break;
    }

    case 'invoice.paid': {
      const user = await findUser(obj.customer);
      if (user && user.graceUntil) {
        user.graceUntil = null;
        await user.save();
      }
      break;
    }

    default:
      break;
  }
}

// POST /api/billing/webhook
router.post('/', express.raw({ type: 'application/json' }), async (req, res) => {
  let event;
  try {
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!secret) throw new Error('STRIPE_WEBHOOK_SECRET is not configured in .env');
    event = stripe().webhooks.constructEvent(req.body, req.headers['stripe-signature'], secret);
  } catch (err) {
    console.error('Stripe webhook rejected:', err.message);
    return res.status(400).json({ message: `Webhook error: ${err.message}` });
  }

  try {
    await ProcessedEvent.create({ eventId: event.id, type: event.type });
  } catch (err) {
    if (err.code === 11000) return res.json({ received: true, duplicate: true });
    return res.status(500).json({ message: err.message });
  }

  try {
    await handleEvent(event);
    res.json({ received: true });
  } catch (err) {
    await ProcessedEvent.deleteOne({ eventId: event.id });
    console.error(`Stripe webhook ${event.type} failed:`, err.message);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
