import { useState, useEffect, useMemo, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Calendar, Clock, User, Scissors, X, ChevronLeft, ChevronRight, Trash2, MailX } from "lucide-react";
import { format, addDays, subDays } from "date-fns";
import { el } from "date-fns/locale";
import type { Appointment } from "@shared/schema";
import { brandLogo, brandLogoAlt } from "@/lib/branding";
import {
  ScheduleComponent,
  Day,
  Inject,
  ViewsDirective,
  ViewDirective,
  ResourcesDirective,
  ResourceDirective,
  type PopupOpenEventArgs,
} from "@syncfusion/ej2-react-schedule";
import "@/scheduler-tv-overrides.css";

interface WorkingHoursRange {
  start: string;
  end: string;
}

function normalizeWorkingHours(hours: any): Array<WorkingHoursRange> | null {
  if (!hours || hours === "closed" || (typeof hours === "object" && hours.start === "closed")) {
    return null;
  }
  if (Array.isArray(hours)) {
    const validRanges = hours.filter((r: any) => r && r.start && r.end);
    if (validRanges.length > 0) return validRanges;
    return null;
  }
  if (typeof hours === "object" && hours.start && hours.end) {
    return [hours];
  }
  return null;
}

/** Get start/end hour and closed periods from shop working hours for a date */
function getDayHours(workingHours: any, date: Date): {
  startHour: number;
  endHour: number;
  startTime: string;
  endTime: string;
  closedPeriods: Array<{ start: string; end: string }>;
} | null {
  if (!workingHours || typeof workingHours !== "object") return null;
  const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"] as const;
  const dayName = dayNames[date.getDay()];
  const dayConfig = workingHours[dayName];
  const ranges = normalizeWorkingHours(dayConfig);
  if (!ranges || ranges.length === 0) return null;
  // Syncfusion requires "HH:mm" string format for startHour/endHour/workHours
  const toHHmm = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    return `${String(h).padStart(2, "0")}:${String(m || 0).padStart(2, "0")}`;
  };
  const startTime = toHHmm(ranges[0].start);
  const endTime = toHHmm(ranges[ranges.length - 1].end);
  const [startH] = startTime.split(":").map(Number);
  const [endH, endM] = endTime.split(":").map(Number);
  const endHour = endM > 0 ? endH + 1 : endH;
  // Find closed periods (gaps between ranges) for split schedules e.g. 09-12, 14-18
  const closedPeriods: Array<{ start: string; end: string }> = [];
  for (let i = 0; i < ranges.length - 1; i++) {
    closedPeriods.push({ start: ranges[i].end, end: ranges[i + 1].start });
  }
  return {
    startHour: startH,
    endHour: Math.min(24, endHour),
    startTime,
    endTime,
    closedPeriods,
  };
}

export default function TVDisplay() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const today = new Date();
  const todayStr = format(today, "yyyy-MM-dd");
  
  // Date navigation state
  const [selectedDate, setSelectedDate] = useState<Date>(today);
  const selectedDateStr = format(selectedDate, "yyyy-MM-dd");
  
  // Booking dialog state
  const [isBookingDialogOpen, setIsBookingDialogOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<{ employeeId: string; employeeName: string; time: string } | null>(null);
  const [clientType, setClientType] = useState<"registered" | "new">("registered");
  const [searchClient, setSearchClient] = useState("");
  
  // Date navigation functions
  const goToPreviousDay = () => {
    setSelectedDate(prev => subDays(prev, 1));
  };
  
  const goToNextDay = () => {
    setSelectedDate(prev => addDays(prev, 1));
  };
  
  const goToToday = () => {
    setSelectedDate(today);
  };
  
  const [bookingForm, setBookingForm] = useState({
    userId: "",
    employeeId: "",
    service: "",
    date: selectedDateStr,
    time: "",
    notes: "",
    status: "confirmed" as "pending" | "confirmed",
    clientFirstName: "",
    clientLastName: "",
    clientEmail: "",
    clientPhone: "",
  });
  
  // Appointment action dialog (cancel with email / delete)
  const [appointmentActionTarget, setAppointmentActionTarget] = useState<Appointment | null>(null);

  // Update booking form date when selectedDate changes
  useEffect(() => {
    setBookingForm(prev => ({ ...prev, date: selectedDateStr }));
  }, [selectedDateStr]);
  
  const { data: todayAppointments = [], isLoading } = useQuery<Appointment[]>({
    queryKey: ["/api/appointments/date", selectedDateStr],
    queryFn: async () => {
      const response = await fetch(`/api/appointments/date/${selectedDateStr}`);
      if (!response.ok) throw new Error("Failed to fetch appointments");
      return response.json();
    },
    refetchInterval: 60000, // Refresh every minute
    refetchOnWindowFocus: true, // Refetch when window regains focus
    refetchOnMount: true, // Refetch when component mounts
  });

  // Fetch employees
  const { data: employees = [], error: employeesError, isLoading: isLoadingEmployees } = useQuery({
    queryKey: ["/api/employees"],
    queryFn: async () => {
      const response = await fetch("/api/employees");
      if (!response.ok) throw new Error("Failed to fetch employees");
      const data = await response.json();
      console.log("👥 TV Display - Fetched employees:", data.length, "employees");
      data.forEach((emp: any) => {
        console.log(`  - ${emp.name}: has workingHours=${!!emp.workingHours}, isActive=${emp.isActive}`);
        if (emp.workingHours) {
          try {
            const parsed = typeof emp.workingHours === 'string' ? JSON.parse(emp.workingHours) : emp.workingHours;
            console.log(`    Working hours:`, Object.keys(parsed || {}));
          } catch (e) {
            console.warn(`    Failed to parse workingHours:`, e);
          }
        }
      });
      return data;
    },
  });

  // Fetch shop working hours
  const { data: workingHours = {}, error: workingHoursError, isLoading: isLoadingWorkingHours } = useQuery({
    queryKey: ["/api/admin/working-hours"],
    queryFn: async () => {
      const response = await fetch("/api/admin/working-hours");
      if (!response.ok) throw new Error("Failed to fetch working hours");
      const data = await response.json();
      console.log("📅 TV Display - Fetched shop working hours:", data);
      return data;
    },
  });

  // Fetch services for display (service names)
  const { data: allServices = [] } = useQuery({
    queryKey: ["/api/services"],
    queryFn: async () => {
      const response = await fetch("/api/services");
      if (!response.ok) throw new Error("Failed to fetch services");
      return response.json();
    },
  });

  // Fetch users to get client names (for display)
  const { data: users = [] } = useQuery({
    queryKey: ["/api/admin/users"],
    queryFn: async () => {
      const response = await fetch("/api/admin/users?page=1&limit=1000");
      if (!response.ok) return [];
      const data = await response.json();
      return data.users || [];
    },
  });

  // Check for critical errors and loading states (must be after query declarations)
  const hasError = workingHoursError || employeesError;
  const isLoadingCritical = isLoading || isLoadingEmployees || isLoadingWorkingHours;
  
  const activeEmployees = Array.isArray(employees) ? employees.filter((emp: any) => emp.isActive) : [];

  // Ensure todayAppointments is an array - must be before scheduleEvents
  const safeAppointments = Array.isArray(todayAppointments) ? todayAppointments : [];

  const now = new Date();
  const currentTime = format(now, "HH:mm");
  const isToday = format(selectedDate, "yyyy-MM-dd") === todayStr;
  const selectedDateOnly = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
  const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const isPastDate = selectedDateOnly < todayOnly;
  const isFutureDate = selectedDateOnly > todayOnly;

  // Syncfusion resource data (employees)
  const employeeResources = useMemo(
    () =>
      activeEmployees.map((emp: any) => ({
        id: emp.id,
        text: emp.name,
        OwnerColor: "#D4A574", // whiskey
        avatar: emp.avatar,
      })),
    [activeEmployees]
  );

  // Convert appointments to Syncfusion event format
  const scheduleEvents = useMemo(() => {
    return safeAppointments
      .filter((apt) => apt.status !== "cancelled")
      .map((apt) => {
        const [h, m] = (apt.time || "00:00").split(":").map(Number);
        const start = new Date(selectedDate);
        start.setHours(h, m, 0, 0);
        const end = new Date(start.getTime() + (apt.duration || 30) * 60000);
        const serviceName =
          allServices.find((s: any) => s?.id === apt.service)?.name || apt.service;
        const clientName = (apt as any).clientFirstName || (apt as any).clientLastName
          ? `${(apt as any).clientFirstName || ""} ${(apt as any).clientLastName || ""}`.trim()
          : users.find((u: any) => u.id === apt.userId)
            ? `${users.find((u: any) => u.id === apt.userId)?.firstName || ""} ${users.find((u: any) => u.id === apt.userId)?.lastName || ""}`.trim()
            : "Άγνωστος Πελάτης";
        const isGoogle = (apt as any).isGoogleCalendarEvent || apt.googleEventId;
        const isCompleted = apt.status === "completed" || (isToday && apt.time && apt.time < currentTime);
        return {
          Id: apt.id,
          Subject: `${serviceName} • ${clientName}`,
          StartTime: start,
          EndTime: end,
          EmployeeId: apt.employeeId || apt.barber,
          IsAllDay: false,
          barberbookAppointment: apt,
          barberbookCompleted: isCompleted,
          barberbookGoogle: !!isGoogle,
        };
      });
  }, [safeAppointments, selectedDate, allServices, users, isToday, currentTime]);

  const dayHours = useMemo(
    () => getDayHours(workingHours, selectedDate),
    [workingHours, selectedDate]
  );

  // Closed-period block events (Διάλειμμα) for split schedules - one per employee per gap
  const closedBlockEvents = useMemo(() => {
    if (!dayHours?.closedPeriods?.length || activeEmployees.length === 0) return [];
    const blocks: any[] = [];
    dayHours.closedPeriods.forEach((gap) => {
      const [sh, sm] = gap.start.split(":").map(Number);
      const [eh, em] = gap.end.split(":").map(Number);
      activeEmployees.forEach((emp: any) => {
        const start = new Date(selectedDate);
        start.setHours(sh, sm, 0, 0);
        const end = new Date(selectedDate);
        end.setHours(eh, em, 0, 0);
        blocks.push({
          Id: `closed-${emp.id}-${gap.start}-${gap.end}`,
          Subject: "Διάλειμμα",
          StartTime: start,
          EndTime: end,
          EmployeeId: emp.id,
          IsAllDay: false,
          barberbookClosed: true,
          CssClass: "barberbook-closed",
        });
      });
    });
    return blocks;
  }, [dayHours, activeEmployees, selectedDate]);

  const scheduleRef = useRef<ScheduleComponent>(null);

  const confirmedAppointments = safeAppointments.filter(apt => apt.status === "confirmed");
  
  // Completed appointments = status "completed" OR confirmed appointments that have passed (time + duration)
  // Only calculate for today, for other dates all past appointments are considered completed
  const completedAppointments = safeAppointments.filter(apt => {
    if (apt.status === "completed") return true;
    if (isToday && apt.status === "confirmed" && apt.time) {
      try {
        const appointmentTime = apt.time;
        const duration = apt.duration || 30;
        const [hours, minutes] = appointmentTime.split(':').map(Number);
        const appointmentEnd = new Date();
        appointmentEnd.setHours(hours, minutes + duration, 0, 0);
        return appointmentEnd < now;
      } catch (e) {
        return false;
      }
    }
    // For past dates, all confirmed appointments are considered completed
    if (!isToday && selectedDate < today) {
      return apt.status === "confirmed";
    }
    return false;
  });
  
  // Upcoming appointments = confirmed appointments that haven't happened yet
  // Only relevant for today or future dates
  const upcomingAppointments = confirmedAppointments.filter(apt => {
    if (!apt.time) return false;
    if (isToday) {
      return apt.time > currentTime;
    }
    // For future dates, all appointments are upcoming
    if (isFutureDate) {
      return true;
    }
    return false;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed":
        return "bg-whiskey text-black";
      case "completed":
        return "bg-green-600 text-white";
      case "cancelled":
        return "bg-red-600 text-white";
      default:
        return "bg-gray-600 text-white";
    }
  };

  const getEmployeeName = (appointment: Appointment) => {
    if (appointment.barber && appointment.barber.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      const employee = employees.find((emp: any) => emp.id === appointment.barber);
      return employee?.name || appointment.barber;
    }
    return appointment.barber || "Αυτόματη Ανάθεση";
  };

  const getServiceName = (appointment: Appointment) => {
    if (!appointment.service) return "Unknown Service";
    if (appointment.service.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      // Ensure allServices is available and is an array
      const servicesList = Array.isArray(allServices) ? allServices : [];
      const service = servicesList.find((svc: any) => svc && svc.id === appointment.service);
      return service?.name || appointment.service;
    }
    return appointment.service;
  };

  const getClientName = (appointment: Appointment) => {
    // Prefer client name from API (enriched from users table)
    const firstName = (appointment as any).clientFirstName;
    const lastName = (appointment as any).clientLastName;
    if (firstName || lastName) {
      return `${firstName || ''} ${lastName || ''}`.trim() || 'Άγνωστος Πελάτης';
    }
    // Fallback: lookup from users (for backward compatibility)
    if (appointment.userId) {
      const user = users.find((u: any) => u.id === appointment.userId);
      if (user) {
        return `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email || 'Άγνωστος Πελάτης';
      }
    }
    return 'Άγνωστος Πελάτης';
  };

  const getAppointmentsForEmployee = (employeeId: string | null) => {
    return safeAppointments.filter(apt => {
      if (!employeeId) return !apt.employeeId || apt.employeeId === "";
      return apt.employeeId === employeeId || apt.barber === employeeId;
    });
  };

  // Fetch services for booking
  const { data: bookingServicesData = [] } = useQuery({
    queryKey: ["/api/services"],
    queryFn: async () => {
      const response = await fetch("/api/services");
      if (!response.ok) throw new Error("Failed to fetch services");
      return response.json();
    },
  });

  // Fetch users for registered client selection
  const { data: usersData = [] } = useQuery({
    queryKey: ["/api/admin/users", searchClient],
    queryFn: async () => {
      const response = await fetch(
        `/api/admin/users?page=1&limit=100&search=${searchClient}`,
        { credentials: "include" }
      );
      if (!response.ok) return [];
      const data = await response.json();
      return data.users || [];
    },
    enabled: isBookingDialogOpen && clientType === "registered",
  });

  const bookingServices = Array.isArray(bookingServicesData) ? bookingServicesData.filter((s: any) => s.isActive) : [];

  // Create appointment mutation
  const createAppointmentMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch("/api/admin/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to create appointment");
      }
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Επιτυχία!",
        description: data.message || "Το ραντεβού δημιουργήθηκε επιτυχώς.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/appointments/date", selectedDateStr] });
      queryClient.invalidateQueries({ queryKey: ["/api/appointments/all"] });
      setIsBookingDialogOpen(false);
      setSelectedSlot(null);
      setBookingForm({
        userId: "",
        employeeId: "",
        service: "",
        date: selectedDateStr,
        time: "",
        notes: "",
        status: "confirmed",
        clientFirstName: "",
        clientLastName: "",
        clientEmail: "",
        clientPhone: "",
      });
      setSearchClient("");
    },
    onError: (error: any) => {
      toast({
        title: "Σφάλμα",
        description: error.message || "Αποτυχία δημιουργίας ραντεβού.",
        variant: "destructive",
      });
    },
  });

  // Cancel (notify client by email) or delete appointment; both update Google Calendar via API
  const cancelAppointmentMutation = useMutation({
    mutationFn: async ({ id, notify }: { id: string; notify: boolean }) => {
      // CRITICAL: Validate appointment ID - Google Calendar events have different ID format
      if (!id || id.startsWith('google-')) {
        throw new Error("Δεν μπορεί να ακυρωθεί αυτό το ραντεβού (Google Calendar event)");
      }
      
      const url = notify ? `/api/appointments/${id}?notify=1` : `/api/appointments/${id}`;
      console.log(`🗑️ Deleting appointment ${id}, notify: ${notify}`);
      const response = await fetch(url, { method: "DELETE", credentials: "include" });
      
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        const errorMessage = err.message || `HTTP ${response.status}: Αποτυχία ακύρωσης`;
        console.error(`❌ Failed to delete appointment ${id}:`, errorMessage);
        throw new Error(errorMessage);
      }
      
      const result = await response.json();
      console.log(`✅ Successfully deleted appointment ${id}`);
      return result;
    },
    onSuccess: (_, { notify }) => {
      toast({
        title: "Επιτυχία",
        description: notify ? "Η ακύρωση αποστάλθηκε και ο πελάτης ενημερώθηκε με email." : "Το ραντεβού ακυρώθηκε.",
      });
      setAppointmentActionTarget(null);
      queryClient.invalidateQueries({ queryKey: ["/api/appointments/date", selectedDateStr] });
      queryClient.invalidateQueries({ queryKey: ["/api/appointments/all"] });
    },
    onError: (error: any) => {
      console.error("❌ Appointment deletion error:", error);
      toast({ 
        title: "Σφάλμα", 
        description: error.message || "Αποτυχία ακύρωσης", 
        variant: "destructive" 
      });
      // Don't clear the dialog on error - let user try again
    },
  });

  const handleCellClick = (args: any) => {
    args.cancel = true;
    const startTime = args.startTime as Date;
    const timeStr = format(startTime, "HH:mm");
    if (dayHours?.closedPeriods?.some((g) => timeStr >= g.start && timeStr < g.end)) {
      toast({ title: "Σφάλμα", description: "Κλειστό κατά τη διάρκεια του διαλείμματος.", variant: "destructive" });
      return;
    }
    const groupIndex = args.groupIndex ?? 0;
    const employee = activeEmployees[groupIndex];
    if (!employee) return;
    const employeeAppointments = getAppointmentsForEmployee(employee.id);
    const isBooked = employeeAppointments.some(
      (apt) => apt.time === timeStr && apt.status !== "cancelled"
    );
    if (isBooked) {
      toast({
        title: "Σφάλμα",
        description: "Αυτή η ώρα είναι ήδη κρατημένη.",
        variant: "destructive",
      });
      return;
    }
    setSelectedSlot({ employeeId: employee.id, employeeName: employee.name, time: timeStr });
    setBookingForm({
      ...bookingForm,
      employeeId: employee.id,
      date: selectedDateStr,
      time: timeStr,
    });
    setIsBookingDialogOpen(true);
  };

  const handleEventClick = (args: any) => {
    args.cancel = true;
    const ev = args.event as { barberbookAppointment?: Appointment; barberbookClosed?: boolean };
    if (ev?.barberbookClosed) return; // Closed period block - no action
    if (ev?.barberbookAppointment) {
      // CRITICAL: Store a fresh copy of the appointment with validated ID
      const appointment = ev.barberbookAppointment;
      
      // Validate appointment ID - Google Calendar events can't be deleted this way
      if (!appointment.id || appointment.id.startsWith('google-')) {
        toast({
          title: "Σφάλμα",
          description: "Δεν μπορεί να ακυρωθεί αυτό το ραντεβού (Google Calendar event)",
          variant: "destructive"
        });
        return;
      }
      
      // Find the appointment in the current list to ensure it's still valid
      const currentAppointment = safeAppointments.find(apt => apt.id === appointment.id);
      if (!currentAppointment) {
        toast({
          title: "Σφάλμα",
          description: "Το ραντεβού δεν βρέθηκε. Παρακαλώ ανανεώστε τη σελίδα.",
          variant: "destructive"
        });
        return;
      }
      
      console.log(`📅 Opening appointment action dialog for: ${currentAppointment.id} (${currentAppointment.time})`);
      setAppointmentActionTarget(currentAppointment);
    }
  };

  const handlePopupOpen = (args: PopupOpenEventArgs) => {
    args.cancel = true;
  };

  const handleBookingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate based on client type
    if (clientType === "registered") {
      if (!bookingForm.userId || !bookingForm.service) {
        toast({
          title: "Σφάλμα",
          description: "Παρακαλώ επιλέξτε πελάτη και υπηρεσία.",
          variant: "destructive",
        });
        return;
      }
    } else {
      if (!bookingForm.clientFirstName || !bookingForm.service) {
        toast({
          title: "Σφάλμα",
          description: "Παρακαλώ συμπληρώστε όνομα και υπηρεσία.",
          variant: "destructive",
        });
        return;
      }
    }

    const selectedService = bookingServices.find((s: any) => s.id === bookingForm.service);
    const appointmentData: any = {
      employeeId: bookingForm.employeeId,
      service: bookingForm.service,
      barber: selectedSlot?.employeeName || "",
      date: bookingForm.date,
      time: bookingForm.time,
      notes: bookingForm.notes,
      duration: selectedService?.duration || 30,
      status: bookingForm.status,
    };

    // Add client info based on type
    if (clientType === "registered") {
      appointmentData.userId = bookingForm.userId;
    } else {
      appointmentData.clientFirstName = bookingForm.clientFirstName;
      appointmentData.clientLastName = bookingForm.clientLastName;
      appointmentData.clientEmail = bookingForm.clientEmail;
      appointmentData.clientPhone = bookingForm.clientPhone;
    }

    createAppointmentMutation.mutate(appointmentData);
  };

  if (isLoadingCritical) {
    return (
      <div className="h-screen bg-leather flex items-center justify-center">
        <div className="text-center">
          <div className="w-24 h-24 mx-auto mb-4">
            <img 
              src={brandLogo}
              alt={brandLogoAlt}
              className="w-full h-full object-contain rounded-full animate-pulse"
            />
          </div>
          <p className="text-whiskey text-xl font-oswald">Φόρτωση...</p>
        </div>
      </div>
    );
  }

  if (hasError) {
    return (
      <div className="h-screen bg-leather flex items-center justify-center">
        <div className="text-center p-8 bg-charcoal/50 rounded-lg border border-red-500">
          <p className="text-red-400 text-xl mb-2">Σφάλμα φόρτωσης</p>
          <p className="text-gray-400 text-sm">
            {workingHoursError?.message || employeesError?.message || "Αποτυχία φόρτωσης δεδομένων"}
          </p>
        </div>
      </div>
    );
  }

  // Safety check - ensure we have valid data before rendering
  if (!workingHours || Object.keys(workingHours).length === 0) {
    return (
      <div className="h-screen bg-leather flex items-center justify-center">
        <div className="text-center p-8 bg-charcoal/50 rounded-lg border border-yellow-500">
          <p className="text-yellow-400 text-xl mb-2">Παρακαλώ ρυθμίστε τις ώρες λειτουργίας</p>
          <p className="text-gray-400 text-sm">Δεν υπάρχουν ώρες λειτουργίας ρυθμισμένες</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-charcoal flex flex-col overflow-hidden text-white">
      {/* Compact Header with Stats and Date Navigation */}
      <div className="flex items-center justify-between px-6 py-2 bg-charcoal/50 border-b border-steel">
        {/* Statistics */}
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-2">
            <Calendar className="text-whiskey" size={18} />
            <span className="text-whiskey font-bold text-base">{safeAppointments.filter(apt => apt.status !== 'cancelled').length}</span>
            <span className="text-gray-400 text-xs">ΣΥΝΟΛΙΚΑ</span>
          </div>
          <div className="flex items-center space-x-2">
            <Clock className="text-green-400" size={18} />
            <span className="text-green-400 font-bold text-base">{completedAppointments.length}</span>
            <span className="text-gray-400 text-xs">ΟΛΟΚΛΗΡΩΜΕΝΑ</span>
          </div>
          <div className="flex items-center space-x-2">
            <Scissors className="text-blue-400" size={18} />
            <span className="text-blue-400 font-bold text-base">{upcomingAppointments.length}</span>
            <span className="text-gray-400 text-xs">ΕΠΟΜΕΝΑ</span>
          </div>
        </div>
        
        {/* Date Navigation */}
        <div className="flex items-center space-x-4">
          {/* Previous Day Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={goToPreviousDay}
            className="bg-slate border-steel text-white hover:bg-steel hover:text-whiskey"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          
          {/* Date Display */}
          <div className="text-center min-w-[200px]">
            <div className="text-whiskey text-lg font-oswald font-bold">
              {format(selectedDate, "EEEE", { locale: el }).toUpperCase()}
            </div>
            <div className="text-gray-300 text-sm">
              {format(selectedDate, "d MMMM yyyy", { locale: el })}
              {isToday && ` • ${format(now, "HH:mm")}`}
            </div>
            {!isToday && (
              <Button
                variant="ghost"
                size="sm"
                onClick={goToToday}
                className="text-xs text-whiskey hover:text-whiskey/80 mt-1 h-6"
              >
                Σήμερα
              </Button>
            )}
          </div>
          
          {/* Next Day Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={goToNextDay}
            className="bg-slate border-steel text-white hover:bg-steel hover:text-whiskey"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Syncfusion Scheduler */}
      <div className="flex-1 overflow-hidden px-6 py-4 min-h-0">
        {!dayHours ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <p className="text-gray-400 text-xl mb-2">Το κατάστημα είναι κλειστό σήμερα</p>
              <p className="text-gray-500 text-sm">Ημέρα ανάπαυσης</p>
            </div>
          </div>
        ) : activeEmployees.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <p className="text-gray-400">Δεν υπάρχουν ενεργοί υπάλληλοι</p>
          </div>
        ) : (
          <ScheduleComponent
            ref={scheduleRef}
            width="100%"
            height="100%"
            selectedDate={selectedDate}
            currentView="Day"
            startHour={dayHours.startTime}
            endHour={dayHours.endTime}
            workHours={{ start: dayHours.startTime, end: dayHours.endTime, highlight: false }}
            timeScale={{ enable: true, interval: 30, slotCount: 2 }}
            key={`schedule-${selectedDateStr}-${dayHours.startTime}-${dayHours.endTime}`}
            showHeaderBar={false}
            showQuickInfo={false}
            allowDragAndDrop={false}
            allowResizing={false}
            eventSettings={{
              dataSource: [...closedBlockEvents, ...scheduleEvents],
              fields: {
                id: "Id",
                subject: { name: "Subject" },
                startTime: { name: "StartTime" },
                endTime: { name: "EndTime" },
                cssClass: { name: "CssClass" },
              },
              allowFollowingEvents: false,
            }}
            group={{ resources: ["Employees"] }}
            cellClick={handleCellClick}
            eventClick={handleEventClick}
            popupOpen={handlePopupOpen}
            cssClass="barberbook-tv-scheduler"
          >
            <ViewsDirective>
              <ViewDirective
                option="Day"
                startHour={dayHours.startTime}
                endHour={dayHours.endTime}
                timeScale={{ enable: true, interval: 30, slotCount: 2 }}
              />
            </ViewsDirective>
            <ResourcesDirective>
              <ResourceDirective
                field="EmployeeId"
                title="Υπάλληλος"
                name="Employees"
                allowMultiple={false}
                dataSource={employeeResources}
                textField="text"
                idField="id"
                colorField="OwnerColor"
              />
            </ResourcesDirective>
            <Inject services={[Day]} />
          </ScheduleComponent>
        )}
      </div>

      {/* Booking Dialog */}
      <Dialog open={isBookingDialogOpen} onOpenChange={setIsBookingDialogOpen}>
        <DialogContent className="bg-charcoal border-steel text-white max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-whiskey text-xl">Κράτηση Ραντεβού</DialogTitle>
            <DialogDescription className="text-gray-400">
              {selectedSlot && (
                <div className="mt-2">
                  <p>Υπάλληλος: <span className="text-whiskey font-semibold">{selectedSlot.employeeName}</span></p>
                  <p>Ημερομηνία: <span className="text-whiskey font-semibold">{format(selectedDate, "d MMMM yyyy", { locale: el })}</span></p>
                  <p>Ώρα: <span className="text-whiskey font-semibold">{selectedSlot.time}</span></p>
                </div>
              )}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleBookingSubmit} className="space-y-4 mt-4">
            {/* Client Type Selection */}
            <div>
              <Label className="text-whiskey mb-2 block">Τύπος Πελάτη *</Label>
              <div className="flex gap-4">
                <Button
                  type="button"
                  variant={clientType === "registered" ? "default" : "outline"}
                  onClick={() => {
                    setClientType("registered");
                    setBookingForm({ ...bookingForm, userId: "", clientFirstName: "", clientLastName: "", clientEmail: "", clientPhone: "" });
                    setSearchClient("");
                  }}
                  className={clientType === "registered" ? "whiskey-gradient text-black" : "bg-slate border-steel text-white"}
                >
                  Εγγεγραμμένος Πελάτης
                </Button>
                <Button
                  type="button"
                  variant={clientType === "new" ? "default" : "outline"}
                  onClick={() => {
                    setClientType("new");
                    setBookingForm({ ...bookingForm, userId: "", clientFirstName: "", clientLastName: "", clientEmail: "", clientPhone: "" });
                    setSearchClient("");
                  }}
                  className={clientType === "new" ? "whiskey-gradient text-black" : "bg-slate border-steel text-white"}
                >
                  Νέος Πελάτης
                </Button>
              </div>
            </div>

            {/* Registered Client Selection */}
            {clientType === "registered" && (
              <div>
                <Label htmlFor="client-search" className="text-whiskey">Επιλογή Πελάτη *</Label>
                <div className="mt-2 space-y-2">
                  <Input
                    id="client-search"
                    placeholder="Αναζήτηση με όνομα, email ή τηλέφωνο..."
                    value={searchClient}
                    onChange={(e) => setSearchClient(e.target.value)}
                    className="bg-slate border-steel text-white"
                  />
                  {usersData && usersData.length > 0 ? (
                    <div className="max-h-40 overflow-y-auto border border-steel rounded p-2 space-y-1">
                      {usersData.map((user: any) => (
                        <div
                          key={user.id}
                          onClick={() => {
                            setBookingForm({ ...bookingForm, userId: user.id });
                            setSearchClient(`${user.firstName} ${user.lastName} (${user.email})`);
                          }}
                          className={`p-2 rounded cursor-pointer hover:bg-steel/50 ${
                            bookingForm.userId === user.id ? "bg-whiskey/20 border border-whiskey" : ""
                          }`}
                        >
                          <p className="text-white font-medium">{user.firstName} {user.lastName}</p>
                          <p className="text-gray-400 text-xs">{user.email} {user.phone ? `• ${user.phone}` : ""}</p>
                        </div>
                      ))}
                    </div>
                  ) : searchClient ? (
                    <p className="text-gray-400 text-sm">Δεν βρέθηκαν χρήστες</p>
                  ) : null}
                </div>
              </div>
            )}

            {/* New Client Information */}
            {clientType === "new" && (
              <div className="space-y-4 p-4 bg-slate/20 border border-steel rounded">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="clientFirstName" className="text-whiskey">Όνομα *</Label>
                    <Input
                      id="clientFirstName"
                      value={bookingForm.clientFirstName}
                      onChange={(e) => setBookingForm({ ...bookingForm, clientFirstName: e.target.value })}
                      className="bg-slate border-steel text-white"
                      placeholder="Όνομα πελάτη"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="clientLastName" className="text-whiskey">Επώνυμο</Label>
                    <Input
                      id="clientLastName"
                      value={bookingForm.clientLastName}
                      onChange={(e) => setBookingForm({ ...bookingForm, clientLastName: e.target.value })}
                      className="bg-slate border-steel text-white"
                      placeholder="Επώνυμο πελάτη"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="clientEmail" className="text-whiskey">Email</Label>
                    <Input
                      id="clientEmail"
                      type="email"
                      value={bookingForm.clientEmail}
                      onChange={(e) => setBookingForm({ ...bookingForm, clientEmail: e.target.value })}
                      className="bg-slate border-steel text-white"
                      placeholder="email@example.com"
                    />
                  </div>
                  <div>
                    <Label htmlFor="clientPhone" className="text-whiskey">Τηλέφωνο</Label>
                    <Input
                      id="clientPhone"
                      type="tel"
                      value={bookingForm.clientPhone}
                      onChange={(e) => setBookingForm({ ...bookingForm, clientPhone: e.target.value })}
                      className="bg-slate border-steel text-white"
                      placeholder="+30 123 456 7890"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Service Selection */}
            <div>
              <Label htmlFor="service" className="text-whiskey">Υπηρεσία *</Label>
              {bookingServices.length === 0 ? (
                <div className="p-3 bg-yellow-900/20 border border-yellow-500 rounded">
                  <p className="text-yellow-400 text-sm">Δεν υπάρχουν διαθέσιμες υπηρεσίες.</p>
                </div>
              ) : (
                <Select
                  value={bookingForm.service || undefined}
                  onValueChange={(value) => setBookingForm({ ...bookingForm, service: value })}
                >
                  <SelectTrigger className="bg-slate border-steel text-white">
                    <SelectValue placeholder="Επιλέξτε υπηρεσία" />
                  </SelectTrigger>
                  <SelectContent className="bg-charcoal border-steel">
                    {bookingServices.map((service: any) => (
                      <SelectItem key={service.id} value={service.id} className="text-white focus:bg-steel">
                        {service.name} {service.description ? `- ${service.description}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Notes */}
            <div>
              <Label htmlFor="notes" className="text-whiskey">Σημειώσεις</Label>
              <Textarea
                id="notes"
                value={bookingForm.notes}
                onChange={(e) => setBookingForm({ ...bookingForm, notes: e.target.value })}
                className="bg-slate border-steel text-white"
                placeholder="Προαιρετικές σημειώσεις..."
                rows={3}
              />
            </div>

            {/* Submit Buttons */}
            <div className="flex gap-4 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsBookingDialogOpen(false);
                  setSelectedSlot(null);
                  setBookingForm({
                    userId: "",
                    employeeId: "",
                    service: "",
                    date: selectedDateStr,
                    time: "",
                    notes: "",
                    status: "confirmed",
                    clientFirstName: "",
                    clientLastName: "",
                    clientEmail: "",
                    clientPhone: "",
                  });
                  setSearchClient("");
                }}
                className="flex-1 bg-steel hover:bg-iron text-white border-steel"
              >
                <X className="w-4 h-4 mr-2" />
                Ακύρωση
              </Button>
              <Button
                type="submit"
                disabled={createAppointmentMutation.isPending}
                className="flex-1 whiskey-gradient hover:opacity-90 text-black font-semibold"
              >
                {createAppointmentMutation.isPending ? "Κράτηση..." : "Κράτηση Ραντεβού"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Appointment action dialog: Cancel (notify client) or Delete */}
      <Dialog open={!!appointmentActionTarget} onOpenChange={(open) => !open && setAppointmentActionTarget(null)}>
        <DialogContent className="bg-charcoal border-steel text-white max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-whiskey">Ραντεβού</DialogTitle>
            <DialogDescription className="text-gray-400">
              {appointmentActionTarget && (
                <>
                  <p>{appointmentActionTarget.time} • {getServiceName(appointmentActionTarget)}</p>
                  <p>{getClientName(appointmentActionTarget)}</p>
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2 pt-2">
            <Button
              variant="outline"
              className="w-full justify-start border-steel text-white hover:bg-steel"
              disabled={cancelAppointmentMutation.isPending || !appointmentActionTarget?.id || appointmentActionTarget.id.startsWith('google-')}
              onClick={() => {
                if (!appointmentActionTarget?.id) {
                  toast({ title: "Σφάλμα", description: "Μη έγκυρο ID ραντεβού", variant: "destructive" });
                  return;
                }
                // Re-validate appointment exists before deletion
                const currentAppointment = safeAppointments.find(apt => apt.id === appointmentActionTarget.id);
                if (!currentAppointment) {
                  toast({ 
                    title: "Σφάλμα", 
                    description: "Το ραντεβού δεν βρέθηκε. Παρακαλώ ανανεώστε τη σελίδα.", 
                    variant: "destructive" 
                  });
                  setAppointmentActionTarget(null);
                  return;
                }
                cancelAppointmentMutation.mutate({ id: currentAppointment.id, notify: true });
              }}
            >
              <MailX className="w-4 h-4 mr-2" />
              Ακύρωση (ειδοποίηση πελάτη με email)
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start border-red-500/50 text-red-400 hover:bg-red-500/20"
              disabled={cancelAppointmentMutation.isPending || !appointmentActionTarget?.id || appointmentActionTarget.id.startsWith('google-')}
              onClick={() => {
                if (!appointmentActionTarget?.id) {
                  toast({ title: "Σφάλμα", description: "Μη έγκυρο ID ραντεβού", variant: "destructive" });
                  return;
                }
                // Re-validate appointment exists before deletion
                const currentAppointment = safeAppointments.find(apt => apt.id === appointmentActionTarget.id);
                if (!currentAppointment) {
                  toast({ 
                    title: "Σφάλμα", 
                    description: "Το ραντεβού δεν βρέθηκε. Παρακαλώ ανανεώστε τη σελίδα.", 
                    variant: "destructive" 
                  });
                  setAppointmentActionTarget(null);
                  return;
                }
                cancelAppointmentMutation.mutate({ id: currentAppointment.id, notify: false });
              }}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Διαγραφή (χωρίς email)
            </Button>
            <Button
              variant="ghost"
              className="w-full text-gray-400"
              onClick={() => setAppointmentActionTarget(null)}
            >
              <X className="w-4 h-4 mr-2" />
              Ακύρωση
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
