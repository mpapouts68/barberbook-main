import express, { type Express } from "express";
import { createServer, type Server } from "http";
import session from "express-session";
import Database from "better-sqlite3";
import createSqliteStore from "better-sqlite3-session-store";
import passport from "passport";
import multer from "multer";
import path from "path";
import fs from "fs";
import helmet from "helmet";
import { storage } from "./storage";
import {
  testCalendarAccess,
  createCalendarEvent,
  deleteCalendarEvent,
  getCalendarEvents,
  reinitializeGoogleCalendar,
} from "./googleCalendar";
import { initializeDatabase } from "./database";
import { setupOAuth } from "./services/oauth";
import { checkAndSendNamedayGreetings, getTodaysNamedays } from "./services/nameday";
import { sendPushToAudience } from "./services/notifications";
import { hashPassword, generateVerificationToken, generateResetToken, sanitizeUser, isTokenExpired } from "./services/auth";
import { sendVerificationEmail, sendPasswordResetEmail, sendWelcomeEmail, sendAppointmentConfirmationEmail, sendAppointmentCancellationEmail } from "./services/email";
import { validateRegistration, validateLogin, validateForgotPassword, validatePasswordReset, validateRoleUpdate } from "./middleware/validation";
import { loginLimiter, registrationLimiter, passwordResetLimiter, verificationLimiter } from "./middleware/rateLimiter";
import { insertAppointmentSchema, insertPushMessageSchema, insertEmployeeSchema, insertCompanyInfoSchema, insertGoogleCalendarConfigSchema, insertOAuthConfigSchema, insertNotificationSchema, insertShopBrandingSchema } from "@shared/schema";
import { LANDING_SLOTS, type LandingSlotKey } from "@shared/brandingDefaults";
import { isPlaceholderEmail } from "./utils";
import {
  appointmentMatchesGoogleEvent,
  buildGoogleCalendarEventData,
  userToCalendarClient,
} from "./calendarEventHelpers";
import { createGuestAppointment } from "./services/guestBooking";
import {
  addMinutesToTime,
  getWorkingHoursRanges,
  intersectRangeSets,
  timeSlotsOverlap,
} from "./schedulingUtils";
import {
  findFirstAvailableEmployee,
  getEmployeeAvailabilitySlots,
  getNoPreferenceAvailability,
} from "./services/employeeAvailability";
// Recurring appointments service - will be loaded dynamically if available
async function getRecurringAppointmentsService() {
  try {
    const recurringModule = await import("./services/recurringAppointments");
    return recurringModule.createRecurringAppointments;
  } catch (error) {
    return null;
  }
}

// Helper to normalize working hours to array format (supports backward compatibility)
function normalizeWorkingHours(hours: any): Array<{ start: string; end: string }> | null {
  if (!hours || hours === "closed" || (typeof hours === 'object' && hours.start === 'closed')) {
    return null;
  }
  if (Array.isArray(hours)) {
    return hours;
  }
  // Single range format (backward compatible)
  if (hours.start && hours.end) {
    return [hours];
  }
  return null;
}

// Helper to check if a time range is within working hours (supports multiple ranges)
function isTimeWithinWorkingHours(timeStart: string, timeEnd: string, workingHours: any): boolean {
  const ranges = normalizeWorkingHours(workingHours);
  if (!ranges || ranges.length === 0) return false;
  
  return ranges.some(range => {
    return timeStart >= range.start && timeEnd <= range.end;
  });
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Initialize database
  await initializeDatabase();
  
  // Trust proxy (important for nginx reverse proxy)
  // This allows Express to trust X-Forwarded-* headers from nginx
  app.set('trust proxy', 1);
  
  // Security middleware
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:", "blob:", "http:", "http://localhost:5100"],
        connectSrc: ["'self'"],
      },
    },
    crossOriginEmbedderPolicy: false,
  }));
  
  // Setup session
  // Require SESSION_SECRET in production
  if (process.env.NODE_ENV === 'production' && !process.env.SESSION_SECRET) {
    throw new Error('SESSION_SECRET must be set in production environment');
  }
  
  // Use SQLite session store - persists across PM2 restarts and works with multiple instances
  // MemoryStore fails when PM2 runs 2+ instances (each has its own memory → 401 after OAuth)
  const dbPath = process.env.DATABASE_URL?.replace(/^file:/, "") || "./database.sqlite";
  const sessionDb = new Database(dbPath);
  const SqliteStore = createSqliteStore({ Store: session.Store });
  const sessionStore = new SqliteStore({
    client: sessionDb,
    expired: { clear: true, intervalMs: 15 * 60 * 1000 }, // Clean expired every 15 min
  });

  // Determine if we're behind HTTPS proxy
  // Check X-Forwarded-Proto header (set by nginx) or NODE_ENV
  const isSecure = process.env.NODE_ENV === 'production' || process.env.FORCE_SECURE_COOKIES === 'true';
  
  app.use(session({
    store: sessionStore,
    secret: process.env.SESSION_SECRET || "barbershop-secret-key-change-in-production",
    resave: false,
    saveUninitialized: false,
    cookie: { 
      secure: isSecure, // HTTPS only when secure
      httpOnly: true, // Prevent XSS attacks
      sameSite: isSecure ? 'lax' : 'strict', // Use 'lax' for better compatibility with redirects
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      // Important: Set domain if needed (leave undefined for current domain)
      // domain: '.fadefactory.cloud' // Uncomment if cookies need to work across subdomains
    }
  }));

  // Setup passport
  app.use(passport.initialize());
  app.use(passport.session());
  await setupOAuth();

  // Configure multer for file uploads
  const storage_multer = multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'avatars');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, `avatar-${uniqueSuffix}${path.extname(file.originalname)}`);
    }
  });

  const imageFileFilter: multer.Options["fileFilter"] = (req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    const allowedExtensions = /\.(jpeg|jpg|png|gif|webp)$/i;
    const isValidMime = allowedMimes.includes(file.mimetype);
    const isValidExt = allowedExtensions.test(path.extname(file.originalname));
    if (isValidMime && isValidExt) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.'));
    }
  };

  const upload = multer({
    storage: storage_multer,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: imageFileFilter,
  });

  const shopStorage = multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'shop');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, `shop-${uniqueSuffix}${path.extname(file.originalname)}`);
    },
  });

  const uploadShop = multer({
    storage: shopStorage,
    limits: { fileSize: 8 * 1024 * 1024 },
    fileFilter: imageFileFilter,
  });

  const brandingStorage = multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadDir = path.join(process.cwd(), "public", "uploads", "branding");
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      cb(null, `brand-${uniqueSuffix}${path.extname(file.originalname)}`);
    },
  });

  const uploadBranding = multer({
    storage: brandingStorage,
    limits: { fileSize: 8 * 1024 * 1024 },
    fileFilter: imageFileFilter,
  });

  const VALID_LANDING_SLOTS = new Set(LANDING_SLOTS.map((s) => s.key));

  // Ensure upload directories exist before serving static files
  const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
  const avatarsDir = path.join(uploadsDir, 'avatars');
  const shopDir = path.join(uploadsDir, 'shop');
  const brandingDir = path.join(uploadsDir, 'branding');
  
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
    console.log(`✅ Created uploads directory: ${uploadsDir}`);
  }
  if (!fs.existsSync(avatarsDir)) {
    fs.mkdirSync(avatarsDir, { recursive: true });
    console.log(`✅ Created avatars directory: ${avatarsDir}`);
  }
  if (!fs.existsSync(shopDir)) {
    fs.mkdirSync(shopDir, { recursive: true });
    console.log(`✅ Created shop gallery directory: ${shopDir}`);
  }
  if (!fs.existsSync(brandingDir)) {
    fs.mkdirSync(brandingDir, { recursive: true });
    console.log(`✅ Created branding uploads directory: ${brandingDir}`);
  }
  
  // Serve static files from public directory
  app.use('/uploads', express.static(path.join(process.cwd(), 'public', 'uploads'), {
    maxAge: '1y', // Cache for 1 year
    etag: true,
    setHeaders: (res, filePath) => {
      // Set proper content type for images
      if (filePath.endsWith('.jpg') || filePath.endsWith('.jpeg')) {
        res.setHeader('Content-Type', 'image/jpeg');
      } else if (filePath.endsWith('.png')) {
        res.setHeader('Content-Type', 'image/png');
      } else if (filePath.endsWith('.gif')) {
        res.setHeader('Content-Type', 'image/gif');
      } else if (filePath.endsWith('.webp')) {
        res.setHeader('Content-Type', 'image/webp');
      }
    }
  }));

  // Middleware to check authentication
  const requireAuth = (req: any, res: any, next: any) => {
    if (req.isAuthenticated()) {
      return next();
    }
    res.status(401).json({ message: "Authentication required" });
  };

  // Middleware to check admin role
  const requireAdmin = (req: any, res: any, next: any) => {
    if (req.isAuthenticated() && req.user?.role === 'admin') {
      return next();
    }
    res.status(403).json({ message: "Admin access required" });
  };

  // OAuth Routes
  app.get("/api/auth/google", passport.authenticate("google", { scope: ["profile", "email"] }));
  
  app.get("/api/auth/google/callback", 
    passport.authenticate("google", { failureRedirect: "/" }),
    (req, res) => {
      req.session.save((err: Error) => {
        if (err) console.error("OAuth session save error:", err);
        res.redirect("/dashboard");
      });
    }
  );

  app.get("/api/auth/facebook", passport.authenticate("facebook", { scope: ["email"] }));
  
  app.get("/api/auth/facebook/callback",
    passport.authenticate("facebook", { failureRedirect: "/" }),
    (req, res) => {
      req.session.save((err: Error) => {
        if (err) console.error("OAuth session save error:", err);
        res.redirect("/dashboard");
      });
    }
  );

  app.post("/api/auth/logout", (req, res) => {
    req.logout((err) => {
      if (err) {
        return res.status(500).json({ message: "Logout failed" });
      }
      res.json({ message: "Logged out successfully" });
    });
  });

  app.get("/api/auth/me", async (req, res) => {
    try {
      if (req.isAuthenticated() && req.user) {
        // Refresh user data from database to ensure it's up to date
        const user = await storage.getUser((req.user as any).id);
        if (user) {
          res.json(sanitizeUser(user));
        } else {
          // User was deleted from database but session still exists
          req.logout((err) => {
            if (err) console.error("Logout error:", err);
          });
          res.status(401).json({ message: "User not found" });
        }
      } else {
        res.status(401).json({ message: "Not authenticated" });
      }
    } catch (error) {
      console.error("Error in /api/auth/me:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Public endpoint to check OAuth status (no auth required)
  app.get("/api/oauth/status", async (req, res) => {
    try {
      const config = await storage.getOAuthConfig();
      res.json({
        googleEnabled: config?.googleEnabled || false,
        facebookEnabled: config?.facebookEnabled || false,
      });
    } catch (error) {
      res.json({
        googleEnabled: false,
        facebookEnabled: false,
      });
    }
  });

  // Registration endpoint
  app.post("/api/auth/register", registrationLimiter, validateRegistration, async (req, res) => {
    try {
      const { email, password, firstName, lastName, birthday, confirmPassword } = req.body;
      
      // Additional validation: ensure confirmPassword matches password
      if (confirmPassword && confirmPassword !== password) {
        return res.status(400).json({ message: "Passwords do not match" });
      }
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(409).json({ message: "Email already registered" });
      }
      
      // Hash password
      const hashedPassword = await hashPassword(password);
      
      // Check if this is the first user (make them admin and auto-verify)
      const allUsers = await storage.getAllUsers();
      const role = allUsers.length === 0 ? "admin" : "customer";
      const emailVerified = allUsers.length === 0 ? true : false; // Auto-verify first admin user
      
      // Generate verification token only if email needs verification
      const { token: verificationToken } = emailVerified ? { token: null } : generateVerificationToken();
      
      // Create user
      const user = await storage.createUser({
        email,
        password: hashedPassword,
        firstName,
        lastName,
        birthday: birthday || null,
        verificationToken: verificationToken || null,
        role,
        emailVerified,
      });
      
      // Send verification email only if user needs verification
      if (!emailVerified && verificationToken) {
        try {
          await sendVerificationEmail(email, firstName, verificationToken);
        } catch (emailError) {
          console.error("Failed to send verification email:", emailError);
          // Don't fail registration if email fails
        }
      } else if (emailVerified) {
        // First admin user - send welcome email instead
        try {
          await sendWelcomeEmail(email, firstName);
        } catch (emailError) {
          console.error("Failed to send welcome email:", emailError);
        }
      }
      
      res.status(201).json({
        message: "Registration successful! Please check your email to verify your account.",
        user: sanitizeUser(user)
      });
    } catch (error: any) {
      console.error("Registration error:", error);
      res.status(500).json({ message: "Registration failed", error: error.message });
    }
  });

  // Login endpoint
  app.post("/api/auth/login", loginLimiter, validateLogin, (req, res, next) => {
    passport.authenticate("local", (err: any, user: any, info: any) => {
      if (err) {
        console.error("Login authentication error:", err);
        const errorMessage = err?.message || String(err);
        return res.status(500).json({ 
          message: "Login failed", 
          error: process.env.NODE_ENV === 'development' ? errorMessage : undefined 
        });
      }
      
      if (!user) {
        return res.status(401).json({ message: info?.message || "Invalid credentials" });
      }
      
      req.login(user, (loginErr) => {
        if (loginErr) {
          console.error("Session login error:", loginErr);
          const errorMessage = loginErr?.message || String(loginErr);
          return res.status(500).json({ 
            message: "Login failed", 
            error: process.env.NODE_ENV === 'development' ? errorMessage : undefined 
          });
        }
        
        res.json({
          message: "Login successful",
          user: sanitizeUser(user)
        });
      });
    })(req, res, next);
  });

  // Email verification endpoint
  app.get("/api/auth/verify-email/:token", async (req, res) => {
    try {
      const { token } = req.params;
      
      // Validate token is not null or empty
      if (!token || token === "null" || token === "undefined") {
        return res.status(400).json({ message: "Invalid verification token. Please request a new verification email." });
      }
      
      const user = await storage.getUserByVerificationToken(token);
      
      if (!user) {
        return res.status(400).json({ message: "Invalid or expired verification token" });
      }
      
      if (user.emailVerified) {
        return res.status(400).json({ message: "Email already verified" });
      }
      
      // Update user - mark as verified
      await storage.updateUser(user.id, {
        emailVerified: true,
        verificationToken: null,
      });
      
      // Send welcome email
      try {
        await sendWelcomeEmail(user.email, user.firstName);
      } catch (emailError) {
        console.error("Failed to send welcome email:", emailError);
      }
      
      res.json({ message: "Email verified successfully! You can now log in." });
    } catch (error) {
      console.error("Email verification error:", error);
      res.status(500).json({ message: "Email verification failed" });
    }
  });

  // Resend verification email
  app.post("/api/auth/resend-verification", verificationLimiter, async (req, res) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }
      
      const user = await storage.getUserByEmail(email);
      
      if (!user) {
        // Don't reveal if user exists for security
        return res.json({ message: "If the email exists, a verification link has been sent" });
      }
      
      if (user.emailVerified) {
        return res.status(400).json({ message: "Email already verified" });
      }
      
      // Generate new verification token
      const { token: verificationToken } = generateVerificationToken();
      
      await storage.updateUser(user.id, { verificationToken });
      
      // Send verification email
      await sendVerificationEmail(user.email, user.firstName, verificationToken);
      
      res.json({ message: "Verification email sent" });
    } catch (error) {
      console.error("Resend verification error:", error);
      res.status(500).json({ message: "Failed to resend verification email" });
    }
  });

  // Forgot password endpoint
  app.post("/api/auth/forgot-password", passwordResetLimiter, validateForgotPassword, async (req, res) => {
    try {
      const { email } = req.body;
      
      const user = await storage.getUserByEmail(email);
      
      // Don't reveal if user exists for security
      if (!user) {
        return res.json({ message: "If the email exists, a password reset link has been sent" });
      }
      
      // Don't allow password reset for OAuth users
      if (!user.password) {
        return res.json({ message: "If the email exists, a password reset link has been sent" });
      }
      
      // Generate reset token
      const { token: resetToken, expires } = generateResetToken();
      
      await storage.updateUser(user.id, {
        resetPasswordToken: resetToken,
        resetPasswordExpires: expires,
      });
      
      // Send reset email
      await sendPasswordResetEmail(user.email, user.firstName, resetToken);
      
      res.json({ message: "Password reset link sent to your email" });
    } catch (error) {
      console.error("Forgot password error:", error);
      res.status(500).json({ message: "Failed to process password reset request" });
    }
  });

  // Reset password endpoint
  app.post("/api/auth/reset-password/:token", validatePasswordReset, async (req, res) => {
    try {
      const { token } = req.params;
      const { password } = req.body;
      
      const user = await storage.getUserByResetToken(token);
      
      if (!user) {
        return res.status(400).json({ message: "Invalid or expired reset token" });
      }
      
      // Check if token has expired
      if (isTokenExpired(user.resetPasswordExpires)) {
        return res.status(400).json({ message: "Reset token has expired" });
      }
      
      // Hash new password
      const hashedPassword = await hashPassword(password);
      
      // Update password and clear reset token
      await storage.updateUser(user.id, {
        password: hashedPassword,
        resetPasswordToken: null,
        resetPasswordExpires: null,
      });
      
      res.json({ message: "Password reset successful! You can now log in with your new password." });
    } catch (error) {
      console.error("Reset password error:", error);
      res.status(500).json({ message: "Failed to reset password" });
    }
  });

  // User Routes
  app.get("/api/users", requireAuth, async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  // Public guest booking (walk-in style, no account required)
  app.post("/api/appointments/guest", async (req, res) => {
    try {
      const {
        clientFirstName,
        clientLastName,
        clientEmail,
        clientPhone,
        employeeId,
        service,
        barber,
        date,
        time,
        notes,
        duration,
      } = req.body;

      if (!clientFirstName?.trim() || !service || !date || !time) {
        return res.status(400).json({
          message:
            "Απαιτούνται όνομα, υπηρεσία, ημερομηνία και ώρα / First name, service, date and time are required",
        });
      }

      if (!clientPhone?.trim()) {
        return res.status(400).json({
          message:
            "Το τηλέφωνο είναι υποχρεωτικό με κωδικό χώρας (π.χ. +30…) / Phone is required with country code (e.g. +30…)",
        });
      }

      const { appointment } = await createGuestAppointment({
        clientFirstName,
        clientLastName,
        clientEmail,
        clientPhone,
        employeeId: employeeId || "",
        service,
        barber,
        date,
        time,
        notes,
        duration,
      });

      res.status(201).json({
        success: true,
        appointment,
        message: "Appointment booked successfully",
      });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to book appointment";
      const status =
        message.includes("διαθέσιμος") ||
        message.includes("available") ||
        message.includes("conflict") ||
        message.includes("closed")
          ? 409
          : message.includes("Missing") ||
              message.includes("required") ||
              message.includes("τηλέφωνο") ||
              message.includes("phone") ||
              message.includes("Phone")
            ? 400
            : 500;
      console.error("Guest booking error:", error);
      res.status(status).json({ message });
    }
  });

  // Appointment Routes
  app.post("/api/appointments", requireAuth, async (req, res) => {
    try {
      let appointmentData = insertAppointmentSchema.parse({
        ...req.body,
        userId: (req.user as any).id
      });
      
      const requestedStart = appointmentData.time;
      const requestedEnd = addMinutesToTime(appointmentData.time, appointmentData.duration || 30);
      
      // No preference: assign first barber free at this time
      if (!appointmentData.employeeId || appointmentData.employeeId === "" || appointmentData.employeeId === "550e8400-e29b-41d4-a716-446655440003") {
        const assigned = await findFirstAvailableEmployee(
          appointmentData.date,
          appointmentData.time,
          appointmentData.duration || 30,
        );
        if (!assigned) {
          return res.status(409).json({
            message:
              "Δεν υπάρχει διαθέσιμος κομμωτής για αυτή την ώρα. Παρακαλώ επιλέξτε άλλη ώρα.",
          });
        }
        appointmentData.employeeId = assigned.id;
        appointmentData.barber = assigned.name;
        console.log(`✅ Assigned appointment to first available employee: ${assigned.name}`);
      }
      
      // Get employee for calendar sync and recurring appointments
      const employee = await storage.getEmployee(appointmentData.employeeId);
      if (!employee) {
        return res.status(400).json({ message: "Employee not found" });
      }
      
      const appointment = await storage.createAppointment(appointmentData);
      
      // Sync with Google Calendar if employee has calendar configured
      if (appointment.employeeId && employee) {
        try {
          if (employee && employee.googleCalendarEnabled && employee.googleCalendarId) {
            const user = await storage.getUser((req.user as any).id);
            const serviceData = await storage.getService(appointment.service);
            const serviceName = serviceData?.name || appointment.service;
            const eventData = buildGoogleCalendarEventData(
              appointment,
              serviceName,
              userToCalendarClient(user),
            );
            const calendarEvent = await createCalendarEvent(employee.googleCalendarId, eventData);
            if (calendarEvent.id) {
              await storage.updateAppointment(appointment.id, {
                googleEventId: calendarEvent.id,
              });
              appointment.googleEventId = calendarEvent.id;
            }
            
            console.log(`📅 Calendar event created for appointment ${appointment.id}: ${calendarEvent.id}`);
          }
        } catch (calendarError: any) {
          console.error('Failed to sync appointment with calendar:', calendarError?.message || calendarError);
          // Don't fail the appointment creation if calendar sync fails
          // Log the specific error for debugging
          if (calendarError?.cause?.message) {
            console.error('Calendar sync error details:', calendarError.cause.message);
          }
        }
      }
      
      // Handle recurring appointments
      if (appointmentData.isRecurring && appointmentData.recurringPattern) {
        try {
          const employeeForRecurring = await storage.getEmployee(appointment.employeeId);
          if (!employeeForRecurring) {
            throw new Error('Employee not found for recurring appointment');
          }
          
          const createRecurringAppointments = await getRecurringAppointmentsService();
          if (!createRecurringAppointments) {
            return res.status(400).json({ 
              success: false,
              message: "Recurring appointments feature not available" 
            });
          }
          
          const recurringAppointments = await createRecurringAppointments(
            appointment,
            appointmentData.recurringPattern as 'weekly' | 'biweekly' | 'monthly',
            appointmentData.recurringInterval || 1,
            appointmentData.recurringEndDate || null,
            employeeForRecurring
          );
          
          // Create notification for recurring appointment series
          await storage.createNotification({
            userId: (req.user as any).id,
            type: 'appointment_created',
            title: 'Επαναλαμβανόμενο Ραντεβού',
            message: `Δημιουργήθηκε επαναλαμβανόμενο ραντεβού. Δημιουργήθηκαν ${recurringAppointments.length} μελλοντικά ραντεβού.`,
            link: `/appointments`
          });
          
          res.json({ 
            appointment, 
            recurringCount: recurringAppointments.length,
            message: `Created recurring appointment series with ${recurringAppointments.length} future appointments`
          });
          return;
        } catch (recurringError: any) {
          console.error('Failed to create recurring appointments:', recurringError);
          // Continue with single appointment if recurring fails
        }
      }
      
      // Create notification for single appointment
      try {
        await storage.createNotification({
          userId: (req.user as any).id,
          type: 'appointment_created',
          title: 'Νέο Ραντεβού',
          message: `Το ραντεβού σας για ${appointment.date} στις ${appointment.time} έχει δημιουργηθεί.`,
          link: `/appointments`
        });
      } catch (notifError) {
        console.error('Failed to create notification:', notifError);
      }
      
      // Send confirmation email
      try {
        const user = await storage.getUser((req.user as any).id);
        if (user?.email && !isPlaceholderEmail(user.email)) {
          let emailEnabled = true;
          try {
            const prefs = user.notificationPreferences
              ? JSON.parse(user.notificationPreferences)
              : { email: true };
            emailEnabled = prefs.email !== false;
          } catch {
            // default enabled
          }

          if (emailEnabled) {
            const serviceData = await storage.getService(appointment.service);
            const serviceName = serviceData?.name || appointment.service;
            await sendAppointmentConfirmationEmail(
              user.email,
              user.firstName || "Πελάτη",
              appointment.date,
              appointment.time,
              serviceName,
              appointment.barber || employee.name,
              appointment.duration,
            );
            console.log(`📧 Confirmation email queued for ${user.email}`);
          }
        } else if (user?.email && isPlaceholderEmail(user.email)) {
          console.log("📧 Skipped confirmation email (walk-in / no-email user)");
        }
      } catch (emailError) {
        console.error("Failed to send confirmation email:", emailError);
      }
      
      res.json(appointment);
    } catch (error) {
      res.status(400).json({ message: "Invalid appointment data", error });
    }
  });

  app.get("/api/appointments", requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const appointments = await storage.getAppointmentsByUser(userId);
      res.json(appointments);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch appointments" });
    }
  });

  app.get("/api/appointments/all", requireAuth, async (req, res) => {
    try {
      const appointments = await storage.getAllAppointments();
      res.json(appointments);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch all appointments" });
    }
  });

  // Admin endpoint: Create appointment manually (for phone calls, etc.)
  app.post("/api/admin/appointments", requireAdmin, async (req, res) => {
    try {
      const { userId, employeeId, service, barber, date, time, notes, duration, status, 
              clientFirstName, clientLastName, clientEmail, clientPhone } = req.body;
      
      // Validate required fields - either userId OR client info must be provided
      // Email is optional for unregistered clients (walk-ins)
      if ((!userId && !clientFirstName) || !service || !date || !time) {
        return res.status(400).json({ 
          message: "Missing required fields: Either userId OR clientFirstName plus service, date, and time are required" 
        });
      }

      let user;
      if (userId) {
        // Registered client - verify user exists
        user = await storage.getUser(userId);
        if (!user) {
          return res.status(404).json({ message: "User not found" });
        }
      } else {
        // Unregistered client - create or find user account
        if (clientEmail) {
          // Check if user with this email already exists
          const existingUser = await storage.getUserByEmail(clientEmail);
          if (existingUser) {
            user = existingUser;
          } else {
            user = await storage.createUser({
              firstName: clientFirstName,
              lastName: clientLastName || "",
              email: clientEmail,
              phone: clientPhone || "",
              password: null,
              role: "customer",
              emailVerified: false,
              isActive: true,
            });
          }
        } else {
          // No email - create walk-in user with placeholder email (required by DB schema)
          const placeholderEmail = `walk-in-${crypto.randomUUID()}@no-email.local`;
          user = await storage.createUser({
            firstName: clientFirstName,
            lastName: clientLastName || "",
            email: placeholderEmail,
            phone: clientPhone || "",
            password: null,
            role: "customer",
            emailVerified: false,
            isActive: true,
          });
        }
      }

      // Get service details for duration
      const serviceData = await storage.getService(service);
      const appointmentDuration = duration || serviceData?.duration || 30;

      const requestedStart = time;
      const requestedEnd = addMinutesToTime(time, appointmentDuration);

      let finalEmployeeId = employeeId;
      let finalBarber = barber;

      // If employee is specified, verify they're available
      if (finalEmployeeId && finalEmployeeId !== "") {
        const employee = await storage.getEmployee(finalEmployeeId);
        if (!employee) {
          return res.status(404).json({ message: "Employee not found" });
        }
        if (!employee.isActive) {
          return res.status(400).json({ message: "Selected employee is not active" });
        }

        // CRITICAL: Always check shop hours first, then intersect with employee hours
        // Employee can only work when shop is also open
        const dayOfWeek = new Date(date).toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
        
        // Get shop working hours first - shop must be open
        const shopWorkingHours = await storage.getWorkingHours();
        const shopRanges = getWorkingHoursRanges(shopWorkingHours, dayOfWeek);
        
        if (!shopRanges || shopRanges.length === 0) {
          return res.status(400).json({ 
            message: `Shop is closed on ${date}` 
          });
        }
        
        // Get employee working hours if set
        let empRanges: Array<{ start: string; end: string }> | null = null;
        if (employee.workingHours) {
          try {
            const empHours = typeof employee.workingHours === 'string' ? JSON.parse(employee.workingHours) : employee.workingHours;
            empRanges = getWorkingHoursRanges(empHours, dayOfWeek);
          } catch (_) {
            // Parse error, will use shop hours only
          }
        }
        
        // Intersect employee hours with shop hours
        let ranges: Array<{ start: string; end: string }>;
        if (empRanges && empRanges.length > 0) {
          // Employee has hours - intersect with shop hours
          ranges = intersectRangeSets(shopRanges, empRanges);
          if (ranges.length === 0) {
            return res.status(400).json({ 
              message: `Employee ${employee.name} is not working on ${date} (no overlap with shop hours)` 
            });
          }
        } else {
          // No employee hours - use shop hours only
          ranges = shopRanges;
        }
        
        // Validate requested time is within the intersected ranges
        const isWithinHours = ranges.some(range => {
          return requestedStart >= range.start && requestedEnd <= range.end;
        });

        if (!isWithinHours) {
          return res.status(400).json({ 
            message: `Requested time ${time} is outside available hours (shop hours: ${shopRanges.map(r => `${r.start}-${r.end}`).join(', ')})` 
          });
        }

        // Check for conflicts
        const existingAppointments = await storage.getAppointmentsByEmployeeAndDate(
          finalEmployeeId, 
          date
        );
        
        const hasConflict = existingAppointments.some(apt => {
          if (apt.status === 'cancelled') return false;
          const aptEnd = addMinutesToTime(apt.time, apt.duration || 30);
          return timeSlotsOverlap(requestedStart, requestedEnd, apt.time, aptEnd);
        });

        if (hasConflict) {
          return res.status(409).json({ 
            message: `Employee ${employee.name} already has an appointment at ${time}` 
          });
        }

        // Check Google Calendar if enabled (using employee's working hours ranges)
        if (employee.googleCalendarEnabled && employee.googleCalendarId) {
          try {
            const matchingRange = ranges.find((range: any) => requestedStart >= range.start && requestedEnd <= range.end) || ranges[0];
            // Create proper ISO datetime with timezone
            const timezoneOffsetMinutes = new Date().getTimezoneOffset();
            const offsetHours = Math.floor(Math.abs(timezoneOffsetMinutes) / 60);
            const offsetMinutes = Math.abs(timezoneOffsetMinutes) % 60;
            const offsetSign = timezoneOffsetMinutes <= 0 ? '+' : '-';
            const offsetStr = `${offsetSign}${String(offsetHours).padStart(2, '0')}:${String(offsetMinutes).padStart(2, '0')}`;
            const timeMin = `${date}T${matchingRange.start}:00${offsetStr}`;
            const timeMax = `${date}T${matchingRange.end}:00${offsetStr}`;
            const calendarEvents = await getCalendarEvents(employee.googleCalendarId, timeMin, timeMax);
            
            const hasCalendarConflict = calendarEvents.some(event => {
              if (!event.start?.dateTime || !event.end?.dateTime) return false;
              const eventStart = new Date(event.start.dateTime);
              const eventEnd = new Date(event.end.dateTime);
              const eventStartTime = eventStart.toTimeString().slice(0, 5);
              const eventEndTime = eventEnd.toTimeString().slice(0, 5);
              return timeSlotsOverlap(requestedStart, requestedEnd, eventStartTime, eventEndTime);
            });
            
            if (hasCalendarConflict) {
              return res.status(409).json({ 
                message: `Employee ${employee.name} has a calendar conflict at ${time}` 
              });
            }
          } catch (calendarError) {
            console.warn(`Failed to check Google Calendar for employee ${finalEmployeeId}:`, calendarError);
            // Continue anyway - admin override
          }
        }

        finalBarber = employee.name;
      } else {
        // Auto-assign employee (same logic as regular appointment creation)
        // First check shop working hours (employees can't work when shop is closed)
        const shopWorkingHours = await storage.getWorkingHours();
        const dayOfWeek = new Date(date).toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
        const shopRanges = getWorkingHoursRanges(shopWorkingHours, dayOfWeek);
        
        if (!shopRanges || shopRanges.length === 0) {
          return res.status(400).json({ message: "Shop is closed on this day" });
        }
        
        const isWithinShopHours = shopRanges.some(range => {
          return requestedStart >= range.start && requestedEnd <= range.end;
        });
        
        if (!isWithinShopHours) {
          return res.status(400).json({ message: "Requested time is outside shop working hours" });
        }
        
        const allEmployees = await storage.getAllEmployees();
        const activeEmployees = allEmployees.filter(emp => emp.isActive);
        let assignedEmployee = null;
        
        for (const employee of activeEmployees) {
          
          const existingAppointments = await storage.getAppointmentsByEmployeeAndDate(
            employee.id, 
            date
          );
          
          const hasConflict = existingAppointments.some(apt => {
            if (apt.status === 'cancelled') return false;
            const aptEnd = addMinutesToTime(apt.time, apt.duration || 30);
            return timeSlotsOverlap(requestedStart, requestedEnd, apt.time, aptEnd);
          });
          
          if (!hasConflict) {
            assignedEmployee = employee;
            break;
          }
        }
        
        if (!assignedEmployee) {
          return res.status(409).json({ 
            message: "No available employee found for this time slot" 
          });
        }
        
        finalEmployeeId = assignedEmployee.id;
        finalBarber = assignedEmployee.name;
      }

      // Create appointment
      const appointmentData: any = {
        userId: user.id, // Use the user object (either existing or newly created)
        employeeId: finalEmployeeId,
        service,
        barber: finalBarber,
        date,
        time,
        notes: notes || "",
        duration: appointmentDuration,
        status: status || "confirmed" // Default to confirmed for admin-created appointments
      };

      const appointment = await storage.createAppointment(appointmentData);

      // Send confirmation email (skip for walk-ins without real email)
      try {
        if (user && user.email && !isPlaceholderEmail(user.email)) {
          // Check if user has email notifications enabled (default to true)
          let emailEnabled = true;
          try {
            const prefs = user.notificationPreferences 
              ? JSON.parse(user.notificationPreferences) 
              : { email: true };
            emailEnabled = prefs.email !== false;
          } catch (e) {
            // Default to enabled if preferences are invalid
          }
          
          if (emailEnabled) {
            const serviceData = await storage.getService(appointment.service);
            const serviceName = serviceData?.name || appointment.service;
            const employee = await storage.getEmployee(finalEmployeeId);
            
            await sendAppointmentConfirmationEmail(
              user.email,
              user.firstName,
              appointment.date,
              appointment.time,
              serviceName,
              appointment.barber || employee?.name || 'Κομμωτής',
              appointment.duration
            );
          }
        }
      } catch (emailError) {
        console.error('Failed to send confirmation email:', emailError);
        // Don't fail appointment creation if email fails
      }

      // Sync with Google Calendar if enabled
      const employee = await storage.getEmployee(finalEmployeeId);
      if (employee?.googleCalendarEnabled && employee?.googleCalendarId) {
        try {
          // Get service name for calendar event
          const serviceData = await storage.getService(appointment.service);
          const serviceName = serviceData?.name || appointment.service;
          const eventData = buildGoogleCalendarEventData(
            appointment,
            serviceName,
            userToCalendarClient(user),
          );
          const calendarEvent = await createCalendarEvent(employee.googleCalendarId, eventData);
          if (calendarEvent.id) {
            await storage.updateAppointment(appointment.id, { googleEventId: calendarEvent.id });
          }
        } catch (calendarError) {
          console.warn("Failed to sync appointment with Google Calendar:", calendarError);
          // Don't fail the request if calendar sync fails
        }
      }

      res.status(201).json({
        success: true,
        appointment,
        message: `Appointment created successfully for ${user.firstName} ${user.lastName}`
      });
    } catch (error: any) {
      console.error("Error creating manual appointment:", error);
      res.status(500).json({ 
        message: error.message || "Failed to create appointment" 
      });
    }
  });

  app.get("/api/appointments/today", requireAuth, async (req, res) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const appointments = await storage.getAppointmentsByDate(today);
      res.json(appointments);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch today's appointments" });
    }
  });

  // Get appointments by specific date (for TV display - no auth required)
  app.get("/api/appointments/date/:date", async (req, res) => {
    try {
      const { date } = req.params;
      
      // Get database appointments
      const dbAppointments = await storage.getAppointmentsByDate(date);
      
      // Enrich with client names for display (TV display and others)
      const enrichedAppointments = await Promise.all(dbAppointments.map(async (apt) => {
        const user = apt.userId ? await storage.getUser(apt.userId) : undefined;
        return {
          ...apt,
          clientFirstName: user?.firstName,
          clientLastName: user?.lastName,
        };
      }));
      
      // Get all employees to check for Google Calendar integration
      const employees = await storage.getAllEmployees();
      const googleCalendarAppointments: any[] = [];
      
      // Fetch Google Calendar events for employees with calendar enabled
      for (const employee of employees) {
        if (employee.googleCalendarEnabled && employee.googleCalendarId && employee.isActive) {
          try {
            // Get shop-wide working hours (NOT per-employee - all employees use same shop hours)
            const shopWorkingHours = await storage.getWorkingHours();
            const dayOfWeek = new Date(date).toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
            const ranges = getWorkingHoursRanges(shopWorkingHours, dayOfWeek);
            
            if (ranges && ranges.length > 0) {
              // Get the earliest start and latest end across all ranges
              const allStarts = ranges.map(r => r.start).sort();
              const allEnds = ranges.map(r => r.end).sort();
              
              // Create proper ISO 8601 datetime strings with local timezone
              const timezoneOffsetMinutes = new Date().getTimezoneOffset();
              const offsetHours = Math.floor(Math.abs(timezoneOffsetMinutes) / 60);
              const offsetMinutes = Math.abs(timezoneOffsetMinutes) % 60;
              const offsetSign = timezoneOffsetMinutes <= 0 ? '+' : '-';
              const offsetStr = `${offsetSign}${String(offsetHours).padStart(2, '0')}:${String(offsetMinutes).padStart(2, '0')}`;
              
              const timeMin = `${date}T${allStarts[0]}:00${offsetStr}`;
              const timeMax = `${date}T${allEnds[allEnds.length - 1]}:00${offsetStr}`;
              
              const calendarEvents = await getCalendarEvents(employee.googleCalendarId, timeMin, timeMax);
              
              // Convert Google Calendar events to appointment-like objects
              for (const event of calendarEvents) {
                if (event.start?.dateTime && event.end?.dateTime) {
                  const eventStart = new Date(event.start.dateTime);
                  const eventEnd = new Date(event.end.dateTime);
                  const eventDate = eventStart.toISOString().split('T')[0];
                  
                  // Only include events for the requested date
                  if (eventDate === date) {
                    const eventStartTime = eventStart.toTimeString().slice(0, 5);
                    const duration = Math.round((eventEnd.getTime() - eventStart.getTime()) / 60000);
                    
                    const existingAppointment = enrichedAppointments.find((apt) =>
                      appointmentMatchesGoogleEvent(apt, event, date, employee.id),
                    );
                    if (!existingAppointment) {
                      googleCalendarAppointments.push({
                        id: `google-${event.id}`,
                        userId: null, // Google Calendar events don't have userId
                        employeeId: employee.id,
                        service: event.summary || 'Google Calendar Event',
                        barber: employee.name,
                        date: date,
                        time: eventStartTime,
                        duration: duration,
                        notes: event.description || '',
                        status: 'confirmed',
                        googleEventId: event.id,
                        isGoogleCalendarEvent: true, // Flag to identify Google Calendar events
                        createdAt: eventStart.getTime()
                      });
                    }
                  }
                }
              }
            }
          } catch (calendarError: any) {
            console.warn(`⚠️  Failed to fetch Google Calendar events for ${employee.name} on ${date}:`, calendarError.message);
            // Continue with other employees if one fails
          }
        }
      }
      
      // Merge database appointments with Google Calendar events
      const allAppointments = [...enrichedAppointments, ...googleCalendarAppointments];
      
      // Sort by time
      allAppointments.sort((a, b) => {
        const timeA = a.time || '00:00';
        const timeB = b.time || '00:00';
        return timeA.localeCompare(timeB);
      });
      
      res.json(allAppointments);
    } catch (error) {
      console.error("Error fetching appointments by date:", error);
      res.status(500).json({ message: "Failed to fetch appointments" });
    }
  });

  app.put("/api/appointments/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const updateData: any = {};
      
      // Allow updating status, date, time, duration, notes, employeeId, service
      if (req.body.status !== undefined) updateData.status = req.body.status;
      if (req.body.date !== undefined) updateData.date = req.body.date;
      if (req.body.time !== undefined) updateData.time = req.body.time;
      if (req.body.duration !== undefined) updateData.duration = req.body.duration;
      if (req.body.notes !== undefined) updateData.notes = req.body.notes;
      if (req.body.employeeId !== undefined) updateData.employeeId = req.body.employeeId;
      if (req.body.service !== undefined) updateData.service = req.body.service;
      if (req.body.barber !== undefined) updateData.barber = req.body.barber;
      
      // Get existing appointment
      const existingAppointment = await storage.getAppointment(id);
      if (!existingAppointment) {
        return res.status(404).json({ message: "Appointment not found" });
      }
      
      // Check if user owns the appointment or is admin
      const userId = (req.user as any).id;
      const userRole = (req.user as any).role;
      if (existingAppointment.userId !== userId && userRole !== 'admin') {
        return res.status(403).json({ message: "You can only update your own appointments" });
      }
      
      // Update appointment
      const updatedAppointment = await storage.updateAppointment(id, updateData);
      
      // If date/time/employee changed, sync with Google Calendar
      if ((updateData.date || updateData.time || updateData.employeeId) && updatedAppointment?.employeeId) {
        try {
          const employee = await storage.getEmployee(updatedAppointment.employeeId);
          if (employee?.googleCalendarEnabled && employee?.googleCalendarId) {
            const finalDate = updateData.date || existingAppointment.date;
            const finalTime = updateData.time || existingAppointment.time;
            const finalDuration = updateData.duration || existingAppointment.duration || 30;
            
            // Delete old calendar event if it exists
            if (existingAppointment.googleEventId) {
              try {
                await deleteCalendarEvent(employee.googleCalendarId, existingAppointment.googleEventId);
              } catch (deleteError) {
                console.warn('Failed to delete old calendar event:', deleteError);
              }
            }
            
            // Create new calendar event
            const user = await storage.getUser(updatedAppointment.userId);
            const serviceData = await storage.getService(updatedAppointment.service);
            const serviceName = serviceData?.name || updatedAppointment.service;
            const eventData = buildGoogleCalendarEventData(
              { ...updatedAppointment, date: finalDate, time: finalTime, duration: finalDuration },
              serviceName,
              userToCalendarClient(user),
            );
            const calendarEvent = await createCalendarEvent(employee.googleCalendarId, eventData);
            if (calendarEvent.id) {
              await storage.updateAppointment(id, { googleEventId: calendarEvent.id });
            }
          }
        } catch (calendarError: any) {
          console.error('Failed to sync with Google Calendar:', calendarError?.message || calendarError);
          // Don't fail the update if calendar sync fails
        }
      }
      
      res.json(updatedAppointment);
    } catch (error: any) {
      console.error("Failed to update appointment:", error);
      res.status(500).json({ message: error.message || "Failed to update appointment" });
    }
  });

  app.delete("/api/appointments/:id", requireAuth, async (req, res) => {
    try {
      const notifyClient = req.query.notify === "1" || req.query.notify === "true";
      const appointment = await storage.getAppointment(req.params.id);
      if (!appointment) {
        return res.status(404).json({ message: "Appointment not found" });
      }

      // If cancel with notification: send email to client, then cancel and sync Google
      if (notifyClient) {
        let clientEmail: string | null = null;
        let clientFirstName = "Πελάτη";
        if (appointment.userId) {
          const user = await storage.getUser(appointment.userId);
          if (user?.email) {
            clientEmail = user.email;
            clientFirstName = user.firstName || clientFirstName;
          }
        } else if ((appointment as any).clientEmail) {
          clientEmail = (appointment as any).clientEmail;
          clientFirstName = (appointment as any).clientFirstName || clientFirstName;
        }
        if (clientEmail && !isPlaceholderEmail(clientEmail)) {
          const serviceData = await storage.getService(appointment.service);
          const serviceName = serviceData?.name || appointment.service;
          const barberName = appointment.barber || "—";
          await sendAppointmentCancellationEmail(
            clientEmail,
            clientFirstName,
            appointment.date,
            appointment.time || "00:00",
            serviceName,
            barberName
          );
        }
      }

      const success = await storage.cancelAppointment(req.params.id);
      if (success) {
        // Delete from Google Calendar if it exists
        if (appointment?.googleEventId && appointment?.employeeId) {
          try {
            const employee = await storage.getEmployee(appointment.employeeId);
            if (employee?.googleCalendarEnabled && employee?.googleCalendarId) {
              await deleteCalendarEvent(employee.googleCalendarId, appointment.googleEventId);
              console.log(`🗑️ Calendar event deleted for appointment ${req.params.id}: ${appointment.googleEventId}`);
            }
          } catch (calendarError: any) {
            console.error('Failed to delete calendar event:', calendarError?.message || calendarError);
          }
        }
        res.json({ message: notifyClient ? "Appointment cancelled and client notified" : "Appointment cancelled successfully" });
      } else {
        res.status(404).json({ message: "Appointment not found" });
      }
    } catch (error) {
      console.error("Failed to cancel appointment:", error);
      res.status(500).json({ message: "Failed to cancel appointment" });
    }
  });

  // Employee routes
  app.get("/api/employees", async (req, res) => {
    try {
      const employees = await storage.getAllEmployees();
      // Filter to only return active employees
      const activeEmployees = employees.filter(emp => emp.isActive !== false);
      res.json(activeEmployees);
    } catch (error) {
      console.error("Error fetching employees:", error);
      res.status(500).json({ message: "Failed to fetch employees" });
    }
  });

  app.post("/api/employees", requireAuth, async (req, res) => {
    try {
      const data = insertEmployeeSchema.parse(req.body);
      const employee = await storage.createEmployee(data);
      res.json(employee);
    } catch (error) {
      console.error("Error creating employee:", error);
      res.status(400).json({ message: "Failed to create employee" });
    }
  });

  app.put("/api/employees/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const data = insertEmployeeSchema.partial().parse(req.body);
      const employee = await storage.updateEmployee(id, data);
      res.json(employee);
    } catch (error) {
      console.error("Error updating employee:", error);
      res.status(400).json({ message: "Failed to update employee", error: error.message });
    }
  });

  app.post("/api/employees/:id/test-calendar", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const employee = await storage.getEmployee(id);
      
      if (!employee || !employee.googleCalendarId) {
        return res.status(400).json({ 
          success: false, 
          message: "Employee not found or Google Calendar ID not set" 
        });
      }

      const result = await testCalendarAccess(employee.googleCalendarId);
      res.json(result);
    } catch (error) {
      console.error("Error testing calendar access:", error);
      res.status(500).json({ 
        success: false, 
        message: "Failed to test calendar access" 
      });
    }
  });

  app.get("/api/employees/:id", async (req, res) => {
    try {
      const employee = await storage.getEmployee(req.params.id);
      if (!employee) {
        return res.status(404).json({ message: "Employee not found" });
      }
      res.json(employee);
    } catch (error) {
      console.error("Error fetching employee:", error);
      res.status(500).json({ message: "Failed to fetch employee" });
    }
  });


  // Calendar availability routes
  app.get("/api/availability/no-preference", async (req, res) => {
    try {
      const { date, duration = 30 } = req.query;
      if (!date || typeof date !== "string") {
        return res.status(400).json({ message: "Date parameter is required" });
      }
      const slots = await getNoPreferenceAvailability(date, Number(duration));
      res.json(slots);
    } catch (error) {
      console.error("Error fetching no-preference availability:", error);
      res.status(500).json({ message: "Failed to fetch availability" });
    }
  });

  app.get("/api/employees/:id/availability", async (req, res) => {
    try {
      const { date, duration = 30 } = req.query;

      if (!date || typeof date !== "string") {
        return res.status(400).json({ message: "Date parameter is required" });
      }

      const employee = await storage.getEmployee(req.params.id);
      if (!employee) {
        return res.status(404).json({ message: "Employee not found" });
      }

      const slots = await getEmployeeAvailabilitySlots(
        req.params.id,
        date,
        Number(duration),
      );
      res.json(slots);
    } catch (error) {
      console.error("Error fetching availability:", error);
      res.status(500).json({ message: "Failed to fetch availability" });
    }
  });

  // Nameday Routes
  app.get("/api/nameday/check", requireAuth, async (req, res) => {
    try {
      const result = await checkAndSendNamedayGreetings();
      res.json({
        message: `Nameday greetings sent to ${result.sent} users`,
        celebratingNames: result.names
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to check namedays" });
    }
  });

  app.get("/api/nameday/today", async (req, res) => {
    try {
      const names = await getTodaysNamedays();
      res.json(names);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch today's namedays" });
    }
  });

  // Push Notification Routes
  app.post("/api/push/send", requireAuth, async (req, res) => {
    try {
      const messageData = insertPushMessageSchema.parse(req.body);
      
      await sendPushToAudience(
        messageData.title,
        messageData.body,
        messageData.audience,
        undefined
      );
      
      res.json({ message: "Push notification sent successfully" });
    } catch (error) {
      res.status(400).json({ message: "Invalid push message data", error });
    }
  });

  app.get("/api/push/history", requireAuth, async (req, res) => {
    try {
      const messages = await storage.getAllPushMessages();
      res.json(messages);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch push message history" });
    }
  });

  // Settings Routes (Admin only)
  app.get("/api/settings/:key", requireAdmin, async (req, res) => {
    try {
      const setting = await storage.getSetting(req.params.key);
      if (setting) {
        res.json(setting);
      } else {
        res.status(404).json({ message: "Setting not found" });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch setting" });
    }
  });

  app.put("/api/settings/:key", requireAdmin, async (req, res) => {
    try {
      if (!req.body.value) {
        return res.status(400).json({ message: "Value is required" });
      }
      await storage.updateSetting(req.params.key, req.body.value);
      res.json({ message: "Setting updated successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to update setting" });
    }
  });

  // Admin routes
  app.get("/api/admin/employees", requireAdmin, async (req, res) => {
    try {
      const employees = await storage.getAllEmployees();
      res.json(employees);
    } catch (error) {
      console.error("Error fetching employees:", error);
      res.status(500).json({ message: "Failed to fetch employees" });
    }
  });

  // Working hours management
  app.get("/api/admin/working-hours", async (req, res) => {
    try {
      const workingHours = await storage.getWorkingHours();
      res.json(workingHours);
    } catch (error) {
      console.error("Error fetching working hours:", error);
      res.status(500).json({ error: "Failed to fetch working hours" });
    }
  });

  app.put("/api/admin/working-hours", async (req, res) => {
    try {
      const workingHours = req.body;
      await storage.updateWorkingHours(workingHours);
      res.json({ success: true });
    } catch (error) {
      console.error("Error updating working hours:", error);
      res.status(500).json({ error: "Failed to update working hours" });
    }
  });

  app.get("/api/appointments/all", requireAdmin, async (req, res) => {
    try {
      const appointments = await storage.getAllAppointments();
      res.json(appointments);
    } catch (error) {
      console.error("Error fetching all appointments:", error);
      res.status(500).json({ message: "Failed to fetch appointments" });
    }
  });

  app.post("/api/admin/employees", requireAdmin, async (req, res) => {
    try {
      const validatedData = insertEmployeeSchema.parse(req.body);
      const employee = await storage.createEmployee(validatedData);
      res.status(201).json(employee);
    } catch (error: any) {
      console.error("Error creating employee:", error);
      res.status(400).json({ message: error.message || "Failed to create employee" });
    }
  });

  app.delete("/api/admin/employees/:id", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const employee = await storage.getEmployee(id);
      if (!employee) {
        return res.status(404).json({ message: "Employee not found" });
      }
      const appts = await storage.getAppointmentsByEmployee(id);
      if (employee.googleCalendarEnabled && employee.googleCalendarId) {
        for (const apt of appts) {
          if (!apt.googleEventId) continue;
          try {
            await deleteCalendarEvent(employee.googleCalendarId, apt.googleEventId);
          } catch (calendarError: unknown) {
            console.error(
              "Failed to delete Google Calendar event for appointment",
              apt.id,
              calendarError
            );
          }
        }
      }
      await storage.deleteEmployee(id);
      res.status(204).send();
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      if (msg === "Employee not found") {
        return res.status(404).json({ message: "Employee not found" });
      }
      console.error("Error deleting employee:", error);
      res.status(500).json({ message: "Failed to delete employee" });
    }
  });

  // Admin user management routes
  app.get("/api/admin/users", requireAdmin, async (req, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const search = req.query.search as string;
      const filter = (req.query.filter as "all" | "real_email" | "walk_in") || "all";
      const sort = (req.query.sort as "name_asc" | "name_desc") || "name_asc";

      const result = await storage.getUsersWithPagination(page, limit, search, filter, sort);
      
      // Sanitize all users before sending
      const sanitizedUsers = result.users.map(user => sanitizeUser(user));
      
      res.json({
        users: sanitizedUsers,
        total: result.total,
        page,
        limit,
        totalPages: Math.ceil(result.total / limit)
      });
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.get("/api/admin/users/:id", requireAdmin, async (req, res) => {
    try {
      const user = await storage.getUser(req.params.id);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json(sanitizeUser(user));
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  app.patch("/api/admin/users/:id/role", requireAdmin, validateRoleUpdate, async (req, res) => {
    try {
      const { id } = req.params;
      const { role } = req.body;
      
      // Prevent changing own role
      const currentUser = req.user as any;
      if (currentUser.id === id) {
        return res.status(403).json({ message: "You cannot change your own role" });
      }
      
      const user = await storage.updateUserRole(id, role);
      res.json({
        message: "User role updated successfully",
        user: sanitizeUser(user)
      });
    } catch (error) {
      console.error("Error updating user role:", error);
      res.status(500).json({ message: "Failed to update user role" });
    }
  });

  app.patch("/api/admin/users/:id/suspend", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      
      // Prevent suspending own account
      const currentUser = req.user as any;
      if (currentUser.id === id) {
        return res.status(403).json({ message: "You cannot suspend your own account" });
      }
      
      const user = await storage.suspendUser(id);
      res.json({
        message: "User suspended successfully",
        user: sanitizeUser(user)
      });
    } catch (error) {
      console.error("Error suspending user:", error);
      res.status(500).json({ message: "Failed to suspend user" });
    }
  });

  app.patch("/api/admin/users/:id/activate", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      
      const user = await storage.activateUser(id);
      res.json({
        message: "User activated successfully",
        user: sanitizeUser(user)
      });
    } catch (error) {
      console.error("Error activating user:", error);
      res.status(500).json({ message: "Failed to activate user" });
    }
  });

  app.patch("/api/admin/users/:id/verify-email", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      
      // Check if user exists
      const user = await storage.getUser(id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Check if already verified
      if (user.emailVerified) {
        return res.status(400).json({ message: "User email is already verified" });
      }
      
      // Verify the user's email
      await storage.updateUser(id, {
        emailVerified: true,
        verificationToken: null,
      });
      
      // Send welcome email if not already sent
      try {
        await sendWelcomeEmail(user.email, user.firstName);
      } catch (emailError) {
        console.error("Failed to send welcome email:", emailError);
        // Don't fail the verification if email fails
      }
      
      const updatedUser = await storage.getUser(id);
      res.json({
        message: "User email verified successfully",
        user: sanitizeUser(updatedUser!)
      });
    } catch (error: any) {
      console.error("Error verifying user email:", error);
      res.status(500).json({ message: error.message || "Failed to verify user email" });
    }
  });

  app.delete("/api/admin/users/:id", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const currentUser = req.user as any;
      
      // Prevent deleting own account
      if (currentUser.id === id) {
        return res.status(403).json({ message: "You cannot delete your own account" });
      }
      
      // Check if user exists
      const user = await storage.getUser(id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Prevent deleting the last admin
      if (user.role === 'admin') {
        const allUsers = await storage.getAllUsers();
        const adminCount = allUsers.filter(u => u.role === 'admin' && u.isActive).length;
        if (adminCount <= 1) {
          return res.status(403).json({ message: "Cannot delete the last admin user" });
        }
      }
      
      // Delete the user (cascading deletes handled in storage)
      await storage.deleteUser(id);
      
      res.json({ message: "User deleted successfully" });
    } catch (error: any) {
      console.error("Error deleting user:", error);
      const msg =
        error.message?.includes("FOREIGN KEY")
          ? "Δεν ήταν δυνατή η διαγραφή — υπάρχουν συνδεδεμένα δεδομένα. Επανεκκινήστε τον server μετά από ενημέρωση."
          : error.message || "Failed to delete user";
      res.status(500).json({ message: msg });
    }
  });

  // File upload routes
  app.post("/api/upload/avatar", requireAuth, upload.single('avatar'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ 
          success: false,
          message: "No file uploaded. Please select an image file." 
        });
      }

      // Verify file was actually saved
      const filePath = path.join(process.cwd(), 'public', 'uploads', 'avatars', req.file.filename);
      if (!fs.existsSync(filePath)) {
        console.error("File was not saved:", filePath);
        return res.status(500).json({ 
          success: false,
          message: "File upload failed - file was not saved" 
        });
      }

      const fileUrl = `/uploads/avatars/${req.file.filename}`;
      console.log(`✅ Avatar uploaded successfully: ${fileUrl}`);
      
      res.json({ 
        success: true, 
        url: fileUrl,
        filename: req.file.filename 
      });
    } catch (error: any) {
      console.error("Error uploading avatar:", error);
      
      // Handle multer errors specifically
      if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ 
            success: false,
            message: "File too large. Maximum size is 5MB." 
          });
        }
        return res.status(400).json({ 
          success: false,
          message: error.message || "File upload error" 
        });
      }
      
      // Handle validation errors
      if (error.message && error.message.includes('Invalid file type')) {
        return res.status(400).json({ 
          success: false,
          message: error.message 
        });
      }
      
      res.status(500).json({ 
        success: false,
        message: error.message || "Failed to upload avatar" 
      });
    }
  });

  // Shop photo gallery
  app.get("/api/shop-photos", requireAuth, async (req, res) => {
    try {
      const photos = await storage.getShopPhotos();
      res.json(photos);
    } catch (error) {
      console.error("Error fetching shop photos:", error);
      res.status(500).json({ message: "Failed to fetch shop photos" });
    }
  });

  app.post("/api/admin/shop-photos", requireAdmin, uploadShop.single("photo"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No image uploaded" });
      }

      const filePath = path.join(shopDir, req.file.filename);
      if (!fs.existsSync(filePath)) {
        return res.status(500).json({ message: "File upload failed" });
      }

      const url = `/uploads/shop/${req.file.filename}`;
      const caption = typeof req.body.caption === "string" ? req.body.caption.trim() : "";
      const existing = await storage.getShopPhotos();
      const photo = await storage.createShopPhoto({
        url,
        caption: caption || null,
        displayOrder: existing.length,
      });

      res.status(201).json(photo);
    } catch (error: unknown) {
      console.error("Error uploading shop photo:", error);
      const message = error instanceof Error ? error.message : "Failed to upload photo";
      res.status(500).json({ message });
    }
  });

  app.delete("/api/admin/shop-photos/:id", requireAdmin, async (req, res) => {
    try {
      const photo = await storage.getShopPhoto(req.params.id);
      if (!photo) {
        return res.status(404).json({ message: "Photo not found" });
      }

      const relative = photo.url.replace(/^\/uploads\/shop\//, "");
      const filePath = path.join(shopDir, relative);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      await storage.deleteShopPhoto(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting shop photo:", error);
      res.status(500).json({ message: "Failed to delete photo" });
    }
  });

  app.delete("/api/upload/avatar/:filename", requireAuth, async (req, res) => {
    try {
      const { filename } = req.params;
      const filePath = path.join(process.cwd(), 'public', 'uploads', 'avatars', filename);
      
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        res.json({ success: true, message: "File deleted successfully" });
      } else {
        res.status(404).json({ message: "File not found" });
      }
    } catch (error) {
      console.error("Error deleting avatar:", error);
      res.status(500).json({ message: "Failed to delete avatar" });
    }
  });

  // Company info routes
  app.get("/api/company", async (req, res) => {
    try {
      const info = await storage.getCompanyInfo();
      res.json(info || { name: "Barbershop Premium", description: "Το καλύτερο κουρείο στην πόλη" });
    } catch (error) {
      console.error("Error fetching company info:", error);
      res.status(500).json({ message: "Failed to fetch company info" });
    }
  });

  app.put("/api/admin/company", requireAdmin, async (req, res) => {
    try {
      const validatedData = insertCompanyInfoSchema.parse(req.body);
      const company = await storage.updateCompanyInfo(validatedData);
      res.json(company);
    } catch (error: any) {
      console.error("Error updating company info:", error);
      res.status(400).json({ message: error.message || "Failed to update company info" });
    }
  });

  // Branding (white-label)
  app.get("/api/branding", async (_req, res) => {
    try {
      const branding = await storage.getBrandingSettings();
      res.json(branding);
    } catch (error) {
      console.error("Error fetching branding:", error);
      res.status(500).json({ message: "Failed to fetch branding" });
    }
  });

  app.put("/api/admin/branding", requireAdmin, async (req, res) => {
    try {
      const validated = insertShopBrandingSchema.parse(req.body);
      const branding = await storage.updateShopBranding(validated);
      res.json(branding);
    } catch (error: unknown) {
      console.error("Error updating branding:", error);
      const message = error instanceof Error ? error.message : "Failed to update branding";
      res.status(400).json({ message });
    }
  });

  app.post("/api/admin/branding/logo", requireAdmin, uploadBranding.single("logo"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No image uploaded" });
      }

      const variant = req.body.variant === "landscape" ? "landscape" : "round";
      const url = `/uploads/branding/${req.file.filename}`;
      const patch =
        variant === "landscape"
          ? { logoLandscapeUrl: url }
          : { logoUrl: url };

      const branding = await storage.updateShopBranding(patch);
      res.json(branding);
    } catch (error: unknown) {
      console.error("Error uploading branding logo:", error);
      const message = error instanceof Error ? error.message : "Failed to upload logo";
      res.status(500).json({ message });
    }
  });

  app.post("/api/admin/branding/landing/:slot", requireAdmin, uploadBranding.single("image"), async (req, res) => {
    try {
      const slot = req.params.slot as LandingSlotKey;
      if (!VALID_LANDING_SLOTS.has(slot)) {
        return res.status(400).json({ message: "Invalid landing image slot" });
      }
      if (!req.file) {
        return res.status(400).json({ message: "No image uploaded" });
      }

      const url = `/uploads/branding/${req.file.filename}`;
      const current = await storage.getBrandingSettings();
      const landingImages = {
        ...current.landingImages,
        [slot]: url,
      };

      const branding = await storage.updateShopBranding({ landingImages });
      res.json(branding);
    } catch (error: unknown) {
      console.error("Error uploading landing image:", error);
      const message = error instanceof Error ? error.message : "Failed to upload landing image";
      res.status(500).json({ message });
    }
  });

  app.delete("/api/admin/branding/landing/:slot", requireAdmin, async (req, res) => {
    try {
      const slot = req.params.slot as LandingSlotKey;
      if (!VALID_LANDING_SLOTS.has(slot)) {
        return res.status(400).json({ message: "Invalid landing image slot" });
      }

      const current = await storage.getBrandingSettings();
      const landingImages = { ...current.landingImages, [slot]: null };
      const branding = await storage.updateShopBranding({ landingImages });
      res.json(branding);
    } catch (error: unknown) {
      console.error("Error clearing landing image:", error);
      const message = error instanceof Error ? error.message : "Failed to clear landing image";
      res.status(500).json({ message });
    }
  });

  // Admin push notifications
  app.post("/api/admin/push-notifications", requireAdmin, async (req, res) => {
    try {
      const { audience, title, message, userIds } = req.body;

      if (!audience || !title || !message) {
        return res.status(400).json({ message: "Audience, title and message are required" });
      }

      if (audience === "selected") {
        if (!Array.isArray(userIds) || userIds.length === 0) {
          return res.status(400).json({
            message: "Επιλέξτε τουλάχιστον έναν χρήστη για αποστολή",
          });
        }
        const bad = userIds.some((id: unknown) => typeof id !== "string" || !String(id).trim());
        if (bad) {
          return res.status(400).json({ message: "Μη έγκυρη λίστα χρηστών" });
        }
      }

      await sendPushToAudience(
        title,
        message,
        audience,
        audience === "selected" ? userIds : undefined
      );

      const messages = await storage.getAllPushMessages();
      const latest = [...messages].sort(
        (a, b) =>
          new Date(b.sentAt || 0).getTime() - new Date(a.sentAt || 0).getTime()
      )[0];

      res.status(201).json(latest ?? { audience, title, body: message });
    } catch (error: any) {
      console.error("Error sending push notification:", error);
      res.status(500).json({ message: error.message || "Failed to send push notification" });
    }
  });
  
  app.get("/api/admin/push-notifications", requireAdmin, async (req, res) => {
    try {
      const messages = await storage.getAllPushMessages();
      res.json(messages);
    } catch (error) {
      console.error("Error fetching push messages:", error);
      res.status(500).json({ message: "Failed to fetch push messages" });
    }
  });

  // Get audience counts for message composer
  app.get("/api/admin/audience-counts", requireAdmin, async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      const today = new Date();
      
      // Get today's namedays
      const todayString = String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
      const todaysNamedays = await storage.getNamedaysByDate(todayString);
      
      // Count users with nameday
      const namedayUsers = users.filter(user => 
        todaysNamedays.some(nameday => 
          user.firstName.toLowerCase() === nameday.name.toLowerCase()
        )
      ).length;
      
      // Count users with birthday
      const todayDD = String(today.getDate()).padStart(2, '0');
      const todayMM = String(today.getMonth() + 1).padStart(2, '0');
      const todayBirthdayMatch = `${todayDD}-${todayMM}`;
      const birthdayUsers = users.filter(user => 
        user.birthday && user.birthday.substring(0, 5) === todayBirthdayMatch
      ).length;
      
      // Count users with upcoming appointments
      const upcomingAppointments = await storage.getUpcomingAppointments();
      const upcomingUserIds = new Set(upcomingAppointments.map(a => a.userId));
      const upcomingUsers = upcomingUserIds.size;
      
      res.json({
        all: users.length,
        nameday: namedayUsers,
        birthday: birthdayUsers,
        upcoming: upcomingUsers,
      });
    } catch (error) {
      console.error("Error fetching audience counts:", error);
      res.status(500).json({ message: "Failed to fetch audience counts" });
    }
  });

  /** Minimal user list for admin notification recipient picker (sorted A→Ω, el). */
  app.get("/api/admin/notification-recipients", requireAdmin, async (req, res) => {
    try {
      const all = await storage.getAllUsers();
      const users = all
        .map((u) => ({
          id: u.id,
          firstName: u.firstName,
          lastName: u.lastName ?? "",
          email: u.email,
          isWalkIn: isPlaceholderEmail(u.email),
        }))
        .sort((a, b) => {
          const na = `${a.firstName} ${a.lastName}`.trim().toLowerCase();
          const nb = `${b.firstName} ${b.lastName}`.trim().toLowerCase();
          return na.localeCompare(nb, "el");
        });
      res.json({ users });
    } catch (error) {
      console.error("Error fetching notification recipients:", error);
      res.status(500).json({ message: "Failed to fetch recipients" });
    }
  });

  // Alias for message history (same as push-notifications)
  app.get("/api/admin/message-history", requireAdmin, async (req, res) => {
    try {
      const messages = await storage.getAllPushMessages();
      res.json(messages);
    } catch (error) {
      console.error("Error fetching message history:", error);
      res.status(500).json({ message: "Failed to fetch message history" });
    }
  });

  // FCM Token registration endpoint
  app.post("/api/fcm/register", requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any)?.id;
      const { token, deviceInfo } = req.body;
      
      if (!token) {
        return res.status(400).json({ message: "FCM token is required" });
      }

      await storage.saveFcmToken(userId, token, deviceInfo ? JSON.stringify(deviceInfo) : undefined);
      
      res.json({ message: "FCM token registered successfully" });
    } catch (error: any) {
      console.error("Error registering FCM token:", error);
      res.status(500).json({ message: error.message || "Failed to register FCM token" });
    }
  });

  // FCM Token unregistration endpoint
  app.post("/api/fcm/unregister", requireAuth, async (req, res) => {
    try {
      const { token } = req.body;
      
      if (!token) {
        return res.status(400).json({ message: "FCM token is required" });
      }

      await storage.deleteFcmToken(token);
      
      res.json({ message: "FCM token unregistered successfully" });
    } catch (error: any) {
      console.error("Error unregistering FCM token:", error);
      res.status(500).json({ message: error.message || "Failed to unregister FCM token" });
    }
  });

  // NOTE: Removed duplicate GET /api/notifications endpoint that returned push messages
  // The correct endpoint is at line 2330 which returns actual database notifications

  // Google Calendar Configuration Routes
  app.get("/api/admin/google-calendar-config", requireAdmin, async (req, res) => {
    try {
      const config = await storage.getGoogleCalendarConfig();
      if (!config) {
        return res.json({ isConfigured: false });
      }
      
      // Don't expose the service account key in the response
      const safeConfig = {
        ...config,
        serviceAccountKey: "[HIDDEN]",
        isConfigured: true
      };
      
      res.json(safeConfig);
    } catch (error) {
      console.error("Error fetching Google Calendar config:", error);
      res.status(500).json({ message: "Failed to fetch Google Calendar configuration" });
    }
  });

  app.post("/api/admin/google-calendar-config", requireAdmin, async (req, res) => {
    try {
      const existing = await storage.getGoogleCalendarConfig();
      const body = { ...req.body };
      const keyInput = typeof body.serviceAccountKey === "string" ? body.serviceAccountKey.trim() : "";
      if (existing && !keyInput) {
        body.serviceAccountKey = existing.serviceAccountKey;
      }

      const configData = insertGoogleCalendarConfigSchema.parse(body);

      try {
        JSON.parse(configData.serviceAccountKey.trim());
      } catch {
        return res.status(400).json({ message: "Μη έγκυρο JSON κλειδί service account" });
      }

      const config = await storage.updateGoogleCalendarConfig(configData);

      const { reinitializeGoogleCalendar } = await import("./googleCalendar");
      await reinitializeGoogleCalendar();

      const safeConfig = {
        ...config,
        serviceAccountKey: "[HIDDEN]",
        isConfigured: true
      };

      res.json(safeConfig);
    } catch (error: any) {
      if (error?.name === "ZodError") {
        const first = error.errors?.[0];
        return res.status(400).json({
          message: first?.message || "Μη έγκυρα δεδομένα διαμόρφωσης",
        });
      }
      console.error("Error updating Google Calendar config:", error);
      res.status(500).json({ message: "Failed to update Google Calendar configuration" });
    }
  });

  app.delete("/api/admin/google-calendar-config", requireAdmin, async (req, res) => {
    try {
      await storage.deleteGoogleCalendarConfig();
      res.json({ message: "Google Calendar configuration deleted successfully" });
    } catch (error) {
      console.error("Error deleting Google Calendar config:", error);
      res.status(500).json({ message: "Failed to delete Google Calendar configuration" });
    }
  });

  app.post("/api/admin/google-calendar-test", requireAdmin, async (req, res) => {
    const calendarId = typeof req.body?.calendarId === "string" ? req.body.calendarId.trim() : "";
    if (!calendarId) {
      return res.status(400).json({ message: "Απαιτείται Calendar ID για δοκιμή" });
    }

    try {
      await reinitializeGoogleCalendar();
      const result = await testCalendarAccess(calendarId);

      if (!result.success) {
        return res.status(400).json({
          success: false,
          message: result.error || "Αποτυχία σύνδεσης Google Calendar",
        });
      }

      return res.json({
        success: true,
        message: "Google Calendar connection successful",
        calendarTitle: result.calendar?.summary || calendarId,
        eventsFound: result.eventsFound ?? 0,
      });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Σφάλμα διακομιστή κατά τη δοκιμή Google Calendar";
      console.error("Google Calendar test failed:", error);
      return res.status(500).json({ success: false, message });
    }
  });

  // OAuth Configuration admin routes
  app.get("/api/admin/oauth-config", requireAdmin, async (req, res) => {
    try {
      const config = await storage.getOAuthConfig();
      if (config) {
        // Hide secrets for security
        res.json({
          ...config,
          googleClientSecret: config.googleClientSecret ? "[HIDDEN]" : undefined,
          facebookAppSecret: config.facebookAppSecret ? "[HIDDEN]" : undefined,
          sessionSecret: config.sessionSecret ? "[HIDDEN]" : undefined,
          isConfigured: true
        });
      } else {
        res.json({ isConfigured: false });
      }
    } catch (error) {
      console.error("Error getting OAuth config:", error);
      res.status(500).json({ message: "Failed to get OAuth configuration" });
    }
  });

  app.post("/api/admin/oauth-config", requireAdmin, async (req, res) => {
    try {
      const configData = insertOAuthConfigSchema.parse(req.body);
      const config = await storage.updateOAuthConfig(configData);
      
      res.json({
        ...config,
        googleClientSecret: config.googleClientSecret ? "[HIDDEN]" : undefined,
        facebookAppSecret: config.facebookAppSecret ? "[HIDDEN]" : undefined,
        sessionSecret: config.sessionSecret ? "[HIDDEN]" : undefined,
        isConfigured: true
      });
    } catch (error: any) {
      console.error("Error saving OAuth config:", error);
      res.status(500).json({ message: error.message || "Failed to save OAuth configuration" });
    }
  });

  app.delete("/api/admin/oauth-config", requireAdmin, async (req, res) => {
    try {
      await storage.deleteOAuthConfig();
      res.json({ message: "OAuth configuration deleted successfully" });
    } catch (error) {
      console.error("Error deleting OAuth config:", error);
      res.status(500).json({ message: "Failed to delete OAuth configuration" });
    }
  });

  // Services management routes
  app.get("/api/services", async (req, res) => {
    try {
      const allServices = await storage.getAllServices();
      // Filter to only return active services
      const activeServices = allServices.filter(svc => svc.isActive !== false);
      res.json(activeServices);
    } catch (error) {
      console.error("Error fetching services:", error);
      res.status(500).json({ message: "Failed to fetch services" });
    }
  });

  app.get("/api/services/:id", async (req, res) => {
    try {
      const service = await storage.getService(req.params.id);
      if (!service) {
        return res.status(404).json({ message: "Service not found" });
      }
      res.json(service);
    } catch (error) {
      console.error("Error fetching service:", error);
      res.status(500).json({ message: "Failed to fetch service" });
    }
  });

  app.post("/api/admin/services", requireAdmin, async (req, res) => {
    try {
      const { insertServiceSchema } = await import("@shared/schema");
      const serviceData = insertServiceSchema.parse(req.body);
      const service = await storage.createService(serviceData);
      res.status(201).json(service);
    } catch (error: any) {
      console.error("Error creating service:", error);
      res.status(400).json({ message: error.message || "Failed to create service" });
    }
  });

  app.put("/api/admin/services/:id", requireAdmin, async (req, res) => {
    try {
      const { insertServiceSchema } = await import("@shared/schema");
      const serviceData = insertServiceSchema.partial().parse(req.body);
      const service = await storage.updateService(req.params.id, serviceData);
      res.json(service);
    } catch (error: any) {
      console.error("Error updating service:", error);
      res.status(400).json({ message: error.message || "Failed to update service" });
    }
  });

  app.delete("/api/admin/services/:id", requireAdmin, async (req, res) => {
    try {
      await storage.deleteService(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting service:", error);
      res.status(500).json({ message: "Failed to delete service" });
    }
  });

  // ============================================
  // PROFILE MANAGEMENT ROUTES
  // ============================================
  
  app.get("/api/profile", requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(sanitizeUser(user));
    } catch (error) {
      console.error("Error fetching profile:", error);
      res.status(500).json({ message: "Failed to fetch profile" });
    }
  });

  app.put("/api/profile", requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const { firstName, lastName, phone, avatar, birthday, notificationPreferences } = req.body;
      
      const updateData: any = {};
      if (firstName !== undefined) updateData.firstName = firstName;
      if (lastName !== undefined) updateData.lastName = lastName;
      if (phone !== undefined) updateData.phone = phone;
      if (avatar !== undefined) updateData.avatar = avatar;
      if (birthday !== undefined) updateData.birthday = birthday;
      if (notificationPreferences !== undefined) {
        updateData.notificationPreferences = JSON.stringify(notificationPreferences);
      }
      
      const updatedUser = await storage.updateUser(userId, updateData);
      res.json(sanitizeUser(updatedUser));
    } catch (error: any) {
      console.error("Error updating profile:", error);
      res.status(400).json({ message: error.message || "Failed to update profile" });
    }
  });

  app.put("/api/profile/password", requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const { currentPassword, newPassword } = req.body;
      
      const user = await storage.getUser(userId);
      if (!user || !user.password) {
        return res.status(400).json({ message: "Password change not available for OAuth users" });
      }
      
      // Verify current password
      const bcrypt = await import("bcrypt");
      const isValid = await bcrypt.compare(currentPassword, user.password);
      if (!isValid) {
        return res.status(401).json({ message: "Current password is incorrect" });
      }
      
      // Hash and update password
      const hashedPassword = await hashPassword(newPassword);
      await storage.updateUserPassword(userId, hashedPassword);
      
      res.json({ message: "Password updated successfully" });
    } catch (error: any) {
      console.error("Error updating password:", error);
      res.status(400).json({ message: error.message || "Failed to update password" });
    }
  });

  // ============================================
  // FAVORITE BARBERS ROUTES
  // ============================================
  
  app.post("/api/favorites/barbers/:employeeId", requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const { employeeId } = req.params;
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const favoriteBarbers = JSON.parse(user.favoriteBarbers || '[]');
      if (!favoriteBarbers.includes(employeeId)) {
        favoriteBarbers.push(employeeId);
        await storage.updateUser(userId, {
          favoriteBarbers: JSON.stringify(favoriteBarbers)
        });
      }
      
      res.json({ favoriteBarbers });
    } catch (error: any) {
      console.error("Error adding favorite barber:", error);
      res.status(400).json({ message: error.message || "Failed to add favorite barber" });
    }
  });

  app.delete("/api/favorites/barbers/:employeeId", requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const { employeeId } = req.params;
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const favoriteBarbers = JSON.parse(user.favoriteBarbers || '[]');
      const updatedFavorites = favoriteBarbers.filter((id: string) => id !== employeeId);
      
      await storage.updateUser(userId, {
        favoriteBarbers: JSON.stringify(updatedFavorites)
      });
      
      res.json({ favoriteBarbers: updatedFavorites });
    } catch (error: any) {
      console.error("Error removing favorite barber:", error);
      res.status(400).json({ message: error.message || "Failed to remove favorite barber" });
    }
  });

  app.get("/api/favorites/barbers", requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const favoriteBarbers = JSON.parse(user.favoriteBarbers || '[]');
      const employees = await storage.getAllEmployees();
      const favoriteEmployees = employees.filter(emp => favoriteBarbers.includes(emp.id));
      
      res.json(favoriteEmployees);
    } catch (error) {
      console.error("Error fetching favorite barbers:", error);
      res.status(500).json({ message: "Failed to fetch favorite barbers" });
    }
  });

  // ============================================
  // NOTIFICATIONS ROUTES
  // ============================================
  
  app.get("/api/notifications", requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const notifications = await storage.getNotificationsByUser(userId, limit);
      res.json(notifications);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      res.status(500).json({ message: "Failed to fetch notifications" });
    }
  });

  app.get("/api/notifications/unread-count", requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      
      // Defensive check: ensure storage and method exist
      if (!storage) {
        throw new Error("Storage not initialized");
      }
      if (typeof storage.getUnreadNotificationCount !== "function") {
        throw new Error(`getUnreadNotificationCount is not a function. Storage methods: ${Object.getOwnPropertyNames(Object.getPrototypeOf(storage)).join(", ")}`);
      }
      
      const count = await storage.getUnreadNotificationCount(userId);
      res.json({ count });
    } catch (error) {
      console.error("Error fetching unread count:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      res.status(500).json({ message: "Failed to fetch unread count", error: errorMessage });
    }
  });

  app.put("/api/notifications/:id/read", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      await storage.markNotificationAsRead(id);
      res.json({ message: "Notification marked as read" });
    } catch (error) {
      console.error("Error marking notification as read:", error);
      res.status(500).json({ message: "Failed to mark notification as read" });
    }
  });

  app.put("/api/notifications/read-all", requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      await storage.markAllNotificationsAsRead(userId);
      res.json({ message: "All notifications marked as read" });
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      res.status(500).json({ message: "Failed to mark all notifications as read" });
    }
  });

  app.delete("/api/notifications/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const userId = (req.user as any)?.id;
      
      // Verify the notification belongs to the user by checking all user notifications
      const userNotifications = await storage.getNotificationsByUser(userId, 1000);
      const notification = userNotifications.find(n => n.id === id);
      
      if (!notification) {
        return res.status(404).json({ message: "Notification not found" });
      }
      
      await storage.deleteNotification(id);
      res.json({ message: "Notification deleted" });
    } catch (error) {
      console.error("Error deleting notification:", error);
      res.status(500).json({ message: "Failed to delete notification" });
    }
  });

  // ============================================
  // RECURRING APPOINTMENTS ROUTES
  // ============================================
  
  app.delete("/api/appointments/recurring/:parentId", requireAuth, async (req, res) => {
    try {
      const { parentId } = req.params;
      const userId = (req.user as any).id;
      
      // Verify the parent appointment belongs to the user
      const parentAppointment = await storage.getAppointment(parentId);
      if (!parentAppointment || parentAppointment.userId !== userId) {
        return res.status(404).json({ message: "Appointment not found" });
      }
      
      await storage.cancelRecurringAppointmentSeries(parentId);
      
      // Create notification
      await storage.createNotification({
        userId,
        type: 'appointment_cancelled',
        title: 'Επαναλαμβανόμενο Ραντεβού Ακυρώθηκε',
        message: 'Η σειρά επαναλαμβανόμενων ραντεβού έχει ακυρωθεί.',
        link: '/appointments'
      });
      
      res.json({ message: "Recurring appointment series cancelled" });
    } catch (error: any) {
      console.error("Error cancelling recurring appointments:", error);
      res.status(500).json({ message: error.message || "Failed to cancel recurring appointments" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
