/**
 * Send a test email using .env SMTP settings.
 * Usage: npm run test-email -- your-inbox@gmail.com
 * On VPS (faster): node scripts/test-email.cjs your-inbox@gmail.com
 */
import "dotenv/config";
import nodemailer from "nodemailer";

const to = process.argv[2];
const TIMEOUT_MS = 15000;

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

console.log(`SMTP: ${host}:${port} as ${user}`);
console.log(`To: ${to}`);

const transporter = nodemailer.createTransport({
  host,
  port,
  secure: port === 465,
  auth: { user, pass },
  connectionTimeout: TIMEOUT_MS,
  greetingTimeout: TIMEOUT_MS,
  socketTimeout: TIMEOUT_MS,
});

function withTimeout<T>(promise: Promise<T>, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(
        () => reject(new Error(`${label} timed out after ${TIMEOUT_MS}ms`)),
        TIMEOUT_MS,
      ),
    ),
  ]);
}

async function main() {
  console.log("Step 1: verify SMTP...");
  try {
    await withTimeout(transporter.verify(), "SMTP verify");
    console.log("  OK");
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.warn("  verify skipped:", msg);
  }

  console.log("Step 2: send...");
  const info = await withTimeout(
    transporter.sendMail({
      from,
      to,
      subject: "BarberBook – test email",
      text: "If you received this, Gmail SMTP is configured correctly.",
      html: "<p>If you received this, <strong>Gmail SMTP</strong> is configured correctly.</p>",
    }),
    "sendMail",
  );

  console.log("Sent:", info.messageId);
}

main().catch((err) => {
  console.error("Failed:", err.message || err);
  if (String(err.message).includes("Invalid login")) {
    console.error("\nTip: Use a Google App Password (16 chars), not your normal Gmail password.");
    console.error("https://myaccount.google.com/apppasswords");
  }
  if (String(err.message).includes("timed out")) {
    console.error("\nVPS may block port 587. On server run: nc -zv smtp.gmail.com 587");
  }
  process.exit(1);
});
