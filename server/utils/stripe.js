const Stripe = require('stripe');

let client = null;

function stripe() {
  if (client) return client;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY is not configured in .env');
  if (!key.startsWith('sk_test_') && !key.startsWith('rk_test_')) {
    throw new Error('Only Stripe test-mode keys are allowed (sk_test_…)');
  }
  client = new Stripe(key);
  return client;
}

module.exports = stripe;
