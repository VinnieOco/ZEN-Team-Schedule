import type { TimeEntry, TimeEntryFormValues } from "@/types";
import { formatDateKey } from "@/lib/week";

export const TIMESHEET_HOUR_STEP = 0.25;

export interface TimesheetRow {
  key: string;
  project_id: string | null;
  /** True when logging non-project time (PTO, admin, etc.). */
  is_non_project: boolean;
  task_name: string;
  allocation_category_id: string;
  is_billable: boolean;
  phase?: string;
  notes?: string;
  class_code?: string;
  hoursByDay: Record<string, number>;
  entryIdsByDay: Record<string, string | undefined>;
}

export function timesheetRowKey(parts: {
  project_id: string | null;
  task_name: string;
  allocation_category_id: string;
  is_billable: boolean;
  class_code?: string;
}): string {
  const projectPart = parts.project_id ?? `task:${parts.task_name.trim().toLowerCase()}`;
  const classPart = (parts.class_code ?? "").trim().toLowerCase();
  return `${projectPart}:${parts.allocation_category_id}:${parts.is_billable ? "1" : "0"}:${classPart}`;
}

export function entriesToTimesheetRows(
  entries: TimeEntry[],
  weekDateKeys: string[],
): TimesheetRow[] {
  const map = new Map<string, TimesheetRow>();

  for (const entry of entries) {
    const key = timesheetRowKey({
      project_id: entry.project_id,
      task_name: entry.task_name ?? "",
      allocation_category_id: entry.allocation_category_id,
      is_billable: entry.is_billable,
      class_code: entry.class_code,
    });

    let row = map.get(key);
    if (!row) {
      row = {
        key,
        project_id: entry.project_id,
        is_non_project: entry.project_id == null,
        task_name: entry.task_name ?? "",
        allocation_category_id: entry.allocation_category_id,
        is_billable: entry.is_billable,
        phase: entry.phase,
        notes: entry.notes,
        class_code: entry.class_code,
        hoursByDay: Object.fromEntries(weekDateKeys.map((d) => [d, 0])),
        entryIdsByDay: Object.fromEntries(weekDateKeys.map((d) => [d, undefined])),
      };
      map.set(key, row);
    }

    if (entry.notes && !row.notes) row.notes = entry.notes;
    if (entry.phase && !row.phase) row.phase = entry.phase;
    if (entry.class_code && !row.class_code) row.class_code = entry.class_code;

    row.hoursByDay[entry.entry_date] = entry.hours;
    row.entryIdsByDay[entry.entry_date] = entry.id;
  }

  return [...map.values()].sort((a, b) => {
    const labelA = a.project_id ?? a.task_name;
    const labelB = b.project_id ?? b.task_name;
    return labelA.localeCompare(labelB);
  });
}

export function createEmptyTimesheetRow(
  weekDateKeys: string[],
  defaults: {
    allocation_category_id: string;
    is_billable: boolean;
    class_code?: string;
  },
): TimesheetRow {
  const key = `new-${crypto.randomUUID()}`;
  return {
    key,
    project_id: null,
    is_non_project: false,
    task_name: "",
    allocation_category_id: defaults.allocation_category_id,
    is_billable: defaults.is_billable,
    notes: "",
    class_code: defaults.class_code ?? "",
    hoursByDay: Object.fromEntries(weekDateKeys.map((d) => [d, 0])),
    entryIdsByDay: Object.fromEntries(weekDateKeys.map((d) => [d, undefined])),
  };
}

/** Saved rows are read-only on the timesheet; edit or delete via the Entries tab. */
export function isTimesheetRowLocked(row: TimesheetRow): boolean {
  return Object.values(row.entryIdsByDay).some((id) => id != null);
}

export function rowTotalHours(row: TimesheetRow, weekDateKeys: string[]): number {
  return weekDateKeys.reduce((sum, d) => sum + (row.hoursByDay[d] ?? 0), 0);
}

export function dayTotalHours(rows: TimesheetRow[], dateKey: string): number {
  return rows.reduce((sum, row) => sum + (row.hoursByDay[dateKey] ?? 0), 0);
}

export function timesheetGrandTotal(rows: TimesheetRow[], weekDateKeys: string[]): number {
  return weekDateKeys.reduce((sum, d) => sum + dayTotalHours(rows, d), 0);
}

export function rowToFormValues(
  row: TimesheetRow,
  employeeId: string,
  dateKey: string,
  hours: number,
): TimeEntryFormValues {
  return {
    employee_id: employeeId,
    project_id: row.is_non_project ? null : row.project_id,
    task_name: row.is_non_project ? row.task_name.trim() : "",
    entry_date: dateKey,
    hours,
    allocation_category_id: row.allocation_category_id,
    is_billable: row.is_billable,
    phase: row.phase,
    notes: row.notes,
    class_code: row.class_code?.trim() || undefined,
  };
}

export interface EmployeeTimesheetSummary {
  employeeId: string;
  rows: TimesheetRow[];
  totalHours: number;
}

/** Group week entries into per-employee timesheets (one timesheet per team member per week). */
export function buildEmployeeTimesheetSummaries(
  entries: TimeEntry[],
  weekDateKeys: string[],
): EmployeeTimesheetSummary[] {
  const byEmployee = new Map<string, TimeEntry[]>();
  for (const entry of entries) {
    const list = byEmployee.get(entry.employee_id) ?? [];
    list.push(entry);
    byEmployee.set(entry.employee_id, list);
  }

  return [...byEmployee.entries()]
    .map(([employeeId, employeeEntries]) => {
      const rows = entriesToTimesheetRows(employeeEntries, weekDateKeys);
      const totalHours = employeeEntries.reduce((sum, e) => sum + e.hours, 0);
      return { employeeId, rows, totalHours };
    })
    .sort((a, b) => a.employeeId.localeCompare(b.employeeId));
}

export function getTimesheetLineLabel(
  row: TimesheetRow,
  getProjectName: (projectId: string) => { client_name: string; project_name: string } | undefined,
): string {
  if (row.is_non_project) return row.task_name.trim() || "Non-project time";
  if (!row.project_id) return "—";
  const project = getProjectName(row.project_id);
  return project ? `${project.client_name} · ${project.project_name}` : "—";
}

/** Parse and snap hours to 0.25 increments. */
export function parseHoursInput(value: string): number {
  if (value.trim() === "") return 0;
  const n = Number.parseFloat(value);
  if (!Number.isFinite(n) || n < 0) return 0;
  const quarters = Math.round(n / TIMESHEET_HOUR_STEP);
  return quarters * TIMESHEET_HOUR_STEP;
}
