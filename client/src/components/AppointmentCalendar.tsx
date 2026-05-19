import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, User, XCircle } from "lucide-react";
import { format, addDays, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, isToday, isBefore } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { useLanguage } from "@/context/language-context";

interface TimeSlot {
  time: string;
  available: boolean;
  employeeId?: string;
}

interface WorkingHours {
  start: string;
  end: string;
}

interface WorkingHoursRange {
  start: string;
  end: string;
}

// Helper to normalize working hours to array format (supports backward compatibility)
function normalizeWorkingHours(hours: any): Array<WorkingHoursRange> | null {
  if (!hours) {
    console.warn("normalizeWorkingHours: hours is null/undefined");
    return null;
  }
  
  if (hours === "closed" || (typeof hours === 'object' && hours.start === 'closed')) {
    return null;
  }
  
  if (Array.isArray(hours)) {
    // Validate array format
    const validRanges = hours.filter((r: any) => r && r.start && r.end);
    if (validRanges.length > 0) {
      return validRanges;
    }
    console.warn("normalizeWorkingHours: array format but no valid ranges", hours);
    return null;
  }
  
  // Single range format (backward compatible)
  if (typeof hours === 'object' && hours.start && hours.end) {
    return [hours];
  }
  
  console.warn("normalizeWorkingHours: unrecognized format", hours);
  return null;
}

interface WorkingHoursConfig {
  monday: WorkingHours | Array<WorkingHoursRange> | string;
  tuesday: WorkingHours | Array<WorkingHoursRange> | string;
  wednesday: WorkingHours | Array<WorkingHoursRange> | string;
  thursday: WorkingHours | Array<WorkingHoursRange> | string;
  friday: WorkingHours | Array<WorkingHoursRange> | string;
  saturday: WorkingHours | Array<WorkingHoursRange> | string;
  sunday: WorkingHours | Array<WorkingHoursRange> | string;
}

interface AppointmentCalendarProps {
  selectedEmployeeId: string;
  selectedService: string;
  onTimeSelect: (date: string, time: string) => void;
  selectedDate?: string;
  selectedTime?: string;
  employees?: Array<{id: string; name: string; specialties: string[]}>;
}

// Dummy busy slots for demonstration - in real implementation this would come from Google Calendar API
const dummyBusySlots: Record<string, string[]> = {
  "2025-09-19": ["10:00", "14:00", "16:30"],
  "2025-09-20": ["09:30", "11:00", "15:00"],
  "2025-09-21": ["13:00", "17:00"],
};

export function AppointmentCalendar({
  selectedEmployeeId,
  selectedService,
  onTimeSelect,
  selectedDate,
  selectedTime,
  employees = []
}: AppointmentCalendarProps) {
  const { isEnglish, dateLocale } = useLanguage();
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<Date | null>(null);
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [error, setError] = useState<string | null>(null);

  const text = {
    errorPrefix: isEnglish ? "Error:" : "Σφάλμα:",
    retry: isEnglish ? "Retry" : "Επανάληψη",
    title: isEnglish ? "DATE & TIME SELECTION" : "ΕΠΙΛΟΓΗ ΗΜΕΡΟΜΗΝΙΑΣ & ΩΡΑΣ",
    mobileTitle: isEnglish ? "CALENDAR" : "ΗΜΕΡΟΛΟΓΙΟ",
    technician: isEnglish ? "Barber:" : "Τεχνικός:",
    selectedBarber: isEnglish ? "Selected barber" : "Επιλεγμένος Κομμωτής",
    noPreference: isEnglish ? "No preference" : "Χωρίς προτίμηση",
    previousWeek: isEnglish ? "← Previous Week" : "← Προηγούμενη Εβδομάδα",
    nextWeek: isEnglish ? "Next Week →" : "Επόμενη Εβδομάδα →",
    availableHours: isEnglish ? "AVAILABLE TIMES" : "ΔΙΑΘΕΣΙΜΕΣ ΩΡΕΣ",
    pickDate: isEnglish ? "Please select a date" : "Παρακαλώ επιλέξτε μια ημερομηνία",
    loadingAvailability: isEnglish ? "Loading availability from Google Calendar..." : "Φόρτωση διαθεσιμότητας από Google Calendar...",
    availabilityError: isEnglish ? "Failed to load availability" : "Σφάλμα φόρτωσης διαθεσιμότητας",
    tryAgain: isEnglish ? "Please try again" : "Παρακαλώ δοκιμάστε ξανά",
    barberUnavailableDate: isEnglish
      ? "The selected barber is not available on this date"
      : "Ο επιλεγμένος κομμωτής δεν είναι διαθέσιμος αυτήν την ημερομηνία",
    suggestedAlternatives: isEnglish ? "Suggested alternatives:" : "Προτεινόμενες εναλλακτικές:",
    suggestedAlternativesHint: isEnglish
      ? 'Try another barber or choose "No preference" for more availability'
      : 'Δοκιμάστε άλλον κομμωτή ή επιλέξτε "Χωρίς προτίμηση" για μεγαλύτερη διαθεσιμότητα',
    storeClosed: isEnglish ? "The shop is closed on this date" : "Το κατάστημα είναι κλειστό αυτήν την ημερομηνία",
    chooseWorkingDay: isEnglish ? "Please choose one of the working days" : "Παρακαλώ επιλέξτε μία από τις ημέρες λειτουργίας",
    noAvailableTimesForBarber: isEnglish
      ? "The selected barber has no available times on this date"
      : "Ο επιλεγμένος κομμωτής δεν έχει διαθέσιμες ώρες αυτήν την ημερομηνία",
    noAvailableTimes: isEnglish ? "No available times for this date" : "Δεν υπάρχουν διαθέσιμες ώρες για αυτήν την ημερομηνία",
    fullyBooked: isEnglish ? "All time slots are booked. Please choose another date" : "Όλες οι ώρες είναι κρατημένες - επιλέξτε άλλη ημερομηνία",
  };
  
  // Ensure employees is always an array
  const safeEmployees = Array.isArray(employees) ? employees : [];

  // Update selectedCalendarDate when selectedDate prop changes
  useEffect(() => {
    try {
      if (selectedDate && selectedDate !== "") {
        const date = new Date(selectedDate);
        if (!isNaN(date.getTime())) {
          setSelectedCalendarDate(date);
          // Update current week to show the week containing the selected date
          setCurrentWeek(date);
          setError(null);
        } else {
          console.warn("Invalid date format:", selectedDate);
          setSelectedCalendarDate(null);
          setError(null); // Don't show error for empty dates
        }
      } else {
        setSelectedCalendarDate(null);
        setError(null); // Don't show error for empty dates
      }
    } catch (err: any) {
      console.error("Error setting selected date:", err);
      setSelectedCalendarDate(null);
      setError(null); // Don't crash on date errors
    }
  }, [selectedDate]);

  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  // Error boundary - show error message instead of crashing
  // Only show error if it's a critical error, not just missing data
  if (error && error !== "Invalid date selected") {
    return (
      <div className="p-4 bg-red-900/20 border border-red-500 rounded">
        <p className="text-red-400">{text.errorPrefix} {error}</p>
        <Button 
          type="button"
          onClick={() => {
            setError(null);
            setSelectedCalendarDate(null);
          }} 
          className="mt-2"
          variant="outline"
        >
          {text.retry}
        </Button>
      </div>
    );
  }

  // Determine if an employee is selected (needed for queries)
  const hasEmployeeSelected = Boolean(selectedEmployeeId && selectedEmployeeId !== "" && selectedEmployeeId !== "auto");

  // Fetch selected employee data to check their working hours
  // CRITICAL: This query refreshes when employee changes, ensuring we have latest employee data
  const { data: selectedEmployee } = useQuery({
    queryKey: ["/api/employees", selectedEmployeeId],
    queryFn: async () => {
      if (!hasEmployeeSelected) return null;
      const response = await fetch(`/api/employees/${selectedEmployeeId}`);
      if (!response.ok) return null;
      const data = await response.json();
      console.log(`📅 Fetched employee ${selectedEmployeeId} data:`, data.name, 'has workingHours:', !!data.workingHours);
      return data;
    },
    enabled: hasEmployeeSelected,
    staleTime: 0, // Always fetch fresh data when employee changes
    refetchOnMount: true,
  });

  // Fetch shop working hours from the database - always use shop hours
  const { data: workingHours = {} as WorkingHoursConfig, isLoading: isLoadingWorkingHours, error: workingHoursError } = useQuery<WorkingHoursConfig>({
    queryKey: ["/api/admin/working-hours"],
    queryFn: async () => {
      const response = await fetch("/api/admin/working-hours");
      if (!response.ok) {
        const errorText = await response.text();
        console.error("Failed to fetch working hours:", response.status, errorText);
        throw new Error(`Failed to fetch working hours: ${response.status}`);
      }
      const data = await response.json();
      console.log("📅 Fetched shop working hours:", data);
      // Validate that we have working hours data
      if (!data || typeof data !== 'object' || Object.keys(data).length === 0) {
        console.warn("⚠️ Working hours data is empty or invalid:", data);
      }
      return data;
    },
    retry: 2,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  // Fetch employee-specific availability when employee and date are selected
  // This endpoint checks both database appointments AND Google Calendar events
  // CRITICAL: Refreshes immediately when employee changes
  const dateStr = selectedCalendarDate ? format(selectedCalendarDate, "yyyy-MM-dd") : null;
  const { data: employeeAvailability = [], isLoading: isLoadingAvailability, error: availabilityError } = useQuery({
    queryKey: ["/api/employees", selectedEmployeeId, "availability", dateStr],
    queryFn: async () => {
      if (!hasEmployeeSelected || !selectedCalendarDate || !dateStr) {
        console.log("Skipping availability fetch - missing requirements");
        return [];
      }
      try {
        console.log(`🔄 Fetching availability for employee ${selectedEmployeeId} on ${dateStr}`);
        const response = await fetch(`/api/employees/${selectedEmployeeId}/availability?date=${dateStr}&duration=30`);
        if (!response.ok) {
          const errorText = await response.text();
          console.error(`Failed to fetch availability for employee ${selectedEmployeeId} on ${dateStr}:`, response.status, errorText);
          return [];
        }
        const data = await response.json();
        if (!Array.isArray(data)) {
          console.warn("Employee availability response is not an array:", data);
          return [];
        }
        console.log(`✅ Received ${data.length} availability slots for employee ${selectedEmployeeId} on ${dateStr}`);
        return data;
      } catch (err: any) {
        console.error("Error fetching employee availability:", err);
        setError(`Error loading availability: ${err.message}`);
        return [];
      }
    },
    enabled: Boolean(hasEmployeeSelected && selectedCalendarDate && dateStr),
    staleTime: 0, // Always fetch fresh data when employee/date changes
    refetchOnMount: true,
    retry: 1,
  });

  // Fallback: Fetch all appointments for the selected date (when no employee selected)
  const { data: existingAppointments = [] } = useQuery({
    queryKey: ["/api/appointments/date", selectedCalendarDate],
    queryFn: async () => {
      if (!selectedCalendarDate) return [];
      const response = await fetch(`/api/appointments/date/${format(selectedCalendarDate, "yyyy-MM-dd")}`);
      if (!response.ok) throw new Error("Failed to fetch appointments");
      return response.json();
    },
    enabled: !!selectedCalendarDate && !selectedEmployeeId,
  });

  // Helper functions using dynamic working hours
  const getWorkingHoursRangesForDay = (date: Date): Array<WorkingHoursRange> | null => {
    try {
      // Check if working hours are loaded
      if (isLoadingWorkingHours || !workingHours || Object.keys(workingHours).length === 0) {
        console.warn(`Working hours not loaded yet or empty. isLoading: ${isLoadingWorkingHours}, keys:`, Object.keys(workingHours || {}));
        return null;
      }
      
      const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;
      const dayName = dayNames[date.getDay()];
      const dayConfig = workingHours[dayName];
      
      console.log(`🔍 getWorkingHoursRangesForDay: dayName=${dayName}, dayConfig=`, dayConfig);
      
      if (!dayConfig) {
        console.warn(`No working hours config for ${dayName} in:`, Object.keys(workingHours));
        return null;
      }
      
      const ranges = normalizeWorkingHours(dayConfig);
      console.log(`📅 ${dayName} normalized ranges:`, ranges);
      
      if (!ranges || ranges.length === 0) {
        console.warn(`No valid ranges found for ${dayName} after normalization`);
        return null;
      }
      
      return ranges;
    } catch (error) {
      console.error(`Error getting working hours for day:`, error);
      return null;
    }
  };

  const getWorkingHoursForDay = (date: Date): WorkingHours | null => {
    const ranges = getWorkingHoursRangesForDay(date);
    if (!ranges || ranges.length === 0) return null;
    // Return first range for backward compatibility (used in display)
    return ranges[0];
  };

  const isShopOpenOnDay = (date: Date): boolean => {
    const ranges = getWorkingHoursRangesForDay(date);
    return ranges !== null && ranges.length > 0;
  };

  // Check if employee is working on a specific day
  // CRITICAL: Employee can only work when shop is also open
  const isEmployeeWorkingOnDay = (date: Date): boolean => {
    // First check if shop is open - if shop is closed, employee cannot work
    if (isLoadingWorkingHours || !workingHours || Object.keys(workingHours).length === 0) {
      return false; // Can't determine if shop is open
    }
    
    const shopOpen = isShopOpenOnDay(date);
    if (!shopOpen) {
      return false; // Shop is closed, employee cannot work
    }
    
    // Shop is open, now check employee hours
    // Always fall back to shop hours if no employee selected
    if (!hasEmployeeSelected || !selectedEmployee) {
      return shopOpen; // Shop is open, use shop hours
    }
    
    // If employee has custom working hours, check them
    if (selectedEmployee.workingHours) {
      try {
        const empHours = typeof selectedEmployee.workingHours === 'string' 
          ? JSON.parse(selectedEmployee.workingHours) 
          : selectedEmployee.workingHours;
        
        // Check if it's a valid object with day configs
        if (empHours && typeof empHours === 'object' && Object.keys(empHours).length > 0) {
          const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;
          const dayName = dayNames[date.getDay()];
          const dayConfig = empHours[dayName];
          
          // Employee is closed this day
          if (!dayConfig || dayConfig === 'closed' || (typeof dayConfig === 'object' && dayConfig.start === 'closed')) {
            return false;
          }
          
          // Check if employee has valid hours for this day
          const empRanges = normalizeWorkingHours(dayConfig);
          if (!empRanges || empRanges.length === 0) {
            return false; // Employee is closed
          }
          
          // Employee has hours, but we also need to check if they intersect with shop hours
          const shopRanges = getWorkingHoursRangesForDay(date);
          if (!shopRanges || shopRanges.length === 0) {
            return false; // Shop is closed (shouldn't happen since we checked above, but safety check)
          }
          
          // Check if employee hours intersect with shop hours
          const intersections = intersectRangeSets(shopRanges, empRanges);
          return intersections.length > 0; // Employee can work if there's any intersection
        }
      } catch (e) {
        console.warn('Error parsing employee working hours, using shop hours:', e);
        // Parse error - fall back to shop hours (shop is open)
        return shopOpen;
      }
    }
    
    // No employee hours set, use shop hours (shop is open)
    return shopOpen;
  };

  const generateTimeSlotsForDay = (date: Date): string[] => {
    try {
      const ranges = getWorkingHoursRangesForDay(date);
      const dateStr = format(date, "yyyy-MM-dd");
      console.log(`🔍 generateTimeSlotsForDay for ${dateStr}:`, ranges);
      
      if (!ranges || ranges.length === 0) {
        console.warn(`No ranges found for ${dateStr}`);
        return [];
      }

      const slots: string[] = [];
      const slotDuration = 30;
      
      // Generate slots for each period
      for (const range of ranges) {
        if (!range.start || !range.end) {
          console.warn(`Invalid range (missing start/end):`, range);
          continue;
        }
        
        try {
          console.log(`  Processing range: ${range.start} - ${range.end}`);
          // Create a date object for easier time manipulation
          const startTime = new Date(`2000-01-01T${range.start}:00`);
          const endTime = new Date(`2000-01-01T${range.end}:00`);
          
          if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
            console.warn(`Invalid time range: ${range.start} - ${range.end}`);
            continue;
          }
          
          let currentTime = new Date(startTime);
          let periodSlots = 0;
          
          while (currentTime < endTime) {
            const slotEndTime = new Date(currentTime.getTime() + slotDuration * 60000);
            
            // Don't create slots that would end after closing time
            if (slotEndTime > endTime) {
              break;
            }
            
            const timeStr = currentTime.toTimeString().slice(0, 5);
            slots.push(timeStr);
            periodSlots++;
            
            // Move to next slot
            currentTime = slotEndTime;
          }
          console.log(`  Generated ${periodSlots} slots for period ${range.start}-${range.end}`);
        } catch (rangeError) {
          console.error(`Error processing range ${range.start}-${range.end}:`, rangeError);
          continue;
        }
      }

      // Remove duplicates and sort
      const finalSlots = Array.from(new Set(slots)).sort();
      console.log(`✅ Total slots generated for ${dateStr}: ${finalSlots.length}`, finalSlots.slice(0, 10));
      return finalSlots;
    } catch (error) {
      console.error("Error in generateTimeSlotsForDay:", error);
      return [];
    }
  };

  // Helper function to intersect two time ranges
  const intersectRanges = (range1: WorkingHoursRange, range2: WorkingHoursRange): WorkingHoursRange | null => {
    const [start1Hour, start1Min] = range1.start.split(':').map(Number);
    const [end1Hour, end1Min] = range1.end.split(':').map(Number);
    const [start2Hour, start2Min] = range2.start.split(':').map(Number);
    const [end2Hour, end2Min] = range2.end.split(':').map(Number);
    
    const start1 = start1Hour * 60 + start1Min;
    const end1 = end1Hour * 60 + end1Min;
    const start2 = start2Hour * 60 + start2Min;
    const end2 = end2Hour * 60 + end2Min;
    
    const intersectStart = Math.max(start1, start2);
    const intersectEnd = Math.min(end1, end2);
    
    if (intersectStart >= intersectEnd) {
      return null; // No intersection
    }
    
    const startHour = Math.floor(intersectStart / 60);
    const startMin = intersectStart % 60;
    const endHour = Math.floor(intersectEnd / 60);
    const endMin = intersectEnd % 60;
    
    return {
      start: `${String(startHour).padStart(2, '0')}:${String(startMin).padStart(2, '0')}`,
      end: `${String(endHour).padStart(2, '0')}:${String(endMin).padStart(2, '0')}`
    };
  };

  // Helper function to intersect all ranges from two sets
  const intersectRangeSets = (ranges1: WorkingHoursRange[], ranges2: WorkingHoursRange[]): WorkingHoursRange[] => {
    const intersections: WorkingHoursRange[] = [];
    
    for (const range1 of ranges1) {
      for (const range2 of ranges2) {
        const intersection = intersectRanges(range1, range2);
        if (intersection) {
          intersections.push(intersection);
        }
      }
    }
    
    // Sort and merge overlapping ranges
    intersections.sort((a, b) => a.start.localeCompare(b.start));
    
    if (intersections.length === 0) return [];
    
    const merged: WorkingHoursRange[] = [intersections[0]];
    for (let i = 1; i < intersections.length; i++) {
      const current = intersections[i];
      const last = merged[merged.length - 1];
      
      const [currentStartHour, currentStartMin] = current.start.split(':').map(Number);
      const [lastEndHour, lastEndMin] = last.end.split(':').map(Number);
      const currentStart = currentStartHour * 60 + currentStartMin;
      const lastEnd = lastEndHour * 60 + lastEndMin;
      
      if (currentStart <= lastEnd) {
        // Merge overlapping ranges
        const [currentEndHour, currentEndMin] = current.end.split(':').map(Number);
        const currentEnd = currentEndHour * 60 + currentEndMin;
        const newEnd = Math.max(lastEnd, currentEnd);
        const newEndHour = Math.floor(newEnd / 60);
        const newEndMin = newEnd % 60;
        last.end = `${String(newEndHour).padStart(2, '0')}:${String(newEndMin).padStart(2, '0')}`;
      } else {
        merged.push(current);
      }
    }
    
    return merged;
  };

  // Generate time slots for selected employee (fallback when API doesn't return data)
  // CRITICAL: Always respects shop hours - employee hours are intersected with shop hours
  const generateTimeSlots = (date: Date): TimeSlot[] => {
    try {
      const dateStr = format(date, "yyyy-MM-dd");
      
      // Check if shop working hours are loaded - REQUIRED
      if (isLoadingWorkingHours || Object.keys(workingHours).length === 0) {
        console.warn("Shop working hours not loaded yet");
        return [];
      }
      
      // ALWAYS get shop hours first - shop must be open
      const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;
      const dayName = dayNames[date.getDay()];
      const shopDayConfig = workingHours[dayName];
      const shopRanges = normalizeWorkingHours(shopDayConfig);
      
      // If shop is closed, no slots available regardless of employee hours
      if (!shopRanges || shopRanges.length === 0) {
        console.log(`Shop is closed on ${dateStr} - no slots available`);
        return [];
      }
      
      // If employee is selected, get their hours and intersect with shop hours
      let finalRanges = shopRanges;
      if (hasEmployeeSelected && selectedEmployee?.workingHours) {
        try {
          const empHours = typeof selectedEmployee.workingHours === 'string' 
            ? JSON.parse(selectedEmployee.workingHours) 
            : selectedEmployee.workingHours;
          
          if (empHours && typeof empHours === 'object' && Object.keys(empHours).length > 0) {
            const empDayConfig = empHours[dayName];
            const empRanges = normalizeWorkingHours(empDayConfig);
            
            if (empRanges && empRanges.length > 0) {
              // Intersect employee hours with shop hours
              finalRanges = intersectRangeSets(shopRanges, empRanges);
              console.log(`Using employee hours intersected with shop hours for ${dateStr}`);
              console.log(`Shop ranges:`, shopRanges);
              console.log(`Employee ranges:`, empRanges);
              console.log(`Final intersected ranges:`, finalRanges);
            } else {
              // Employee is closed this day, but shop is open - no slots
              console.log(`Employee is closed on ${dateStr} but shop is open - no slots available`);
              return [];
            }
          }
        } catch (e) {
          console.warn('Error parsing employee hours, using shop hours only:', e);
          // On error, use shop hours only
        }
      }
      
      // If no valid ranges after intersection, return empty
      if (!finalRanges || finalRanges.length === 0) {
        console.log(`No valid time ranges after intersection for ${dateStr}`);
        return [];
      }
      
      // Generate available time slots from final ranges
      // CRITICAL: Process ALL ranges, not just the first one
      const availableTimeSlots: string[] = [];
      const slotDuration = 30;
      
      console.log(`🔧 Generating slots from ${finalRanges.length} range(s):`, finalRanges.map(r => `${r.start}-${r.end}`));
      
      for (const range of finalRanges) {
        if (!range.start || !range.end) {
          console.warn(`⚠️ Skipping invalid range:`, range);
          continue;
        }
        
        const startTime = new Date(`2000-01-01T${range.start}:00`);
        const endTime = new Date(`2000-01-01T${range.end}:00`);
        
        if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
          console.warn(`⚠️ Skipping range with invalid times: ${range.start}-${range.end}`);
          continue;
        }
        
        let currentTime = new Date(startTime);
        let rangeSlotCount = 0;
        
        while (currentTime < endTime) {
          const slotEndTime = new Date(currentTime.getTime() + slotDuration * 60000);
          if (slotEndTime <= endTime) {
            const timeStr = currentTime.toTimeString().slice(0, 5);
            availableTimeSlots.push(timeStr);
            rangeSlotCount++;
          }
          currentTime = new Date(currentTime.getTime() + slotDuration * 60000);
        }
        
        console.log(`  ✅ Range ${range.start}-${range.end}: Generated ${rangeSlotCount} slots`);
      }
      
      console.log(`📅 Total slots generated: ${availableTimeSlots.length} from ${finalRanges.length} range(s)`);
      
      if (availableTimeSlots.length === 0) {
        console.warn(`No time slots generated for ${dateStr} - check working hours intersection`);
        return [];
      }
      
      // Get existing appointments for this date and employee (if selected)
      const dayAppointments = Array.isArray(existingAppointments) 
        ? existingAppointments.filter((apt: any) => {
            if (apt.date !== dateStr || apt.status === 'cancelled') return false;
            if (hasEmployeeSelected && selectedEmployeeId) {
              return apt.employeeId === selectedEmployeeId || apt.barber === selectedEmployeeId;
            }
            return true;
          })
        : [];
      
      // Get all busy time slots
      const allBusySlots = dayAppointments.map((apt: any) => apt.time);
      
      return availableTimeSlots.map(time => ({
        time,
        available: !allBusySlots.includes(time),
        employeeId: hasEmployeeSelected ? selectedEmployeeId : undefined
      }));
    } catch (error) {
      console.error("Error in generateTimeSlots:", error);
      return [];
    }
  };

  // CRITICAL: When employee changes, validate and clear selected date if employee doesn't work that day
  useEffect(() => {
    // Only validate if we have all required data and an employee is selected
    if (!selectedCalendarDate || !hasEmployeeSelected || !selectedEmployee || isLoadingWorkingHours || !workingHours || Object.keys(workingHours).length === 0) {
      return;
    }
    
    // Check if the currently selected date is valid for the new employee
    const dateStr = format(selectedCalendarDate, "yyyy-MM-dd");
    
    // Check shop hours first
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;
    const dayName = dayNames[selectedCalendarDate.getDay()];
    const shopDayConfig = workingHours[dayName];
    const shopRanges = normalizeWorkingHours(shopDayConfig);
    
    // If shop is closed, clear date
    if (!shopRanges || shopRanges.length === 0) {
      console.log(`⚠️ Shop is closed on ${dateStr} - clearing selection`);
      setSelectedCalendarDate(null);
      setAvailableSlots([]);
      onTimeSelect("", "");
      return;
    }
    
    // Check if employee works this day (this function checks shop hours AND employee hours)
    const isDateValid = isEmployeeWorkingOnDay(selectedCalendarDate);
    
    if (!isDateValid) {
      console.log(`⚠️ Selected date ${dateStr} is not valid for employee ${selectedEmployeeId} (${selectedEmployee.name}) - clearing selection`);
      setSelectedCalendarDate(null);
      setAvailableSlots([]);
      // Clear the selected time by calling onTimeSelect with empty values
      onTimeSelect("", "");
    } else {
      console.log(`✅ Selected date ${dateStr} is valid for employee ${selectedEmployeeId} (${selectedEmployee.name})`);
    }
  }, [selectedEmployeeId, selectedEmployee, selectedCalendarDate, hasEmployeeSelected, isLoadingWorkingHours, workingHours]); // Run when employee or date changes

  useEffect(() => {
    try {
      if (selectedCalendarDate) {
        // If employee is selected, use employee-specific availability from API
        if (hasEmployeeSelected) {
          // CRITICAL: First check if employee works this day - if not, clear slots immediately
          if (!isEmployeeWorkingOnDay(selectedCalendarDate)) {
            console.log(`Employee ${selectedEmployeeId} does not work on ${format(selectedCalendarDate, "yyyy-MM-dd")} - clearing slots`);
            setAvailableSlots([]);
            return;
          }
          
          // Wait for availability data - it includes Google Calendar events
          // CRITICAL: API should return slots that are already intersected with shop hours
          if (employeeAvailability && Array.isArray(employeeAvailability) && employeeAvailability.length > 0) {
            console.log(`📅 Using API availability data (${employeeAvailability.length} slots) - these should already be intersected with shop hours`);
            const slots: TimeSlot[] = employeeAvailability.reduce((validSlots: TimeSlot[], slot: any) => {
              if (!slot || !slot.start) {
                console.warn("Invalid slot data:", slot);
                return validSlots;
              }

              validSlots.push({
                time: slot.start,
                available: slot.available !== false, // Default to available if not specified
                employeeId: selectedEmployeeId,
              });

              return validSlots;
            }, []);
            
            console.log(`📅 Employee ${selectedEmployeeId} availability slots from API:`, slots.length, slots.map(s => s.time).slice(0, 10));
            setAvailableSlots(slots);
          } else if (!isLoadingAvailability && !availabilityError) {
            // No availability data - check if employee should be working, if so generate slots
            const dateStr = format(selectedCalendarDate, "yyyy-MM-dd");
            console.log(`No availability data for employee ${selectedEmployeeId} on ${dateStr}, checking if employee should be working...`);
            
            // Check if employee is working this day
            if (isEmployeeWorkingOnDay(selectedCalendarDate)) {
              // Employee should be working but API returned empty - generate slots from hours
              console.log(`Employee should be working, generating slots from working hours`);
              const slots = generateTimeSlots(selectedCalendarDate);
              setAvailableSlots(slots);
            } else {
              // Employee is not working this day
              console.log(`Employee is not working on ${dateStr}`);
              setAvailableSlots([]);
            }
          } else if (availabilityError) {
            // Error fetching availability - try to generate from hours as fallback
            console.error("Error loading employee availability:", availabilityError);
            if (isEmployeeWorkingOnDay(selectedCalendarDate)) {
              console.log("Falling back to generating slots from working hours");
              const slots = generateTimeSlots(selectedCalendarDate);
              setAvailableSlots(slots);
            } else {
              setAvailableSlots([]);
            }
          }
          // If loading, keep current slots or empty
        } else if (!isLoadingWorkingHours && Object.keys(workingHours).length > 0) {
          // No employee selected, use shop hours and all appointments
          console.log(`📅 No employee selected, using shop hours. Working hours:`, workingHours);
          const slots = generateTimeSlots(selectedCalendarDate);
          const dateStr = format(selectedCalendarDate, "yyyy-MM-dd");
          console.log(`📅 Shop hours slots for ${dateStr}:`, slots.length, "All slots:", slots.map(s => s.time));
          setAvailableSlots(slots);
        } else if (isLoadingWorkingHours) {
          // Still loading working hours
          console.log(`⏳ Still loading working hours...`);
          setAvailableSlots([]);
        } else {
          console.warn(`⚠️ Working hours not available. isLoadingWorkingHours: ${isLoadingWorkingHours}, workingHours keys:`, Object.keys(workingHours));
          setAvailableSlots([]);
        }
      } else {
        setAvailableSlots([]);
      }
    } catch (err: any) {
      console.error("Error in useEffect for available slots:", err);
      setError(err.message || "Error updating available slots");
      setAvailableSlots([]);
    }
  }, [selectedCalendarDate, selectedEmployeeId, hasEmployeeSelected, workingHours, existingAppointments, employeeAvailability, isLoadingWorkingHours, isLoadingAvailability, availabilityError, selectedEmployee]);

  const handleDateSelect = (date: Date) => {
    try {
      if (!date || isNaN(date.getTime())) {
        console.error("Invalid date provided to handleDateSelect");
        return;
      }
      setSelectedCalendarDate(date);
      setError(null);
    } catch (err: any) {
      console.error("Error in handleDateSelect:", err);
      setError(err.message || "Error selecting date");
    }
  };

  const handleTimeSelect = (time: string) => {
    try {
      if (selectedCalendarDate) {
        const dateStr = format(selectedCalendarDate, "yyyy-MM-dd");
        onTimeSelect(dateStr, time);
      }
    } catch (error) {
      console.error("Error selecting time:", error);
    }
  };

  const goToPreviousWeek = () => {
    setCurrentWeek(prev => addDays(prev, -7));
  };

  const goToNextWeek = () => {
    setCurrentWeek(prev => addDays(prev, 7));
  };

  return (
    <div className="space-y-6">
      {/* Calendar Header */}
      <Card className="metal-gradient border-steel">
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="font-oswald text-lg sm:text-xl text-whiskey flex items-center">
            <Calendar className="mr-2" size={18} />
            <span className="hidden sm:inline">{text.title}</span>
            <span className="sm:hidden">{text.mobileTitle}</span>
          </CardTitle>
          <p className="text-gray-400 text-sm sm:text-base">
            {text.technician} <Badge variant="outline" className="text-whiskey border-whiskey ml-1 text-xs sm:text-sm">
              {hasEmployeeSelected ? 
                (safeEmployees.find(emp => emp?.id === selectedEmployeeId)?.name || text.selectedBarber) :
                text.noPreference
              }
            </Badge>
          </p>
        </CardHeader>
      </Card>

      {/* Week Navigation */}
      <Card className="metal-gradient border-steel">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-4">
            <Button 
              type="button"
              variant="outline" 
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                goToPreviousWeek();
              }}
              className="border-whiskey text-whiskey hover:bg-whiskey hover:text-black w-full sm:w-auto text-sm sm:text-base"
            >
              {text.previousWeek}
            </Button>
            <h3 className="font-oswald text-lg text-whiskey text-center">
              {format(weekStart, "d MMM", { locale: dateLocale })} - {format(weekEnd, "d MMM yyyy", { locale: dateLocale })}
            </h3>
            <Button 
              type="button"
              variant="outline" 
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                goToNextWeek();
              }}
              className="border-whiskey text-whiskey hover:bg-whiskey hover:text-black w-full sm:w-auto text-sm sm:text-base"
            >
              {text.nextWeek}
            </Button>
          </div>

          {/* Week Days Grid */}
          <div className="grid grid-cols-7 gap-1 sm:gap-2">
            {weekDays.map((day) => {
              const isPast = isBefore(day, new Date()) && !isToday(day);
              const isSelected = selectedCalendarDate && isSameDay(day, selectedCalendarDate);
              const isCurrentDay = isToday(day);
              // Use employee hours if employee selected, otherwise shop hours
              const isDayAvailable = hasEmployeeSelected ? isEmployeeWorkingOnDay(day) : isShopOpenOnDay(day);
              const workingHours = getWorkingHoursForDay(day);
              
              return (
                <Button
                  key={day.toISOString()}
                  type="button"
                  variant={isSelected ? "default" : "outline"}
                  disabled={isPast || !isDayAvailable}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleDateSelect(day);
                  }}
                  className={`h-16 sm:h-20 flex flex-col justify-center relative text-xs sm:text-sm ${
                    isSelected 
                      ? "whiskey-gradient text-black" 
                      : isCurrentDay
                        ? "border-whiskey text-whiskey bg-whiskey/10"
                        : isPast || !isDayAvailable
                          ? "opacity-50 cursor-not-allowed border-gray-600 text-gray-500"
                          : "border-steel text-gray-300 hover:border-whiskey hover:text-whiskey"
                  }`}
                >
                  <span className="text-xs font-medium">
                    {format(day, "EEE", { locale: dateLocale }).toUpperCase()}
                  </span>
                  <span className="text-sm sm:text-lg font-bold">
                    {format(day, "d")}
                  </span>
                  {!isDayAvailable && !isPast && (
                    <XCircle className="absolute top-1 right-1" size={10} />
                  )}
                  {isDayAvailable && (() => {
                    const ranges = getWorkingHoursRangesForDay(day);
                    if (ranges && ranges.length > 0) {
                      // Show all ranges properly
                      if (ranges.length === 1) {
                        // Single range: show start-end
                        return (
                          <span className="text-xs mt-1 opacity-75 hidden sm:block">
                            {ranges[0].start}-{ranges[0].end}
                          </span>
                        );
                      } else {
                        // Multiple ranges: show first start and last end, or all ranges
                        const firstStart = ranges[0].start;
                        const lastEnd = ranges[ranges.length - 1].end;
                        const fullText = ranges.map(r => `${r.start}-${r.end}`).join(', ');
                        return (
                          <span className="text-xs mt-1 opacity-75 hidden sm:block" title={fullText}>
                            {firstStart}-{lastEnd}
                          </span>
                        );
                      }
                    }
                    return null;
                  })()}
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Time Slots */}
      {selectedCalendarDate && (
        <Card className="metal-gradient border-steel">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="font-oswald text-base sm:text-lg text-whiskey flex items-center">
              <Clock className="mr-2" size={16} />
              <span className="hidden sm:inline">{text.availableHours} - {format(selectedCalendarDate, isEnglish ? "MMMM d, yyyy" : "d MMMM yyyy", { locale: dateLocale })}</span>
              <span className="sm:hidden">{text.availableHours} - {format(selectedCalendarDate, "d/MM", { locale: dateLocale })}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            {!selectedCalendarDate ? (
              <div className="text-center py-8">
                <p className="text-gray-400">{text.pickDate}</p>
              </div>
            ) : isLoadingAvailability && hasEmployeeSelected ? (
              <div className="text-center py-8">
                <p className="text-gray-400">{text.loadingAvailability}</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 sm:gap-3">
                  {availableSlots.map((slot) => {
                    const isSelected = selectedTime === slot.time && selectedDate === format(selectedCalendarDate!, "yyyy-MM-dd");
                    
                    return (
                      <Button
                        key={slot.time}
                        type="button"
                        variant={isSelected ? "default" : "outline"}
                        disabled={!slot.available}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleTimeSelect(slot.time);
                        }}
                        className={`h-10 sm:h-12 font-semibold text-sm sm:text-base ${
                          isSelected
                            ? "whiskey-gradient text-black"
                            : slot.available
                              ? "border-steel text-gray-300 hover:border-whiskey hover:text-whiskey"
                              : "bg-red-600 hover:bg-red-600 border-red-600 text-black cursor-not-allowed opacity-100"
                        }`}
                      >
                        {slot.time}
                      </Button>
                    );
                  })}
                </div>
                
                {availableSlots.length === 0 ? (
                  <div className="text-center py-8 col-span-full">
                    {availabilityError ? (
                      <>
                        <XCircle className="mx-auto mb-2 text-red-500" size={24} />
                        <p className="text-red-400">{text.availabilityError}</p>
                        <p className="text-gray-500 text-sm mt-1">{text.tryAgain}</p>
                      </>
                    ) : hasEmployeeSelected ? (
                      <>
                        <User className="mx-auto mb-2 text-gray-500" size={24} />
                        <p className="text-gray-400">{text.barberUnavailableDate}</p>
                        {safeEmployees.length > 1 && (
                          <div className="mt-3 p-3 bg-whiskey/10 rounded border border-whiskey/30">
                            <p className="text-whiskey text-sm font-medium mb-1">{text.suggestedAlternatives}</p>
                            <p className="text-gray-300 text-sm">
                              {text.suggestedAlternativesHint}
                            </p>
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        <XCircle className="mx-auto mb-2 text-gray-500" size={24} />
                        <p className="text-gray-400">{text.storeClosed}</p>
                        <p className="text-gray-500 text-sm mt-1">{text.chooseWorkingDay}</p>
                      </>
                    )}
                  </div>
                ) : availableSlots.filter(slot => slot.available).length === 0 ? (
                  <div className="text-center py-8 col-span-full">
                    <User className="mx-auto mb-2 text-gray-500" size={24} />
                    {hasEmployeeSelected ? (
                      <>
                        <p className="text-gray-400">{text.noAvailableTimesForBarber}</p>
                        {employees.length > 1 && (
                          <div className="mt-3 p-3 bg-whiskey/10 rounded border border-whiskey/30">
                            <p className="text-whiskey text-sm font-medium mb-1">{text.suggestedAlternatives}</p>
                            <p className="text-gray-300 text-sm">
                              {text.suggestedAlternativesHint}
                            </p>
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        <p className="text-gray-400">{text.noAvailableTimes}</p>
                        <p className="text-gray-500 text-sm mt-1">{text.fullyBooked}</p>
                      </>
                    )}
                  </div>
                ) : null}
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}