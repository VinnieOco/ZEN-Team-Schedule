import { getEmployeeDepartmentKey } from "@/lib/departments";
import type { Employee } from "@/types";

import type { AppPermissions } from "./permissions";
import type { AppRole } from "./roles";

export function canEditAllocation(
  permissions: AppPermissions,
  role: AppRole | null | undefined,
  targetEmployeeId: string,
  linkedEmployeeId: string | null,
  getEmployeeById: (id: string) => Employee | undefined,
): boolean {
  if (permissions.editSchedulingForAnyone) return true;
  if (!permissions.editScheduling || !linkedEmployeeId) return false;

  const linked = getEmployeeById(linkedEmployeeId);
  if (!linked) return false;

  if (role === "member") {
    return targetEmployeeId === linkedEmployeeId;
  }

  if (role === "manager") {
    const target = getEmployeeById(targetEmployeeId);
    if (!target) return false;
    return getEmployeeDepartmentKey(target) === getEmployeeDepartmentKey(linked);
  }

  return false;
}

export function canEditAnySchedule(
  permissions: AppPermissions,
  role: AppRole | null | undefined,
  linkedEmployeeId: string | null,
): boolean {
  if (permissions.editSchedulingForAnyone) return true;
  if (!permissions.editScheduling || !linkedEmployeeId) return false;
  return role === "member" || role === "manager";
}
