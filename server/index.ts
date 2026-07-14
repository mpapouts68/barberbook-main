import 'dotenv/config';
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { initializeFirebase } from "./services/fcm";
import cron from "node-cron";
import { sendNamedayGreetings } from "./services/notifications";
import { checkAndSendReminders } from "./services/appointmentReminders";
import { serveStatic, log } from "./utils";
import { isEmailConfigured } from "./services/email";
import { isGmailApiConfigured } from "./services/gmailApiMailer";
import path from "path";
import fs from "fs";

// Initialize Firebase Admin SDK for push notifications
initializeFirebase();

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  // Check NODE_ENV explicitly - default to production for safety
  const nodeEnv = process.env.NODE_ENV || "production";
  const isDevelopment = nodeEnv === "development";
  
  // ALWAYS use static files in production - NEVER import vite
  // In production, this entire block is skipped, preventing any vite import
  if (isDevelopment && process.env.NODE_ENV === "development") {
    // Only in explicit development mode: try to load vite
    const viteFilePath = path.resolve(import.meta.dirname, "vite.ts");
    const viteFileExists = fs.existsSync(viteFilePath);
    
    if (viteFileExists) {
      try {
        // Use Function constructor to prevent esbuild from analyzing the import
        // @ts-ignore
        const importVite = new Function('return import("./vite")');
        const viteModule = await importVite();
        if (viteModule && viteModule.setupVite) {
          await viteModule.setupVite(app, server);
          log("Vite dev server initialized");
        } else {
          throw new Error("Vite module not available");
        }
      } catch (error: any) {
        const errorMsg = error?.message || String(error);
        log(`Vite not available, using static file serving: ${errorMsg}`);
        serveStatic(app);
      }
    } else {
      log("Vite file not found, using static file serving");
      serveStatic(app);
    }
  } else {
    // Production or NODE_ENV not set: always use static files
    log(`Running in ${nodeEnv} mode - using static file serving`);
    serveStatic(app);
  }

  // Serve the app on the port specified in the environment variable PORT
  // Default to 5100 if not specified.
  // This serves both the API and the client.
  const port = parseInt(process.env.PORT || '5100', 10);
  server.listen(port, () => {
    log(`serving on port ${port}`);
    if (isGmailApiConfigured()) {
      log("email: Gmail API configured (HTTPS)");
    } else if (isEmailConfigured()) {
      log("email: SMTP configured (confirmation emails enabled)");
    } else {
      log(
        "email: not configured — set Gmail API (deploy/GMAIL-API-SETUP.md) or EMAIL_USER/EMAIL_PASS",
      );
    }
  });

  // Schedule daily nameday/birthday greetings
  // Runs every day at 9:00 AM (server timezone)
  // Cron format: minute hour day month weekday
  // '0 9 * * *' = 9:00 AM every day
  cron.schedule('0 9 * * *', async () => {
    try {
      log('🕘 Running scheduled nameday/birthday greetings...');
      await sendNamedayGreetings();
      log('✅ Scheduled nameday/birthday greetings completed');
    } catch (error) {
      log(`❌ Error in scheduled nameday/birthday greetings: ${error}`);
    }
  });

  log('✅ Cron job scheduled: Daily nameday/birthday greetings at 9:00 AM');

  // Schedule appointment reminder checks
  // Runs every 15 minutes to check for appointments needing reminders
  // Cron format: minute hour day month weekday
  // '*/15 * * * *' = Every 15 minutes
  cron.schedule('*/15 * * * *', async () => {
    try {
      log('🔔 Running appointment reminder check...');
      await checkAndSendReminders();
      log('✅ Appointment reminder check completed');
    } catch (error) {
      log(`❌ Error in appointment reminder check: ${error}`);
    }
  });

  log('✅ Cron job scheduled: Appointment reminders every 15 minutes');
})();
