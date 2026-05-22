import { useState, useEffect } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/auth-context";
import { api } from "@/services/api";
import { Link, useLocation } from "wouter";
import { Calendar } from "lucide-react";
import { AppointmentCalendar } from "@/components/AppointmentCalendar";
import type { InsertAppointment, Employee } from "@shared/schema";
import { useLanguage } from "@/context/language-context";
import LanguageSwitcher from "@/components/language-switcher";
import { getServiceDescription, getServiceLabel, getServiceName } from "@/lib/serviceLabels";

export default function Booking() {
  const { user } = useAuth();
  const isGuest = !user;
  const { toast } = useToast();
  const { isEnglish } = useLanguage();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const [guest, setGuest] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
  });

  const [booking, setBooking] = useState({
    service: "",
    employeeId: "",
    barber: "",
    date: "",
    time: "",
    notes: "",
    isRecurring: false,
    recurringPattern: "weekly" as "weekly" | "biweekly" | "monthly",
    recurringInterval: 1,
    recurringEndDate: "",
  });

  const [availableSlots, setAvailableSlots] = useState<{ start: string; end: string; available: boolean; }[]>([]);
  const [showCalendar, setShowCalendar] = useState(false);

  const text = {
    successTitle: isEnglish ? "Success!" : "Επιτυχία!",
    successDescription: isEnglish ? "Your appointment was booked successfully." : "Το ραντεβού σας κλείστηκε επιτυχώς.",
    errorTitle: isEnglish ? "Error" : "Σφάλμα",
    bookingError: isEnglish ? "Failed to book appointment. Please try again." : "Αποτυχία κλεισίματος ραντεβού. Παρακαλώ προσπαθήστε ξανά.",
    guestTitle: isEnglish ? "BOOK AS GUEST" : "ΚΛΕΙΣΕ ΩΣ ΕΠΙΣΚΕΠΤΗΣ",
    guestSubtitle: isEnglish
      ? "No account needed — email is optional"
      : "Χωρίς λογαριασμό — το email είναι προαιρετικό",
    firstName: isEnglish ? "FIRST NAME" : "ΟΝΟΜΑ",
    lastName: isEnglish ? "LAST NAME (optional)" : "ΕΠΩΝΥΜΟ (προαιρετικό)",
    emailOptional: isEnglish ? "EMAIL (optional)" : "EMAIL (προαιρετικό)",
    phoneOptional: isEnglish ? "PHONE (optional)" : "ΤΗΛΕΦΩΝΟ (προαιρετικό)",
    guestNameRequired: isEnglish ? "Please enter your first name." : "Παρακαλώ συμπληρώστε το όνομά σας.",
    guestSuccess: isEnglish
      ? "Your appointment is confirmed. See you soon!"
      : "Το ραντεβού σου επιβεβαιώθηκε. Σε περιμένουμε!",
    backHome: isEnglish ? "Back to home" : "Επιστροφή στην αρχική",
    signIn: isEnglish ? "Sign in" : "Σύνδεση",
    requiredFields: isEnglish ? "Please fill in all required fields." : "Παρακαλώ συμπληρώστε όλα τα απαιτούμενα πεδία.",
    employeeNotFound: isEnglish ? "The selected barber could not be found." : "Ο επιλεγμένος υπάλληλος δεν βρέθηκε.",
    noPreference: isEnglish ? "No preference" : "Χωρίς προτίμηση",
    availableBarber: isEnglish ? "Any available barber" : "Διαθέσιμος κομμωτής",
    title: isEnglish ? "BOOK YOUR APPOINTMENT" : "ΚΛΕΙΣΕ ΤΟ ΡΑΝΤΕΒΟΥ ΣΟΥ",
    subtitle: isEnglish ? "Choose your service and preferred time" : "Διάλεξε την υπηρεσία και την προτιμώμενη ώρα σου",
    details: isEnglish ? "APPOINTMENT DETAILS" : "ΣΤΟΙΧΕΙΑ ΡΑΝΤΕΒΟΥ",
    service: isEnglish ? "SERVICE" : "ΥΠΗΡΕΣΙΑ",
    servicePlaceholder: isEnglish ? "Choose a service" : "Διάλεξε υπηρεσία",
    barber: isEnglish ? "BARBER" : "ΚΟΜΜΩΤΗΣ",
    loadingBarbers: isEnglish ? "Loading barbers..." : "Φόρτωση κομμωτών...",
    employeePhotoTitle: isEnglish ? "Click for larger image" : "Κάντε κλικ για μεγαλύτερη εικόνα",
    selectedAppointment: isEnglish ? "SELECTED APPOINTMENT" : "ΕΠΙΛΕΓΜΕΝΟ ΡΑΝΤΕΒΟΥ",
    recurring: isEnglish ? "RECURRING APPOINTMENT" : "ΕΠΑΝΑΛΑΜΒΑΝΟΜΕΝΟ ΡΑΝΤΕΒΟΥ",
    frequency: isEnglish ? "Frequency" : "Συχνότητα",
    weekly: isEnglish ? "Every week" : "Κάθε Εβδομάδα",
    biweekly: isEnglish ? "Every 2 weeks" : "Κάθε 2 Εβδομάδες",
    monthly: isEnglish ? "Every month" : "Κάθε Μήνα",
    endDate: isEnglish ? "End date (optional)" : "Ημερομηνία Λήξης (Προαιρετικό)",
    recurringHint: isEnglish ? "Leave blank for unlimited recurrence" : "Αφήστε κενό για απεριόριστη επανάληψη",
    specialRequests: isEnglish ? "SPECIAL REQUESTS" : "ΕΙΔΙΚΕΣ ΑΙΤΗΣΕΙΣ",
    specialRequestsPlaceholder: isEnglish
      ? "Any special requests or preferences..."
      : "Οποιεσδήποτε ειδικές αιτήσεις ή προτιμήσεις...",
    cancel: isEnglish ? "CANCEL" : "ΑΚΥΡΩΣΗ",
    bookingInProgress: isEnglish ? "BOOKING..." : "ΚΛΕΙΣΙΜΟ...",
    bookAutoAssign: isEnglish ? "BOOK APPOINTMENT (Auto Assign)" : "ΚΛΕΙΣΕ ΡΑΝΤΕΒΟΥ (Αυτόματη Επιλογή)",
    bookAppointment: isEnglish ? "BOOK APPOINTMENT" : "ΚΛΕΙΣΕ ΡΑΝΤΕΒΟΥ",
    dateSelection: isEnglish ? "DATE SELECTION" : "ΕΠΙΛΟΓΗ ΗΜΕΡΟΜΗΝΙΑΣ",
    dateSelectionHint: isEnglish
      ? "Please choose a service to view the availability calendar"
      : "Παρακαλώ επιλέξτε υπηρεσία για να δείτε το ημερολόγιο διαθεσιμότητας",
    noPreferenceHint: isEnglish
      ? "No preference: pick a time — we assign the first available barber for that slot."
      : "Χωρίς προτίμηση: επιλέξτε ώρα — ανατίθεται ο πρώτος διαθέσιμος κομμωτής.",
    assignedBarber: isEnglish ? "Barber" : "Κομμωτής",
  };

  // Fetch employees
  const { data: employees = [], isLoading: isLoadingEmployees } = useQuery<Employee[]>({
    queryKey: ["/api/employees"],
    queryFn: async () => {
      const response = await fetch("/api/employees");
      if (!response.ok) throw new Error("Failed to fetch employees");
      return response.json();
    },
  });

  const createAppointmentMutation = useMutation({
    mutationFn: async (payload: InsertAppointment | Record<string, unknown>) => {
      if (isGuest) {
        return api.createGuestAppointment(payload as Parameters<typeof api.createGuestAppointment>[0]);
      }
      return api.createAppointment(payload as InsertAppointment);
    },
    onSuccess: (data: { appointment?: { barber?: string } }, variables) => {
      const barberName = data?.appointment?.barber;
      const withBarber =
        barberName && barberName !== text.noPreference
          ? ` (${text.assignedBarber}: ${barberName})`
          : "";
      toast({
        title: text.successTitle,
        description: isGuest
          ? `${text.guestSuccess}${withBarber}`
          : `${text.successDescription}${withBarber}`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/appointments/date"] });
      const dateKey =
        "date" in variables && variables.date
          ? variables.date
          : undefined;
      if (dateKey) {
        queryClient.invalidateQueries({ queryKey: ["/api/appointments/date", dateKey] });
      }
      const employeeKey =
        "employeeId" in variables && variables.employeeId
          ? variables.employeeId
          : undefined;
      if (employeeKey) {
        queryClient.invalidateQueries({
          queryKey: ["/api/employees", employeeKey, "availability"],
        });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/employees"] });
      setLocation(isGuest ? "/" : "/dashboard");
    },
    onError: (error: Error) => {
      toast({
        title: text.errorTitle,
        description: error.message || text.bookingError,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (isGuest && !guest.firstName.trim()) {
      toast({
        title: text.errorTitle,
        description: text.guestNameRequired,
        variant: "destructive",
      });
      return;
    }

    if (!booking.service || !booking.date || !booking.time) {
      toast({
        title: text.errorTitle,
        description: text.requiredFields,
        variant: "destructive",
      });
      return;
    }

    let barberName = booking.barber || text.noPreference;
    if (booking.employeeId) {
      const selectedEmployee = employees.find((emp) => emp.id === booking.employeeId);
      if (!selectedEmployee) {
        toast({
          title: text.errorTitle,
          description: text.employeeNotFound,
          variant: "destructive",
        });
        return;
      }
      barberName = selectedEmployee.name;
    }
    
    if (isGuest) {
      const selectedService = services.find((s) => s.value === booking.service);
      createAppointmentMutation.mutate({
        clientFirstName: guest.firstName.trim(),
        clientLastName: guest.lastName.trim(),
        clientEmail: guest.email.trim() || undefined,
        clientPhone: guest.phone.trim(),
        employeeId: booking.employeeId || "",
        service: booking.service,
        barber: barberName,
        date: booking.date,
        time: booking.time,
        notes: booking.notes,
        duration: selectedService?.duration,
      });
      return;
    }

    const appointmentData: InsertAppointment & {
      isRecurring?: boolean;
      recurringPattern?: string;
      recurringInterval?: number;
      recurringEndDate?: string;
    } = {
      userId: user!.id,
      employeeId: booking.employeeId || "",
      service: booking.service,
      barber: barberName,
      date: booking.date,
      time: booking.time,
      notes: booking.notes,
    };

    if (booking.isRecurring) {
      appointmentData.isRecurring = true;
      appointmentData.recurringPattern = booking.recurringPattern;
      appointmentData.recurringInterval = booking.recurringInterval;
      if (booking.recurringEndDate) {
        appointmentData.recurringEndDate = booking.recurringEndDate;
      }
    }

    createAppointmentMutation.mutate(appointmentData);
  };

  // Fetch services from API
  const { data: servicesData = [] } = useQuery<any[]>({
    queryKey: ["/api/services"],
  });

  const services = servicesData
    .filter((service) => service.isActive)
    .map((service) => ({
      value: service.id,
      label: getServiceLabel(service, isEnglish, { includeDescription: true }),
      name: getServiceName(service, isEnglish),
      description: getServiceDescription(service, isEnglish),
      duration: service.duration,
      raw: service,
    }));

  const selectedServiceDuration =
    services.find((s) => s.value === booking.service)?.duration || 30;

  // Show calendar when service is selected (employee is optional with "no preference")
  useEffect(() => {
    if (booking.service) {
      setShowCalendar(true);
    } else {
      setShowCalendar(false);
    }
  }, [booking.service]);

  // Fetch availability when employee and date are selected
  useEffect(() => {
    if (booking.employeeId && booking.date) {
      fetchAvailability();
    } else {
      setAvailableSlots([]);
    }
  }, [booking.employeeId, booking.date]);

  const fetchAvailability = async () => {
    try {
      const response = await fetch(`/api/employees/${booking.employeeId}/availability?date=${booking.date}&duration=30`);
      if (response.ok) {
        const slots = await response.json();
        setAvailableSlots(slots);
      }
    } catch (error) {
      console.error("Failed to fetch availability:", error);
      setAvailableSlots([]);
    }
  };

  const handleTimeSelect = (
    date: string,
    time: string,
    assignee?: { employeeId: string; employeeName: string },
  ) => {
    setBooking((prev) => {
      const next = { ...prev, date, time };
      if (assignee && (!prev.employeeId || prev.employeeId === "")) {
        next.employeeId = assignee.employeeId;
        next.barber = assignee.employeeName;
      }
      return next;
    });
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
      <div className="text-center mb-8 relative">
        {isGuest && (
          <div className="absolute right-0 top-0">
            <LanguageSwitcher />
          </div>
        )}
        <h2 className="font-oswald text-3xl font-bold text-whiskey mb-2">
          {isGuest ? text.guestTitle : text.title}
        </h2>
        <p className="text-gray-400">
          {isGuest ? text.guestSubtitle : text.subtitle}
        </p>
        {isGuest && (
          <>
            <p className="mt-2 text-sm text-whiskey/80">{text.noPreferenceHint}</p>
            <p className="mt-3 text-sm text-gray-500">
              {text.signIn}?{" "}
              <Link href="/login" className="text-whiskey hover:underline font-semibold">
                {text.signIn}
              </Link>
            </p>
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
        {/* Left Column - Service and Employee Selection */}
        <Card className="metal-gradient border-steel">
          <CardContent className="p-4 sm:p-8">
            <h3 className="font-oswald text-xl text-whiskey mb-6">{text.details}</h3>

            <form onSubmit={handleSubmit} className="space-y-6">
              {isGuest && (
                <div className="space-y-4 pb-4 border-b border-steel">
                  <div>
                    <Label htmlFor="guestFirstName" className="text-whiskey font-semibold mb-2 block">
                      {text.firstName} *
                    </Label>
                    <Input
                      id="guestFirstName"
                      value={guest.firstName}
                      onChange={(e) => setGuest({ ...guest, firstName: e.target.value })}
                      className="bg-charcoal border-steel text-white focus:border-whiskey"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="guestLastName" className="text-whiskey font-semibold mb-2 block">
                      {text.lastName}
                    </Label>
                    <Input
                      id="guestLastName"
                      value={guest.lastName}
                      onChange={(e) => setGuest({ ...guest, lastName: e.target.value })}
                      className="bg-charcoal border-steel text-white focus:border-whiskey"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="guestEmail" className="text-whiskey font-semibold mb-2 block">
                        {text.emailOptional}
                      </Label>
                      <Input
                        id="guestEmail"
                        type="email"
                        value={guest.email}
                        onChange={(e) => setGuest({ ...guest, email: e.target.value })}
                        className="bg-charcoal border-steel text-white focus:border-whiskey"
                      />
                    </div>
                    <div>
                      <Label htmlFor="guestPhone" className="text-whiskey font-semibold mb-2 block">
                        {text.phoneOptional}
                      </Label>
                      <Input
                        id="guestPhone"
                        type="tel"
                        value={guest.phone}
                        onChange={(e) => setGuest({ ...guest, phone: e.target.value })}
                        className="bg-charcoal border-steel text-white focus:border-whiskey"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Service Selection */}
              <div>
                <Label htmlFor="service" className="text-whiskey font-semibold mb-2 block">
                  {text.service}
                </Label>
                <Select value={booking.service} onValueChange={(value) => setBooking({ ...booking, service: value })}>
                  <SelectTrigger className="bg-charcoal border-steel text-white focus:border-whiskey">
                    <SelectValue placeholder={text.servicePlaceholder}>
                      {booking.service ? services.find(s => s.value === booking.service)?.name ?? "" : ""}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="bg-charcoal border-steel">
                    {services.map((service) => (
                      <SelectItem key={service.value} value={service.value} className="text-white focus:bg-steel focus:text-white py-3">
                        <div>
                          <div className="font-semibold">{service.name}</div>
                          {service.description && (
                            <div className="text-xs text-gray-400 mt-1 leading-relaxed">{service.description}</div>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Employee Selection */}
              <div>
                <Label className="text-whiskey font-semibold mb-2 block">{text.barber}</Label>
                <p className="text-xs text-whiskey/80 mb-3">{text.noPreferenceHint}</p>
                {isLoadingEmployees ? (
                  <div className="text-gray-400">{text.loadingBarbers}</div>
                ) : (
                  <div className="grid grid-cols-1 gap-2 sm:gap-3">
                    <label className="cursor-pointer">
                      <input
                        type="radio"
                        name="employee"
                        value=""
                        checked={booking.employeeId === ""}
                        onChange={() =>
                          setBooking({
                            ...booking,
                            employeeId: "",
                            barber: text.noPreference,
                            date: "",
                            time: "",
                          })
                        }
                        className="sr-only"
                      />
                      <div className={`bg-charcoal border-2 ${booking.employeeId === "" ? "border-whiskey bg-slate" : "border-steel"} rounded-lg p-3 sm:p-4 transition-all hover:border-whiskey/50`}>
                        <div className="flex items-center space-x-3 sm:space-x-4">
                          <div className="w-12 h-12 whiskey-gradient rounded-full flex items-center justify-center">
                            <span className="text-lg text-black">✨</span>
                          </div>
                          <div>
                            <h4 className="text-white font-semibold">{text.noPreference}</h4>
                            <p className="text-gray-400 text-sm">
                              {text.availableBarber}
                            </p>
                          </div>
                        </div>
                      </div>
                    </label>
                    
                    {employees.map((employee) => (
                      <label key={employee.id} className="cursor-pointer">
                        <input
                          type="radio"
                          name="employee"
                          value={employee.id}
                          checked={booking.employeeId === employee.id}
                          onChange={(e) =>
                            setBooking({
                              ...booking,
                              employeeId: e.target.value,
                              barber: employee.name,
                              date: "",
                              time: "",
                            })
                          }
                          className="sr-only"
                        />
                        <div className={`bg-charcoal border-2 ${booking.employeeId === employee.id ? "border-whiskey bg-slate" : "border-steel"} rounded-lg p-3 sm:p-4 transition-all hover:border-whiskey/50`}>
                          <div className="flex items-center space-x-3 sm:space-x-4">
                            <div 
                              className="w-12 h-12 rounded-full flex items-center justify-center overflow-hidden cursor-pointer hover:ring-2 hover:ring-whiskey/50 transition-all group relative"
                              style={{ aspectRatio: '1/1', width: '48px', height: '48px' }}
                              title={text.employeePhotoTitle}
                              onClick={() => {
                                if (employee.avatar) {
                                  // Create modal to show larger image
                                  const modal = document.createElement('div');
                                  modal.className = 'fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4';
                                  modal.innerHTML = `
                                    <div class="relative max-w-md w-full">
                                      <div class="w-full h-80 rounded-lg overflow-hidden shadow-2xl">
                                        <img 
                                          src="${employee.avatar}" 
                                          alt="${employee.name}" 
                                          class="w-full h-full object-cover object-center"
                                        />
                                      </div>
                                      <button 
                                        onclick="this.closest('.fixed').remove()"
                                        class="absolute top-4 right-4 bg-black/50 text-white rounded-full w-8 h-8 flex items-center justify-center hover:bg-black/70"
                                      >
                                        ×
                                      </button>
                                      <div class="absolute bottom-4 left-4 right-4 bg-black/50 text-white p-3 rounded-lg">
                                        <h3 class="font-semibold text-lg">${employee.name}</h3>
                                        <p class="text-sm opacity-90 mt-1">${Array.isArray(employee.specialties) ? employee.specialties.join(", ") : (typeof employee.specialties === 'string' ? JSON.parse(employee.specialties).join(", ") : "")}</p>
                                        ${employee.description ? `<p class="text-xs opacity-75 mt-2 italic">"${employee.description}"</p>` : ''}
                                      </div>
                                    </div>
                                  `;
                                  document.body.appendChild(modal);
                                  modal.addEventListener('click', (e) => {
                                    if (e.target === modal) modal.remove();
                                  });
                                }
                              }}
                            >
                              {employee.avatar ? (
                                <>
                                  <img 
                                    src={employee.avatar} 
                                    alt={employee.name}
                                    className="w-full h-full object-cover object-center"
                                    style={{ aspectRatio: '1/1', width: '100%', height: '100%' }}
                                  />
                                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all rounded-full flex items-center justify-center">
                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-whiskey/80 rounded-full p-1">
                                      <svg className="w-3 h-3 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                                      </svg>
                                    </div>
                                  </div>
                                </>
                              ) : (
                                <div className="w-full h-full whiskey-gradient rounded-full flex items-center justify-center">
                              <span className="text-lg text-black">👨</span>
                                </div>
                              )}
                            </div>
                            <div>
                              <h4 className="text-white font-semibold">{employee.name}</h4>
                              <p className="text-gray-400 text-sm">
                                {Array.isArray(employee.specialties) ? employee.specialties.join(", ") : (typeof employee.specialties === 'string' ? JSON.parse(employee.specialties).join(", ") : "")}
                              </p>
                            </div>
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* Selected Date and Time Display */}
              {booking.date && booking.time && (
                <div className="bg-steel/20 border border-whiskey/30 rounded-lg p-4">
                  <h4 className="text-whiskey font-semibold mb-2">{text.selectedAppointment}</h4>
                  <p className="text-white">📅 {booking.date}</p>
                  <p className="text-white">🕒 {booking.time}</p>
                  {booking.employeeId && booking.barber && booking.barber !== text.noPreference && (
                    <p className="text-white">
                      💇 {text.assignedBarber}: {booking.barber}
                    </p>
                  )}
                </div>
              )}

              {/* Recurring — registered users only */}
              {!isGuest && (
              <div className="border-t border-steel pt-4">
                <div className="flex items-center space-x-2 mb-4">
                  <input
                    type="checkbox"
                    id="isRecurring"
                    checked={booking.isRecurring}
                    onChange={(e) => setBooking({ ...booking, isRecurring: e.target.checked })}
                    className="rounded"
                  />
                  <Label htmlFor="isRecurring" className="text-whiskey font-semibold cursor-pointer">
                    {text.recurring}
                  </Label>
                </div>

                {booking.isRecurring && (
                  <div className="space-y-4 bg-slate/30 p-4 rounded-lg border border-steel">
                    <div>
                      <Label htmlFor="recurringPattern" className="text-white mb-2 block">
                        {text.frequency}
                      </Label>
                      <Select
                        value={booking.recurringPattern}
                        onValueChange={(value: "weekly" | "biweekly" | "monthly") =>
                          setBooking({ ...booking, recurringPattern: value })
                        }
                      >
                        <SelectTrigger className="bg-charcoal border-steel text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-charcoal border-steel">
                          <SelectItem value="weekly" className="text-white">
                            {text.weekly}
                          </SelectItem>
                          <SelectItem value="biweekly" className="text-white">
                            {text.biweekly}
                          </SelectItem>
                          <SelectItem value="monthly" className="text-white">
                            {text.monthly}
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="recurringEndDate" className="text-white mb-2 block">
                        {text.endDate}
                      </Label>
                      <Input
                        id="recurringEndDate"
                        type="date"
                        value={booking.recurringEndDate}
                        onChange={(e) => setBooking({ ...booking, recurringEndDate: e.target.value })}
                        className="bg-charcoal border-steel text-white"
                        min={booking.date}
                      />
                      <p className="text-xs text-gray-400 mt-1">
                        {text.recurringHint}
                      </p>
                    </div>
                  </div>
                )}
              </div>
              )}

              {/* Special Requests */}
              <div>
                <Label htmlFor="notes" className="text-whiskey font-semibold mb-2 block">
                  {text.specialRequests}
                </Label>
                <Textarea
                  id="notes"
                  value={booking.notes}
                  onChange={(e) => setBooking({ ...booking, notes: e.target.value })}
                  placeholder={text.specialRequestsPlaceholder}
                  rows={3}
                  className="bg-charcoal border-steel text-white placeholder-gray-500 focus:border-whiskey resize-none"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-4 sm:pt-6">
                <Link href={isGuest ? "/" : "/dashboard"} className="flex-1">
                  <Button 
                    type="button" 
                    variant="outline"
                    className="w-full bg-steel hover:bg-iron text-white border-steel"
                  >
                    {isGuest ? text.backHome : text.cancel}
                  </Button>
                </Link>
                <Button
                  type="submit"
                  disabled={
                    createAppointmentMutation.isPending ||
                    !booking.service ||
                    !booking.date ||
                    !booking.time ||
                    (isGuest && !guest.firstName.trim())
                  }
                  className="flex-1 whiskey-gradient hover:opacity-90 text-black font-semibold shine-effect disabled:opacity-50"
                >
                  {createAppointmentMutation.isPending 
                    ? text.bookingInProgress 
                    : booking.employeeId === "" 
                      ? text.bookAutoAssign 
                      : text.bookAppointment}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Right Column - Calendar */}
        <div>
          {showCalendar ? (
            <AppointmentCalendar
              selectedEmployeeId={booking.employeeId}
              selectedService={booking.service}
              slotDuration={selectedServiceDuration}
              onTimeSelect={handleTimeSelect}
              selectedDate={booking.date}
              selectedTime={booking.time}
              employees={employees.map(emp => {
                try {
                  let specialties: string[] = [];
                  if (typeof emp.specialties === 'string') {
                    try {
                      specialties = JSON.parse(emp.specialties);
                    } catch {
                      specialties = [];
                    }
                  } else if (Array.isArray(emp.specialties)) {
                    specialties = emp.specialties;
                  }
                  return { id: emp.id, name: emp.name || "Unknown", specialties };
                } catch (err) {
                  console.error("Error mapping employee:", emp, err);
                  return { id: emp.id, name: emp.name || "Unknown", specialties: [] };
                }
              })}
            />
          ) : (
            <Card className="metal-gradient border-steel">
              <CardContent className="p-4 sm:p-8 text-center">
                <div className="text-gray-400">
                  <Calendar className="mx-auto mb-4" size={48} />
                  <h3 className="text-lg font-semibold mb-2">{text.dateSelection}</h3>
                  <p>{text.dateSelectionHint}</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
