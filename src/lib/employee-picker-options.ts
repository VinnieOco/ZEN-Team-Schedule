import type { SearchableSelectOption } from "@/components/ui/searchable-select";
import { getEmployeeFullName } from "@/lib/week";
import type { Employee } from "@/types";

export interface BuildEmployeeSelectOptionsConfig {
  /**
   * When true, only active employees (schedule / time-tracking style).
   * Owner fields should leave this false so inactive people stay selectable.
   */
  activeOnly?: boolean;
}

/** Label for owner/assignee pickers — marks inactive team members. */
export function formatEmployeeOptionLabel(employee: Employee): string {
  const name = getEmployeeFullName(employee);
  return employee.active ? name : `${name} (inactive)`;
}

/**
 * Employees for lead/project/estimate owner pickers.
 * Includes inactive by default; active members sort first, then by name.
 */
export function listEmployeesForOwnerPicker(
  employees: Employee[],
  config: BuildEmployeeSelectOptionsConfig = {},
): Employee[] {
  const activeOnly = config.activeOnly ?? false;
  const list = activeOnly ? employees.filter((e) => e.active) : employees;
  return [...list].sort((a, b) => {
    if (a.active !== b.active) return a.active ? -1 : 1;
    return getEmployeeFullName(a).localeCompare(getEmployeeFullName(b));
  });
}

/** SearchableSelect options for owner / lead / estimator fields. */
export function buildEmployeeSelectOptions(
  employees: Employee[],
  config: BuildEmployeeSelectOptionsConfig = {},
): SearchableSelectOption[] {
  return listEmployeesForOwnerPicker(employees, config).map((employee) => ({
    value: employee.id,
    label: formatEmployeeOptionLabel(employee),
    keywords: [employee.email, employee.department, employee.active ? "" : "inactive"]
      .filter(Boolean)
      .join(" "),
  }));
}
