/**
 * Send a test email using .env SMTP settings.
 * Usage: npm run test-email -- your-inbox@gmail.com
 */
import "dotenv/config";
import nodemailer from "nodemailer";

const to = process.argv[2];
if (!to) {
  console.error("Usage: npm run test-email -- recipient@example.com");
  process.exit(1);
}

const host = process.env.EMAIL_HOST || "smtp.gmail.com";
const port = parseInt(process.env.EMAIL_PORT || "587", 10);
const user = process.env.EMAIL_USER || "";
const pass = process.env.EMAIL_PASS || "";
const from = process.env.EMAIL_FROM || user;

if (!user || !pass) {
  console.error("Set EMAIL_USER and EMAIL_PASS in .env (Gmail App Password).");
  process.exit(1);
}

const transporter = nodemailer.createTransport({
  host,
  port,
  secure: port === 465,
  auth: { user, pass },
});

async function main() {
  await transporter.verify();
  console.log("SMTP connection OK");

  const info = await transporter.sendMail({
    from,
    to,
    subject: "PEQI – test email",
    text: "If you received this, Gmail SMTP is configured correctly.",
    html: "<p>If you received this, <strong>Gmail SMTP</strong> is configured correctly for PEQI.</p>",
  });

  console.log("Sent:", info.messageId);
  console.log("To:", to);
}

main().catch((err) => {
  console.error("Failed:", err.message || err);
  if (String(err.message).includes("Invalid login")) {
    console.error("\nTip: Use a Google App Password (16 chars), not your normal Gmail password.");
    console.error("https://myaccount.google.com/apppasswords");
  }
  process.exit(1);
});
