import { useState } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/auth-context";
import { api } from "@/services/api";
import { useLanguage } from "@/context/language-context";
import { getServiceLabel } from "@/lib/serviceLabels";
import type { InsertAppointment } from "@shared/schema";

interface AppointmentFormProps {
  onSuccess?: () => void;
}

export default function AppointmentForm({ onSuccess }: AppointmentFormProps) {
  const { user } = useAuth();
  const { isEnglish } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    service: "",
    barber: "",
    date: "",
    time: "",
    notes: "",
  });

  const createAppointmentMutation = useMutation({
    mutationFn: (appointment: InsertAppointment) => api.createAppointment(appointment),
    onSuccess: () => {
      toast({
        title: "Επιτυχία!",
        description: "Το ραντεβού σας κλείστηκε επιτυχώς.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/appointments/date"] });
      setFormData({ service: "", barber: "", date: "", time: "", notes: "" });
      onSuccess?.();
    },
    onError: () => {
      toast({
        title: "Σφάλμα",
        description: "Αποτυχία κλεισίματος ραντεβού. Παρακαλώ προσπαθήστε ξανά.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast({
        title: "Σφάλμα",
        description: "Πρέπει να είστε συνδεδεμένοι για να κλείσετε ραντεβού.",
        variant: "destructive",
      });
      return;
    }

    if (!formData.service || !formData.barber || !formData.date || !formData.time) {
      toast({
        title: "Σφάλμα",
        description: "Παρακαλώ συμπληρώστε όλα τα απαιτούμενα πεδία.",
        variant: "destructive",
      });
      return;
    }

    createAppointmentMutation.mutate({
      userId: user.id,
      employeeId: "550e8400-e29b-41d4-a716-446655440003", // Default employee
      service: formData.service,
      barber: formData.barber,
      date: formData.date,
      time: formData.time,
      notes: formData.notes,
    });
  };

  // Fetch services from API
  const { data: servicesData = [] } = useQuery({
    queryKey: ["/api/services"],
    enabled: !!user,
  });

  const services = servicesData
    .filter((service: any) => service.isActive)
    .map((service: any) => ({
      value: service.id,
      label: `${getServiceLabel(service, isEnglish)} - $${service.price}`,
      duration: service.duration,
    }));

  const barbers = [
    { value: "tony", name: "Tony", specialty: "Master Barber" },
    { value: "mike", name: "Mike", specialty: "Senior Stylist" },
    { value: "alex", name: "Alex", specialty: "Beard Specialist" },
  ];

  const timeSlots = [
    "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00"
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <Label htmlFor="service" className="text-whiskey font-semibold mb-2 block">
          ΥΠΗΡΕΣΙΑ
        </Label>
        <Select value={formData.service} onValueChange={(value) => setFormData({ ...formData, service: value })}>
          <SelectTrigger className="bg-charcoal border-steel text-white focus:border-whiskey">
            <SelectValue placeholder="Διάλεξε υπηρεσία" />
          </SelectTrigger>
          <SelectContent className="bg-charcoal border-steel">
            {services.map((service) => (
              <SelectItem key={service.value} value={service.value} className="text-white focus:bg-steel focus:text-white">
                {service.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label className="text-whiskey font-semibold mb-2 block">ΚΟΜΜΩΤΗΣ</Label>
        <Select value={formData.barber} onValueChange={(value) => setFormData({ ...formData, barber: value })}>
          <SelectTrigger className="bg-charcoal border-steel text-white focus:border-whiskey">
            <SelectValue placeholder="Διάλεξε κομμωτή" />
          </SelectTrigger>
          <SelectContent className="bg-charcoal border-steel">
            {barbers.map((barber) => (
              <SelectItem key={barber.value} value={barber.value} className="text-white focus:bg-steel focus:text-white">
                {barber.name} - {barber.specialty}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <Label htmlFor="date" className="text-whiskey font-semibold mb-2 block">
            ΗΜΕΡΟΜΗΝΙΑ
          </Label>
          <Input
            id="date"
            type="date"
            value={formData.date}
            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            min={new Date().toISOString().split('T')[0]}
            className="bg-charcoal border-steel text-white focus:border-whiskey"
          />
        </div>
        <div>
          <Label htmlFor="time" className="text-whiskey font-semibold mb-2 block">
            ΩΡΑ
          </Label>
          <Select value={formData.time} onValueChange={(value) => setFormData({ ...formData, time: value })}>
            <SelectTrigger className="bg-charcoal border-steel text-white focus:border-whiskey">
              <SelectValue placeholder="Διάλεξε ώρα" />
            </SelectTrigger>
            <SelectContent className="bg-charcoal border-steel">
              {timeSlots.map((time) => (
                <SelectItem key={time} value={time} className="text-white focus:bg-steel focus:text-white">
                  {new Date(`2000-01-01T${time}`).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true })}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label htmlFor="notes" className="text-whiskey font-semibold mb-2 block">
          ΕΙΔΙΚΕΣ ΑΙΤΗΣΕΙΣ
        </Label>
        <Textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          placeholder="Οποιεσδήποτε ειδικές αιτήσεις ή προτιμήσεις..."
          rows={3}
          className="bg-charcoal border-steel text-white placeholder-gray-500 focus:border-whiskey resize-none"
        />
      </div>

      <Button
        type="submit"
        disabled={createAppointmentMutation.isPending}
        className="w-full whiskey-gradient hover:opacity-90 text-black font-semibold shine-effect"
      >
        {createAppointmentMutation.isPending ? "ΚΛΕΙΣΙΜΟ..." : "ΚΛΕΙΣΕ ΡΑΝΤΕΒΟΥ"}
      </Button>
    </form>
  );
}
