import { getEmployeeFullName } from "@/lib/week";
import type { Allocation, Employee, ScheduledProjectPhase } from "@/types";

export interface PhaseStaffingSegment {
  employeeId: string;
  employeeName: string;
  firstName: string;
  initials: string;
  startDate: string;
  endDate: string;
  totalHours: number;
}

function allocationMatchesPhase(allocation: Allocation, phaseKey: string): boolean {
  const phase = allocation.phase?.trim();
  if (phase) return phase === phaseKey;
  return phaseKey === "Concept";
}

function buildStaffingSegments(
  allocations: Allocation[],
  employees: Employee[],
  matched: Allocation[],
): PhaseStaffingSegment[] {
  const byEmployee = new Map<string, Allocation[]>();
  for (const allocation of matched) {
    const list = byEmployee.get(allocation.employee_id) ?? [];
    list.push(allocation);
    byEmployee.set(allocation.employee_id, list);
  }

  return Array.from(byEmployee.entries())
    .map(([employeeId, employeeAllocations]) => {
      const dates = employeeAllocations.map((a) => a.allocation_date).sort();
      const employee = employees.find((e) => e.id === employeeId);
      const firstName = employee?.first_name?.trim() ?? "";
      const lastName = employee?.last_name?.trim() ?? "";
      const initials =
        firstName && lastName
          ? `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase()
          : "?";

      return {
        employeeId,
        employeeName: employee ? getEmployeeFullName(employee) : "Unknown",
        firstName: firstName || "Unknown",
        initials,
        startDate: dates[0]!,
        endDate: dates[dates.length - 1]!,
        totalHours: employeeAllocations.reduce((sum, a) => sum + a.hours, 0),
      };
    })
    .sort((a, b) => a.employeeName.localeCompare(b.employeeName));
}

export function staffingForPhase(
  allocations: Allocation[],
  employees: Employee[],
  projectId: string,
  phase: ScheduledProjectPhase,
): PhaseStaffingSegment[] {
  if (!phase.start_date || !phase.end_date) return [];

  const matched = allocations.filter(
    (allocation) =>
      allocation.project_id === projectId &&
      allocation.allocation_date >= phase.start_date! &&
      allocation.allocation_date <= phase.end_date! &&
      allocationMatchesPhase(allocation, phase.phase_key),
  );

  return buildStaffingSegments(allocations, employees, matched);
}

/** Staffing across a project timeline (firm Gantt row). */
export function staffingForProject(
  allocations: Allocation[],
  employees: Employee[],
  projectId: string,
  phases: ScheduledProjectPhase[],
): PhaseStaffingSegment[] {
  const datedPhases = phases.filter((phase) => phase.start_date && phase.end_date);
  if (datedPhases.length === 0) return [];

  let minStart = datedPhases[0]!.start_date!;
  let maxEnd = datedPhases[0]!.end_date!;
  for (const phase of datedPhases) {
    if (phase.start_date! < minStart) minStart = phase.start_date!;
    if (phase.end_date! > maxEnd) maxEnd = phase.end_date!;
  }

  const matched = allocations.filter(
    (allocation) =>
      allocation.project_id === projectId &&
      allocation.allocation_date >= minStart &&
      allocation.allocation_date <= maxEnd,
  );

  return buildStaffingSegments(allocations, employees, matched);
}
