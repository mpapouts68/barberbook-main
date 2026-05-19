import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/context/auth-context";
import AppointmentList from "@/components/appointment-list";
import type { Appointment } from "@shared/schema";
import { useLanguage } from "@/context/language-context";

export default function Appointments() {
  const { user } = useAuth();
  const { isEnglish } = useLanguage();

  const text = {
    title: isEnglish ? "MY APPOINTMENTS" : "ΤΑ ΡΑΝΤΕΒΟΥ ΜΟΥ",
    subtitle: isEnglish
      ? "Manage your upcoming and past appointments"
      : "Διαχειριστείτε τα επερχόμενα και παλιά ραντεβού σας",
    upcoming: isEnglish ? "UPCOMING" : "ΕΠΕΡΧΟΜΕΝΑ",
    noUpcoming: isEnglish ? "No upcoming appointments" : "Δεν υπάρχουν επερχόμενα ραντεβού",
    bookAppointment: isEnglish ? "Book Appointment" : "Κλείσε Ραντεβού",
    past: isEnglish ? "PAST APPOINTMENTS" : "ΠΑΛΙΑ ΡΑΝΤΕΒΟΥ",
    noPast: isEnglish ? "No past appointments" : "Δεν υπάρχουν παλιά ραντεβού",
  };

  const { data: appointments = [], isLoading } = useQuery<Appointment[]>({
    queryKey: ["/api/appointments"],
    enabled: !!user,
  });

  const upcomingAppointments = appointments.filter(
    (apt) => apt.status !== "cancelled" && new Date(apt.date) >= new Date()
  );

  const pastAppointments = appointments.filter(
    (apt) => apt.status === "completed" || new Date(apt.date) < new Date()
  );

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-steel rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-steel rounded w-1/2 mb-8"></div>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-steel rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h2 className="font-oswald text-3xl font-bold text-whiskey mb-2">
          {text.title}
        </h2>
        <p className="text-gray-400">{text.subtitle}</p>
      </div>

      {/* Upcoming Appointments */}
      <Card className="metal-gradient border-steel mb-8">
        <CardContent className="p-6">
          <h3 className="font-oswald text-xl font-semibold text-whiskey mb-4">
            {text.upcoming}
          </h3>
          {upcomingAppointments.length > 0 ? (
            <AppointmentList appointments={upcomingAppointments} showActions={true} />
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-400 mb-4">{text.noUpcoming}</p>
              <a
                href="/booking"
                className="inline-block whiskey-gradient text-black px-6 py-2 rounded-lg font-semibold"
              >
                {text.bookAppointment}
              </a>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Past Appointments */}
      <Card className="metal-gradient border-steel">
        <CardContent className="p-6">
          <h3 className="font-oswald text-xl font-semibold text-whiskey mb-4">
            {text.past}
          </h3>
          {pastAppointments.length > 0 ? (
            <AppointmentList appointments={pastAppointments} showActions={false} />
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-400">{text.noPast}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
