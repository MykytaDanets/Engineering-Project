const crypto = require('crypto');
const express = require('express');
const { sendExpiryReminders } = require('../utils/expiryReminders');

const router = express.Router();

let running = false;

function authorised(req) {
  const given = Buffer.from(req.get('authorization') ?? '');
  const expected = Buffer.from(`Bearer ${process.env.JOB_SECRET}`);
  return given.length === expected.length && crypto.timingSafeEqual(given, expected);
}

// POST /api/jobs/expiry-reminders
router.post('/expiry-reminders', async (req, res) => {
  if (!process.env.JOB_SECRET) return res.status(503).json({ message: 'JOB_SECRET is not set' });
  if (!authorised(req)) return res.status(401).json({ message: 'Not authorised' });
  if (running) return res.status(409).json({ message: 'Already running' });

  running = true;
  try {
    res.json(await sendExpiryReminders());
  } catch (err) {
    res.status(500).json({ message: err.message });
  } finally {
    running = false;
  }
});

module.exports = router;
