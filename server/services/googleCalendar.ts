import { google } from 'googleapis';
import type { Employee, Appointment } from '@shared/schema';

interface CalendarEvent {
  summary: string;
  description?: string;
  start: {
    dateTime: string;
    timeZone: string;
  };
  end: {
    dateTime: string;
    timeZone: string;
  };
}

interface TimeSlot {
  start: string;
  end: string;
  available: boolean;
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

// Helper to get all time ranges for a day
function getWorkingHoursRanges(workingHours: any, dayOfWeek: string): Array<{ start: string; end: string }> | null {
  const dayName = dayOfWeek === 'sun' ? 'sunday' :
                  dayOfWeek === 'mon' ? 'monday' :
                  dayOfWeek === 'tue' ? 'tuesday' :
                  dayOfWeek === 'wed' ? 'wednesday' :
                  dayOfWeek === 'thu' ? 'thursday' :
                  dayOfWeek === 'fri' ? 'friday' : 'saturday';
  
  const dayConfig = workingHours[dayName];
  return normalizeWorkingHours(dayConfig);
}

export class GoogleCalendarService {
  private calendar;

  constructor() {
    const auth = new google.auth.GoogleAuth({
      keyFile: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_FILE,
      scopes: ['https://www.googleapis.com/auth/calendar'],
    });

    this.calendar = google.calendar({ version: 'v3', auth });
  }

  async getAvailableSlots(employee: Employee, date: string, duration: number = 30): Promise<TimeSlot[]> {
    if (!employee.googleCalendarId) {
      throw new Error('Employee does not have a Google Calendar connected');
    }

    const workingHours = JSON.parse(employee.workingHours);
    const dayOfWeek = new Date(date).toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    const ranges = getWorkingHoursRanges(workingHours, dayOfWeek);

    if (!ranges || ranges.length === 0) {
      return [];
    }

    // Get the earliest start and latest end across all ranges for Google Calendar query
    const allStarts = ranges.map(r => r.start).sort();
    const allEnds = ranges.map(r => r.end).sort();
    const timeMin = `${date}T${allStarts[0]}:00.000Z`;
    const timeMax = `${date}T${allEnds[allEnds.length - 1]}:00.000Z`;

    try {
      const response = await this.calendar.events.list({
        calendarId: employee.googleCalendarId,
        timeMin,
        timeMax,
        singleEvents: true,
        orderBy: 'startTime',
      });

      const events = response.data.items || [];
      
      // Generate time slots based on all working hour ranges
      const slots: TimeSlot[] = [];
      
      for (const range of ranges) {
        const startTime = new Date(`${date}T${range.start}:00`);
        const endTime = new Date(`${date}T${range.end}:00`);
        
        while (startTime < endTime) {
          const slotEnd = new Date(startTime.getTime() + duration * 60000);
          if (slotEnd <= endTime) {
            const slotStart = startTime.toTimeString().slice(0, 5);
            const slotEndStr = slotEnd.toTimeString().slice(0, 5);
            
            // Check if slot conflicts with existing events
            const isAvailable = !events.some(event => {
              if (!event.start?.dateTime || !event.end?.dateTime) return false;
              const eventStart = new Date(event.start.dateTime);
              const eventEnd = new Date(event.end.dateTime);
              return (startTime < eventEnd && slotEnd > eventStart);
            });

            slots.push({
              start: slotStart,
              end: slotEndStr,
              available: isAvailable
            });
          }
          startTime.setMinutes(startTime.getMinutes() + duration);
        }
      }

      // Sort slots by start time
      slots.sort((a, b) => a.start.localeCompare(b.start));

      return slots;
    } catch (error) {
      console.error('Error fetching calendar events:', error);
      throw new Error('Failed to check calendar availability');
    }
  }

  async createAppointment(employee: Employee, appointment: Appointment): Promise<string> {
    if (!employee.googleCalendarId) {
      throw new Error('Employee does not have a Google Calendar connected');
    }

    // Import storage to get service name
    const { storage } = await import('../storage');
    const serviceData = await storage.getService(appointment.service);
    const serviceName = serviceData?.name || appointment.service;

    const startDateTime = new Date(`${appointment.date}T${appointment.time}:00`);
    const endDateTime = new Date(startDateTime.getTime() + (appointment.duration || 30) * 60000);

    const event: CalendarEvent = {
      summary: `${serviceName} - ${appointment.barber}`,
      description: appointment.notes || `Ραντεβού κουρείου - ${serviceName}`,
      start: {
        dateTime: startDateTime.toISOString(),
        timeZone: 'Europe/Athens',
      },
      end: {
        dateTime: endDateTime.toISOString(),
        timeZone: 'Europe/Athens',
      },
    };

    try {
      const response = await this.calendar.events.insert({
        calendarId: employee.googleCalendarId,
        requestBody: event,
      });

      return response.data.id!;
    } catch (error) {
      console.error('Error creating calendar event:', error);
      throw new Error('Failed to create calendar event');
    }
  }

  async updateAppointment(employee: Employee, appointment: Appointment): Promise<void> {
    if (!employee.googleCalendarId || !appointment.googleEventId) {
      throw new Error('Missing calendar information for update');
    }

    // Import storage to get service name
    const { storage } = await import('../storage');
    const serviceData = await storage.getService(appointment.service);
    const serviceName = serviceData?.name || appointment.service;

    const startDateTime = new Date(`${appointment.date}T${appointment.time}:00`);
    const endDateTime = new Date(startDateTime.getTime() + (appointment.duration || 30) * 60000);

    const event: CalendarEvent = {
      summary: `${serviceName} - ${appointment.barber}`,
      description: appointment.notes || `Ραντεβού κουρείου - ${serviceName}`,
      start: {
        dateTime: startDateTime.toISOString(),
        timeZone: 'Europe/Athens',
      },
      end: {
        dateTime: endDateTime.toISOString(),
        timeZone: 'Europe/Athens',
      },
    };

    try {
      await this.calendar.events.update({
        calendarId: employee.googleCalendarId,
        eventId: appointment.googleEventId,
        requestBody: event,
      });
    } catch (error) {
      console.error('Error updating calendar event:', error);
      throw new Error('Failed to update calendar event');
    }
  }

  async deleteAppointment(employee: Employee, eventId: string): Promise<void> {
    if (!employee.googleCalendarId) {
      throw new Error('Employee does not have a Google Calendar connected');
    }

    try {
      await this.calendar.events.delete({
        calendarId: employee.googleCalendarId,
        eventId,
      });
    } catch (error) {
      console.error('Error deleting calendar event:', error);
      throw new Error('Failed to delete calendar event');
    }
  }
}

export const googleCalendarService = new GoogleCalendarService();