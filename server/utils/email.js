const RESEND_URL = 'https://api.resend.com/emails';
const DEFAULT_FROM = 'Smart Grocery Planner <onboarding@resend.dev>';

const emailEnabled = () => Boolean(process.env.RESEND_API_KEY);

async function sendEmail({ to, subject, html, text }) {
  if (!emailEnabled()) {
    console.log(`[email not sent, no RESEND_API_KEY] to ${to}: ${subject}`);
    return { skipped: true };
  }

  const res = await fetch(RESEND_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: process.env.EMAIL_FROM || DEFAULT_FROM, to: [to], subject, html, text }),
  });
  if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`);
  return res.json();
}

const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

module.exports = { sendEmail, emailEnabled, escapeHtml };
