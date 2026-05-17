import {
  departmentFilterLabel,
  getEmployeeDepartmentKey,
  listDepartmentsFromEmployees,
} from "@/lib/departments";
import {
  filterTimeEntriesForWeek,
  getEmployeeWeekTimeStats,
  getTeamTimeSummary,
} from "@/lib/time-tracking";
import {
  filterAllocationsForWeek,
  getEmployeeWeekStats,
  getTeamSummary,
} from "@/lib/utilization";
import type {
  Allocation,
  CompanySettings,
  Employee,
  EmployeeWeekStats,
  EmployeeWeekTimeStats,
  TeamSummaryStats,
  TeamTimeSummary,
  TimeEntry,
} from "@/types";

export interface DepartmentDashboardSummary {
  departmentKey: string;
  departmentLabel: string;
  memberCount: number;
  utilization: TeamSummaryStats;
  time: TeamTimeSummary;
  overallocated: { employee: Employee; stats: EmployeeWeekStats }[];
  underutilized: { employee: Employee; stats: EmployeeWeekStats }[];
  activeProjectCount: number;
}

function allocationsForEmployees(
  allocations: Allocation[],
  employeeIds: Set<string>,
): Allocation[] {
  return allocations.filter((a) => employeeIds.has(a.employee_id));
}

function entriesForEmployees(entries: TimeEntry[], employeeIds: Set<string>): TimeEntry[] {
  return entries.filter((e) => employeeIds.has(e.employee_id));
}

export function getActiveProjectCountForWeek(
  allocations: Allocation[],
  weekStart: Date,
  settings: CompanySettings,
  employeeIds?: Set<string>,
): number {
  const week = filterAllocationsForWeek(allocations, weekStart, settings);
  const scoped = employeeIds
    ? week.filter((a) => employeeIds.has(a.employee_id))
    : week;
  const projectIds = new Set(
    scoped.map((a) => a.project_id).filter((id): id is string => Boolean(id)),
  );
  return projectIds.size;
}

export function getDepartmentDashboardSummaries(
  employees: Employee[],
  allocations: Allocation[],
  timeEntries: TimeEntry[],
  weekStart: Date,
  settings: CompanySettings,
  configuredDepartments: string[] = [],
): DepartmentDashboardSummary[] {
  const active = employees.filter((e) => e.active);
  const departments = listDepartmentsFromEmployees(active, configuredDepartments);

  return departments.map((departmentKey) => {
    const members = active.filter((e) => getEmployeeDepartmentKey(e) === departmentKey);
    const memberIds = new Set(members.map((e) => e.id));
    const scopedAllocations = allocationsForEmployees(allocations, memberIds);
    const scopedEntries = entriesForEmployees(timeEntries, memberIds);

    const employeeStats = members.map((e) =>
      getEmployeeWeekStats(e, allocations, weekStart, settings),
    );

    const overallocated = employeeStats
      .filter((s) => s.status === "over")
      .sort((a, b) => b.utilizationPercent - a.utilizationPercent)
      .map((stats) => ({
        employee: members.find((e) => e.id === stats.employeeId)!,
        stats,
      }));

    const underutilized = employeeStats
      .filter((s) => s.status === "under")
      .sort((a, b) => a.utilizationPercent - b.utilizationPercent)
      .map((stats) => ({
        employee: members.find((e) => e.id === stats.employeeId)!,
        stats,
      }));

    return {
      departmentKey,
      departmentLabel: departmentFilterLabel(departmentKey),
      memberCount: members.length,
      utilization: getTeamSummary(scopedAllocations, members, weekStart, settings),
      time: getTeamTimeSummary(
        scopedAllocations,
        scopedEntries,
        members,
        weekStart,
        settings,
      ),
      overallocated,
      underutilized,
      activeProjectCount: getActiveProjectCountForWeek(
        allocations,
        weekStart,
        settings,
        memberIds,
      ),
    };
  });
}

export function getMemberDepartmentEmployees(
  employees: Employee[],
  linkedEmployee: Employee | undefined,
): Employee[] {
  if (!linkedEmployee) return [];
  const deptKey = getEmployeeDepartmentKey(linkedEmployee);
  return employees.filter(
    (e) => e.active && getEmployeeDepartmentKey(e) === deptKey,
  );
}

export interface PersonalWeekSummary {
  schedule: EmployeeWeekStats;
  time: EmployeeWeekTimeStats;
}

export function getPersonalWeekSummary(
  employee: Employee,
  allocations: Allocation[],
  timeEntries: TimeEntry[],
  weekStart: Date,
  settings: CompanySettings,
): PersonalWeekSummary {
  return {
    schedule: getEmployeeWeekStats(employee, allocations, weekStart, settings),
    time: getEmployeeWeekTimeStats(employee, allocations, timeEntries, weekStart, settings),
  };
}
