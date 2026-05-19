import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Clock, Save, Plus, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { WorkingHours, TimeRange } from "@shared/config";
import { normalizeWorkingHours } from "@shared/config";

interface WorkingHoursConfig {
  monday: WorkingHours;
  tuesday: WorkingHours;
  wednesday: WorkingHours;
  thursday: WorkingHours;
  friday: WorkingHours;
  saturday: WorkingHours;
  sunday: WorkingHours;
}

const dayNames = {
  monday: "Δευτέρα",
  tuesday: "Τρίτη",
  wednesday: "Τετάρτη",
  thursday: "Πέμπτη",
  friday: "Παρασκευή",
  saturday: "Σάββατο",
  sunday: "Κυριακή"
};

// Helper to normalize hours to array format for internal state
function normalizeToArray(hours: WorkingHours): TimeRange[] {
  if (hours === "closed") return [];
  if (Array.isArray(hours)) return hours;
  return [hours];
}

// Helper to convert array back to WorkingHours format
function arrayToWorkingHours(ranges: TimeRange[]): WorkingHours {
  if (ranges.length === 0) return "closed";
  if (ranges.length === 1) return ranges[0];
  return ranges;
}

export function WorkingHoursManager() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Internal state: always use array format for easier manipulation
  const [workingHoursArrays, setWorkingHoursArrays] = useState<Record<string, TimeRange[]>>({
    monday: [{ start: "09:00", end: "18:00" }],
    tuesday: [{ start: "09:00", end: "18:00" }],
    wednesday: [{ start: "09:00", end: "18:00" }],
    thursday: [{ start: "09:00", end: "20:00" }],
    friday: [{ start: "09:00", end: "20:00" }],
    saturday: [{ start: "08:00", end: "19:00" }],
    sunday: [{ start: "10:00", end: "16:00" }]
  });

  const [closedDays, setClosedDays] = useState<Record<string, boolean>>({});

  // Fetch current working hours
  const { data: currentHours, isLoading } = useQuery({
    queryKey: ["/api/admin/working-hours"],
    queryFn: async () => {
      const response = await fetch("/api/admin/working-hours");
      if (!response.ok) throw new Error("Failed to fetch working hours");
      return response.json();
    },
  });

  // Update working hours mutation
  const updateHoursMutation = useMutation({
    mutationFn: async (data: WorkingHoursConfig) => {
      const response = await fetch("/api/admin/working-hours", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to update working hours");
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Επιτυχία!",
        description: "Οι ώρες λειτουργίας ενημερώθηκαν επιτυχώς.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/working-hours"] });
    },
    onError: () => {
      toast({
        title: "Σφάλμα",
        description: "Αποτυχία ενημέρωσης ωρών λειτουργίας.",
        variant: "destructive",
      });
    },
  });

  // Load current hours when data is available
  useEffect(() => {
    if (currentHours) {
      const normalized: Record<string, TimeRange[]> = {};
      Object.keys(dayNames).forEach(day => {
        normalized[day] = normalizeToArray(currentHours[day]);
        if (normalized[day].length === 0) {
          setClosedDays(prev => ({ ...prev, [day]: true }));
        }
      });
      setWorkingHoursArrays(normalized);
    }
  }, [currentHours]);

  const handleTimeChange = (day: string, rangeIndex: number, field: 'start' | 'end', value: string) => {
    setWorkingHoursArrays(prev => {
      const newRanges = [...prev[day]];
      newRanges[rangeIndex] = { ...newRanges[rangeIndex], [field]: value };
      return { ...prev, [day]: newRanges };
    });
  };

  const handleAddRange = (day: string) => {
    setWorkingHoursArrays(prev => {
      const currentRanges = prev[day];
      // Add a new range starting 1 hour after the last range ends, or default to 17:00-22:00
      const lastRange = currentRanges[currentRanges.length - 1];
      const newStart = lastRange ? lastRange.end : "17:00";
      const newEnd = "22:00";
      return {
        ...prev,
        [day]: [...currentRanges, { start: newStart, end: newEnd }]
      };
    });
  };

  const handleRemoveRange = (day: string, rangeIndex: number) => {
    setWorkingHoursArrays(prev => {
      const newRanges = prev[day].filter((_, idx) => idx !== rangeIndex);
      return { ...prev, [day]: newRanges };
    });
  };

  const handleDayToggle = (day: string, isClosed: boolean) => {
    setClosedDays(prev => ({ ...prev, [day]: isClosed }));
    if (isClosed) {
      // Clear ranges when closing
      setWorkingHoursArrays(prev => ({ ...prev, [day]: [] }));
    } else {
      // Add default range when opening
      setWorkingHoursArrays(prev => ({
        ...prev,
        [day]: prev[day].length === 0 ? [{ start: "09:00", end: "18:00" }] : prev[day]
      }));
    }
  };

  const handleSave = () => {
    // Convert arrays back to WorkingHours format
    const finalHours: WorkingHoursConfig = {} as WorkingHoursConfig;
    
    // Validate ranges
    for (const [day, ranges] of Object.entries(workingHoursArrays)) {
      if (closedDays[day] || ranges.length === 0) {
        finalHours[day as keyof WorkingHoursConfig] = "closed";
        continue;
      }

      // Validate each range
      for (let i = 0; i < ranges.length; i++) {
        const range = ranges[i];
        if (range.start >= range.end) {
          toast({
            title: "Σφάλμα Ωραρίου",
            description: `Η ώρα κλεισίματος πρέπει να είναι μετά την ώρα ανοίγματος για ${dayNames[day as keyof typeof dayNames]} (Περίοδος ${i + 1}).`,
            variant: "destructive",
          });
          return;
        }

        // Check for overlapping ranges
        for (let j = i + 1; j < ranges.length; j++) {
          const otherRange = ranges[j];
          if (
            (range.start < otherRange.end && range.end > otherRange.start)
          ) {
            toast({
              title: "Σφάλμα Ωραρίου",
              description: `Οι περιόδους για ${dayNames[day as keyof typeof dayNames]} δεν μπορούν να επικαλύπτονται.`,
              variant: "destructive",
            });
            return;
          }
        }
      }

      finalHours[day as keyof WorkingHoursConfig] = arrayToWorkingHours(ranges);
    }

    updateHoursMutation.mutate(finalHours);
  };

  const copyToAllDays = (sourceDay: string) => {
    const sourceRanges = workingHoursArrays[sourceDay];
    setWorkingHoursArrays(prev => {
      const updated = { ...prev };
      Object.keys(dayNames).forEach(day => {
        if (day !== sourceDay && !closedDays[day]) {
          updated[day] = [...sourceRanges];
        }
      });
      return updated;
    });
  };

  if (isLoading) {
    return (
      <Card className="metal-gradient border-steel">
        <CardContent className="p-8 text-center">
          <Clock className="mx-auto mb-4 animate-spin" size={32} />
          <p className="text-gray-400">Φόρτωση ωραρίου...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="metal-gradient border-steel">
      <CardHeader>
        <CardTitle className="font-oswald text-xl text-whiskey flex items-center">
          <Clock className="mr-2" size={20} />
          ΔΙΑΧΕΙΡΙΣΗ ΩΡΑΡΙΟΥ ΛΕΙΤΟΥΡΓΙΑΣ
        </CardTitle>
        <p className="text-gray-400">
          Ορίστε τις ώρες λειτουργίας του καταστήματος για κάθε ημέρα της εβδομάδας. Μπορείτε να προσθέσετε πολλαπλές περιόδους (π.χ. 10:00-14:00 και 17:00-22:00).
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {Object.entries(dayNames).map(([dayKey, dayLabel]) => {
          const day = dayKey;
          const isClosed = closedDays[day];
          const ranges = workingHoursArrays[day] || [];
          
          return (
            <div key={day} className="bg-charcoal/30 rounded-lg p-4 border border-steel/50">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <h3 className="font-semibold text-white text-lg">{dayLabel}</h3>
                  <input
                    type="checkbox"
                    checked={!isClosed}
                    onChange={(e) => handleDayToggle(day, !e.target.checked)}
                    className="w-4 h-4 text-whiskey bg-charcoal border-steel rounded focus:ring-whiskey"
                  />
                  <span className="text-sm text-gray-400">
                    {isClosed ? "Κλειστό" : "Ανοιχτό"}
                  </span>
                </div>
                {!isClosed && (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleAddRange(day)}
                      className="text-xs border-whiskey text-whiskey hover:bg-whiskey hover:text-black"
                    >
                      <Plus className="mr-1" size={14} />
                      Προσθήκη Περιόδου
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToAllDays(day)}
                      className="text-xs border-whiskey text-whiskey hover:bg-whiskey hover:text-black"
                    >
                      Αντιγραφή σε όλες
                    </Button>
                  </div>
                )}
              </div>

              {!isClosed && (
                <div className="space-y-3">
                  {ranges.map((range, index) => (
                    <div key={index} className="grid grid-cols-2 gap-4 items-end">
                      <div>
                        <Label htmlFor={`${day}-${index}-start`} className="text-whiskey font-medium text-sm">
                          {index === 0 ? "Άνοιγμα" : `Άνοιγμα (Περίοδος ${index + 1})`}
                        </Label>
                        <Input
                          id={`${day}-${index}-start`}
                          type="time"
                          value={range.start}
                          onChange={(e) => handleTimeChange(day, index, 'start', e.target.value)}
                          className="bg-charcoal border-steel text-white focus:border-whiskey"
                        />
                      </div>
                      <div>
                        <Label htmlFor={`${day}-${index}-end`} className="text-whiskey font-medium text-sm">
                          {index === 0 ? "Κλείσιμο" : `Κλείσιμο (Περίοδος ${index + 1})`}
                        </Label>
                        <div className="flex gap-2">
                          <Input
                            id={`${day}-${index}-end`}
                            type="time"
                            value={range.end}
                            onChange={(e) => handleTimeChange(day, index, 'end', e.target.value)}
                            className="bg-charcoal border-steel text-white focus:border-whiskey"
                          />
                          {ranges.length > 1 && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleRemoveRange(day, index)}
                              className="border-red-500 text-red-500 hover:bg-red-500 hover:text-white px-3"
                            >
                              <X size={16} />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  {ranges.length === 0 && (
                    <p className="text-sm text-gray-400 italic">
                      Κάντε κλικ στο "Προσθήκη Περιόδου" για να προσθέσετε ώρες λειτουργίας
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}

        <div className="pt-6 border-t border-steel">
          <Button
            onClick={handleSave}
            disabled={updateHoursMutation.isPending}
            className="w-full whiskey-gradient hover:opacity-90 text-black font-semibold shine-effect"
          >
            {updateHoursMutation.isPending ? (
              <>
                <Clock className="mr-2 animate-spin" size={16} />
                ΑΠΟΘΗΚΕΥΣΗ...
              </>
            ) : (
              <>
                <Save className="mr-2" size={16} />
                ΑΠΟΘΗΚΕΥΣΗ ΩΡΑΡΙΟΥ
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
