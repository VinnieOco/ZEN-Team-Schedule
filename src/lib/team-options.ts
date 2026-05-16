import { listDepartmentsFromEmployees } from "@/lib/departments";
import type { CompanySettings, Employee } from "@/types";
import { DEFAULT_DEPARTMENTS, DEFAULT_JOB_ROLES } from "@/types";

function uniqueSorted(values: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const trimmed = value.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(trimmed);
  }
  return result.sort((a, b) => a.localeCompare(b));
}

export function resolveJobRoles(settings: CompanySettings): string[] {
  return settings.job_roles?.length ? settings.job_roles : DEFAULT_JOB_ROLES;
}

export function resolveDepartments(settings: CompanySettings): string[] {
  return settings.departments?.length ? settings.departments : DEFAULT_DEPARTMENTS;
}

export function getJobRoleOptions(settings: CompanySettings, employees: Employee[]): string[] {
  const inUse = employees.filter((e) => e.active).map((e) => e.role);
  return uniqueSorted([...resolveJobRoles(settings), ...inUse]);
}

export function getDepartmentOptions(settings: CompanySettings, employees: Employee[]): string[] {
  return listDepartmentsFromEmployees(employees, resolveDepartments(settings));
}

export function appendJobRole(settings: CompanySettings, role: string): string[] | null {
  const trimmed = role.trim();
  if (!trimmed) return null;
  const current = resolveJobRoles(settings);
  if (current.some((r) => r.toLowerCase() === trimmed.toLowerCase())) return null;
  return uniqueSorted([...current, trimmed]);
}

export function appendDepartment(
  settings: CompanySettings,
  department: string,
): string[] | null {
  const trimmed = department.trim();
  if (!trimmed) return null;
  const current = resolveDepartments(settings);
  if (current.some((d) => d.toLowerCase() === trimmed.toLowerCase())) return null;
  return uniqueSorted([...current, trimmed]);
}

export function removeFromList(list: string[], value: string): string[] {
  const target = value.trim().toLowerCase();
  return list.filter((item) => item.trim().toLowerCase() !== target);
}

export function normalizeCompanySettings(settings: CompanySettings): CompanySettings {
  return {
    ...settings,
    job_roles: resolveJobRoles(settings),
    departments: resolveDepartments(settings),
  };
}
