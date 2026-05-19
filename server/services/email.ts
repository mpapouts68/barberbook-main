import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import { isPlaceholderEmail } from "../utils";
import { EMAIL_BRAND_FULL } from "./emailBranding";
import { isGmailApiConfigured, sendViaGmailApi } from "./gmailApiMailer";

function getEmailConfig() {
  return {
    host: process.env.EMAIL_HOST || "smtp.gmail.com",
    port: parseInt(process.env.EMAIL_PORT || "587", 10),
    user: process.env.EMAIL_USER || "",
    pass: process.env.EMAIL_PASS || "",
    from:
      process.env.EMAIL_FROM ||
      "PEQI Haircut Studio <peqihaircutstudio@gmail.com>",
    baseUrl: process.env.BASE_URL || "http://localhost:5100",
  };
}

export function isEmailConfigured(): boolean {
  if (isGmailApiConfigured()) {
    return true;
  }
  const { user, pass } = getEmailConfig();
  return Boolean(user && pass);
}

function hasSmtpCredentials(): boolean {
  const { user, pass } = getEmailConfig();
  return Boolean(user && pass);
}

type MailPayload = {
  from: string;
  to: string;
  subject: string;
  html: string;
  text?: string;
};

async function deliverMail(
  mail: MailPayload,
  devLabel?: string,
): Promise<void> {
  if (isGmailApiConfigured()) {
    const id = await sendViaGmailApi(mail);
    console.log(`✅ Email sent via Gmail API (${id}) → ${mail.to}`);
    return;
  }

  if (!hasSmtpCredentials()) {
    if (devLabel) {
      console.log(`📧 [DEV MODE] ${devLabel}:`, mail.to, mail.subject);
    }
    return;
  }

  const info = await getTransporter().sendMail(mail);
  console.log(`✅ Email sent via SMTP (${info.messageId}) → ${mail.to}`);
}

// Create email transporter
let transporter: Transporter | null = null;

function getTransporter(): Transporter {
  const cfg = getEmailConfig();
  if (!transporter) {
    if (process.env.NODE_ENV === "production" && !cfg.user && !cfg.pass) {
      console.error("❌ Email not configured: set EMAIL_USER and EMAIL_PASS in .env");
    } else if (!cfg.user || !cfg.pass) {
      console.warn("⚠️  Email credentials not configured — emails will be logged only.");
    }

    transporter = nodemailer.createTransport({
      host: cfg.host,
      port: cfg.port,
      secure: cfg.port === 465,
      auth: cfg.user && cfg.pass ? { user: cfg.user, pass: cfg.pass } : undefined,
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 10000,
    });

    if (
      process.env.NODE_ENV === "production" &&
      cfg.user &&
      cfg.pass &&
      !isGmailApiConfigured()
    ) {
      transporter
        .verify()
        .then(() => console.log("✅ Email SMTP verified:", cfg.user))
        .catch((error) => {
          console.error("❌ Email SMTP verification failed:", error.message);
          console.error(
            "   On VPS with blocked SMTP use Gmail API: see deploy/GMAIL-API-SETUP.md",
          );
        });
    }
  }
  return transporter;
}

/**
 * Send verification email to new users
 */
export async function sendVerificationEmail(
  email: string,
  firstName: string,
  verificationToken: string
): Promise<void> {
  const cfg = getEmailConfig();
  const verificationUrl = `${cfg.baseUrl}/verify-email/${verificationToken}`;

  const mailOptions = {
    from: cfg.from,
    to: email,
    subject: "Επιβεβαίωση Email - PEQI Haircut Studio",
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #0a0a0a; color: #ffffff; padding: 30px; text-align: center; }
            .content { background: #f9f9f9; padding: 30px; }
            .button { display: inline-block; background: #0a0a0a; color: #ffffff; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 20px 0; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>✂️ Καλώς Ήρθες στο PEQI!</h1>
            </div>
            <div class="content">
              <h2>Γεια σου ${firstName},</h2>
              <p>Ευχαριστούμε που εγγράφηκες στο PEQI!</p>
              <p>Για να ολοκληρώσεις την εγγραφή σου, παρακαλώ επιβεβαίωσε το email σου κάνοντας κλικ στο παρακάτω κουμπί:</p>
              <div style="text-align: center;">
                <a href="${verificationUrl}" class="button">Επιβεβαίωση Email</a>
              </div>
              <p>Ή αντίγραψε και επικόλλησε αυτόν τον σύνδεσμο στον browser σου:</p>
              <p style="word-break: break-all; color: #666;">${verificationUrl}</p>
              <p><strong>Αυτός ο σύνδεσμος λήγει σε 24 ώρες.</strong></p>
              <p>Αν δεν έκανες εσύ αυτό το αίτημα, παρακαλώ αγνόησε αυτό το email.</p>
            </div>
            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} PEQI Haircut Studio. All rights reserved.</p>
              <p>Το καλύτερο κουρείο στην πόλη!</p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `
      Καλώς Ήρθες στο PEQI!
      
      Γεια σου ${firstName},
      
      Ευχαριστούμε που εγγράφηκες στο PEQI!
      
      Για να ολοκληρώσεις την εγγραφή σου, παρακαλώ επιβεβαίωσε το email σου επισκεπτόμενος τον παρακάτω σύνδεσμο:
      
      ${verificationUrl}
      
      Αυτός ο σύνδεσμος λήγει σε 24 ώρες.
      
      Αν δεν έκανες εσύ αυτό το αίτημα, παρακαλώ αγνόησε αυτό το email.
      
      PEQI Haircut Studio
      Το καλύτερο κουρείο στην πόλη!
    `,
  };

  try {
    await deliverMail(mailOptions, "Verification email");
  } catch (error: any) {
    console.error("❌ Failed to send verification email:", error);
    // In production, throw error; in dev, just log
    if (process.env.NODE_ENV === 'production') {
      throw new Error(`Failed to send verification email: ${error.message}`);
    }
  }
}

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail(
  email: string,
  firstName: string,
  resetToken: string
): Promise<void> {
  const resetUrl = `${getEmailConfig().baseUrl}/reset-password/${resetToken}`;

  const mailOptions = {
    from: getEmailConfig().from,
    to: email,
    subject: "Επαναφορά Κωδικού - PEQI Haircut Studio",
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #0a0a0a; color: #ffffff; padding: 30px; text-align: center; }
            .content { background: #f9f9f9; padding: 30px; }
            .button { display: inline-block; background: #0a0a0a; color: #ffffff; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 20px 0; }
            .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔐 Επαναφορά Κωδικού</h1>
            </div>
            <div class="content">
              <h2>Γεια σου ${firstName},</h2>
              <p>Λάβαμε ένα αίτημα για επαναφορά του κωδικού σου.</p>
              <p>Κάνε κλικ στο παρακάτω κουμπί για να ορίσεις νέο κωδικό:</p>
              <div style="text-align: center;">
                <a href="${resetUrl}" class="button">Επαναφορά Κωδικού</a>
              </div>
              <p>Ή αντίγραψε και επικόλλησε αυτόν τον σύνδεσμο στον browser σου:</p>
              <p style="word-break: break-all; color: #666;">${resetUrl}</p>
              <div class="warning">
                <p><strong>⚠️ Προσοχή:</strong></p>
                <ul>
                  <li>Αυτός ο σύνδεσμος λήγει σε 1 ώρα</li>
                  <li>Μπορεί να χρησιμοποιηθεί μόνο μία φορά</li>
                  <li>Αν δεν έκανες εσύ αυτό το αίτημα, αγνόησε αυτό το email</li>
                </ul>
              </div>
            </div>
            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} PEQI Haircut Studio. All rights reserved.</p>
              <p>Για ερωτήσεις ασφαλείας, επικοινώνησε μαζί μας.</p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `
      Επαναφορά Κωδικού
      
      Γεια σου ${firstName},
      
      Λάβαμε ένα αίτημα για επαναφορά του κωδικού σου.
      
      Επισκέψου τον παρακάτω σύνδεσμο για να ορίσεις νέο κωδικό:
      
      ${resetUrl}
      
      ΠΡΟΣΟΧΗ:
      - Αυτός ο σύνδεσμος λήγει σε 1 ώρα
      - Μπορεί να χρησιμοποιηθεί μόνο μία φορά
      - Αν δεν έκανες εσύ αυτό το αίτημα, αγνόησε αυτό το email
      
      PEQI Haircut Studio
    `,
  };

  try {
    await deliverMail(mailOptions, "Password reset email");
  } catch (error: any) {
    console.error("❌ Failed to send password reset email:", error);
    // In production, throw error; in dev, just log
    if (process.env.NODE_ENV === 'production') {
      throw new Error(`Failed to send password reset email: ${error.message}`);
    }
  }
}

/**
 * Send welcome email after successful verification
 */
export async function sendWelcomeEmail(email: string, firstName: string): Promise<void> {
  const mailOptions = {
    from: getEmailConfig().from,
    to: email,
    subject: "Καλωσόρισμα στο PEQI! 🎉",
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #0a0a0a; color: #ffffff; padding: 30px; text-align: center; }
            .content { background: #f9f9f9; padding: 30px; }
            .button { display: inline-block; background: #0a0a0a; color: #ffffff; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 20px 0; }
            .features { background: #fff; padding: 20px; margin: 20px 0; border-radius: 5px; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>✂️ Καλωσόρισμα!</h1>
            </div>
            <div class="content">
              <h2>Συγχαρητήρια ${firstName}! 🎉</h2>
              <p>Ο λογαριασμός σου επιβεβαιώθηκε με επιτυχία!</p>
              <p>Είσαι πλέον μέλος του PEQI και μπορείς να απολαύσεις:</p>
              <div class="features">
                <ul>
                  <li>✅ Online κλείσιμο ραντεβού 24/7</li>
                  <li>✅ Επιλογή του αγαπημένου σου κομμωτή</li>
                  <li>✅ Διαχείριση των ραντεβού σου</li>
                  <li>✅ Ειδικές προσφορές για γιορτές ονομάτων</li>
                  <li>✅ Ειδοποιήσεις για τα επερχόμενα ραντεβού σου</li>
                </ul>
              </div>
              <div style="text-align: center;">
                <a href="${getEmailConfig().baseUrl}/booking" class="button">Κλείσε το Πρώτο σου Ραντεβού</a>
              </div>
              <p>Ανυπομονούμε να σε δούμε στο κατάστημά μας!</p>
            </div>
            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} PEQI Haircut Studio. All rights reserved.</p>
              <p>Το καλύτερο κουρείο στην πόλη!</p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `
      Καλωσόρισμα στο PEQI!
      
      Συγχαρητήρια ${firstName}! 🎉
      
      Ο λογαριασμός σου επιβεβαιώθηκε με επιτυχία!
      
      Είσαι πλέον μέλος του PEQI και μπορείς να απολαύσεις:
      - Online κλείσιμο ραντεβού 24/7
      - Επιλογή του αγαπημένου σου κομμωτή
      - Διαχείριση των ραντεβού σου
      - Ειδικές προσφορές για γιορτές ονομάτων
      - Ειδοποιήσεις για τα επερχόμενα ραντεβού σου
      
      Ανυπομονούμε να σε δούμε στο κατάστημά μας!
      
      PEQI Haircut Studio
    `,
  };

  try {
    await deliverMail(mailOptions, "Welcome email");
  } catch (error: any) {
    console.error("❌ Failed to send welcome email:", error);
    // Don't throw error for welcome email - it's not critical, but log in production
    if (process.env.NODE_ENV === 'production') {
      console.error(`   Error details: ${error.message}`);
    }
  }
}

/**
 * Admin broadcast: themed HTML email matching confirmations (walk-ins skipped by caller).
 */
export async function sendBroadcastNotificationEmail(
  to: string,
  firstName: string,
  title: string,
  bodyText: string
): Promise<void> {
  if (!to?.trim() || isPlaceholderEmail(to)) return;

  const escapeHtml = (s: string) =>
    s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  const bodyHtml = escapeHtml(bodyText).replace(/\n/g, "<br/>");
  const safeTitle = escapeHtml(title);

  const mailOptions = {
    from: getEmailConfig().from,
    to,
    subject: `${title} — PEQI`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #0a0a0a; color: #ffffff; padding: 30px; text-align: center; }
            .content { background: #f9f9f9; padding: 30px; }
            .message-box { background: #fff; padding: 20px; margin: 20px 0; border-radius: 5px; border-left: 4px solid #0a0a0a; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>✂️ ${safeTitle}</h1>
            </div>
            <div class="content">
              <h2>Γεια σου ${escapeHtml(firstName || "φίλε")}!</h2>
              <div class="message-box">
                ${bodyHtml}
              </div>
              <p style="text-align:center;">
                <a href="${getEmailConfig().baseUrl}/booking" style="display:inline-block;background:#0a0a0a;color:#ffffff;padding:12px 24px;text-decoration:none;border-radius:5px;font-weight:bold;">Κλείσε Ραντεβού</a>
              </p>
            </div>
            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} PEQI Haircut Studio. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `${title}\n\nΓεια σου ${firstName || ""},\n\n${bodyText}\n\n${getEmailConfig().baseUrl}`,
  };

  try {
    await deliverMail(mailOptions, "Broadcast email");
  } catch (error: unknown) {
    console.error(`❌ Broadcast email failed for ${to}:`, error);
  }
}

/**
 * Send appointment confirmation email
 */
export async function sendAppointmentConfirmationEmail(
  email: string,
  firstName: string,
  appointmentDate: string,
  appointmentTime: string,
  serviceName: string,
  barberName: string,
  duration?: number
): Promise<void> {
  const formattedDate = new Date(`${appointmentDate}T${appointmentTime}`).toLocaleDateString('el-GR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
  const formattedTime = appointmentTime;
  const durationText = duration ? ` (${duration} λεπτά)` : '';

  const mailOptions = {
    from: getEmailConfig().from,
    to: email,
    subject: "Επιβεβαίωση Ραντεβού - PEQI",
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #0a0a0a; color: #ffffff; padding: 30px; text-align: center; }
            .content { background: #f9f9f9; padding: 30px; }
            .appointment-details { background: #fff; padding: 20px; margin: 20px 0; border-radius: 5px; border-left: 4px solid #0a0a0a; }
            .detail-row { margin: 10px 0; }
            .detail-label { font-weight: bold; color: #666; }
            .button { display: inline-block; background: #0a0a0a; color: #ffffff; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 20px 0; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>✂️ Επιβεβαίωση Ραντεβού</h1>
            </div>
            <div class="content">
              <h2>Γεια σου ${firstName}!</h2>
              <p>Το ραντεβού σου επιβεβαιώθηκε με επιτυχία!</p>
              
              <div class="appointment-details">
                <div class="detail-row">
                  <span class="detail-label">📅 Ημερομηνία:</span> ${formattedDate}
                </div>
                <div class="detail-row">
                  <span class="detail-label">🕐 Ώρα:</span> ${formattedTime}${durationText}
                </div>
                <div class="detail-row">
                  <span class="detail-label">💇 Κομμωτής:</span> ${barberName}
                </div>
                <div class="detail-row">
                  <span class="detail-label">✂️ Υπηρεσία:</span> ${serviceName}
                </div>
              </div>
              
              <p>Θα λάβεις υπενθύμιση 24 ώρες πριν και 2 ώρες πριν το ραντεβού σου.</p>
              
              <div style="text-align: center;">
                <a href="${getEmailConfig().baseUrl}/appointments" class="button">Δες τα Ραντεβού μου</a>
              </div>
              
              <p>Αν χρειάζεσαι να αλλάξεις ή να ακυρώσεις το ραντεβού σου, μπορείς να το κάνεις από τον λογαριασμό σου.</p>
            </div>
            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} PEQI Haircut Studio. All rights reserved.</p>
              <p>Ανυπομονούμε να σε δούμε!</p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `
      Επιβεβαίωση Ραντεβού - PEQI
      
      Γεια σου ${firstName}!
      
      Το ραντεβού σου επιβεβαιώθηκε με επιτυχία!
      
      Λεπτομέρειες Ραντεβού:
      📅 Ημερομηνία: ${formattedDate}
      🕐 Ώρα: ${formattedTime}${durationText}
      💇 Κομμωτής: ${barberName}
      ✂️ Υπηρεσία: ${serviceName}
      
      Θα λάβεις υπενθύμιση 24 ώρες πριν και 2 ώρες πριν το ραντεβού σου.
      
      Αν χρειάζεσαι να αλλάξεις ή να ακυρώσεις το ραντεβού σου, μπορείς να το κάνεις από τον λογαριασμό σου.
      
      PEQI Haircut Studio
      Ανυπομονούμε να σε δούμε!
    `,
  };

  try {
    await deliverMail(mailOptions, "Appointment confirmation");
  } catch (error: any) {
    console.error("❌ Failed to send appointment confirmation email:", error);
    // Don't throw error - appointment creation should not fail if email fails
    if (process.env.NODE_ENV === 'production') {
      console.error(`   Error details: ${error.message}`);
    }
  }
}

/**
 * Send appointment cancellation email to client
 */
export async function sendAppointmentCancellationEmail(
  email: string,
  firstName: string,
  appointmentDate: string,
  appointmentTime: string,
  serviceName: string,
  barberName: string
): Promise<void> {
  const formattedDate = new Date(`${appointmentDate}T${appointmentTime}`).toLocaleDateString('el-GR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  const mailOptions = {
    from: getEmailConfig().from,
    to: email,
    subject: "Ακύρωση Ραντεβού - PEQI",
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #6b7280; color: #fff; padding: 30px; text-align: center; }
            .content { background: #f9f9f9; padding: 30px; }
            .appointment-details { background: #fff; padding: 20px; margin: 20px 0; border-radius: 5px; border-left: 4px solid #6b7280; }
            .detail-row { margin: 10px 0; }
            .detail-label { font-weight: bold; color: #666; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Ακύρωση Ραντεβού</h1>
            </div>
            <div class="content">
              <h2>Γεια σου ${firstName},</h2>
              <p>Το ακόλουθο ραντεβού ακυρώθηκε:</p>
              <div class="appointment-details">
                <div class="detail-row"><span class="detail-label">Ημερομηνία:</span> ${formattedDate}</div>
                <div class="detail-row"><span class="detail-label">Ώρα:</span> ${appointmentTime}</div>
                <div class="detail-row"><span class="detail-label">Κομμωτής:</span> ${barberName}</div>
                <div class="detail-row"><span class="detail-label">Υπηρεσία:</span> ${serviceName}</div>
              </div>
              <p>Μπορείς να κάνεις νέα κράτηση ανά πάσα στιγμή από τον λογαριασμό σου ή να επικοινωνήσεις μαζί μας.</p>
            </div>
            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} PEQI Haircut Studio.</p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `
      Γεια σου ${firstName},
      Το ραντεβού σου ακυρώθηκε.
      Ημερομηνία: ${formattedDate}
      Ώρα: ${appointmentTime}
      Κομμωτής: ${barberName}
      Υπηρεσία: ${serviceName}
      PEQI Haircut Studio
    `,
  };

  try {
    await deliverMail(mailOptions, "Appointment cancellation");
  } catch (error: any) {
    console.error("❌ Failed to send cancellation email:", error);
  }
}

/**
 * Send same-day appointment reminder email
 */
export async function sendSameDayReminderEmail(
  email: string,
  firstName: string,
  appointmentDate: string,
  appointmentTime: string,
  serviceName: string,
  barberName: string,
  duration?: number
): Promise<void> {
  const formattedDate = new Date(`${appointmentDate}T${appointmentTime}`).toLocaleDateString('el-GR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
  const formattedTime = appointmentTime;
  const durationText = duration ? ` (${duration} λεπτά)` : '';

  const mailOptions = {
    from: getEmailConfig().from,
    to: email,
    subject: "Υπενθύμιση Ραντεβού - Σήμερα! - PEQI",
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #0a0a0a; color: #ffffff; padding: 30px; text-align: center; }
            .content { background: #f9f9f9; padding: 30px; }
            .appointment-details { background: #fff; padding: 20px; margin: 20px 0; border-radius: 5px; border-left: 4px solid #0a0a0a; }
            .reminder-badge { background: #ffc107; color: #1a1a1a; padding: 10px 20px; border-radius: 5px; font-weight: bold; display: inline-block; margin: 10px 0; }
            .detail-row { margin: 10px 0; }
            .detail-label { font-weight: bold; color: #666; }
            .button { display: inline-block; background: #0a0a0a; color: #ffffff; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 20px 0; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔔 Υπενθύμιση Ραντεβού</h1>
            </div>
            <div class="content">
              <div class="reminder-badge">ΣΗΜΕΡΑ!</div>
              <h2>Γεια σου ${firstName}!</h2>
              <p>Θυμίζουμε ότι έχεις ραντεβού σήμερα!</p>
              
              <div class="appointment-details">
                <div class="detail-row">
                  <span class="detail-label">📅 Ημερομηνία:</span> ${formattedDate}
                </div>
                <div class="detail-row">
                  <span class="detail-label">🕐 Ώρα:</span> ${formattedTime}${durationText}
                </div>
                <div class="detail-row">
                  <span class="detail-label">💇 Κομμωτής:</span> ${barberName}
                </div>
                <div class="detail-row">
                  <span class="detail-label">✂️ Υπηρεσία:</span> ${serviceName}
                </div>
              </div>
              
              <p><strong>Ανυπομονούμε να σε δούμε!</strong></p>
              
              <div style="text-align: center;">
                <a href="${getEmailConfig().baseUrl}/appointments" class="button">Δες τα Ραντεβού μου</a>
              </div>
              
              <p>Αν χρειάζεσαι να ακυρώσεις το ραντεβού σου, παρακαλώ κάνε το το συντομότερο δυνατό.</p>
            </div>
            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} PEQI Haircut Studio. All rights reserved.</p>
              <p>Σε περιμένουμε!</p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `
      Υπενθύμιση Ραντεβού - Σήμερα! - PEQI
      
      ΣΗΜΕΡΑ!
      
      Γεια σου ${firstName}!
      
      Θυμίζουμε ότι έχεις ραντεβού σήμερα!
      
      Λεπτομέρειες Ραντεβού:
      📅 Ημερομηνία: ${formattedDate}
      🕐 Ώρα: ${formattedTime}${durationText}
      💇 Κομμωτής: ${barberName}
      ✂️ Υπηρεσία: ${serviceName}
      
      Ανυπομονούμε να σε δούμε!
      
      Αν χρειάζεσαι να ακυρώσεις το ραντεβού σου, παρακαλώ κάνε το το συντομότερο δυνατό.
      
      PEQI Haircut Studio
      Σε περιμένουμε!
    `,
  };

  try {
    await deliverMail(mailOptions, "Same-day reminder");
  } catch (error: any) {
    console.error("❌ Failed to send same-day reminder email:", error);
    // Don't throw error - reminder should not fail if email fails
    if (process.env.NODE_ENV === 'production') {
      console.error(`   Error details: ${error.message}`);
    }
  }
}

