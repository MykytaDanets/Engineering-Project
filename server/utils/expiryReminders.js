const Pantry = require('../models/Pantry');
const User = require('../models/User');
const Household = require('../models/Household');
const { sendEmail, emailEnabled, escapeHtml } = require('./email');
const { capitalize } = require('./pantryItem');
const { ownPremium } = require('./plan');

const REMIND_DAYS = 2;//today up to the day after tomorrow
const DAY_MS = 86400000;
const SEND_GAP_MS = 600;//resend allows 2 requests per second

const startOfUtcDay = (d) => Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const whenText = (days) => (days === 0 ? 'today' : days === 1 ? 'tomorrow' : `in ${days} days`);

async function recipientsFor(ownerId) {
  const household = await Household.findById(ownerId).select('members');
  const users = await User.find(household
    ? { _id: { $in: household.members.map((m) => m.userId) } }
    : { _id: ownerId, householdId: null }
  ).select('name email emailReminders subscriptionStatus graceUntil');
  if (!users.some(ownPremium)) return [];
  return users.filter((u) => u.emailReminders !== false);
}

function buildEmail(user, due) {
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
  const lines = due.map((d) => `${capitalize(d.name)} – ${whenText(d.days)}`);
  const subject = due.length === 1
    ? `${capitalize(due[0].name)} expires ${whenText(due[0].days)}`
    : `${due.length} items in your pantry expire soon`;

  const text = [
    `Hi ${user.name},`,
    '',
    'These items in your pantry expire soon:',
    ...lines.map((l) => `- ${l}`),
    '',
    `Find recipes that use them: ${clientUrl}/recipes`,
    '',
    `You can turn these emails off on the Household page: ${clientUrl}/household`,
  ].join('\n');

  const html = `
    <p>Hi ${escapeHtml(user.name)},</p>
    <p>These items in your pantry expire soon:</p>
    <ul>${lines.map((l) => `<li>${escapeHtml(l)}</li>`).join('')}</ul>
    <p><a href="${clientUrl}/recipes">Find recipes that use them</a></p>
    <p style="color:#6b7280;font-size:12px">You can turn these emails off on the <a href="${clientUrl}/household">Household page</a>.</p>`;

  return { subject, text, html };
}

async function sendExpiryReminders(now = new Date()) {
  const today = startOfUtcDay(now);
  const from = new Date(today);
  const to = new Date(today + (REMIND_DAYS + 1) * DAY_MS);
  const dryRun = !emailEnabled();
  const stats = { pantries: 0, emails: 0, failed: 0, items: 0, dryRun };

  const pantries = await Pantry.find({
    items: { $elemMatch: { expiryDate: { $gte: from, $lt: to }, reminded: { $ne: true } } },
  });
  stats.pantries = pantries.length;

  for (const pantry of pantries) {
    const due = pantry.items
      .filter((i) => i.expiryDate >= from && i.expiryDate < to && !i.reminded)
      .map((i) => ({ item: i, name: i.name, days: Math.round((startOfUtcDay(i.expiryDate) - today) / DAY_MS) }))
      .sort((a, b) => a.days - b.days);

    const users = await recipientsFor(pantry.userId);
    let sent = 0;
    for (const user of users) {
      try {
        await sendEmail({ to: user.email, ...buildEmail(user, due) });
        sent++;
        stats.emails++;
      } catch (err) {
        stats.failed++;
        console.error(`Expiry email to user ${user._id} failed:`, err.message);
      }
      if (!dryRun) await wait(SEND_GAP_MS);
    }

    if (dryRun || (users.length && !sent)) continue;
    due.forEach((d) => { d.item.reminded = true; });
    stats.items += due.length;
    await pantry.save();
  }

  return stats;
}

module.exports = { sendExpiryReminders };
