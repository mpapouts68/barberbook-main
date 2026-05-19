// Shop configuration - centralized settings for working hours and availability

export interface TimeRange {
  start: string; // Format: "HH:MM"
  end: string;   // Format: "HH:MM"
}

// WorkingHours can be either:
// - A single TimeRange (backward compatible: { start: "09:00", end: "18:00" })
// - An array of TimeRange (for split hours: [{ start: "10:00", end: "14:00" }, { start: "17:00", end: "22:00" }])
// - "closed" string (for closed days)
export type WorkingHours = TimeRange | TimeRange[] | "closed";

export interface ShopConfig {
  workingHours: {
    monday: WorkingHours;
    tuesday: WorkingHours;
    wednesday: WorkingHours;
    thursday: WorkingHours;
    friday: WorkingHours;
    saturday: WorkingHours;
    sunday: WorkingHours;
  };
  appointmentDuration: number; // in minutes
  bufferTime: number; // buffer between appointments in minutes
}

// Fade Factory working hours configuration
export const SHOP_CONFIG: ShopConfig = {
  workingHours: {
    monday: { start: "09:00", end: "18:00" },
    tuesday: { start: "09:00", end: "18:00" },
    wednesday: { start: "09:00", end: "18:00" },
    thursday: { start: "09:00", end: "20:00" }, // Late night Thursday
    friday: { start: "09:00", end: "20:00" },   // Late night Friday
    saturday: { start: "08:00", end: "19:00" }, // Early start Saturday
    sunday: { start: "10:00", end: "16:00" },   // Sunday hours
  },
  appointmentDuration: 30, // 30 minutes per appointment
  bufferTime: 5, // 5 minutes between appointments
};

// Helper function to normalize working hours to array format
export function normalizeWorkingHours(hours: WorkingHours): TimeRange[] {
  if (hours === "closed") return [];
  if (Array.isArray(hours)) return hours;
  return [hours]; // Single range, convert to array
}

// Helper function to check if a time is within any of the working hour ranges
export function isTimeWithinWorkingHours(time: string, hours: WorkingHours): boolean {
  const ranges = normalizeWorkingHours(hours);
  if (ranges.length === 0) return false;
  
  return ranges.some(range => {
    return time >= range.start && time < range.end;
  });
}

// Helper function to get working hours for a specific day
export function getWorkingHoursForDay(date: Date): WorkingHours | null {
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;
  const dayName = dayNames[date.getDay()];
  
  return SHOP_CONFIG.workingHours[dayName];
}

// Helper function to check if shop is open on a specific day
export function isShopOpenOnDay(date: Date): boolean {
  const workingHours = getWorkingHoursForDay(date);
  if (!workingHours || workingHours === "closed") return false;
  const ranges = normalizeWorkingHours(workingHours);
  return ranges.length > 0;
}

// Helper function to generate time slots for a specific day
export function generateTimeSlotsForDay(date: Date): string[] {
  const workingHours = getWorkingHoursForDay(date);
  if (!workingHours || workingHours === "closed") return [];

  const ranges = normalizeWorkingHours(workingHours);
  const slots: string[] = [];
  const slotDuration = SHOP_CONFIG.appointmentDuration;
  
  // Generate slots for each time range
  for (const range of ranges) {
    const [startHour, startMinute] = range.start.split(":").map(Number);
    const [endHour, endMinute] = range.end.split(":").map(Number);
    
    for (let hour = startHour; hour < endHour; hour++) {
      for (let minute = (hour === startHour ? startMinute : 0); minute < 60; minute += slotDuration) {
        // Don't create slots that would end after closing time
        const slotEndHour = Math.floor((minute + slotDuration) / 60) + hour;
        const slotEndMinute = (minute + slotDuration) % 60;
        
        if (slotEndHour > endHour || (slotEndHour === endHour && slotEndMinute > endMinute)) {
          break;
        }
        
        const timeStr = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
        slots.push(timeStr);
      }
    }
  }

  return slots.sort(); // Sort to ensure chronological order
}