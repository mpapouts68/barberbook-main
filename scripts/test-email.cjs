/**
 * SMTP test (no tsx) — use on VPS: node scripts/test-email.cjs you@email.com
 * Loads .env from project root.
 */
const fs = require("fs");
const path = require("path");
const nodemailer = require("nodemailer");

const envPath = path.join(__dirname, "..", ".env");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i === -1) continue;
    const k = t.slice(0, i).trim();
    let v = t.slice(i + 1).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    if (!process.env[k]) process.env[k] = v;
  }
}

const to = process.argv[2];
if (!to) {
  console.error("Usage: node scripts/test-email.cjs recipient@example.com");
  process.exit(1);
}

const host = process.env.EMAIL_HOST || "smtp.gmail.com";
const port = parseInt(process.env.EMAIL_PORT || "587", 10);
const user = process.env.EMAIL_USER || "";
const pass = process.env.EMAIL_PASS || "";
const from = process.env.EMAIL_FROM || user;
const TIMEOUT_MS = 15000;

if (!user || !pass) {
  console.error("Set EMAIL_USER and EMAIL_PASS in /var/www/peqi/.env");
  process.exit(1);
}

console.log(`SMTP: ${host}:${port} as ${user}`);
console.log(`To: ${to}`);
console.log(`Timeout: ${TIMEOUT_MS / 1000}s per step`);

const transporter = nodemailer.createTransport({
  host,
  port,
  secure: port === 465,
  auth: { user, pass },
  connectionTimeout: TIMEOUT_MS,
  greetingTimeout: TIMEOUT_MS,
  socketTimeout: TIMEOUT_MS,
});

function withTimeout(promise, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(
        () => reject(new Error(`${label} timed out after ${TIMEOUT_MS}ms`)),
        TIMEOUT_MS,
      ),
    ),
  ]);
}

async function main() {
  console.log("Step 1: verify SMTP (skip if firewall blocks)...");
  try {
    await withTimeout(transporter.verify(), "SMTP verify");
    console.log("  OK — connection verified");
  } catch (e) {
    console.warn("  verify failed:", e.message);
    console.warn("  Trying send anyway...");
  }

  console.log("Step 2: send test message...");
  const info = await withTimeout(
    transporter.sendMail({
      from,
      to,
      subject: "PEQI – test email",
      text: "If you received this, Gmail SMTP works on the server.",
      html: "<p>If you received this, <strong>Gmail SMTP</strong> works on PEQI VPS.</p>",
    }),
    "sendMail",
  );

  console.log("Sent:", info.messageId);
  console.log("Check inbox (and spam) for", to);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Failed:", err.message || err);
    if (String(err.message).includes("Invalid login")) {
      console.error("\nUse a Gmail App Password: https://myaccount.google.com/apppasswords");
    }
    if (String(err.message).includes("timed out")) {
      console.error("\nVPS may block outbound SMTP. Try:");
      console.error("  nc -zv smtp.gmail.com 587");
      console.error("  Or EMAIL_PORT=465 with secure:true");
    }
    process.exit(1);
  });
