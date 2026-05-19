import { format, parseISO } from "date-fns";

import { downloadCsv, rowsToCsv } from "@/lib/csv-export";
import {
  filterAllocationsForMonth,
  filterAllocationsForWeek,
  getEmployeeMonthStats,
  getEmployeeWeekStats,
  getProjectBudgetStats,
} from "@/lib/utilization";
import {
  filterTimeEntriesForMonth,
  filterTimeEntriesForWeek,
  getEmployeeMonthTimeStats,
  getEmployeeWeekTimeStats,
  varianceLabel,
} from "@/lib/time-tracking";
import { formatMonthRange, formatWeekRange, getWeekStart } from "@/lib/week";
import type {
  Allocation,
  AllocationCategory,
  CompanySettings,
  Employee,
  Project,
  ProjectNote,
  TimeEntry,
} from "@/types";

export type ReportsPeriod = "week" | "month";

export interface ReportsExportContext {
  period: ReportsPeriod;
  periodStart: Date;
  settings: CompanySettings;
  employees: Employee[];
  projects: Project[];
  categories: AllocationCategory[];
  allocations: Allocation[];
  timeEntries: TimeEntry[];
  projectNotes: ProjectNote[];
  getEmployeeById: (id: string) => Employee | undefined;
  getProjectById: (id: string) => Project | undefined;
  getCategoryById: (id: string) => AllocationCategory | undefined;
  getEmployeeFullName: (e: { first_name: string; last_name: string }) => string;
}

function periodFileSuffix(ctx: ReportsExportContext): string {
  if (ctx.period === "month") {
    return format(ctx.periodStart, "yyyy-MM");
  }
  return format(getWeekStart(ctx.periodStart, ctx.settings), "yyyy-MM-dd") + "_week";
}

function periodLabel(ctx: ReportsExportContext): string {
  if (ctx.period === "month") {
    return formatMonthRange(ctx.periodStart);
  }
  return formatWeekRange(ctx.periodStart, ctx.settings);
}

function periodAllocations(ctx: ReportsExportContext): Allocation[] {
  if (ctx.period === "month") {
    return filterAllocationsForMonth(ctx.allocations, ctx.periodStart, ctx.settings);
  }
  return filterAllocationsForWeek(
    ctx.allocations,
    getWeekStart(ctx.periodStart, ctx.settings),
    ctx.settings,
  );
}

const RECENT_PROJECT_NOTES = 3;

function noteCreatedAtMs(note: ProjectNote): number {
  return new Date(note.created_at).getTime();
}

function recentProjectNotes(
  notes: ProjectNote[],
  projectId: string,
  limit = RECENT_PROJECT_NOTES,
): ProjectNote[] {
  return notes
    .filter((n) => n.project_id === projectId)
    .sort((a, b) => noteCreatedAtMs(b) - noteCreatedAtMs(a))
    .slice(0, limit);
}

function formatNoteExportDate(iso: string): string {
  try {
    return format(parseISO(iso), "yyyy-MM-dd");
  } catch {
    return iso;
  }
}

function periodTimeEntries(ctx: ReportsExportContext): TimeEntry[] {
  if (ctx.period === "month") {
    return filterTimeEntriesForMonth(ctx.timeEntries, ctx.periodStart, ctx.settings);
  }
  return filterTimeEntriesForWeek(
    ctx.timeEntries,
    getWeekStart(ctx.periodStart, ctx.settings),
    ctx.settings,
  );
}

export function exportTeamUtilizationCsv(ctx: ReportsExportContext): void {
  const weekStart = getWeekStart(ctx.periodStart, ctx.settings);
  const rows = ctx.employees.filter((e) => e.active).map((employee) => {
    if (ctx.period === "month") {
      const stats = getEmployeeMonthStats(
        employee,
        ctx.allocations,
        ctx.periodStart,
        ctx.settings,
      );
      return [
        ctx.getEmployeeFullName(employee),
        employee.role,
        String(stats.scheduledHours),
        String(stats.monthlyCapacity),
        String(stats.billableHours),
        String(stats.nonBillableHours),
        String(stats.utilizationPercent),
        stats.status,
      ];
    }
    const stats = getEmployeeWeekStats(employee, ctx.allocations, weekStart, ctx.settings);
    return [
      ctx.getEmployeeFullName(employee),
      employee.role,
      String(stats.scheduledHours),
      String(stats.weeklyCapacity),
      String(stats.billableHours),
      String(stats.nonBillableHours),
      String(stats.utilizationPercent),
      stats.status,
    ];
  });

  const capacityHeader = ctx.period === "month" ? "Monthly capacity (h)" : "Weekly capacity (h)";
  const csv = rowsToCsv(
    [
      "Team member",
      "Role",
      "Scheduled (h)",
      capacityHeader,
      "Billable (h)",
      "Non-billable (h)",
      "Utilization %",
      "Status",
    ],
    rows,
  );
  downloadCsv(`team-utilization_${periodFileSuffix(ctx)}.csv`, csv);
}

export function exportProjectBudgetCsv(ctx: ReportsExportContext): void {
  const weekStart = getWeekStart(ctx.periodStart, ctx.settings);
  const rows = ctx.projects
    .filter((p) => p.active)
    .map((project) => {
      const stats = getProjectBudgetStats(
        ctx.allocations,
        project.id,
        project.budgeted_design_hours,
        weekStart,
        ctx.settings,
      );
      return [
        project.project_name,
        project.client_name,
        project.department?.trim() ?? "",
        String(project.budgeted_design_hours),
        String(stats.scheduledAllTime),
        String(stats.scheduledThisWeek),
        String(stats.remaining),
        String(stats.percentUsed),
        stats.status,
      ];
    });

  const csv = rowsToCsv(
    [
      "Project",
      "Client",
      "Department",
      "Budget (h)",
      "Scheduled all-time (h)",
      "Scheduled this week (h)",
      "Remaining (h)",
      "% used",
      "Budget status",
    ],
    rows,
  );
  downloadCsv(`project-budget_${periodFileSuffix(ctx)}.csv`, csv);
}

export function exportScheduledVsActualCsv(ctx: ReportsExportContext): void {
  const weekStart = getWeekStart(ctx.periodStart, ctx.settings);
  const rows = ctx.employees
    .filter((e) => e.active)
    .map((employee) => {
      const stats =
        ctx.period === "month"
          ? getEmployeeMonthTimeStats(
              employee,
              ctx.allocations,
              ctx.timeEntries,
              ctx.periodStart,
              ctx.settings,
            )
          : getEmployeeWeekTimeStats(
              employee,
              ctx.allocations,
              ctx.timeEntries,
              weekStart,
              ctx.settings,
            );
      return [
        ctx.getEmployeeFullName(employee),
        employee.role,
        String(stats.scheduledHours),
        String(stats.actualHours),
        varianceLabel(stats.varianceHours),
        String(stats.varianceHours),
      ];
    });

  const csv = rowsToCsv(
    ["Team member", "Role", "Scheduled (h)", "Actual (h)", "Variance", "Variance (h)"],
    rows,
  );
  downloadCsv(`scheduled-vs-actual_${periodFileSuffix(ctx)}.csv`, csv);
}

export function exportAllocationsDetailCsv(ctx: ReportsExportContext): void {
  const allocs = periodAllocations(ctx).sort((a, b) =>
    a.allocation_date.localeCompare(b.allocation_date),
  );
  const rows = allocs.map((a) => {
    const employee = ctx.getEmployeeById(a.employee_id);
    const project = a.project_id ? ctx.getProjectById(a.project_id) : null;
    const category = ctx.getCategoryById(a.allocation_category_id);
    return [
      a.allocation_date,
      employee ? ctx.getEmployeeFullName(employee) : "",
      project?.project_name ?? a.task_name ?? "",
      category?.name ?? "",
      String(a.hours),
      a.is_billable ? "Yes" : "No",
      a.phase ?? "",
      a.notes ?? "",
    ];
  });

  const csv = rowsToCsv(
    [
      "Date",
      "Team member",
      "Project / task",
      "Category",
      "Hours",
      "Billable",
      "Phase",
      "Notes",
    ],
    rows,
  );
  downloadCsv(`allocations_${periodFileSuffix(ctx)}.csv`, csv);
}

export function exportProjectTeamNotesCsv(ctx: ReportsExportContext): void {
  const sortedProjects = [...ctx.projects].sort((a, b) => {
    const client = a.client_name.localeCompare(b.client_name);
    if (client !== 0) return client;
    return a.project_name.localeCompare(b.project_name);
  });

  const noteHeaders = Array.from({ length: RECENT_PROJECT_NOTES }, (_, i) => {
    const n = i + 1;
    return [`Note ${n} date`, `Note ${n}`];
  }).flat();

  const rows = sortedProjects.map((project) => {
    const notes = recentProjectNotes(ctx.projectNotes, project.id);
    const noteCells = Array.from({ length: RECENT_PROJECT_NOTES }, (_, i) => {
      const note = notes[i];
      if (!note) return ["", ""];
      return [formatNoteExportDate(note.created_at), note.body.trim()];
    }).flat();

    return [
      project.project_name,
      project.client_name,
      project.department?.trim() ?? "",
      project.active ? "Yes" : "No",
      ...noteCells,
    ];
  });

  const csv = rowsToCsv(
    ["Project", "Client", "Department", "Active", ...noteHeaders],
    rows,
  );
  downloadCsv(`project-team-notes_${format(new Date(), "yyyy-MM-dd")}.csv`, csv);
}

export function exportTimeEntriesDetailCsv(ctx: ReportsExportContext): void {
  const entries = periodTimeEntries(ctx).sort((a, b) => a.entry_date.localeCompare(b.entry_date));
  const rows = entries.map((e) => {
    const employee = ctx.getEmployeeById(e.employee_id);
    const project = e.project_id ? ctx.getProjectById(e.project_id) : null;
    const category = ctx.getCategoryById(e.allocation_category_id);
    return [
      e.entry_date,
      employee ? ctx.getEmployeeFullName(employee) : "",
      project?.project_name ?? e.task_name ?? "",
      category?.name ?? "",
      String(e.hours),
      e.is_billable ? "Yes" : "No",
      e.phase ?? "",
      e.notes ?? "",
    ];
  });

  const csv = rowsToCsv(
    [
      "Date",
      "Team member",
      "Project / task",
      "Category",
      "Hours",
      "Billable",
      "Phase",
      "Notes",
    ],
    rows,
  );
  downloadCsv(`time-entries_${periodFileSuffix(ctx)}.csv`, csv);
}

export function exportAllReportsCsv(ctx: ReportsExportContext): void {
  exportTeamUtilizationCsv(ctx);
  exportProjectBudgetCsv(ctx);
  exportScheduledVsActualCsv(ctx);
  exportProjectTeamNotesCsv(ctx);
  exportAllocationsDetailCsv(ctx);
  exportTimeEntriesDetailCsv(ctx);
}

export { periodLabel };
