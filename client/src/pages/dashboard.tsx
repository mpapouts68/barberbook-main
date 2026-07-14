import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/auth-context";
import { api } from "@/services/api";
import { CalendarPlus, Clock, Gift, UserCircle, Shield } from "lucide-react";
import { Link } from "wouter";
import NamedayPanel from "@/components/nameday-panel";
import ShopGallery from "@/components/ShopGallery";
import type { Appointment } from "@shared/schema";
import { useLanguage } from "@/context/language-context";
import { resolveServiceName } from "@/lib/serviceLabels";
import { useBranding } from "@/context/branding-context";

export default function Dashboard() {
  const { user } = useAuth();
  const { isEnglish, localeCode } = useLanguage();
  const { brandLogo, brandLogoAlt, brandName, landingImage } = useBranding();

  const bannerImg = landingImage("banner");
  const appointmentImg = landingImage("bookAppointment");
  const myAppointmentsImg = landingImage("myAppointments");
  const eortologioImg = landingImage("nameday");
  const settingsImg = landingImage("profile");
  const prosfataImg = landingImage("recentActivity");

  const text = {
    welcomeFallback: isEnglish ? "User" : "Χρήστη",
    heroSubtitle: isEnglish
      ? `Ready for your next ${brandName} appointment?`
      : `Έτοιμος για το επόμενο ραντεβού σου στο ${brandName};`,
    bookAppointment: isEnglish ? "BOOK APPOINTMENT" : "ΚΛΕΙΣΕ ΡΑΝΤΕΒΟΥ",
    bookAppointmentDesc: isEnglish ? "Schedule your next haircut" : "Προγραμμάτισε το επόμενο κούρεμα",
    myAppointments: isEnglish ? "MY APPOINTMENTS" : "ΤΑ ΡΑΝΤΕΒΟΥ ΜΟΥ",
    myAppointmentsDesc: isEnglish ? "View and manage your appointments" : "Δες & διαχειρίσου τα ραντεβού",
    nameday: isEnglish ? "NAME DAY" : "ΓΙΟΡΤΗ ΟΝΟΜΑΤΟΣ",
    namedayDesc: isEnglish ? "See today's special offers" : "Δες τις σημερινές προσφορές",
    profile: isEnglish ? "PROFILE" : "ΠΡΟΦΙΛ",
    profileDesc: isEnglish ? "Account settings" : "Ρυθμίσεις λογαριασμού",
    adminDesc: isEnglish ? "Admin panel & settings" : "Admin panel & ρυθμίσεις",
    recentActivity: isEnglish ? "RECENT ACTIVITY" : "ΠΡΌΣΦΑΤΗ ΔΡΑΣΤΗΡΙΌΤΗΤΑ",
    withBarber: isEnglish ? "with" : "με τον",
    at: isEnglish ? "at" : "στις",
    noRecentActivity: isEnglish ? "No recent activity" : "Καμία πρόσφατη δραστηριότητα",
    firstAppointment: isEnglish ? "Book Your First Appointment" : "Κλείσε το Πρώτο σου Ραντεβού",
    noPreference: isEnglish ? "No preference" : "Χωρίς προτίμηση",
  };
  
  const { data: todaysNamedays = [] } = useQuery({
    queryKey: ["/api/nameday/today"],
    enabled: !!user,
  });

  const { data: myAppointments = [] } = useQuery({
    queryKey: ["/api/appointments"],
    enabled: !!user,
  });

  // Fetch employees to map IDs to names
  const { data: employees = [] } = useQuery({
    queryKey: ["/api/employees"],
    queryFn: () => api.getEmployees(),
    enabled: !!user,
  });

  // Fetch services to map IDs to names
  const { data: services = [] } = useQuery({
    queryKey: ["/api/services"],
    queryFn: async () => {
      const response = await fetch("/api/services");
      if (!response.ok) throw new Error("Failed to fetch services");
      return response.json();
    },
    enabled: !!user,
  });

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

  const upcomingAppointments = (myAppointments as any[]).filter(
    (apt: any) => apt.status === "confirmed" && new Date(apt.date) >= new Date()
  ).slice(0, 2);

  const getStatusLabel = (status: string) => {
    if (!isEnglish) {
      return status.toUpperCase();
    }

    switch (status.toLowerCase()) {
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Welcome Hero Section */}
      <Card
        className="relative border-steel mb-8 overflow-hidden min-h-[200px]"
        style={{
          backgroundImage: `url(${bannerImg})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="absolute inset-0 bg-charcoal/85 z-0" aria-hidden />
        <CardContent className="relative z-10 p-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-oswald text-4xl font-bold text-whiskey mb-2 [text-shadow:0_1px_2px_rgba(0,0,0,0.8),0_0_20px_rgba(0,0,0,0.5)]">
                {isEnglish ? "Welcome," : "Καλώς Ήρθες,"} {user?.firstName || text.welcomeFallback}
              </h1>
              <p className="text-gray-200 text-lg [text-shadow:0_1px_2px_rgba(0,0,0,0.6)]">
                {text.heroSubtitle}
              </p>
            </div>
            <div className="hidden lg:block w-32 h-32">
              <img
                src={brandLogo}
                alt={brandLogoAlt}
                className="w-full h-full object-contain rounded-full"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Link href="/booking">
          <Card
            className="relative border-steel hover:border-whiskey transition-all duration-200 cursor-pointer group h-full min-h-[180px] overflow-hidden"
            style={{
              backgroundImage: `url(${appointmentImg})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          >
            <div className="absolute inset-0 bg-charcoal/85 group-hover:bg-charcoal/78 transition-colors z-0" aria-hidden />
            <CardContent className="relative z-10 p-6 h-full flex flex-col">
              <div className="w-12 h-12 whiskey-gradient rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <CalendarPlus className="text-xl text-black" size={24} />
              </div>
              <h3 className="font-oswald text-xl font-bold text-whiskey mb-2 [text-shadow:0_1px_3px_rgba(0,0,0,0.8)]">
                {text.bookAppointment}
              </h3>
              <p className="text-gray-200 text-sm flex-grow [text-shadow:0_1px_2px_rgba(0,0,0,0.6)]">{text.bookAppointmentDesc}</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/appointments">
          <Card
            className="relative border-steel hover:border-whiskey transition-all duration-200 cursor-pointer group h-full min-h-[180px] overflow-hidden"
            style={{
              backgroundImage: `url(${myAppointmentsImg})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          >
            <div className="absolute inset-0 bg-charcoal/85 group-hover:bg-charcoal/78 transition-colors z-0" aria-hidden />
            <CardContent className="relative z-10 p-6 h-full flex flex-col">
              <div className="w-12 h-12 whiskey-gradient rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Clock className="text-xl text-black" size={24} />
              </div>
              <h3 className="font-oswald text-xl font-bold text-whiskey mb-2 [text-shadow:0_1px_3px_rgba(0,0,0,0.8)]">
                {text.myAppointments}
              </h3>
              <p className="text-gray-200 text-sm flex-grow [text-shadow:0_1px_2px_rgba(0,0,0,0.6)]">{text.myAppointmentsDesc}</p>
            </CardContent>
          </Card>
        </Link>

        <Button
          onClick={() => {
            const namedaySection = document.getElementById("nameday-section");
            if (namedaySection) {
              namedaySection.scrollIntoView({ behavior: "smooth", block: "start" });
            } else {
              window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
            }
          }}
          className="h-full p-0 bg-transparent hover:bg-transparent"
        >
          <Card
            className="relative border-steel hover:border-whiskey transition-all duration-200 cursor-pointer group w-full h-full min-h-[180px] overflow-hidden"
            style={{
              backgroundImage: `url(${eortologioImg})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          >
            <div className="absolute inset-0 bg-charcoal/85 group-hover:bg-charcoal/78 transition-colors z-0" aria-hidden />
            <CardContent className="relative z-10 p-6 h-full flex flex-col">
              <div className="w-12 h-12 whiskey-gradient rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Gift className="text-xl text-black" size={24} />
              </div>
              <h3 className="font-oswald text-xl font-bold text-whiskey mb-2 [text-shadow:0_1px_3px_rgba(0,0,0,0.8)]">
                {text.nameday}
              </h3>
              <p className="text-gray-200 text-sm flex-grow [text-shadow:0_1px_2px_rgba(0,0,0,0.6)]">{text.namedayDesc}</p>
            </CardContent>
          </Card>
        </Button>

        {user?.role === "admin" ? (
          <Link href="/admin">
            <Card
              className="relative border-steel hover:border-whiskey transition-all duration-200 cursor-pointer group h-full min-h-[180px] overflow-hidden"
              style={{
                backgroundImage: `url(${settingsImg})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
            >
              <div className="absolute inset-0 bg-charcoal/85 group-hover:bg-charcoal/78 transition-colors z-0" aria-hidden />
              <CardContent className="relative z-10 p-6 h-full flex flex-col">
                <div className="w-12 h-12 whiskey-gradient rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Shield className="text-xl text-black" size={24} />
                </div>
                <h3 className="font-oswald text-xl font-bold text-whiskey mb-2 [text-shadow:0_1px_3px_rgba(0,0,0,0.8)]">
                  ΔΙΑΧΕΙΡΙΣΗ
                </h3>
                <p className="text-gray-200 text-sm flex-grow [text-shadow:0_1px_2px_rgba(0,0,0,0.6)]">{text.adminDesc}</p>
              </CardContent>
            </Card>
          </Link>
        ) : (
          <Link href="/profile">
            <Card
              className="relative border-steel hover:border-whiskey transition-all duration-200 cursor-pointer group h-full min-h-[180px] overflow-hidden"
              style={{
                backgroundImage: `url(${settingsImg})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
            >
              <div className="absolute inset-0 bg-charcoal/85 group-hover:bg-charcoal/78 transition-colors z-0" aria-hidden />
              <CardContent className="relative z-10 p-6 h-full flex flex-col">
                <div className="w-12 h-12 whiskey-gradient rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <UserCircle className="text-xl text-black" size={24} />
                </div>
                <h3 className="font-oswald text-xl font-bold text-whiskey mb-2 [text-shadow:0_1px_3px_rgba(0,0,0,0.8)]">
                  {text.profile}
                </h3>
                <p className="text-gray-200 text-sm flex-grow [text-shadow:0_1px_2px_rgba(0,0,0,0.6)]">{text.profileDesc}</p>
              </CardContent>
            </Card>
          </Link>
        )}
      </div>

      {/* Namedays + shop gallery */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8 items-stretch">
        <div id="nameday-section" className="min-h-[320px]">
          <NamedayPanel compact />
        </div>
        <div id="shop-section" className="min-h-[320px]">
          <ShopGallery />
        </div>
      </div>

      {/* Recent Activity */}
      <Card
        className="relative border-steel overflow-hidden"
        style={{
          backgroundImage: `url(${prosfataImg})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="absolute inset-0 bg-charcoal/85 z-0" aria-hidden />
        <CardContent className="relative z-10 p-6">
          <h3 className="font-oswald text-2xl font-bold text-whiskey mb-4 [text-shadow:0_1px_3px_rgba(0,0,0,0.8)]">
            {text.recentActivity}
          </h3>
          <div className="space-y-4">
            {upcomingAppointments.length > 0 ? (
              upcomingAppointments.map((appointment: any) => (
                <div key={appointment.id} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full mr-4"></div>
                    <div>
                      <p className="text-white font-medium [text-shadow:0_1px_2px_rgba(0,0,0,0.5)]">
                        {getServiceName(appointment)} {text.withBarber} {getEmployeeName(appointment)}
                      </p>
                      <p className="text-gray-200 text-sm [text-shadow:0_1px_2px_rgba(0,0,0,0.5)]">
                        {new Date(appointment.date).toLocaleDateString(localeCode)} {text.at} {appointment.time}
                      </p>
                    </div>
                  </div>
                  <span className="text-emerald-500 text-sm font-semibold">
                    {getStatusLabel(appointment.status)}
                  </span>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-200 [text-shadow:0_1px_2px_rgba(0,0,0,0.5)]">{text.noRecentActivity}</p>
                <Link href="/booking">
                  <Button className="mt-4 whiskey-gradient text-black">
                    {text.firstAppointment}
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
