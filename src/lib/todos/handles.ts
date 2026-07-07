import type { Employee } from "@/types";

const HANDLE_PATTERN = /^[a-z0-9][a-z0-9._-]{1,30}$/;

export function normalizeHandle(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9._-]/g, "");
}

export function isValidHandle(value: string): boolean {
  const normalized = normalizeHandle(value);
  return normalized.length >= 2 && HANDLE_PATTERN.test(normalized);
}

export function suggestEmployeeHandle(
  employee: Pick<Employee, "email" | "first_name" | "last_name">,
  takenHandles: Set<string>,
): string {
  const candidates: string[] = [];

  if (employee.email) {
    const local = normalizeHandle(employee.email.split("@")[0] ?? "");
    if (local.length >= 2) candidates.push(local);
  }

  const first = normalizeHandle(employee.first_name);
  const last = normalizeHandle(employee.last_name);
  if (first && last) {
    candidates.push(`${first[0]}${last}`);
  }
  if (last.length >= 2) {
    candidates.push(last);
  }

  for (const candidate of candidates) {
    if (!takenHandles.has(candidate)) return candidate;
  }

  const base = candidates[0] ?? "user";
  let suffix = 2;
  while (takenHandles.has(`${base}${suffix}`)) {
    suffix += 1;
  }
  return `${base}${suffix}`;
}

export function buildHandleMap(employees: Employee[]): Map<string, Employee> {
  const map = new Map<string, Employee>();
  for (const employee of employees) {
    if (!employee.handle) continue;
    map.set(employee.handle.toLowerCase(), employee);
  }
  return map;
}

export function getEmployeeHandleLabel(employee: Employee): string | null {
  return employee.handle ? `@${employee.handle}` : null;
}
