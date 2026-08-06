import type { TimeEntry } from "@/types";

export interface ProjectPersonActualHours {
  employeeId: string;
  totalHours: number;
  entryCount: number;
  entries: TimeEntry[];
}

export interface ProjectDayActualHours {
  date: string;
  hours: number;
  entries: TimeEntry[];
}

/** People with logged timesheet hours on a project, highest total first. */
export function buildProjectPersonActualHours(
  timeEntries: TimeEntry[],
  projectId: string,
): ProjectPersonActualHours[] {
  const byEmployee = new Map<string, TimeEntry[]>();

  for (const entry of timeEntries) {
    if (entry.project_id !== projectId || entry.hours <= 0) continue;
    const list = byEmployee.get(entry.employee_id) ?? [];
    list.push(entry);
    byEmployee.set(entry.employee_id, list);
  }

  return [...byEmployee.entries()]
    .map(([employeeId, entries]) => ({
      employeeId,
      entries: [...entries].sort((a, b) => b.entry_date.localeCompare(a.entry_date)),
      totalHours: Math.round(entries.reduce((sum, e) => sum + e.hours, 0) * 100) / 100,
      entryCount: entries.length,
    }))
    .sort((a, b) => b.totalHours - a.totalHours || a.employeeId.localeCompare(b.employeeId));
}

/** Day-by-day breakdown for one person's entries on a project (newest first). */
export function buildPersonDayActualHours(entries: TimeEntry[]): ProjectDayActualHours[] {
  const byDate = new Map<string, TimeEntry[]>();

  for (const entry of entries) {
    if (entry.hours <= 0) continue;
    const list = byDate.get(entry.entry_date) ?? [];
    list.push(entry);
    byDate.set(entry.entry_date, list);
  }

  return [...byDate.entries()]
    .map(([date, dayEntries]) => ({
      date,
      entries: dayEntries,
      hours: Math.round(dayEntries.reduce((sum, e) => sum + e.hours, 0) * 100) / 100,
    }))
    .sort((a, b) => b.date.localeCompare(a.date));
}
