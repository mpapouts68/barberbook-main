import { storage } from "../storage";
import { fcmService } from "./fcm";
import { sendSameDayReminderEmail } from "./email";
import type { Appointment, User } from "@shared/schema";

/**
 * Check if user has enabled reminder notifications
 */
function shouldSendReminder(user: User, reminderType: '24h' | '2h'): boolean {
  try {
    const prefs = user.notificationPreferences 
      ? JSON.parse(user.notificationPreferences) 
      : { reminder24h: true, reminder2h: true, push: true };
    
    if (reminderType === '24h') {
      return prefs.reminder24h !== false && prefs.push !== false;
    } else {
      return prefs.reminder2h !== false && prefs.push !== false;
    }
  } catch (error) {
    // If preferences are invalid, default to sending reminders
    console.warn(`Invalid notification preferences for user ${user.id}, defaulting to send reminders`);
    return true;
  }
}

/**
 * Format appointment date and time for display
 */
function formatAppointmentDateTime(appointment: Appointment): string {
  // Date is in YYYY-MM-DD format, time is in HH:MM format
  const dateObj = new Date(`${appointment.date}T${appointment.time}`);
  return dateObj.toLocaleDateString('el-GR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Send 24-hour reminder for an appointment
 */
async function send24HourReminder(appointment: Appointment, user: User, employeeName: string): Promise<boolean> {
  // Check if reminder already sent
  if (appointment.reminderSent24h) {
    return false;
  }

  // Check user preferences
  if (!shouldSendReminder(user, '24h')) {
    console.log(`User ${user.id} has disabled 24h reminders`);
    return false;
  }

  // Get service name
  const serviceData = await storage.getService(appointment.service);
  const serviceName = serviceData?.name || appointment.service;

  const appointmentDateTime = formatAppointmentDateTime(appointment);
  const title = "Υπενθύμιση Ραντεβού";
  const message = `Έχετε ραντεβού ${appointmentDateTime} με ${employeeName} για ${serviceName}`;
  const link = `/appointments`;

  try {
    // Create in-app notification
    await storage.createNotification({
      userId: user.id,
      type: 'appointment_reminder',
      title,
      message,
      link,
      read: false,
    });

    // Send FCM push notification
    const sent = await fcmService.sendToUser(user.id, {
      title,
      body: message,
      data: {
        type: 'appointment_reminder',
        appointmentId: appointment.id,
        link,
      },
    });

    // Mark reminder as sent
    await storage.updateAppointment(appointment.id, {
      reminderSent24h: true,
    });

    console.log(`✅ Sent 24h reminder for appointment ${appointment.id} to user ${user.email}`);
    return sent;
  } catch (error) {
    console.error(`❌ Error sending 24h reminder for appointment ${appointment.id}:`, error);
    return false;
  }
}

/**
 * Send 2-hour reminder for an appointment
 */
async function send2HourReminder(appointment: Appointment, user: User, employeeName: string): Promise<boolean> {
  // Check if reminder already sent
  if (appointment.reminderSent2h) {
    return false;
  }

  // Check user preferences
  if (!shouldSendReminder(user, '2h')) {
    console.log(`User ${user.id} has disabled 2h reminders`);
    return false;
  }

  // Get service name
  const serviceData = await storage.getService(appointment.service);
  const serviceName = serviceData?.name || appointment.service;

  const appointmentDateTime = formatAppointmentDateTime(appointment);
  const title = "Υπενθύμιση Ραντεβού";
  const message = `Σε 2 ώρες έχετε ραντεβού ${appointmentDateTime} με ${employeeName} για ${serviceName}`;
  const link = `/appointments`;

  try {
    // Create in-app notification
    await storage.createNotification({
      userId: user.id,
      type: 'appointment_reminder',
      title,
      message,
      link,
      read: false,
    });

    // Send FCM push notification
    const sent = await fcmService.sendToUser(user.id, {
      title,
      body: message,
      data: {
        type: 'appointment_reminder',
        appointmentId: appointment.id,
        link,
      },
    });

    // Mark reminder as sent
    await storage.updateAppointment(appointment.id, {
      reminderSent2h: true,
    });

    console.log(`✅ Sent 2h reminder for appointment ${appointment.id} to user ${user.email}`);
    return sent;
  } catch (error) {
    console.error(`❌ Error sending 2h reminder for appointment ${appointment.id}:`, error);
    return false;
  }
}

/**
 * Get appointments that need reminders sent
 * Returns appointments within the specified time window
 */
async function getAppointmentsForReminder(
  hoursFromNow: number,
  windowMinutes: number = 30
): Promise<Appointment[]> {
  const now = new Date();
  const targetTime = new Date(now.getTime() + hoursFromNow * 60 * 60 * 1000);
  const windowStart = new Date(targetTime.getTime() - (windowMinutes / 2) * 60 * 1000);
  const windowEnd = new Date(targetTime.getTime() + (windowMinutes / 2) * 60 * 1000);

  // Get all confirmed appointments
  const allAppointments = await storage.getAllAppointments();
  const confirmedAppointments = allAppointments.filter(
    a => a.status === 'confirmed' || a.status === 'pending'
  );

  // Filter appointments within the time window
  const appointmentsInWindow: Appointment[] = [];

  for (const appointment of confirmedAppointments) {
    try {
      // Parse appointment date and time
      const appointmentDateTime = new Date(`${appointment.date}T${appointment.time}`);
      
      // Check if appointment is within the window
      if (appointmentDateTime >= windowStart && appointmentDateTime <= windowEnd) {
        appointmentsInWindow.push(appointment);
      }
    } catch (error) {
      console.warn(`Error parsing appointment ${appointment.id} date/time:`, error);
    }
  }

  return appointmentsInWindow;
}

/**
 * Get appointments happening today (for same-day reminder)
 */
async function getTodayAppointments(): Promise<Appointment[]> {
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0]; // YYYY-MM-DD format
  
  // Get all confirmed appointments
  const allAppointments = await storage.getAllAppointments();
  const confirmedAppointments = allAppointments.filter(
    a => a.status === 'confirmed' || a.status === 'pending'
  );

  // Filter appointments happening today
  return confirmedAppointments.filter(appointment => appointment.date === todayStr);
}

/**
 * Send same-day reminder for an appointment
 */
async function sendSameDayReminder(appointment: Appointment, user: User, employeeName: string): Promise<boolean> {
  // Check if reminder already sent
  if (appointment.reminderSentSameDay) {
    return false;
  }

  // Check user preferences
  if (!shouldSendReminder(user, '2h')) {
    console.log(`User ${user.id} has disabled reminders`);
    return false;
  }

  // Check if user has email enabled
  let emailEnabled = true;
  try {
    const prefs = user.notificationPreferences 
      ? JSON.parse(user.notificationPreferences) 
      : { email: true };
    emailEnabled = prefs.email !== false;
  } catch (e) {
    // Default to enabled
  }

  // Get service name
  const serviceData = await storage.getService(appointment.service);
  const serviceName = serviceData?.name || appointment.service;

  const appointmentDateTime = formatAppointmentDateTime(appointment);
  const title = "Υπενθύμιση Ραντεβού - Σήμερα!";
  const message = `Σήμερα έχετε ραντεβού ${appointmentDateTime} με ${employeeName} για ${serviceName}`;
  const link = `/appointments`;

  try {
    // Create in-app notification
    await storage.createNotification({
      userId: user.id,
      type: 'appointment_reminder',
      title,
      message,
      link,
      read: false,
    });

    // Send FCM push notification
    await fcmService.sendToUser(user.id, {
      title,
      body: message,
      data: {
        type: 'appointment_reminder',
        appointmentId: appointment.id,
        link,
      },
    });

    // Send email reminder if enabled
    if (emailEnabled && user.email) {
      try {
        const serviceData = await storage.getService(appointment.service);
        const serviceName = serviceData?.name || appointment.service;
        
        await sendSameDayReminderEmail(
          user.email,
          user.firstName,
          appointment.date,
          appointment.time,
          serviceName,
          employeeName,
          appointment.duration
        );
      } catch (emailError) {
        console.error(`Failed to send same-day reminder email for appointment ${appointment.id}:`, emailError);
        // Don't fail if email fails
      }
    }

    // Mark reminder as sent
    await storage.updateAppointment(appointment.id, {
      reminderSentSameDay: true,
    });

    console.log(`✅ Sent same-day reminder for appointment ${appointment.id} to user ${user.email}`);
    return true;
  } catch (error) {
    console.error(`❌ Error sending same-day reminder for appointment ${appointment.id}:`, error);
    return false;
  }
}

/**
 * Check and send appointment reminders
 * This is the main function called by the cron job
 */
export async function checkAndSendReminders(): Promise<void> {
  console.log('🔔 Checking for appointment reminders...');

  try {
    // Get appointments needing 24h reminders (between 23-25 hours from now)
    const appointments24h = await getAppointmentsForReminder(24, 120); // 2-hour window
    
    // Get appointments needing 2h reminders (between 1-3 hours from now)
    const appointments2h = await getAppointmentsForReminder(2, 60); // 1-hour window
    
    // Get appointments happening today (for same-day reminder)
    const todayAppointments = await getTodayAppointments();

    console.log(`Found ${appointments24h.length} appointments needing 24h reminders`);
    console.log(`Found ${appointments2h.length} appointments needing 2h reminders`);
    console.log(`Found ${todayAppointments.length} appointments happening today`);

    // Get all users and employees for lookups
    const allUsers = await storage.getAllUsers();
    const allEmployees = await storage.getAllEmployees();
    const userMap = new Map(allUsers.map(u => [u.id, u]));
    const employeeMap = new Map(allEmployees.map(e => [e.id, e]));

    let sent24h = 0;
    let sent2h = 0;
    let sentSameDay = 0;

    // Send 24h reminders
    for (const appointment of appointments24h) {
      // Skip if already sent
      if (appointment.reminderSent24h) {
        continue;
      }

      const user = userMap.get(appointment.userId);
      const employee = employeeMap.get(appointment.employeeId);

      if (!user) {
        console.warn(`User ${appointment.userId} not found for appointment ${appointment.id}`);
        continue;
      }

      if (!employee) {
        console.warn(`Employee ${appointment.employeeId} not found for appointment ${appointment.id}`);
        continue;
      }

      const sent = await send24HourReminder(appointment, user, employee.name);
      if (sent) {
        sent24h++;
      }
    }

    // Send 2h reminders
    for (const appointment of appointments2h) {
      // Skip if already sent
      if (appointment.reminderSent2h) {
        continue;
      }

      const user = userMap.get(appointment.userId);
      const employee = employeeMap.get(appointment.employeeId);

      if (!user) {
        console.warn(`User ${appointment.userId} not found for appointment ${appointment.id}`);
        continue;
      }

      if (!employee) {
        console.warn(`Employee ${appointment.employeeId} not found for appointment ${appointment.id}`);
        continue;
      }

      const sent = await send2HourReminder(appointment, user, employee.name);
      if (sent) {
        sent2h++;
      }
    }

    // Send same-day reminders (only once per day, check if appointment time is in the morning)
    const now = new Date();
    const currentHour = now.getHours();
    
    // Only send same-day reminders between 8 AM and 12 PM (to avoid sending too early or too late)
    // This ensures users get a reminder in the morning for their appointments later in the day
    if (currentHour >= 8 && currentHour < 12) {
      for (const appointment of todayAppointments) {
        // Skip if reminder already sent
        if (appointment.reminderSentSameDay) {
          continue;
        }

        const user = userMap.get(appointment.userId);
        const employee = employeeMap.get(appointment.employeeId);

        if (!user || !employee) {
          continue;
        }

        // Only send if appointment is later today (not already passed)
        const appointmentHour = parseInt(appointment.time.split(':')[0]);
        const appointmentMinute = parseInt(appointment.time.split(':')[1] || '0');
        const appointmentTime = appointmentHour * 60 + appointmentMinute;
        const currentTime = currentHour * 60 + now.getMinutes();
        
        // Send reminder if appointment is at least 1 hour away but still today
        if (appointmentTime > currentTime + 60) {
          const sent = await sendSameDayReminder(appointment, user, employee.name);
          if (sent) {
            sentSameDay++;
          }
        }
      }
    }

    console.log(`✅ Reminder check completed: ${sent24h} 24h reminders, ${sent2h} 2h reminders, ${sentSameDay} same-day reminders`);
  } catch (error) {
    console.error('❌ Error checking reminders:', error);
    throw error;
  }
}




