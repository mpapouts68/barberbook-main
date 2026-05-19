import { google } from "googleapis";

export type OutboundMail = {
  from: string;
  to: string;
  subject: string;
  html: string;
  text?: string;
};

export function isGmailApiConfigured(): boolean {
  if (process.env.EMAIL_USE_GMAIL_API === "false") {
    return false;
  }
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

function encodeRawMessage(
  from: string,
  to: string,
  subject: string,
  html: string,
  text?: string,
): string {
  const boundary = `peqi_${Date.now()}`;
  const plain = text || html.replace(/<[^>]+>/g, " ");
  const lines = [
    `From: ${from}`,
    `To: ${to}`,
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

export async function sendViaGmailApi(mail: OutboundMail): Promise<string> {
  const clientId = process.env.GOOGLE_CLIENT_ID!;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET!;
  const refreshToken = process.env.GMAIL_REFRESH_TOKEN!;
  const from =
    mail.from ||
    process.env.EMAIL_FROM ||
    `PEQI <${process.env.EMAIL_USER || "peqihaircutstudio@gmail.com"}>`;

  const oauth2 = new google.auth.OAuth2(clientId, clientSecret);
  oauth2.setCredentials({ refresh_token: refreshToken });

  const gmail = google.gmail({ version: "v1", auth: oauth2 });
  const raw = encodeRawMessage(from, mail.to, mail.subject, mail.html, mail.text);

  const res = await gmail.users.messages.send({
    userId: "me",
    requestBody: { raw },
  });

  return res.data.id || "sent";
}
