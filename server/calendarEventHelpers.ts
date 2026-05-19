import type { Appointment, User } from "@shared/schema";
import { isPlaceholderEmail } from "./utils";

export type CalendarClientInfo = {
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
};

export function formatCalendarEventSummary(
  serviceName: string,
  client?: CalendarClientInfo | null,
): string {
  const name = [client?.firstName, client?.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();
  return `${serviceName} • ${name || "Άγνωστος Πελάτης"}`;
}

export function buildCalendarEventDescription(
  serviceName: string,
  client?: CalendarClientInfo | null,
  notes?: string | null,
): string {
  const name = [client?.firstName, client?.lastName]
    .filter(Boolean)
    .join(" ")
    .trim() || "Άγνωστος Πελάτης";
  let description = `Ραντεβού κουρείου\nΥπηρεσία: ${serviceName}\nΠελάτης: ${name}`;
  if (client?.email && !isPlaceholderEmail(client.email)) {
    description += `\nEmail: ${client.email}`;
  }
  if (client?.phone) {
    description += `\nΤηλέφωνο: ${client.phone}`;
  }
  if (notes) {
    description += `\nΣημειώσεις: ${notes}`;
  }
  return description;
}

export function buildGoogleCalendarEventData(
  appointment: Pick<Appointment, "date" | "time" | "duration" | "notes">,
  serviceName: string,
  client?: CalendarClientInfo | null,
) {
  const startDateTime = `${appointment.date}T${appointment.time}:00`;
  const appointmentDateTime = new Date(startDateTime);
  const endDateTime = new Date(
    appointmentDateTime.getTime() + (appointment.duration || 30) * 60000,
  );

  return {
    summary: formatCalendarEventSummary(serviceName, client),
    description: buildCalendarEventDescription(
      serviceName,
      client,
      appointment.notes,
    ),
    start: {
      dateTime: appointmentDateTime.toISOString(),
      timeZone: "Europe/Athens",
    },
    end: {
      dateTime: endDateTime.toISOString(),
      timeZone: "Europe/Athens",
    },
  };
}

export function userToCalendarClient(user?: User | null): CalendarClientInfo | null {
  if (!user) return null;
  return {
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    phone: user.phone,
  };
}

/** Avoid showing the same slot twice when DB row lacks googleEventId. */
export function appointmentMatchesGoogleEvent(
  apt: Appointment & { clientFirstName?: string; clientLastName?: string },
  event: { id?: string | null; start?: { dateTime?: string }; end?: { dateTime?: string } },
  date: string,
  employeeId: string,
): boolean {
  if (event.id && apt.googleEventId === event.id) {
    return true;
  }
  if (apt.employeeId !== employeeId || apt.date !== date || apt.status === "cancelled") {
    return false;
  }
  if (!event.start?.dateTime) {
    return false;
  }
  const eventStart = new Date(event.start.dateTime);
  const eventStartTime = eventStart.toTimeString().slice(0, 5);
  if (apt.time !== eventStartTime) {
    return false;
  }
  if (event.end?.dateTime) {
    const eventEnd = new Date(event.end.dateTime);
    const duration = Math.round(
      (eventEnd.getTime() - eventStart.getTime()) / 60000,
    );
    const aptDuration = apt.duration || 30;
    if (Math.abs(duration - aptDuration) > 2) {
      return false;
    }
  }
  return true;
}
