import crypto from "crypto";
import type { InsertAppointment } from "@shared/schema";
import { storage } from "../storage";
import { isPlaceholderEmail } from "../utils";
import {
  buildGoogleCalendarEventData,
  userToCalendarClient,
} from "../calendarEventHelpers";
import { createCalendarEvent, getCalendarEvents } from "../googleCalendar";
import { sendAppointmentConfirmationEmail } from "./email";
import { addMinutesToTime, getWorkingHoursRanges, timeSlotsOverlap } from "../schedulingUtils";
import { findFirstAvailableEmployee } from "./employeeAvailability";

export type GuestBookingInput = {
  clientFirstName: string;
  clientLastName?: string;
  clientEmail?: string;
  clientPhone?: string;
  employeeId?: string;
  service: string;
  barber?: string;
  date: string;
  time: string;
  notes?: string;
  duration?: number;
};

export async function createGuestAppointment(input: GuestBookingInput) {
  const {
    clientFirstName,
    clientLastName = "",
    clientEmail,
    clientPhone = "",
    employeeId,
    service,
    date,
    time,
    notes = "",
    duration,
  } = input;

  if (!clientFirstName?.trim() || !service || !date || !time) {
    throw new Error("Missing required fields: first name, service, date, and time");
  }

  let user;
  const trimmedEmail = clientEmail?.trim();
  if (trimmedEmail) {
    const existingUser = await storage.getUserByEmail(trimmedEmail);
    if (existingUser) {
      user = existingUser;
    } else {
      user = await storage.createUser({
        firstName: clientFirstName.trim(),
        lastName: clientLastName?.trim() || "",
        email: trimmedEmail,
        phone: clientPhone,
        password: undefined,
        role: "customer",
        emailVerified: false,
        isActive: true,
      } as Parameters<typeof storage.createUser>[0]);
    }
  } else {
    const placeholderEmail = `walk-in-${crypto.randomUUID()}@no-email.local`;
    user = await storage.createUser({
      firstName: clientFirstName.trim(),
      lastName: clientLastName?.trim() || "",
      email: placeholderEmail,
      phone: clientPhone,
      password: undefined,
      role: "customer",
      emailVerified: false,
      isActive: true,
    } as Parameters<typeof storage.createUser>[0]);
  }

  const serviceData = await storage.getService(service);
  const appointmentDuration = duration || serviceData?.duration || 30;
  const requestedStart = time;
  const requestedEnd = addMinutesToTime(time, appointmentDuration);

  let finalEmployeeId = employeeId || "";
  let finalBarber = input.barber || "";

  if (finalEmployeeId) {
    const employee = await storage.getEmployee(finalEmployeeId);
    if (!employee?.isActive) {
      throw new Error("Employee not found or inactive");
    }

    const shopWorkingHours = await storage.getWorkingHours();
    const dayOfWeek = new Date(date)
      .toLocaleDateString("en-US", { weekday: "long" })
      .toLowerCase();
    const shopRanges = getWorkingHoursRanges(shopWorkingHours, dayOfWeek);
    if (!shopRanges?.length) {
      throw new Error("Shop is closed on this day");
    }

    const isWithinHours = shopRanges.some(
      (range) => requestedStart >= range.start && requestedEnd <= range.end,
    );
    if (!isWithinHours) {
      throw new Error("Requested time is outside shop working hours");
    }

    const existingAppointments = await storage.getAppointmentsByEmployeeAndDate(
      finalEmployeeId,
      date,
    );
    const hasConflict = existingAppointments.some((apt) => {
      if (apt.status === "cancelled") return false;
      const aptEnd = addMinutesToTime(apt.time, apt.duration || 30);
      return timeSlotsOverlap(requestedStart, requestedEnd, apt.time, aptEnd);
    });
    if (hasConflict) {
      throw new Error("This time slot is no longer available");
    }

    finalBarber = employee.name;
  } else {
    const assigned = await findFirstAvailableEmployee(
      date,
      time,
      appointmentDuration,
    );
    if (!assigned) {
      throw new Error(
        "Δεν υπάρχει διαθέσιμος κομμωτής για αυτή την ώρα. Παρακαλώ επιλέξτε άλλη ώρα.",
      );
    }
    finalEmployeeId = assigned.id;
    finalBarber = assigned.name;
  }

  const appointment = await storage.createAppointment({
    userId: user.id,
    employeeId: finalEmployeeId,
    service,
    barber: finalBarber,
    date,
    time,
    notes,
    duration: appointmentDuration,
    status: "confirmed",
  } as InsertAppointment & { status: string });

  const employee = await storage.getEmployee(finalEmployeeId);
  if (employee?.googleCalendarEnabled && employee?.googleCalendarId) {
    try {
      const serviceName = serviceData?.name || service;
      const eventData = buildGoogleCalendarEventData(
        appointment,
        serviceName,
        userToCalendarClient(user),
      );
      const calendarEvent = await createCalendarEvent(
        employee.googleCalendarId,
        eventData,
      );
      if (calendarEvent.id) {
        await storage.updateAppointment(appointment.id, {
          googleEventId: calendarEvent.id,
        } as Partial<InsertAppointment> & { googleEventId: string });
        appointment.googleEventId = calendarEvent.id;
      }
    } catch (calendarError) {
      console.warn("Guest booking: calendar sync failed:", calendarError);
    }
  }

  if (user.email && !isPlaceholderEmail(user.email)) {
    try {
      const serviceName = serviceData?.name || service;
      await sendAppointmentConfirmationEmail(
        user.email,
        user.firstName,
        appointment.date,
        appointment.time,
        serviceName,
        appointment.barber || employee?.name || "Κομμωτής",
        appointment.duration,
      );
    } catch (emailError) {
      console.warn("Guest booking: confirmation email failed:", emailError);
    }
  }

  return { appointment, user };
}
