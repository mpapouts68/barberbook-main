import { sql } from "drizzle-orm";
import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = sqliteTable("users", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  firstName: text("first_name").notNull(),
  lastName: text("last_name"),
  email: text("email").notNull().unique(),
  password: text("password"), // Nullable for OAuth users
  phone: text("phone"), // User phone number
  avatar: text("avatar"), // User profile photo URL
  oauthProvider: text("oauth_provider"), // Nullable - 'google', 'facebook', or null for email/password
  oauthId: text("oauth_id"), // Nullable
  role: text("role").notNull().default("customer"), // 'customer', 'admin'
  emailVerified: integer("email_verified", { mode: 'boolean' }).notNull().default(false),
  verificationToken: text("verification_token"),
  resetPasswordToken: text("reset_password_token"),
  resetPasswordExpires: integer("reset_password_expires", { mode: 'timestamp' }),
  birthday: text("birthday"), // Nullable - DD-MM-YYYY format (Greek standard) for birthday notifications
  favoriteBarbers: text("favorite_barbers").notNull().default('[]'), // JSON array of employee IDs
  notificationPreferences: text("notification_preferences").notNull().default('{"email":true,"push":true,"sms":false,"reminder24h":true,"reminder2h":true}'), // JSON object
  isActive: integer("is_active", { mode: 'boolean' }).notNull().default(true),
  lastLoginAt: integer("last_login_at", { mode: 'timestamp' }),
  createdAt: integer("created_at", { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

export const appointments = sqliteTable("appointments", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull().references(() => users.id),
  employeeId: text("employee_id").notNull().references(() => employees.id),
  service: text("service").notNull(),
  barber: text("barber").notNull(), // Keep for backward compatibility
  date: text("date").notNull(), // YYYY-MM-DD format
  time: text("time").notNull(), // HH:MM format
  duration: integer("duration").notNull().default(30), // minutes
  notes: text("notes"),
  status: text("status").notNull().default("confirmed"), // confirmed, pending, cancelled, completed
  googleEventId: text("google_event_id"), // Google Calendar event ID
  // Recurring appointment fields
  isRecurring: integer("is_recurring", { mode: 'boolean' }).notNull().default(false),
  recurringPattern: text("recurring_pattern"), // 'weekly', 'biweekly', 'monthly', 'custom'
  recurringInterval: integer("recurring_interval").default(1), // Every X weeks/months
  recurringEndDate: text("recurring_end_date"), // YYYY-MM-DD format, null for indefinite
  parentAppointmentId: text("parent_appointment_id"), // Reference to original appointment in series
  nextAppointmentId: text("next_appointment_id"), // Reference to next appointment in series
  // Reminder tracking flags
  reminderSent24h: integer("reminder_sent_24h", { mode: 'boolean' }).notNull().default(false),
  reminderSent2h: integer("reminder_sent_2h", { mode: 'boolean' }).notNull().default(false),
  reminderSentSameDay: integer("reminder_sent_same_day", { mode: 'boolean' }).notNull().default(false),
  createdAt: integer("created_at", { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

export const namedays = sqliteTable("namedays", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  date: text("date").notNull(), // MM-DD format
  name: text("name").notNull(),
});

export const pushMessages = sqliteTable("push_messages", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  title: text("title").notNull(),
  body: text("body").notNull(),
  audience: text("audience").notNull(), // 'all', 'nameday', 'birthday', 'upcoming', 'inactive'
  sentAt: integer("sent_at", { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

// In-app notifications table
export const notifications = sqliteTable("notifications", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull().references(() => users.id),
  type: text("type").notNull(), // 'appointment_reminder', 'appointment_confirmed', 'appointment_cancelled', 'appointment_created', 'system', 'promotion'
  title: text("title").notNull(),
  message: text("message").notNull(),
  link: text("link"), // Optional link to related page
  read: integer("read", { mode: 'boolean' }).notNull().default(false),
  createdAt: integer("created_at", { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

// FCM Tokens for push notifications
export const fcmTokens = sqliteTable("fcm_tokens", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull().references(() => users.id),
  token: text("token").notNull().unique(),
  deviceInfo: text("device_info"), // JSON string with device info
  createdAt: integer("created_at", { mode: 'timestamp' }).$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

export const employees = sqliteTable("employees", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  specialties: text("specialties").notNull().default('[]'),
  avatar: text("avatar"), // URL to employee photo
  description: text("description"), // Short description of employee
  googleCalendarId: text("google_calendar_id"),
  googleCalendarEnabled: integer("google_calendar_enabled", { mode: 'boolean' }).notNull().default(false),
  googleCalendarSyncToken: text("google_calendar_sync_token"),
  lastSyncAt: integer("last_sync_at", { mode: 'timestamp' }),
  autoSyncEnabled: integer("auto_sync_enabled", { mode: 'boolean' }).notNull().default(false),
  workingHours: text("working_hours").notNull().default('{"monday":{"start":"09:00","end":"18:00"},"tuesday":{"start":"09:00","end":"18:00"},"wednesday":{"start":"09:00","end":"18:00"},"thursday":{"start":"09:00","end":"18:00"},"friday":{"start":"09:00","end":"18:00"},"saturday":{"start":"09:00","end":"15:00"},"sunday":{"start":"closed","end":"closed"}}'),
  isActive: integer("is_active", { mode: 'boolean' }).notNull().default(true),
  createdAt: integer("created_at", { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

export const settings = sqliteTable("settings", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
});

// Google Calendar Configuration
export const googleCalendarConfig = sqliteTable("google_calendar_config", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  serviceAccountEmail: text("service_account_email").notNull(),
  serviceAccountKey: text("service_account_key").notNull(), // JSON key content
  projectId: text("project_id").notNull(),
  isEnabled: integer("is_enabled", { mode: 'boolean' }).notNull().default(false),
  timeZone: text("time_zone").notNull().default("Europe/Athens"),
  defaultEventDuration: integer("default_event_duration").notNull().default(30), // minutes
  appointmentPrefix: text("appointment_prefix").default("Ραντεβού κουρείου"),
  createdAt: integer("created_at", { mode: 'timestamp' }).$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

// OAuth Providers Configuration
export const oauthConfig = sqliteTable("oauth_config", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  // Google OAuth Configuration
  googleClientId: text("google_client_id"),
  googleClientSecret: text("google_client_secret"),
  googleEnabled: integer("google_enabled", { mode: 'boolean' }).notNull().default(false),
  googleScopes: text("google_scopes").notNull().default('["profile", "email"]'), // JSON array
  // Facebook OAuth Configuration  
  facebookAppId: text("facebook_app_id"),
  facebookAppSecret: text("facebook_app_secret"),
  facebookEnabled: integer("facebook_enabled", { mode: 'boolean' }).notNull().default(false),
  facebookScopes: text("facebook_scopes").notNull().default('["email"]'), // JSON array
  // General OAuth Settings
  baseUrl: text("base_url").notNull().default("http://localhost:5100"), // For callback URLs
  sessionSecret: text("session_secret"), // Override default session secret
  createdAt: integer("created_at", { mode: 'timestamp' }).$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

export const companyInfo = sqliteTable("company_info", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull().default("Barbershop Premium"),
  logoUrl: text("logo_url"),
  description: text("description").default("Το καλύτερο κουρείο στην πόλη"),
  phone: text("phone"),
  email: text("email"),
  address: text("address"),
  workingHours: text("working_hours").notNull().default('{"monday":{"start":"09:00","end":"18:00"},"tuesday":{"start":"09:00","end":"18:00"},"wednesday":{"start":"09:00","end":"18:00"},"thursday":{"start":"09:00","end":"18:00"},"friday":{"start":"09:00","end":"18:00"},"saturday":{"start":"09:00","end":"15:00"},"sunday":{"start":"closed","end":"closed"}}'),
  updatedAt: integer("updated_at", { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

export const shopConfig = sqliteTable("shop_config", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  workingHours: text("working_hours").notNull().default('{"monday":{"start":"09:00","end":"18:00"},"tuesday":{"start":"09:00","end":"18:00"},"wednesday":{"start":"09:00","end":"18:00"},"thursday":{"start":"09:00","end":"20:00"},"friday":{"start":"09:00","end":"20:00"},"saturday":{"start":"08:00","end":"19:00"},"sunday":{"start":"10:00","end":"16:00"}}'),
  appointmentDuration: integer("appointment_duration").notNull().default(30),
  bufferTime: integer("buffer_time").notNull().default(5),
  updatedAt: integer("updated_at", { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

export const shopPhotos = sqliteTable("shop_photos", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  url: text("url").notNull(),
  caption: text("caption"),
  displayOrder: integer("display_order").notNull().default(0),
  createdAt: integer("created_at", { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

export const services = sqliteTable("services", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  description: text("description"),
  nameEn: text("name_en"),
  descriptionEn: text("description_en"),
  price: real("price").notNull(),
  duration: integer("duration").notNull().default(30), // in minutes
  isActive: integer("is_active", { mode: 'boolean' }).notNull().default(true),
  displayOrder: integer("display_order").notNull().default(0),
  createdAt: integer("created_at", { mode: 'timestamp' }).$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
}).extend({
  password: z.string().min(8, "Password must be at least 8 characters").optional(),
  email: z.string().email("Invalid email address"),
  phone: z.string().nullable().optional(),
  avatar: z.string().url().nullable().optional(),
  emailVerified: z.boolean().optional(),
  verificationToken: z.string().nullable().optional(),
  resetPasswordToken: z.string().nullable().optional(),
  resetPasswordExpires: z.date().nullable().optional(),
  birthday: z.string().regex(/^\d{2}-\d{2}-\d{4}$/, "Birthday must be in DD-MM-YYYY format").nullable().optional(),
  favoriteBarbers: z.array(z.string()).optional(),
  notificationPreferences: z.object({
    email: z.boolean().optional(),
    push: z.boolean().optional(),
    sms: z.boolean().optional(),
    reminder24h: z.boolean().optional(),
    reminder2h: z.boolean().optional(),
  }).optional(),
  isActive: z.boolean().optional(),
  lastLoginAt: z.date().nullable().optional(),
});

export const insertAppointmentSchema = createInsertSchema(appointments).omit({
  id: true,
  createdAt: true,
  status: true,
  googleEventId: true,
}).extend({
  isRecurring: z.boolean().optional(),
  recurringPattern: z.enum(['weekly', 'biweekly', 'monthly', 'custom']).nullable().optional(),
  recurringInterval: z.number().int().positive().optional(),
  recurringEndDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  parentAppointmentId: z.string().nullable().optional(),
  nextAppointmentId: z.string().nullable().optional(),
});

export const insertPushMessageSchema = createInsertSchema(pushMessages).omit({
  id: true,
  sentAt: true,
});

export const insertEmployeeSchema = createInsertSchema(employees).omit({
  id: true,
  createdAt: true,
});

export const insertCompanyInfoSchema = createInsertSchema(companyInfo).omit({
  id: true,
  updatedAt: true,
});

export const insertGoogleCalendarConfigSchema = createInsertSchema(googleCalendarConfig).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertOAuthConfigSchema = createInsertSchema(oauthConfig).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertShopPhotoSchema = createInsertSchema(shopPhotos).omit({
  id: true,
  createdAt: true,
});

export const insertServiceSchema = createInsertSchema(services).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertFcmTokenSchema = createInsertSchema(fcmTokens).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertAppointment = z.infer<typeof insertAppointmentSchema>;
export type Appointment = typeof appointments.$inferSelect;
export type InsertEmployee = z.infer<typeof insertEmployeeSchema>;
export type Employee = typeof employees.$inferSelect;
export type Nameday = typeof namedays.$inferSelect;
export type PushMessage = typeof pushMessages.$inferSelect;
export type InsertPushMessage = z.infer<typeof insertPushMessageSchema>;
export type FcmToken = typeof fcmTokens.$inferSelect;
export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
  read: true,
});

export type InsertFcmToken = z.infer<typeof insertFcmTokenSchema>;
export type Setting = typeof settings.$inferSelect;
export type CompanyInfo = typeof companyInfo.$inferSelect;
export type InsertCompanyInfo = z.infer<typeof insertCompanyInfoSchema>;
export type GoogleCalendarConfig = typeof googleCalendarConfig.$inferSelect;
export type InsertGoogleCalendarConfig = z.infer<typeof insertGoogleCalendarConfigSchema>;
export type OAuthConfig = typeof oauthConfig.$inferSelect;
export type InsertOAuthConfig = z.infer<typeof insertOAuthConfigSchema>;
export type ShopPhoto = typeof shopPhotos.$inferSelect;
export type InsertShopPhoto = z.infer<typeof insertShopPhotoSchema>;
export type Service = typeof services.$inferSelect;
export type InsertService = z.infer<typeof insertServiceSchema>;
export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
