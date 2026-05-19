import { google } from 'googleapis';
import { JWT } from 'google-auth-library';
import fs from 'fs';
import path from 'path';
import { storage } from './storage';

let googleCalendarService: any = null;

function formatGoogleCalendarError(error: unknown): string {
  const err = error as {
    code?: number;
    message?: string;
    response?: { data?: { error?: { message?: string } } };
  };
  const apiMessage = err.response?.data?.error?.message;
  if (apiMessage) return apiMessage;
  if (err.code === 404) {
    return 'Το ημερολόγιο δεν βρέθηκε. Ελέγξτε το Calendar ID και ότι έχει διαμοιραστεί με το service account.';
  }
  if (err.code === 403) {
    return 'Δεν επιτρέπεται πρόσβαση. Χρησιμοποιήστε δικαιώματα «Make changes to events» στο Google Calendar.';
  }
  return err.message || 'Άγνωστο σφάλμα Google Calendar';
}

function parseServiceAccountJson(raw: string) {
  const trimmed = raw.trim().replace(/^\uFEFF/, '');
  return JSON.parse(trimmed);
}

export async function initializeGoogleCalendar() {
  try {
    let credentials;

    // First try to get credentials from database configuration
    try {
      const config = await storage.getGoogleCalendarConfig();
      if (config?.serviceAccountKey) {
        credentials = parseServiceAccountJson(config.serviceAccountKey);
        console.log('Loaded Google service account key from database configuration');
      }
    } catch (dbError) {
      console.error('Failed to load Google Calendar config from database:', dbError);
    }

    // Fall back to environment variable
    if (!credentials) {
      let serviceAccountKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_FILE;
      if (serviceAccountKey) {
        try {
          credentials = JSON.parse(serviceAccountKey);
          console.log('Loaded Google service account key from environment');
        } catch (parseError) {
          console.error('Failed to parse Google service account key from env:', parseError);
        }
      }
    }

    // Fall back to reading from file as last resort
    if (!credentials) {
      try {
        const keyPath = path.join(process.cwd(), 'service-account-key.json');
        if (fs.existsSync(keyPath)) {
          credentials = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
          console.log('Loaded Google service account key from file');
        }
      } catch (fileError) {
        console.error('Failed to load service account key from file:', fileError);
      }
    }

    if (!credentials) {
      console.log('Google Calendar service account key not available');
      return null;
    }
    
    const auth = new JWT({
      email: credentials.client_email,
      key: credentials.private_key,
      scopes: [
        'https://www.googleapis.com/auth/calendar',
        'https://www.googleapis.com/auth/calendar.events'
      ]
    });

    googleCalendarService = google.calendar({ version: 'v3', auth });
    console.log('Google Calendar service initialized successfully');
    return googleCalendarService;
  } catch (error) {
    console.error('Failed to initialize Google Calendar service:', error);
    return null;
  }
}

export async function createCalendarEvent(calendarId: string, eventData: {
  summary: string;
  description?: string;
  start: { dateTime: string; timeZone: string };
  end: { dateTime: string; timeZone: string };
  attendees?: Array<{ email: string }>;
}) {
  if (!googleCalendarService) {
    throw new Error('Google Calendar service not initialized');
  }

  try {
    const response = await googleCalendarService.events.insert({
      calendarId,
      resource: eventData,
    });

    return response.data;
  } catch (error) {
    console.error('Error creating calendar event:', error);
    throw error;
  }
}

export async function updateCalendarEvent(calendarId: string, eventId: string, eventData: any) {
  if (!googleCalendarService) {
    throw new Error('Google Calendar service not initialized');
  }

  try {
    const response = await googleCalendarService.events.update({
      calendarId,
      eventId,
      resource: eventData,
    });

    return response.data;
  } catch (error) {
    console.error('Error updating calendar event:', error);
    throw error;
  }
}

export async function deleteCalendarEvent(calendarId: string, eventId: string) {
  if (!googleCalendarService) {
    throw new Error('Google Calendar service not initialized');
  }

  try {
    await googleCalendarService.events.delete({
      calendarId,
      eventId,
    });

    return true;
  } catch (error) {
    console.error('Error deleting calendar event:', error);
    throw error;
  }
}

export async function getCalendarEvents(calendarId: string, timeMin: string, timeMax: string): Promise<any[]> {
  if (!googleCalendarService) {
    console.warn('Google Calendar service not initialized, returning empty events');
    return [];
  }

  try {
    const response = await googleCalendarService.events.list({
      calendarId,
      timeMin,
      timeMax,
      singleEvents: true,
      orderBy: 'startTime',
    });

    return response.data.items || [];
  } catch (error: any) {
    // Handle 404 (calendar not found or not accessible) gracefully
    if (error.code === 404 || error.status === 404) {
      console.warn(`⚠️  Google Calendar not found or not accessible: ${calendarId}. Calendar may not exist or service account lacks access.`);
      return []; // Return empty array instead of throwing
    }
    
    // Handle 403 (forbidden/permission denied) gracefully
    if (error.code === 403 || error.status === 403) {
      console.warn(`⚠️  Google Calendar access denied for: ${calendarId}. Service account may need calendar sharing permissions.`);
      return []; // Return empty array instead of throwing
    }
    
    // For other errors, log but don't break the availability check
    console.error(`❌ Error getting calendar events for ${calendarId}:`, error.message || error);
    return []; // Return empty array to allow availability check to continue
  }
}

export async function getCalendarInfo(calendarId: string) {
  if (!googleCalendarService) {
    throw new Error('Google Calendar service not initialized');
  }

  try {
    const response = await googleCalendarService.calendars.get({
      calendarId,
    });

    return response.data;
  } catch (error) {
    console.error('Error getting calendar info:', error);
    throw error;
  }
}

export async function testCalendarAccess(calendarId: string): Promise<{
  success: boolean;
  error?: string;
  calendar?: { summary?: string; id?: string };
  eventsFound?: number;
}> {
  if (!googleCalendarService) {
    await initializeGoogleCalendar();
  }

  if (!googleCalendarService) {
    return {
      success: false,
      error:
        'Το Google Calendar δεν αρχικοποιήθηκε. Αποθηκεύστε έγκυρο JSON service account στη διαμόρφωση.',
    };
  }

  const trimmedId = calendarId.trim();
  const now = new Date();
  const timeMax = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  try {
    // events.list matches how the app uses calendars (more reliable than calendars.get for shared calendars)
    const response = await googleCalendarService.events.list({
      calendarId: trimmedId,
      timeMin: now.toISOString(),
      timeMax: timeMax.toISOString(),
      maxResults: 10,
      singleEvents: true,
      orderBy: 'startTime',
    });

    let summary = trimmedId;
    try {
      const meta = await googleCalendarService.calendars.get({ calendarId: trimmedId });
      if (meta.data?.summary) summary = meta.data.summary;
    } catch {
      // Optional metadata; list success is enough
    }

    return {
      success: true,
      calendar: { summary, id: trimmedId },
      eventsFound: response.data.items?.length ?? 0,
    };
  } catch (error: unknown) {
    console.error('Calendar access test error:', error);
    return {
      success: false,
      error: formatGoogleCalendarError(error),
    };
  }
}

export async function reinitializeGoogleCalendar() {
  googleCalendarService = null;
  return initializeGoogleCalendar();
}

// Initialize the service when the module loads
initializeGoogleCalendar();