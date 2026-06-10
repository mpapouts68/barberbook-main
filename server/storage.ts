import { db } from "./db";
import { users, appointments, namedays, pushMessages, settings, employees, companyInfo, shopConfig, googleCalendarConfig, oauthConfig, services, shopPhotos, fcmTokens, notifications } from "@shared/schema";
import { eq, and, desc, or, inArray, asc } from "drizzle-orm";
import type { User, InsertUser, Appointment, InsertAppointment, Nameday, PushMessage, InsertPushMessage, Setting, Employee, InsertEmployee, CompanyInfo, InsertCompanyInfo, GoogleCalendarConfig, InsertGoogleCalendarConfig, OAuthConfig, InsertOAuthConfig, Service, InsertService, ShopPhoto, InsertShopPhoto, FcmToken, InsertFcmToken, Notification, InsertNotification } from "@shared/schema";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByOAuthId(provider: string, oauthId: string): Promise<User | undefined>;
  getUserByVerificationToken(token: string): Promise<User | undefined>;
  getUserByResetToken(token: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, user: Partial<InsertUser>): Promise<User>;
  updateUserRole(id: string, role: string): Promise<User>;
  updateUserPassword(id: string, password: string): Promise<User>;
  suspendUser(id: string): Promise<User>;
  activateUser(id: string): Promise<User>;
  deleteUser(id: string): Promise<void>;
  getAllUsers(): Promise<User[]>;
  getUsersWithPagination(
    page: number,
    limit: number,
    search?: string,
    filter?: "all" | "real_email" | "walk_in",
    sort?: "name_asc" | "name_desc"
  ): Promise<{ users: User[], total: number }>;

  // Employee operations
  createEmployee(employee: InsertEmployee): Promise<Employee>;
  getEmployee(id: string): Promise<Employee | undefined>;
  getAllEmployees(): Promise<Employee[]>;
  updateEmployee(id: string, employee: Partial<InsertEmployee>): Promise<Employee>;
  deleteEmployee(id: string): Promise<void>;
  getEmployeeByCalendarId(calendarId: string): Promise<Employee | undefined>;

  // Appointment operations
  createAppointment(appointment: InsertAppointment): Promise<Appointment>;
  getAppointment(id: string): Promise<Appointment | undefined>;
  getAppointmentsByUser(userId: string): Promise<Appointment[]>;
  getAppointmentsByEmployee(employeeId: string): Promise<Appointment[]>;
  getAllAppointments(): Promise<Appointment[]>;
  getAppointmentsByDate(date: string): Promise<Appointment[]>;
  getAppointmentsByEmployeeAndDate(employeeId: string, date: string): Promise<Appointment[]>;
  updateAppointment(id: string, appointment: Partial<InsertAppointment>): Promise<Appointment>;
  cancelAppointment(id: string): Promise<boolean>;
  getUpcomingAppointments(): Promise<Appointment[]>;

  // Nameday operations
  getNamedaysByDate(date: string): Promise<Nameday[]>;
  getAllNamedays(): Promise<Nameday[]>;

  // Push message operations
  createPushMessage(message: InsertPushMessage): Promise<PushMessage>;
  getAllPushMessages(): Promise<PushMessage[]>;

  // Settings operations
  getSetting(key: string): Promise<Setting | undefined>;
  updateSetting(key: string, value: string): Promise<void>;

  // Company info operations
  getCompanyInfo(): Promise<CompanyInfo | undefined>;
  updateCompanyInfo(info: InsertCompanyInfo): Promise<CompanyInfo>;

  // Working hours operations
  getWorkingHours(): Promise<any>;
  updateWorkingHours(workingHours: any): Promise<void>;

  // Google Calendar configuration operations
  getGoogleCalendarConfig(): Promise<GoogleCalendarConfig | undefined>;
  updateGoogleCalendarConfig(config: InsertGoogleCalendarConfig): Promise<GoogleCalendarConfig>;
  deleteGoogleCalendarConfig(): Promise<void>;

  // OAuth configuration operations
  getOAuthConfig(): Promise<OAuthConfig | undefined>;
  updateOAuthConfig(config: InsertOAuthConfig): Promise<OAuthConfig>;
  deleteOAuthConfig(): Promise<void>;

  // Services operations
  getAllServices(): Promise<Service[]>;
  getService(id: string): Promise<Service | undefined>;
  createService(service: InsertService): Promise<Service>;
  updateService(id: string, service: Partial<InsertService>): Promise<Service>;
  deleteService(id: string): Promise<void>;

  // Shop gallery
  getShopPhotos(): Promise<ShopPhoto[]>;
  createShopPhoto(photo: InsertShopPhoto): Promise<ShopPhoto>;
  getShopPhoto(id: string): Promise<ShopPhoto | undefined>;
  deleteShopPhoto(id: string): Promise<void>;

  // FCM Token operations
  saveFcmToken(userId: string, token: string, deviceInfo?: string): Promise<FcmToken>;
  getFcmTokensByUser(userId: string): Promise<FcmToken[]>;
  getAllFcmTokens(): Promise<FcmToken[]>;
  deleteFcmToken(token: string): Promise<void>;
  getFcmTokensByUsers(userIds: string[]): Promise<FcmToken[]>;

  // Notification operations
  createNotification(notification: InsertNotification): Promise<Notification>;
  getNotificationsByUser(userId: string, limit?: number): Promise<Notification[]>;
  markNotificationAsRead(notificationId: string): Promise<void>;
  markAllNotificationsAsRead(userId: string): Promise<void>;
  getUnreadNotificationCount(userId: string): Promise<number>;
  deleteNotification(notificationId: string): Promise<void>;

  // Recurring appointment operations
  getRecurringAppointmentsByParent(parentAppointmentId: string): Promise<Appointment[]>;
  cancelRecurringAppointmentSeries(parentAppointmentId: string): Promise<void>;
  getNextAppointmentInSeries(appointmentId: string): Promise<Appointment | undefined>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async getUserByOAuthId(provider: string, oauthId: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(
      and(eq(users.oauthProvider, provider), eq(users.oauthId, oauthId))
    );
    return user || undefined;
  }

  async createUser(user: InsertUser): Promise<User> {
    const [result] = await db.insert(users).values(user).returning();
    return result;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  async getUserByVerificationToken(token: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.verificationToken, token));
    return user || undefined;
  }

  async getUserByResetToken(token: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.resetPasswordToken, token));
    return user || undefined;
  }

  async updateUser(id: string, userData: Partial<InsertUser>): Promise<User> {
    const [result] = await db.update(users)
      .set(userData)
      .where(eq(users.id, id))
      .returning();
    return result;
  }

  async updateUserRole(id: string, role: string): Promise<User> {
    const [result] = await db.update(users)
      .set({ role })
      .where(eq(users.id, id))
      .returning();
    return result;
  }

  async updateUserPassword(id: string, password: string): Promise<User> {
    const [result] = await db.update(users)
      .set({ password })
      .where(eq(users.id, id))
      .returning();
    return result;
  }

  async suspendUser(id: string): Promise<User> {
    const [result] = await db.update(users)
      .set({ isActive: false })
      .where(eq(users.id, id))
      .returning();
    return result;
  }

  async activateUser(id: string): Promise<User> {
    const [result] = await db.update(users)
      .set({ isActive: true })
      .where(eq(users.id, id))
      .returning();
    return result;
  }

  async deleteUser(id: string): Promise<void> {
    db.transaction((tx) => {
      tx.delete(fcmTokens).where(eq(fcmTokens.userId, id)).run();
      tx.delete(notifications).where(eq(notifications.userId, id)).run();
      // Must delete rows — SQLite FK on appointments.user_id blocks user delete if only cancelled
      tx.delete(appointments).where(eq(appointments.userId, id)).run();

      const removed = tx.delete(users).where(eq(users.id, id)).returning().all();
      if (removed.length === 0) {
        throw new Error("User not found");
      }
    });
  }

  async getUsersWithPagination(
    page: number,
    limit: number,
    search?: string,
    filter: "all" | "real_email" | "walk_in" = "all",
    sort: "name_asc" | "name_desc" = "name_asc"
  ): Promise<{ users: User[], total: number }> {
    const offset = (page - 1) * limit;

    let list = await db.select().from(users);

    if (search?.trim()) {
      const s = search.trim().toLowerCase();
      list = list.filter(
        (user) =>
          user.firstName?.toLowerCase().includes(s) ||
          user.lastName?.toLowerCase().includes(s) ||
          user.email?.toLowerCase().includes(s) ||
          user.phone?.includes(search.trim())
      );
    }

    if (filter === "real_email") {
      list = list.filter((u) => u.email && !u.email.endsWith("@no-email.local"));
    } else if (filter === "walk_in") {
      list = list.filter((u) => !u.email || u.email.endsWith("@no-email.local"));
    }

    const nameKey = (u: User) =>
      `${u.firstName || ""} ${u.lastName || ""}`.trim().toLowerCase();
    list.sort((a, b) => {
      const cmp = nameKey(a).localeCompare(nameKey(b), "el");
      return sort === "name_desc" ? -cmp : cmp;
    });

    const total = list.length;
    const paginatedUsers = list.slice(offset, offset + limit);

    return { users: paginatedUsers, total };
  }

  // Employee operations
  async createEmployee(employee: InsertEmployee): Promise<Employee> {
    const [result] = await db.insert(employees).values(employee).returning();
    return result;
  }

  async getEmployee(id: string): Promise<Employee | undefined> {
    const [employee] = await db.select().from(employees).where(eq(employees.id, id));
    return employee || undefined;
  }

  async getAllEmployees(): Promise<Employee[]> {
    return await db.select().from(employees);
  }

  async updateEmployee(id: string, employee: Partial<InsertEmployee>): Promise<Employee> {
    const [result] = await db.update(employees)
      .set(employee)
      .where(eq(employees.id, id))
      .returning();
    return result;
  }

  /**
   * Permanently removes the employee and all appointments for that employee,
   * and strips this id from every user's favoriteBarbers JSON.
   * Uses a synchronous transaction (better-sqlite3 / Drizzle "sync" mode).
   */
  async deleteEmployee(id: string): Promise<void> {
    db.transaction((tx) => {
      tx.delete(appointments).where(eq(appointments.employeeId, id)).run();

      const allUsers = tx.select().from(users).all();
      for (const u of allUsers) {
        let favs: string[];
        try {
          favs = JSON.parse(u.favoriteBarbers || "[]");
        } catch {
          favs = [];
        }
        if (!Array.isArray(favs) || !favs.includes(id)) continue;
        const next = favs.filter((x: string) => x !== id);
        tx.update(users)
          .set({ favoriteBarbers: JSON.stringify(next) })
          .where(eq(users.id, u.id))
          .run();
      }

      const removed = tx.delete(employees).where(eq(employees.id, id)).returning().all();
      if (removed.length === 0) {
        throw new Error("Employee not found");
      }
    });
  }

  async getEmployeeByCalendarId(calendarId: string): Promise<Employee | undefined> {
    const [employee] = await db.select().from(employees).where(eq(employees.googleCalendarId, calendarId));
    return employee || undefined;
  }

  async createAppointment(appointment: InsertAppointment): Promise<Appointment> {
    const [result] = await db.insert(appointments).values(appointment).returning();
    return result;
  }

  async getAppointment(id: string): Promise<Appointment | undefined> {
    const [appointment] = await db.select().from(appointments).where(eq(appointments.id, id));
    return appointment || undefined;
  }

  async getAppointmentsByUser(userId: string): Promise<Appointment[]> {
    return await db.select().from(appointments)
      .where(eq(appointments.userId, userId))
      .orderBy(desc(appointments.createdAt));
  }

  async getAppointmentsByEmployee(employeeId: string): Promise<Appointment[]> {
    return await db.select().from(appointments)
      .where(eq(appointments.employeeId, employeeId))
      .orderBy(desc(appointments.date), desc(appointments.time));
  }

  async getAllAppointments(): Promise<Appointment[]> {
    return await db.select().from(appointments)
      .orderBy(desc(appointments.date), desc(appointments.time));
  }

  async getAppointmentsByDate(date: string): Promise<Appointment[]> {
    return await db.select().from(appointments)
      .where(eq(appointments.date, date))
      .orderBy(appointments.time);
  }

  async getAppointmentsByEmployeeAndDate(employeeId: string, date: string): Promise<Appointment[]> {
    return await db.select().from(appointments)
      .where(and(eq(appointments.employeeId, employeeId), eq(appointments.date, date)))
      .orderBy(appointments.time);
  }

  async updateAppointment(id: string, appointment: Partial<InsertAppointment>): Promise<Appointment> {
    const [result] = await db.update(appointments)
      .set(appointment)
      .where(eq(appointments.id, id))
      .returning();
    return result;
  }

  async cancelAppointment(id: string): Promise<boolean> {
    const result = await db.update(appointments)
      .set({ status: "cancelled" })
      .where(eq(appointments.id, id))
      .returning();
    return result.length > 0;
  }

  async getUpcomingAppointments(): Promise<Appointment[]> {
    const today = new Date().toISOString().split('T')[0];
    return await db.select().from(appointments)
      .where(eq(appointments.status, "confirmed"));
  }

  async getNamedaysByDate(date: string): Promise<Nameday[]> {
    return await db.select().from(namedays).where(eq(namedays.date, date));
  }

  async getAllNamedays(): Promise<Nameday[]> {
    return await db.select().from(namedays);
  }

  async createPushMessage(message: InsertPushMessage): Promise<PushMessage> {
    const [result] = await db.insert(pushMessages).values(message).returning();
    return result;
  }

  async getAllPushMessages(): Promise<PushMessage[]> {
    return await db.select().from(pushMessages).orderBy(desc(pushMessages.sentAt));
  }

  async getSetting(key: string): Promise<Setting | undefined> {
    const [setting] = await db.select().from(settings).where(eq(settings.key, key));
    return setting || undefined;
  }

  async updateSetting(key: string, value: string): Promise<void> {
    const existing = await this.getSetting(key);
    if (existing) {
      await db.update(settings).set({ value }).where(eq(settings.key, key));
    } else {
      await db.insert(settings).values({ key, value });
    }
  }

  async getCompanyInfo(): Promise<CompanyInfo | undefined> {
    const [info] = await db.select().from(companyInfo).limit(1);
    return info || undefined;
  }

  async updateCompanyInfo(info: InsertCompanyInfo): Promise<CompanyInfo> {
    const existing = await this.getCompanyInfo();
    if (existing) {
      const [result] = await db.update(companyInfo)
        .set({ ...info, updatedAt: new Date() })
        .where(eq(companyInfo.id, existing.id))
        .returning();
      return result;
    } else {
      const [result] = await db.insert(companyInfo).values(info).returning();
      return result;
    }
  }

  // Working hours operations
  async getWorkingHours(): Promise<any> {
    const [config] = await db.select().from(shopConfig);
    if (!config) {
      // Create default config if none exists
      const [newConfig] = await db
        .insert(shopConfig)
        .values({})
        .returning();
      return JSON.parse(newConfig.workingHours);
    }
    return JSON.parse(config.workingHours);
  }

  async updateWorkingHours(workingHours: any): Promise<void> {
    const [config] = await db.select().from(shopConfig);
    if (config) {
      await db
        .update(shopConfig)
        .set({ 
          workingHours: JSON.stringify(workingHours),
          updatedAt: new Date()
        })
        .where(eq(shopConfig.id, config.id));
    } else {
      await db
        .insert(shopConfig)
        .values({
          workingHours: JSON.stringify(workingHours)
        });
    }
  }

  // Google Calendar configuration operations
  async getGoogleCalendarConfig(): Promise<GoogleCalendarConfig | undefined> {
    const [config] = await db.select().from(googleCalendarConfig);
    return config || undefined;
  }

  async updateGoogleCalendarConfig(config: InsertGoogleCalendarConfig): Promise<GoogleCalendarConfig> {
    const [existing] = await db.select().from(googleCalendarConfig);
    if (existing) {
      const [result] = await db
        .update(googleCalendarConfig)
        .set({ 
          ...config,
          updatedAt: new Date()
        })
        .where(eq(googleCalendarConfig.id, existing.id))
        .returning();
      return result;
    } else {
      const [result] = await db.insert(googleCalendarConfig).values(config).returning();
      return result;
    }
  }

  async deleteGoogleCalendarConfig(): Promise<void> {
    await db.delete(googleCalendarConfig);
  }

  // OAuth Configuration methods
  async getOAuthConfig(): Promise<OAuthConfig | undefined> {
    const [config] = await db.select().from(oauthConfig);
    return config || undefined;
  }

  async updateOAuthConfig(config: InsertOAuthConfig): Promise<OAuthConfig> {
    const [existing] = await db.select().from(oauthConfig);
    if (existing) {
      const [result] = await db
        .update(oauthConfig)
        .set({
          ...config,
          updatedAt: new Date()
        })
        .where(eq(oauthConfig.id, existing.id))
        .returning();
      return result;
    } else {
      const [result] = await db.insert(oauthConfig).values(config).returning();
      return result;
    }
  }

  async deleteOAuthConfig(): Promise<void> {
    await db.delete(oauthConfig);
  }

  // Services operations
  async getAllServices(): Promise<Service[]> {
    return await db.select().from(services).orderBy(services.displayOrder, services.name);
  }

  async getService(id: string): Promise<Service | undefined> {
    const [service] = await db.select().from(services).where(eq(services.id, id));
    return service || undefined;
  }

  async createService(service: InsertService): Promise<Service> {
    const [result] = await db.insert(services).values(service).returning();
    return result;
  }

  async updateService(id: string, service: Partial<InsertService>): Promise<Service> {
    const [result] = await db.update(services)
      .set({ ...service, updatedAt: new Date() })
      .where(eq(services.id, id))
      .returning();
    return result;
  }

  async deleteService(id: string): Promise<void> {
    await db.delete(services).where(eq(services.id, id));
  }

  async getShopPhotos(): Promise<ShopPhoto[]> {
    return await db
      .select()
      .from(shopPhotos)
      .orderBy(asc(shopPhotos.displayOrder), desc(shopPhotos.createdAt));
  }

  async createShopPhoto(photo: InsertShopPhoto): Promise<ShopPhoto> {
    const [result] = await db.insert(shopPhotos).values(photo).returning();
    return result;
  }

  async getShopPhoto(id: string): Promise<ShopPhoto | undefined> {
    const [row] = await db.select().from(shopPhotos).where(eq(shopPhotos.id, id));
    return row || undefined;
  }

  async deleteShopPhoto(id: string): Promise<void> {
    await db.delete(shopPhotos).where(eq(shopPhotos.id, id));
  }

  // FCM Token operations
  async saveFcmToken(userId: string, token: string, deviceInfo?: string): Promise<FcmToken> {
    // Check if token already exists
    const existing = await db.select().from(fcmTokens).where(eq(fcmTokens.token, token)).limit(1);
    
    if (existing.length > 0) {
      // Update existing token
      const [result] = await db.update(fcmTokens)
        .set({ 
          userId,
          deviceInfo: deviceInfo || existing[0].deviceInfo,
          updatedAt: new Date()
        })
        .where(eq(fcmTokens.token, token))
        .returning();
      return result;
    } else {
      // Create new token
      const [result] = await db.insert(fcmTokens).values({
        userId,
        token,
        deviceInfo: deviceInfo || null,
      }).returning();
      return result;
    }
  }

  async getFcmTokensByUser(userId: string): Promise<FcmToken[]> {
    return await db.select().from(fcmTokens).where(eq(fcmTokens.userId, userId));
  }

  async getAllFcmTokens(): Promise<FcmToken[]> {
    return await db.select().from(fcmTokens);
  }

  async deleteFcmToken(token: string): Promise<void> {
    await db.delete(fcmTokens).where(eq(fcmTokens.token, token));
  }

  async getFcmTokensByUsers(userIds: string[]): Promise<FcmToken[]> {
    if (userIds.length === 0) return [];
    return await db.select().from(fcmTokens).where(inArray(fcmTokens.userId, userIds));
  }

  // Notification operations
  async createNotification(notification: InsertNotification): Promise<Notification> {
    const [result] = await db.insert(notifications).values(notification).returning();
    return result;
  }

  async getNotificationsByUser(userId: string, limit?: number): Promise<Notification[]> {
    let query = db.select().from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt));
    
    if (limit) {
      query = query.limit(limit) as any;
    }
    
    return await query;
  }

  async markNotificationAsRead(notificationId: string): Promise<void> {
    await db.update(notifications)
      .set({ read: true })
      .where(eq(notifications.id, notificationId));
  }

  async markAllNotificationsAsRead(userId: string): Promise<void> {
    await db.update(notifications)
      .set({ read: true })
      .where(and(eq(notifications.userId, userId), eq(notifications.read, false)));
  }

  async getUnreadNotificationCount(userId: string): Promise<number> {
    const result = await db.select().from(notifications)
      .where(and(eq(notifications.userId, userId), eq(notifications.read, false)));
    return result.length;
  }

  async deleteNotification(notificationId: string): Promise<void> {
    await db.delete(notifications).where(eq(notifications.id, notificationId));
  }

  // Recurring appointment operations
  async getRecurringAppointmentsByParent(parentAppointmentId: string): Promise<Appointment[]> {
    return await db.select().from(appointments)
      .where(eq(appointments.parentAppointmentId, parentAppointmentId))
      .orderBy(appointments.date, appointments.time);
  }

  async cancelRecurringAppointmentSeries(parentAppointmentId: string): Promise<void> {
    // Cancel all appointments in the series
    await db.update(appointments)
      .set({ status: 'cancelled' })
      .where(eq(appointments.parentAppointmentId, parentAppointmentId));
    
    // Also cancel the parent appointment
    await db.update(appointments)
      .set({ status: 'cancelled' })
      .where(eq(appointments.id, parentAppointmentId));
  }

  async getNextAppointmentInSeries(appointmentId: string): Promise<Appointment | undefined> {
    const appointment = await this.getAppointment(appointmentId);
    if (!appointment || !appointment.nextAppointmentId) {
      return undefined;
    }
    return await this.getAppointment(appointment.nextAppointmentId);
  }
}

export const storage = new DatabaseStorage();
