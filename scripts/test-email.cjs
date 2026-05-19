/**
 * Email test — use on VPS: node scripts/test-email.cjs you@email.com
 * Uses Gmail API (HTTPS) when configured; otherwise SMTP.
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

const TIMEOUT_MS = 15000;

function isGmailApiConfigured() {
  if (process.env.EMAIL_USE_GMAIL_API === "false") return false;
  const useApi =
    process.env.EMAIL_USE_GMAIL_API === "true" ||
    Boolean(process.env.GMAIL_REFRESH_TOKEN);
  return Boolean(
    useApi &&
      process.env.GOOGLE_CLIENT_ID &&
      process.env.GOOGLE_CLIENT_SECRET &&
      process.env.GMAIL_REFRESH_TOKEN,
  );
}

function encodeRawMessage(from, toAddr, subject, html, text) {
  const boundary = `peqi_${Date.now()}`;
  const plain = text || html.replace(/<[^>]+>/g, " ");
  const lines = [
    `From: ${from}`,
    `To: ${toAddr}`,
    `Subject: =?UTF-8?B?${Buffer.from(subject).toString("base64")}?=`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    "Content-Type: text/plain; charset=UTF-8",
    "",
    plain,
    `--${boundary}`,
    "Content-Type: text/html; charset=UTF-8",
    "",
    html,
    `--${boundary}--`,
  ];
  return Buffer.from(lines.join("\r\n"))
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

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

async function sendViaGmailApi() {
  const { google } = require("googleapis");
  const from =
    process.env.EMAIL_FROM ||
    `PEQI <${process.env.EMAIL_USER || "peqihaircutstudio@gmail.com"}>`;
  const subject = "PEQI – test email (Gmail API)";
  const html =
    "<p>If you received this, <strong>Gmail API over HTTPS</strong> works on PEQI VPS.</p>";
  const text = "If you received this, Gmail API over HTTPS works on PEQI VPS.";

  console.log("Mode: Gmail API (HTTPS port 443)");
  console.log(`From: ${from}`);
  console.log(`To: ${to}`);

  const oauth2 = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
  );
  oauth2.setCredentials({ refresh_token: process.env.GMAIL_REFRESH_TOKEN });

  const gmail = google.gmail({ version: "v1", auth: oauth2 });
  const raw = encodeRawMessage(from, to, subject, html, text);

  const res = await withTimeout(
    gmail.users.messages.send({
      userId: "me",
      requestBody: { raw },
    }),
    "Gmail API send",
  );

  console.log("Sent:", res.data.id || "ok");
  console.log("Check inbox (and spam) for", to);
}

async function sendViaSmtp() {
  const host = process.env.EMAIL_HOST || "smtp.gmail.com";
  const port = parseInt(process.env.EMAIL_PORT || "587", 10);
  const user = process.env.EMAIL_USER || "";
  const pass = process.env.EMAIL_PASS || "";
  const from = process.env.EMAIL_FROM || user;

  if (!user || !pass) {
    console.error(
      "Set Gmail API vars (see deploy/GMAIL-API-SETUP.md) or EMAIL_USER + EMAIL_PASS in .env",
    );
    process.exit(1);
  }

  console.log(`Mode: SMTP ${host}:${port} as ${user}`);
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

async function main() {
  if (isGmailApiConfigured()) {
    await sendViaGmailApi();
    return;
  }
  await sendViaSmtp();
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Failed:", err.message || err);
    if (String(err.message).includes("Invalid login")) {
      console.error(
        "\nUse a Gmail App Password: https://myaccount.google.com/apppasswords",
      );
    }
    if (String(err.message).includes("timed out")) {
      console.error("\nHostman often blocks outbound SMTP (587/465).");
      console.error("Use Gmail API instead: deploy/GMAIL-API-SETUP.md");
      console.error("  nc -zv smtp.gmail.com 587   # expect timeout on VPS");
    }
    if (
      String(err.message).includes("insufficient") ||
      String(err.message).includes("403")
    ) {
      console.error(
        "\nGmail API: re-authorize with scope https://www.googleapis.com/auth/gmail.send",
      );
    }
    process.exit(1);
  });
