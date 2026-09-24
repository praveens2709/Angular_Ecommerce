const nodemailer = require("nodemailer");

const devMode = !process.env.SMTP_HOST;
let transporter;

/** Mails sent without SMTP configured (dev/test); lets tests read reset links */
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
      });
  return transporter;
};

/** Never throws: an email failure must not fail the request that triggered it */
const sendMail = async ({ to, subject, html, text }) => {
  try {
    const message = {
      from: process.env.MAIL_FROM || "DopeShope <no-reply@dopeshope.local>",
      to,
      subject,
      html,
      text,
    };
    await getTransport().sendMail(message);
    if (devMode) {
      outbox.push(message);
      if (outbox.length > 50) outbox.shift();
      if (process.env.NODE_ENV !== "test") {
        console.log(`[mail:dev] To: ${to} | ${subject}${text ? `\n${text}` : ""}`);
      }
    }
  } catch (error) {
    console.error("Email failed:", error.message);
  }
};

module.exports = { sendMail, outbox, devMode };
