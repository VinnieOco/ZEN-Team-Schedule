import { format, parseISO } from "date-fns";

import type { AllocationCategory, Employee, Project, TimeEntry, TimeEntryFormValues } from "@/types";
import { getEmployeeFullName } from "@/lib/week";

export const TIMESHEET_HOUR_STEP = 0.25;

export interface TimesheetRow {
  key: string;
  /** Stable id for this line across the week; stored on each day entry. */
  timesheet_line_id: string;
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

function groupingKeyForEntry(entry: TimeEntry): string {
  if (entry.timesheet_line_id) return `line:${entry.timesheet_line_id}`;
  return `legacy:${timesheetRowKey({
    project_id: entry.project_id,
    task_name: entry.task_name ?? "",
    allocation_category_id: entry.allocation_category_id,
    is_billable: entry.is_billable,
    class_code: entry.class_code,
  })}`;
}

/** Deterministic UUID so legacy grouped rows stay stable across reloads. */
function stableUuidFromString(input: string): string {
  let h1 = 0x811c9dc5;
  let h2 = 0x9e3779b9;
  for (let i = 0; i < input.length; i++) {
    h1 ^= input.charCodeAt(i);
    h1 = Math.imul(h1, 0x01000193);
    h2 ^= input.charCodeAt(i) + i * 17;
    h2 = Math.imul(h2, 0x01000193);
  }
  const hex = (n: number) => (n >>> 0).toString(16).padStart(8, "0");
  const raw = `${hex(h1)}${hex(h2)}${hex(h1 ^ h2)}${hex(~h2)}`;
  return `${raw.slice(0, 8)}-${raw.slice(8, 12)}-5${raw.slice(13, 16)}-a${raw.slice(17, 20)}-${raw.slice(20, 32)}`;
}

export function entriesToTimesheetRows(
  entries: TimeEntry[],
  weekDateKeys: string[],
): TimesheetRow[] {
  const map = new Map<string, TimesheetRow>();

  for (const entry of entries) {
    const groupKey = groupingKeyForEntry(entry);
    const lineId = entry.timesheet_line_id ?? stableUuidFromString(groupKey);

    let row = map.get(groupKey);
    if (!row) {
      row = {
        key: lineId,
        timesheet_line_id: lineId,
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
      map.set(groupKey, row);
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
  const lineId = crypto.randomUUID();
  return {
    key: lineId,
    timesheet_line_id: lineId,
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
    timesheet_line_id: row.timesheet_line_id,
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

function dateSearchTokens(dateKey: string): string[] {
  try {
    const date = parseISO(dateKey);
    return [
      dateKey,
      format(date, "M/d/yyyy"),
      format(date, "MMM d"),
      format(date, "EEE M/d"),
      format(date, "EEEE"),
    ];
  } catch {
    return [dateKey];
  }
}

/** Normalize separators so "Acme Kitchen" matches "Acme · Kitchen". */
function normalizeSearchText(text: string): string {
  return text.toLowerCase().replace(/[·•|,;/]+/g, " ");
}

/** Every whitespace-separated token must appear in the haystack. */
export function matchesTextSearch(haystack: string, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const normalized = normalizeSearchText(haystack);
  const tokens = q.split(/\s+/).filter(Boolean);
  return tokens.every((token) => normalized.includes(token));
}

export function timesheetRowMatchesSearch(
  row: TimesheetRow,
  weekDateKeys: string[],
  query: string,
  getProjectById: (id: string) => Project | undefined,
  getCategoryById: (id: string) => AllocationCategory | undefined,
): boolean {
  if (!query.trim()) return true;

  const jobLabel = getTimesheetLineLabel(row, (id) => {
    const project = getProjectById(id);
    return project
      ? { client_name: project.client_name, project_name: project.project_name }
      : undefined;
  });
  const project = row.project_id ? getProjectById(row.project_id) : undefined;
  const category = getCategoryById(row.allocation_category_id);
  const activeDateKeys = weekDateKeys.filter((dateKey) => (row.hoursByDay[dateKey] ?? 0) > 0);
  const dateText = activeDateKeys.flatMap(dateSearchTokens).join(" ");

  const haystack = [
    jobLabel,
    project?.client_name,
    project?.project_name,
    project?.project_number,
    row.task_name,
    category?.name,
    row.notes,
    row.class_code,
    row.phase,
    dateText,
  ]
    .filter(Boolean)
    .join(" ");

  return matchesTextSearch(haystack, query);
}

export interface TimesheetWithEmployee {
  employee: Employee;
  rows: TimesheetRow[];
}

/** Filter weekly timesheets by employee name/role or line fields (job, class, project, date, notes). */
export function filterTimesheetsBySearch<T extends TimesheetWithEmployee>(
  timesheets: T[],
  query: string,
  weekDateKeys: string[],
  getProjectById: (id: string) => Project | undefined,
  getCategoryById: (id: string) => AllocationCategory | undefined,
): T[] {
  if (!query.trim()) return timesheets;

  return timesheets
    .map((timesheet) => {
      const employeeHaystack = [
        getEmployeeFullName(timesheet.employee),
        timesheet.employee.role,
        timesheet.employee.email,
        timesheet.employee.department,
      ]
        .filter(Boolean)
        .join(" ");

      const matchingRows = timesheet.rows.filter((row) =>
        timesheetRowMatchesSearch(row, weekDateKeys, query, getProjectById, getCategoryById),
      );

      if (matchesTextSearch(employeeHaystack, query)) return timesheet;
      if (matchingRows.length > 0) {
        const totalHours = matchingRows.reduce(
          (sum, row) => sum + rowTotalHours(row, weekDateKeys),
          0,
        );
        return { ...timesheet, rows: matchingRows, totalHours };
      }
      return null;
    })
    .filter((timesheet): timesheet is T => timesheet != null);
}

/** Parse and snap hours to 0.25 increments. */
export function parseHoursInput(value: string): number {
  if (value.trim() === "") return 0;
  const n = Number.parseFloat(value);
  if (!Number.isFinite(n) || n < 0) return 0;
  const quarters = Math.round(n / TIMESHEET_HOUR_STEP);
  return quarters * TIMESHEET_HOUR_STEP;
}
