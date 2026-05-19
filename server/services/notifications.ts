import { storage } from "../storage";
import { fcmService } from "./fcm";
import { isPlaceholderEmail } from "../utils";
import { sendBroadcastNotificationEmail } from "./email";

export interface NotificationService {
  sendPush(email: string, message: string): Promise<void>;
  sendBulkPush(recipients: string[], message: string): Promise<void>;
}

export class ConsoleNotificationService implements NotificationService {
  async sendPush(email: string, message: string): Promise<void> {
    console.log(`🔔 PUSH to ${email}: ${message}`);
  }

  async sendBulkPush(recipients: string[], message: string): Promise<void> {
    for (const email of recipients) {
      await this.sendPush(email, message);
    }
  }
}

// Hybrid notification service that uses FCM when available, falls back to console
export class HybridNotificationService implements NotificationService {
  async sendPush(email: string, message: string): Promise<void> {
    // Try to find user by email and send FCM notification
    const user = await storage.getUserByEmail(email);
    if (user) {
      const sent = await fcmService.sendToUser(user.id, {
        title: "BarberBook",
        body: message,
      });
      if (!sent) {
        // Fallback to console if no FCM tokens
        console.log(`🔔 PUSH to ${email}: ${message}`);
      }
    } else {
      console.log(`🔔 PUSH to ${email}: ${message}`);
    }
  }

  async sendBulkPush(recipients: string[], message: string): Promise<void> {
    // Get users by emails
    const users = await storage.getAllUsers();
    const userMap = new Map(users.map(u => [u.email, u]));
    
    const userIds: string[] = [];
    const emailsWithoutUsers: string[] = [];
    
    for (const email of recipients) {
      const user = userMap.get(email);
      if (user) {
        userIds.push(user.id);
      } else {
        emailsWithoutUsers.push(email);
      }
    }
    
    // Send FCM notifications to users with tokens
    if (userIds.length > 0) {
      await fcmService.sendToUsers(userIds, {
        title: "BarberBook",
        body: message,
      });
    }
    
    // Log console notifications for emails without users
    for (const email of emailsWithoutUsers) {
      console.log(`🔔 PUSH to ${email}: ${message}`);
    }
  }
}

export const notificationService = new HybridNotificationService();

export async function sendNamedayGreetings(): Promise<void> {
  // Get today's date in MM-DD format
  const today = new Date();
  const todayString = String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
  
  // Get today's namedays
  const todaysNamedays = await storage.getNamedaysByDate(todayString);
  
  // Get all users
  const users = await storage.getAllUsers();
  
  // Get nameday message template
  const messageSetting = await storage.getSetting("nameday_message");
  const messageTemplate = messageSetting?.value || "Χρόνια Πολλά {name}! Enjoy a 20% discount today!";
  
  const celebratingUserIds: string[] = [];
  
  // Find users celebrating their nameday (by name match)
  if (todaysNamedays.length > 0) {
    for (const nameday of todaysNamedays) {
      const celebratingUsers = users.filter(user => 
        user.firstName.toLowerCase() === nameday.name.toLowerCase()
      );
      celebratingUserIds.push(...celebratingUsers.map(u => u.id));
    }
  }
  
  // Also find users celebrating their birthday (by birthday date)
  // Format: DD-MM-YYYY, compare DD-MM part
  const todayDD = String(today.getDate()).padStart(2, '0');
  const todayMM = String(today.getMonth() + 1).padStart(2, '0');
  const todayBirthdayMatch = `${todayDD}-${todayMM}`;
  const birthdayUsers = users.filter(user => 
    user.birthday && user.birthday.substring(0, 5) === todayBirthdayMatch // Compare DD-MM
  );
  celebratingUserIds.push(...birthdayUsers.map(u => u.id));
  
  // Remove duplicates
  const uniqueUserIds = Array.from(new Set(celebratingUserIds));
  
  if (uniqueUserIds.length === 0) {
    console.log("No namedays or birthdays today");
    return;
  }
  
  // Send personalized messages via FCM
  for (const userId of uniqueUserIds) {
    const user = users.find(u => u.id === userId);
    if (user) {
      const personalizedMessage = messageTemplate.replace(/{name}/g, user.firstName);
      await fcmService.sendToUser(userId, {
        title: "Χρόνια Πολλά!",
        body: personalizedMessage,
      });
    }
  }
}

export async function sendPushToAudience(
  title: string,
  body: string,
  audience: string,
  selectedUserIds?: string[]
): Promise<void> {
  const users = await storage.getAllUsers();
  let recipientUserIds: string[] = [];
  const today = new Date(); // Declare once for all cases

  switch (audience) {
    case "all":
      recipientUserIds = users.map(u => u.id);
      break;

    case "selected": {
      const wanted = new Set((selectedUserIds ?? []).filter(Boolean));
      if (wanted.size === 0) {
        recipientUserIds = [];
      } else {
        recipientUserIds = users.filter((u) => wanted.has(u.id)).map((u) => u.id);
      }
      break;
    }
    
    case "nameday":
      const todayString = String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
      const todaysNamedays = await storage.getNamedaysByDate(todayString);
      
      for (const nameday of todaysNamedays) {
        const celebratingUsers = users.filter(user => 
          user.firstName.toLowerCase() === nameday.name.toLowerCase()
        );
        recipientUserIds.push(...celebratingUsers.map(u => u.id));
      }
      break;
    
    case "birthday":
      // Format: DD-MM-YYYY, compare DD-MM part
      const todayDD = String(today.getDate()).padStart(2, '0');
      const todayMM = String(today.getMonth() + 1).padStart(2, '0');
      const todayBirthdayMatch = `${todayDD}-${todayMM}`;
      const birthdayUsers = users.filter(user => 
        user.birthday && user.birthday.substring(0, 5) === todayBirthdayMatch // Compare DD-MM
      );
      recipientUserIds = birthdayUsers.map(u => u.id);
      break;
    
    case "upcoming":
      const upcomingAppointments = await storage.getUpcomingAppointments();
      const upcomingUserIds = Array.from(
        new Set(
          upcomingAppointments
            .map((a) => a.userId)
            .filter((id): id is string => !!id && id.length > 0)
        )
      );
      recipientUserIds = upcomingUserIds;
      break;
    
    default:
      recipientUserIds = [];
  }

  // Remove duplicates
  const uniqueUserIds = Array.from(new Set(recipientUserIds));

  if (uniqueUserIds.length === 0) {
    console.log(`No recipients found for audience: ${audience}`);
    // Still store the message
    await storage.createPushMessage({
      title,
      body,
      audience
    });
    return;
  }

  // Send personalized messages via FCM
  const userMap = new Map(users.map(u => [u.id, u]));
  const personalizedMessages: Array<{ userId: string; title: string; body: string }> = [];
  
  for (const userId of uniqueUserIds) {
    const user = userMap.get(userId);
    if (user) {
      const personalizedBody = body.replace(/{name}/g, user.firstName || "");
      personalizedMessages.push({
        userId,
        title,
        body: personalizedBody
      });
    }
  }

  // Determine notification type based on audience
  let notificationType: 'promotion' | 'system' = 'promotion';
  if (audience === 'all') {
    notificationType = 'system';
  }

  // Send notifications and create in-app notifications
  for (const msg of personalizedMessages) {
    // Send FCM push notification
    await fcmService.sendToUser(msg.userId, {
      title: msg.title,
      body: msg.body,
    });

    // Create in-app notification
    try {
      await storage.createNotification({
        userId: msg.userId,
        type: notificationType,
        title: msg.title,
        message: msg.body,
        link: null, // Could add link based on audience type
        read: false,
      });
    } catch (error) {
      console.error(`Error creating notification for user ${msg.userId}:`, error);
      // Continue even if notification creation fails
    }

    const user = userMap.get(msg.userId);
    if (user?.email && !isPlaceholderEmail(user.email)) {
      try {
        await sendBroadcastNotificationEmail(
          user.email,
          user.firstName || "",
          msg.title,
          msg.body
        );
      } catch (e) {
        console.error(`Broadcast email error for ${user.email}:`, e);
      }
    }
  }

  // Store the push message
  await storage.createPushMessage({
    title,
    body,
    audience
  });
}
