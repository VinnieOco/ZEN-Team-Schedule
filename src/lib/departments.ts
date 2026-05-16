import type { Employee } from "@/types";

/** Filter value for employees with no department set. */
export const UNASSIGNED_DEPARTMENT = "__unassigned__";

export function getEmployeeDepartmentKey(employee: Employee): string {
  const trimmed = employee.department?.trim();
  return trimmed ? trimmed : UNASSIGNED_DEPARTMENT;
}

export function departmentFilterLabel(departmentKey: string): string {
  return departmentKey === UNASSIGNED_DEPARTMENT ? "Unassigned" : departmentKey;
}

export function listDepartmentsFromEmployees(
  employees: Employee[],
  configuredDepartments: string[] = [],
): string[] {
  const keys = new Set<string>();
  for (const name of configuredDepartments) {
    const trimmed = name.trim();
    if (trimmed) keys.add(trimmed);
  }
  for (const employee of employees) {
    if (!employee.active) continue;
    keys.add(getEmployeeDepartmentKey(employee));
  }
  return [...keys].sort((a, b) => {
    if (a === UNASSIGNED_DEPARTMENT) return 1;
    if (b === UNASSIGNED_DEPARTMENT) return -1;
    return a.localeCompare(b);
  });
}

export function employeeMatchesDepartmentFilter(
  employee: Employee,
  department: string | null,
): boolean {
  if (!department) return true;
  return getEmployeeDepartmentKey(employee) === department;
}

export function filterEmployeesByDepartment(
  employees: Employee[],
  department: string | null,
): Employee[] {
  return employees.filter((e) => employeeMatchesDepartmentFilter(e, department));
}
