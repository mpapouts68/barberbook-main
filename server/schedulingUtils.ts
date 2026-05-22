export function addMinutesToTime(timeStr: string, minutes: number): string {
  const [hours, mins] = timeStr.split(":").map(Number);
  const date = new Date();
  date.setHours(hours, mins, 0, 0);
  date.setMinutes(date.getMinutes() + minutes);
  return date.toTimeString().slice(0, 5);
}

function timeToMinutes(timeStr: string): number {
  const [hours, minutes] = timeStr.split(":").map(Number);
  return hours * 60 + minutes;
}

export function timeSlotsOverlap(
  slot1Start: string,
  slot1End: string,
  slot2Start: string,
  slot2End: string,
): boolean {
  const start1 = timeToMinutes(slot1Start);
  const end1 = timeToMinutes(slot1End);
  const start2 = timeToMinutes(slot2Start);
  const end2 = timeToMinutes(slot2End);
  return start1 < end2 && start2 < end1;
}

function normalizeWorkingHours(
  hours: unknown,
): Array<{ start: string; end: string }> | null {
  if (
    !hours ||
    hours === "closed" ||
    (typeof hours === "object" &&
      hours !== null &&
      "start" in hours &&
      (hours as { start: string }).start === "closed")
  ) {
    return null;
  }
  if (Array.isArray(hours)) {
    return hours as Array<{ start: string; end: string }>;
  }
  if (
    typeof hours === "object" &&
    hours !== null &&
    "start" in hours &&
    "end" in hours
  ) {
    return [hours as { start: string; end: string }];
  }
  return null;
}

export function getWorkingHoursRanges(
  workingHours: Record<string, unknown>,
  dayOfWeek: string,
): Array<{ start: string; end: string }> | null {
  let dayName = dayOfWeek.toLowerCase();
  const fullDayNames = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
  ];
  if (!fullDayNames.includes(dayName)) {
    const dayMap: Record<string, string> = {
      sun: "sunday",
      mon: "monday",
      tue: "tuesday",
      wed: "wednesday",
      thu: "thursday",
      fri: "friday",
      sat: "saturday",
    };
    dayName = dayMap[dayName] || dayName;
  }
  const dayConfig = workingHours[dayName];
  return normalizeWorkingHours(dayConfig);
}

function intersectRanges(
  range1: { start: string; end: string },
  range2: { start: string; end: string },
): { start: string; end: string } | null {
  const [start1Hour, start1Min] = range1.start.split(":").map(Number);
  const [end1Hour, end1Min] = range1.end.split(":").map(Number);
  const [start2Hour, start2Min] = range2.start.split(":").map(Number);
  const [end2Hour, end2Min] = range2.end.split(":").map(Number);

  const start1 = start1Hour * 60 + start1Min;
  const end1 = end1Hour * 60 + end1Min;
  const start2 = start2Hour * 60 + start2Min;
  const end2 = end2Hour * 60 + end2Min;

  const intersectStart = Math.max(start1, start2);
  const intersectEnd = Math.min(end1, end2);

  if (intersectStart >= intersectEnd) {
    return null;
  }

  const startHour = Math.floor(intersectStart / 60);
  const startMin = intersectStart % 60;
  const endHour = Math.floor(intersectEnd / 60);
  const endMin = intersectEnd % 60;

  return {
    start: `${String(startHour).padStart(2, "0")}:${String(startMin).padStart(2, "0")}`,
    end: `${String(endHour).padStart(2, "0")}:${String(endMin).padStart(2, "0")}`,
  };
}

export function intersectRangeSets(
  ranges1: Array<{ start: string; end: string }>,
  ranges2: Array<{ start: string; end: string }>,
): Array<{ start: string; end: string }> {
  const intersections: Array<{ start: string; end: string }> = [];

  for (const range1 of ranges1) {
    for (const range2 of ranges2) {
      const intersection = intersectRanges(range1, range2);
      if (intersection) {
        intersections.push(intersection);
      }
    }
  }

  intersections.sort((a, b) => a.start.localeCompare(b.start));

  if (intersections.length === 0) return [];

  const merged: Array<{ start: string; end: string }> = [intersections[0]];
  for (let i = 1; i < intersections.length; i++) {
    const current = intersections[i];
    const last = merged[merged.length - 1];

    const [currentStartHour, currentStartMin] = current.start.split(":").map(Number);
    const [lastEndHour, lastEndMin] = last.end.split(":").map(Number);
    const currentStart = currentStartHour * 60 + currentStartMin;
    const lastEnd = lastEndHour * 60 + lastEndMin;

    if (currentStart <= lastEnd) {
      const [currentEndHour, currentEndMin] = current.end.split(":").map(Number);
      const currentEnd = currentEndHour * 60 + currentEndMin;
      const newEnd = Math.max(lastEnd, currentEnd);
      const newEndHour = Math.floor(newEnd / 60);
      const newEndMin = newEnd % 60;
      last.end = `${String(newEndHour).padStart(2, "0")}:${String(newEndMin).padStart(2, "0")}`;
    } else {
      merged.push(current);
    }
  }

  return merged;
}
