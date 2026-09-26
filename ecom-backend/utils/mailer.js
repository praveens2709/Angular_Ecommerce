const nodemailer = require("nodemailer");

/**
 * Three ways to send, picked from the environment:
 * - BREVO_API_KEY: Brevo's HTTPS API. Preferred in production: it uses port 443, which hosts
 *   never block (Render's free plan blocks the SMTP ports 25/465/587, so SMTP just times out).
 * - SMTP_HOST (+ SMTP_PORT/USER/PASS): any SMTP server.
 * - neither: dev/test mode, mails are printed and kept in `outbox`.
 */
const useBrevoApi = !!process.env.BREVO_API_KEY;
const devMode = !useBrevoApi && !process.env.SMTP_HOST;
const TIMEOUT_MS = 15_000;
let transporter;

/** Mails sent without a real provider (dev/test); lets tests read reset links */
const outbox = [];

const getTransport = () => {
  if (transporter) return transporter;
  transporter = devMode
    ? nodemailer.createTransport({ jsonTransport: true })
    : nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 587),
        secure: process.env.SMTP_SECURE === "true",
        auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
        // Fail fast (the default waits ~2 minutes) so a blocked port shows up in the logs quickly
        connectionTimeout: TIMEOUT_MS,
        greetingTimeout: TIMEOUT_MS,
        socketTimeout: TIMEOUT_MS,
      });
  return transporter;
};

/** "DopeShope <orders@example.com>" -> { name, email } */
const parseFrom = (from) => {
  const match = /^\s*"?([^"<]*?)"?\s*<([^>]+)>\s*$/.exec(from);
  return match ? { name: match[1].trim() || undefined, email: match[2].trim() } : { email: from.trim() };
};

const sendWithBrevoApi = async (message) => {
  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { "api-key": process.env.BREVO_API_KEY, "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({
      sender: parseFrom(message.from),
      to: [{ email: message.to }],
      subject: message.subject,
      htmlContent: message.html || undefined,
      textContent: message.text || undefined,
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Brevo API ${res.status}: ${detail.slice(0, 300)}`);
  }
};

/** "someone@gmail.com" -> "so***@gmail.com", so logs don't hold full addresses */
const maskEmail = (email) => String(email).replace(/^(.{2})[^@]*/, "$1***");

/** Never throws: an email failure must not fail the request that triggered it */
const sendMail = async ({ to, subject, html, text }) => {
  const message = {
    from: process.env.MAIL_FROM || "DopeShope <no-reply@dopeshope.local>",
    to,
    subject,
    html,
    text,
  };
  try {
    if (useBrevoApi) await sendWithBrevoApi(message);
    else await getTransport().sendMail(message);

    if (devMode) {
      outbox.push(message);
      if (outbox.length > 50) outbox.shift();
      if (process.env.NODE_ENV !== "test") {
        console.log(`[mail:dev] To: ${to} | ${subject}${text ? `\n${text}` : ""}`);
      }
    } else {
      console.log(`Email sent via ${useBrevoApi ? "Brevo API" : "SMTP"}: "${subject}" to ${maskEmail(to)}`);
    }
  } catch (error) {
    console.error(`Email failed via ${useBrevoApi ? "Brevo API" : "SMTP"} ("${subject}" to ${maskEmail(to)}):`, error.message);
  }
};

module.exports = { sendMail, outbox, devMode, parseFrom };
