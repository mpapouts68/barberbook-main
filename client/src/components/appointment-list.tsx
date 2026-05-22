import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/services/api";
import { Scissors, Calendar, Clock } from "lucide-react";
import type { Appointment } from "@shared/schema";
import { useLanguage } from "@/context/language-context";
import { resolveServiceName } from "@/lib/serviceLabels";

interface AppointmentListProps {
  appointments: Appointment[];
  showActions?: boolean;
}

export default function AppointmentList({ appointments, showActions = true }: AppointmentListProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isEnglish, localeCode } = useLanguage();

  const text = {
    successTitle: isEnglish ? "Success!" : "Επιτυχία!",
    successDescription: isEnglish ? "Appointment cancelled successfully." : "Το ραντεβού ακυρώθηκε επιτυχώς.",
    errorTitle: isEnglish ? "Error" : "Σφάλμα",
    errorDescription: isEnglish ? "Failed to cancel appointment." : "Αποτυχία ακύρωσης ραντεβού.",
    cancelConfirm: isEnglish
      ? "Are you sure you want to cancel this appointment?"
      : "Είστε σίγουροι ότι θέλετε να ακυρώσετε αυτό το ραντεβού;",
    noPreference: isEnglish ? "No preference" : "Χωρίς προτίμηση",
    withBarber: isEnglish ? "with" : "με",
    note: isEnglish ? "Note:" : "Σημείωση:",
    cancelling: isEnglish ? "CANCELLING..." : "ΑΚΥΡΩΣΗ...",
    cancel: isEnglish ? "CANCEL" : "ΑΚΥΡΩΣΗ",
    bookAgain: isEnglish ? "BOOK AGAIN" : "ΚΛΕΙΣΕ ΞΑΝΑ",
  };

  // Fetch employees to map IDs to names
  const { data: employees = [] } = useQuery({
    queryKey: ["/api/employees"],
    queryFn: () => api.getEmployees(),
  });

  // Fetch services to map IDs to names
  const { data: services = [] } = useQuery({
    queryKey: ["/api/services"],
    queryFn: async () => {
      const response = await fetch("/api/services");
      if (!response.ok) throw new Error("Failed to fetch services");
      return response.json();
    },
  });

  const cancelAppointmentMutation = useMutation({
    mutationFn: (id: string) => api.cancelAppointment(id),
    onSuccess: () => {
      toast({
        title: text.successTitle,
        description: text.successDescription,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/appointments/date"] });
    },
    onError: () => {
      toast({
        title: text.errorTitle,
        description: text.errorDescription,
        variant: "destructive",
      });
    },
  });

  const handleCancel = (id: string) => {
    if (confirm(text.cancelConfirm)) {
      cancelAppointmentMutation.mutate(id);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "confirmed":
        return "bg-emerald-600";
      case "pending":
        return "bg-amber-600";
      case "cancelled":
        return "bg-red-600";
      case "completed":
        return "bg-green-600";
      default:
        return "bg-gray-600";
    }
  };

  const formatTime = (time: string) => {
    return new Date(`2000-01-01T${time}`).toLocaleTimeString(localeCode, {
      hour: 'numeric',
      minute: '2-digit',
      hour12: !isEnglish,
    });
  };

  const getEmployeeName = (appointment: Appointment) => {
    // If barber field contains a UUID (employee ID), look up the employee name
    if (appointment.barber && appointment.barber.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      const employee = employees.find((emp: any) => emp.id === appointment.barber);
      return employee?.name || appointment.barber;
    }
    // If barber field contains a name or "Χωρίς προτίμηση", use it directly
    if (appointment.barber === "Χωρίς προτίμηση" || appointment.barber === "No preference") {
      return text.noPreference;
    }
    return appointment.barber;
  };

  const getServiceName = (appointment: Appointment) =>
    resolveServiceName(appointment.service, services, isEnglish);

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString(localeCode, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusLabel = (status: string) => {
    const normalizedStatus = status.toLowerCase();

    if (!isEnglish) {
      return normalizedStatus.toUpperCase();
    }

    switch (normalizedStatus) {
      case "confirmed":
        return "CONFIRMED";
      case "pending":
        return "PENDING";
      case "cancelled":
        return "CANCELLED";
      case "completed":
        return "COMPLETED";
      default:
        return status.toUpperCase();
    }
  };

  return (
    <div className="space-y-4">
      {appointments.map((appointment) => (
        <div key={appointment.id} className="bg-charcoal rounded-lg p-6 border border-steel">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start space-x-4 mb-4 lg:mb-0">
              <div className="w-12 h-12 whiskey-gradient rounded-lg flex items-center justify-center flex-shrink-0">
                <Scissors className="text-black" size={20} />
              </div>
              <div>
                <h4 className="text-white font-semibold text-lg">
                  {getServiceName(appointment)}
                </h4>
                <p className="text-gray-400 mb-1">
                  {text.withBarber} <span className="text-whiskey font-semibold">{getEmployeeName(appointment)}</span>
                </p>
                <div className="flex items-center text-gray-400 text-sm space-x-4">
                  <span className="flex items-center">
                    <Calendar className="mr-1" size={14} />
                    {formatDate(appointment.date)}
                  </span>
                  <span className="flex items-center">
                    <Clock className="mr-1" size={14} />
                    {formatTime(appointment.time)}
                  </span>
                </div>
                {appointment.notes && (
                  <p className="text-gray-500 text-sm mt-1">
                    {text.note} {appointment.notes}
                  </p>
                )}
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <span className={`${getStatusColor(appointment.status)} text-white px-3 py-1 rounded-full text-sm font-semibold`}>
                {getStatusLabel(appointment.status)}
              </span>
              
              {showActions && appointment.status !== "cancelled" && appointment.status !== "completed" && (
                <Button
                  onClick={() => handleCancel(appointment.id)}
                  disabled={cancelAppointmentMutation.isPending}
                  variant="destructive"
                  size="sm"
                >
                  {cancelAppointmentMutation.isPending ? text.cancelling : text.cancel}
                </Button>
              )}
              
              {appointment.status === "completed" && (
                <Button
                  className="whiskey-gradient hover:opacity-90 text-black"
                  size="sm"
                >
                  {text.bookAgain}
                </Button>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
