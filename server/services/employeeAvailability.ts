import { storage } from "../storage";
import { getCalendarEvents } from "../googleCalendar";
import {
  addMinutesToTime,
  getWorkingHoursRanges,
  intersectRangeSets,
  timeSlotsOverlap,
} from "../schedulingUtils";

export type AvailabilitySlot = {
  start: string;
  end: string;
  available: boolean;
  employeeId?: string;
  employeeName?: string;
};

function getTimezoneOffsetStr(): string {
  const timezoneOffsetMinutes = new Date().getTimezoneOffset();
  const offsetHours = Math.floor(Math.abs(timezoneOffsetMinutes) / 60);
  const offsetMinutes = Math.abs(timezoneOffsetMinutes) % 60;
  const offsetSign = timezoneOffsetMinutes <= 0 ? "+" : "-";
  return `${offsetSign}${String(offsetHours).padStart(2, "0")}:${String(offsetMinutes).padStart(2, "0")}`;
}

async function getEmployeeWorkingRanges(
  employee: { workingHours?: string | null },
  date: string,
  shopRanges: Array<{ start: string; end: string }>,
): Promise<Array<{ start: string; end: string }>> {
  const dayOfWeek = new Date(date)
    .toLocaleDateString("en-US", { weekday: "long" })
    .toLowerCase();

  let empRanges: Array<{ start: string; end: string }> | null = null;
  if (employee.workingHours) {
    try {
      const empHours =
        typeof employee.workingHours === "string"
          ? JSON.parse(employee.workingHours)
          : employee.workingHours;
      empRanges = getWorkingHoursRanges(empHours, dayOfWeek);
    } catch {
      empRanges = null;
    }
  }

  if (empRanges?.length) {
    const intersected = intersectRangeSets(shopRanges, empRanges);
    return intersected.length > 0 ? intersected : [];
  }
  return shopRanges;
}

/** Slots for one barber (DB + Google Calendar). */
export async function getEmployeeAvailabilitySlots(
  employeeId: string,
  date: string,
  duration: number,
): Promise<AvailabilitySlot[]> {
  const employee = await storage.getEmployee(employeeId);
  if (!employee?.isActive) {
    return [];
  }

  const dayOfWeek = new Date(date)
    .toLocaleDateString("en-US", { weekday: "long" })
    .toLowerCase();
  const shopWorkingHours = await storage.getWorkingHours();
  const shopRanges = getWorkingHoursRanges(shopWorkingHours, dayOfWeek);
  if (!shopRanges?.length) {
    return [];
  }

  const ranges = await getEmployeeWorkingRanges(employee, date, shopRanges);
  if (!ranges.length) {
    return [];
  }

  let googleCalendarEvents: Awaited<ReturnType<typeof getCalendarEvents>> = [];
  if (employee.googleCalendarEnabled && employee.googleCalendarId) {
    try {
      const allStarts = ranges.map((r) => r.start).sort();
      const allEnds = ranges.map((r) => r.end).sort();
      const offsetStr = getTimezoneOffsetStr();
      const timeMin = `${date}T${allStarts[0]}:00${offsetStr}`;
      const timeMax = `${date}T${allEnds[allEnds.length - 1]}:00${offsetStr}`;
      googleCalendarEvents = await getCalendarEvents(
        employee.googleCalendarId,
        timeMin,
        timeMax,
      );
    } catch {
      googleCalendarEvents = [];
    }
  }

  const existingAppointments = await storage.getAppointmentsByEmployeeAndDate(
    employeeId,
    date,
  );
  const bookedSlots = existingAppointments
    .filter((apt) => apt.status !== "cancelled")
    .map((apt) => ({
      start: apt.time,
      end: addMinutesToTime(apt.time, apt.duration || 30),
    }));

  for (const event of googleCalendarEvents) {
    if (event.start?.dateTime && event.end?.dateTime) {
      const eventStart = new Date(event.start.dateTime);
      const eventEnd = new Date(event.end.dateTime);
      bookedSlots.push({
        start: eventStart.toTimeString().slice(0, 5),
        end: eventEnd.toTimeString().slice(0, 5),
      });
    }
  }

  const slots: AvailabilitySlot[] = [];
  for (const range of ranges) {
    if (!range.start || !range.end) continue;

    const startTime = new Date(`${date}T${range.start}:00`);
    const endTime = new Date(`${date}T${range.end}:00`);
    if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) continue;

    let currentTime = new Date(startTime);
    while (currentTime < endTime) {
      const slotEnd = new Date(currentTime.getTime() + duration * 60000);
      if (slotEnd <= endTime) {
        const slotStartTime = currentTime.toTimeString().slice(0, 5);
        const slotEndTime = slotEnd.toTimeString().slice(0, 5);
        const isAvailable = !bookedSlots.some((booked) =>
          timeSlotsOverlap(
            slotStartTime,
            slotEndTime,
            booked.start,
            booked.end,
          ),
        );
        slots.push({
          start: slotStartTime,
          end: slotEndTime,
          available: isAvailable,
          employeeId: employee.id,
          employeeName: employee.name,
        });
        currentTime = new Date(currentTime.getTime() + duration * 60000);
      } else {
        break;
      }
    }
  }

  slots.sort((a, b) => a.start.localeCompare(b.start));
  return slots;
}

/** No preference: each time shows first barber who is free. */
export async function getNoPreferenceAvailability(
  date: string,
  duration: number,
): Promise<AvailabilitySlot[]> {
  const activeEmployees = (await storage.getAllEmployees()).filter(
    (e) => e.isActive,
  );
  if (!activeEmployees.length) {
    return [];
  }

  const byEmployee = new Map<string, AvailabilitySlot[]>();
  const allTimes = new Set<string>();

  for (const emp of activeEmployees) {
    const slots = await getEmployeeAvailabilitySlots(emp.id, date, duration);
    byEmployee.set(emp.id, slots);
    for (const slot of slots) {
      allTimes.add(slot.start);
    }
  }

  return [...allTimes].sort().map((start) => {
    for (const emp of activeEmployees) {
      const slot = byEmployee.get(emp.id)?.find((s) => s.start === start);
      if (slot?.available) {
        return {
          start,
          end: slot.end,
          available: true,
          employeeId: emp.id,
          employeeName: emp.name,
        };
      }
    }
    const fallback = [...byEmployee.values()]
      .flat()
      .find((s) => s.start === start);
    return {
      start,
      end: fallback?.end ?? addMinutesToTime(start, duration),
      available: false,
    };
  });
}

/** First active barber free at date/time (same order as booking auto-assign). */
export async function findFirstAvailableEmployee(
  date: string,
  time: string,
  duration: number,
): Promise<{ id: string; name: string } | null> {
  const requestedStart = time;
  const requestedEnd = addMinutesToTime(time, duration);

  const shopWorkingHours = await storage.getWorkingHours();
  const dayOfWeek = new Date(date)
    .toLocaleDateString("en-US", { weekday: "long" })
    .toLowerCase();
  const shopRanges = getWorkingHoursRanges(shopWorkingHours, dayOfWeek);
  if (!shopRanges?.length) {
    return null;
  }

  const isWithinShopHours = shopRanges.some(
    (range) => requestedStart >= range.start && requestedEnd <= range.end,
  );
  if (!isWithinShopHours) {
    return null;
  }

  const activeEmployees = (await storage.getAllEmployees()).filter(
    (e) => e.isActive,
  );

  for (const employee of activeEmployees) {
    const ranges = await getEmployeeWorkingRanges(employee, date, shopRanges);
    if (!ranges.length) continue;

    const inRange = ranges.some(
      (range) => requestedStart >= range.start && requestedEnd <= range.end,
    );
    if (!inRange) continue;

    const existingAppointments = await storage.getAppointmentsByEmployeeAndDate(
      employee.id,
      date,
    );
    const hasConflict = existingAppointments.some((apt) => {
      if (apt.status === "cancelled") return false;
      const aptEnd = addMinutesToTime(apt.time, apt.duration || 30);
      return timeSlotsOverlap(requestedStart, requestedEnd, apt.time, aptEnd);
    });
    if (hasConflict) continue;

    if (employee.googleCalendarEnabled && employee.googleCalendarId) {
      try {
        const matchingRange =
          ranges.find(
            (range) =>
              requestedStart >= range.start && requestedEnd <= range.end,
          ) || ranges[0];
        const offsetStr = getTimezoneOffsetStr();
        const timeMin = `${date}T${matchingRange.start}:00${offsetStr}`;
        const timeMax = `${date}T${matchingRange.end}:00${offsetStr}`;
        const calendarEvents = await getCalendarEvents(
          employee.googleCalendarId,
          timeMin,
          timeMax,
        );
        const hasCalendarConflict = calendarEvents.some((event) => {
          if (!event.start?.dateTime || !event.end?.dateTime) return false;
          const eventStart = new Date(event.start.dateTime);
          const eventEnd = new Date(event.end.dateTime);
          const eventStartTime = eventStart.toTimeString().slice(0, 5);
          const eventEndTime = eventEnd.toTimeString().slice(0, 5);
          return timeSlotsOverlap(
            requestedStart,
            requestedEnd,
            eventStartTime,
            eventEndTime,
          );
        });
        if (hasCalendarConflict) continue;
      } catch {
        // treat as available if calendar check fails
      }
    }

    return { id: employee.id, name: employee.name };
  }

  return null;
}
