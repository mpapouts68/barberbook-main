import { storage } from "../storage";
import { createCalendarEvent } from "../googleCalendar";
import type { Appointment, InsertAppointment, Employee } from "@shared/schema";

/**
 * Calculate the next appointment date based on recurring pattern
 */
export function calculateNextDate(
  currentDate: string, // YYYY-MM-DD
  pattern: 'weekly' | 'biweekly' | 'monthly',
  interval: number = 1
): string {
  const date = new Date(currentDate);
  
  switch (pattern) {
    case 'weekly':
      date.setDate(date.getDate() + (7 * interval));
      break;
    case 'biweekly':
      date.setDate(date.getDate() + (14 * interval));
      break;
    case 'monthly':
      date.setMonth(date.getMonth() + interval);
      break;
  }
  
  return date.toISOString().split('T')[0];
}

/**
 * Check if a date is before the end date (if set)
 */
export function isBeforeEndDate(date: string, endDate: string | null | undefined): boolean {
  if (!endDate) return true; // No end date = indefinite
  return date <= endDate;
}

/**
 * Create recurring appointments from a parent appointment
 */
export async function createRecurringAppointments(
  parentAppointment: Appointment,
  pattern: 'weekly' | 'biweekly' | 'monthly',
  interval: number,
  endDate: string | null,
  employee: Employee
): Promise<Appointment[]> {
  const createdAppointments: Appointment[] = [];
  let currentDate = parentAppointment.date;
  let previousAppointmentId = parentAppointment.id;
  
  // Create up to 12 future appointments (or until end date)
  for (let i = 0; i < 12; i++) {
    currentDate = calculateNextDate(currentDate, pattern, interval);
    
    // Check if we've reached the end date
    if (!isBeforeEndDate(currentDate, endDate)) {
      break;
    }
    
    // Create the next appointment
    const nextAppointment: InsertAppointment = {
      userId: parentAppointment.userId,
      employeeId: parentAppointment.employeeId,
      service: parentAppointment.service,
      barber: parentAppointment.barber,
      date: currentDate,
      time: parentAppointment.time,
      duration: parentAppointment.duration,
      notes: parentAppointment.notes,
      isRecurring: true,
      recurringPattern: pattern,
      recurringInterval: interval,
      recurringEndDate: endDate,
      parentAppointmentId: parentAppointment.id,
    };
    
    const created = await storage.createAppointment(nextAppointment);
    
    // Update previous appointment's nextAppointmentId
    if (previousAppointmentId !== parentAppointment.id) {
      await storage.updateAppointment(previousAppointmentId, {
        nextAppointmentId: created.id
      });
    }
    
    // Create Google Calendar event if enabled
    if (employee.googleCalendarEnabled && employee.googleCalendarId) {
      try {
        // Get service name for calendar event
        const serviceData = await storage.getService(created.service);
        const serviceName = serviceData?.name || created.service;
        
        // Get user details
        const user = await storage.getUser(created.userId);
        
        // Create calendar event with proper format
        const startDateTime = `${created.date}T${created.time}:00`;
        const appointmentDateTime = new Date(startDateTime);
        const endDateTime = new Date(appointmentDateTime.getTime() + (created.duration || 30) * 60000);
        
        const eventData = {
          summary: `${serviceName} - ${created.barber}`,
          description: `Ραντεβού κουρείου\nΥπηρεσία: ${serviceName}\nΠελάτης: ${user?.firstName || 'Client'} ${user?.lastName || ''}${user?.email ? `\nEmail: ${user.email}` : ''}${user?.phone ? `\nΤηλέφωνο: ${user.phone}` : ''}${created.notes ? `\nΣημειώσεις: ${created.notes}` : ''}`,
          start: {
            dateTime: appointmentDateTime.toISOString(),
            timeZone: 'Europe/Athens'
          },
          end: {
            dateTime: endDateTime.toISOString(),
            timeZone: 'Europe/Athens'
          }
        };
        
        const calendarEvent = await createCalendarEvent(employee.googleCalendarId, eventData);
        await storage.updateAppointment(created.id, { googleEventId: calendarEvent.id });
      } catch (error) {
        console.error('Failed to create calendar event for recurring appointment:', error);
      }
    }
    
    createdAppointments.push(created);
    previousAppointmentId = created.id;
  }
  
  // Update parent appointment's nextAppointmentId
  if (createdAppointments.length > 0) {
    await storage.updateAppointment(parentAppointment.id, {
      nextAppointmentId: createdAppointments[0].id
    });
  }
  
  return createdAppointments;
}




