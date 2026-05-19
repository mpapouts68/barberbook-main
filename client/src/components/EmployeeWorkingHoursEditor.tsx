import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Clock } from "lucide-react";

export type DayWorkingHours = { start: string; end: string } | { start: "closed"; end: "closed" };

export type EmployeeWorkingHoursConfig = {
  monday: DayWorkingHours;
  tuesday: DayWorkingHours;
  wednesday: DayWorkingHours;
  thursday: DayWorkingHours;
  friday: DayWorkingHours;
  saturday: DayWorkingHours;
  sunday: DayWorkingHours;
};

const DEFAULT_EMPLOYEE_HOURS: EmployeeWorkingHoursConfig = {
  monday: { start: "09:00", end: "18:00" },
  tuesday: { start: "09:00", end: "18:00" },
  wednesday: { start: "09:00", end: "18:00" },
  thursday: { start: "09:00", end: "18:00" },
  friday: { start: "09:00", end: "18:00" },
  saturday: { start: "09:00", end: "15:00" },
  sunday: { start: "closed", end: "closed" },
};

const dayNames: Record<keyof EmployeeWorkingHoursConfig, string> = {
  monday: "Δευτέρα",
  tuesday: "Τρίτη",
  wednesday: "Τετάρτη",
  thursday: "Πέμπτη",
  friday: "Παρασκευή",
  saturday: "Σάββατο",
  sunday: "Κυριακή",
};

export function parseEmployeeWorkingHours(value: string | null | undefined): EmployeeWorkingHoursConfig {
  if (!value) return { ...DEFAULT_EMPLOYEE_HOURS };
  try {
    const parsed = JSON.parse(value);
    return { ...DEFAULT_EMPLOYEE_HOURS, ...parsed };
  } catch {
    return { ...DEFAULT_EMPLOYEE_HOURS };
  }
}

interface EmployeeWorkingHoursEditorProps {
  value: EmployeeWorkingHoursConfig;
  onChange: (value: EmployeeWorkingHoursConfig) => void;
  className?: string;
}

export function EmployeeWorkingHoursEditor({ value, onChange, className = "" }: EmployeeWorkingHoursEditorProps) {
  const handleDayChange = (day: keyof EmployeeWorkingHoursConfig, field: "start" | "end", val: string) => {
    const dayConfig = value[day];
    if (dayConfig.start === "closed") return;
    onChange({
      ...value,
      [day]: { ...dayConfig, [field]: val },
    });
  };

  const setDayClosed = (day: keyof EmployeeWorkingHoursConfig, closed: boolean) => {
    onChange({
      ...value,
      [day]: closed ? { start: "closed", end: "closed" } : { start: "09:00", end: "18:00" },
    });
  };

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center gap-2 text-whiskey font-medium">
        <Clock className="w-4 h-4" />
        <span>Ωράριο Υπαλλήλου</span>
      </div>
      <p className="text-gray-400 text-sm">
        Οι ώρες εμφανίζονται στο πλάνο και στις διαθέσιμες ώρες κράτησης για αυτόν τον υπάλληλο.
      </p>
      <div className="grid gap-3">
        {(Object.keys(dayNames) as (keyof EmployeeWorkingHoursConfig)[]).map((day) => {
          const config = value[day];
          const isClosed = config.start === "closed";
          return (
            <div
              key={day}
              className="flex flex-wrap items-center gap-2 p-2 rounded bg-slate/30 border border-steel/50"
            >
              <div className="flex items-center gap-2 w-28">
                <input
                  type="checkbox"
                  id={`emp-wh-${day}`}
                  checked={!isClosed}
                  onChange={(e) => setDayClosed(day, !e.target.checked)}
                  className="rounded border-steel text-whiskey focus:ring-whiskey"
                />
                <Label htmlFor={`emp-wh-${day}`} className="text-white text-sm font-medium cursor-pointer">
                  {dayNames[day]}
                </Label>
              </div>
              {!isClosed && (
                <>
                  <Input
                    type="time"
                    value={config.start}
                    onChange={(e) => handleDayChange(day, "start", e.target.value)}
                    className="w-28 h-8 bg-charcoal border-steel text-white text-sm"
                  />
                  <span className="text-gray-500">–</span>
                  <Input
                    type="time"
                    value={config.end}
                    onChange={(e) => handleDayChange(day, "end", e.target.value)}
                    className="w-28 h-8 bg-charcoal border-steel text-white text-sm"
                  />
                </>
              )}
              {isClosed && <span className="text-gray-500 text-sm">Κλειστό</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
