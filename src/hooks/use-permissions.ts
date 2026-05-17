"use client";

import { useCallback, useMemo } from "react";

import { useAuth } from "@/context/auth-context";
import { useScheduling } from "@/context/scheduling-context";
import {
  canEditAllocation,
  canEditAnySchedule,
} from "@/lib/auth/schedule-access";
import {
  canEditTimeEntry,
  getPermissions,
  type AppPermissions,
} from "@/lib/auth/permissions";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export function usePermissions() {
  const { profile, isAdmin, isManager, isManagerOrAdmin, isLoading: authLoading } = useAuth();
  const { employees, getEmployeeById, dataSource } = useScheduling();

  const localMode = !isSupabaseConfigured() || dataSource === "local";

  const permissions = useMemo(
    () => getPermissions(profile?.app_role, { localMode }),
    [profile?.app_role, localMode],
  );

  const linkedEmployeeId = useMemo(() => {
    if (!profile) return null;
    return employees.find((e) => e.profile_id === profile.id)?.id ?? null;
  }, [profile, employees]);

  const role = profile?.app_role ?? null;

  const canLogTime = permissions.logTimeForAnyone || linkedEmployeeId != null;
  const canEditSchedule = canEditAnySchedule(permissions, role, linkedEmployeeId);

  const canEditEntry = useCallback(
    (employeeId: string) =>
      canEditTimeEntry(permissions, employeeId, linkedEmployeeId),
    [permissions, linkedEmployeeId],
  );

  const canEditAllocationFor = useCallback(
    (employeeId: string) =>
      canEditAllocation(permissions, role, employeeId, linkedEmployeeId, getEmployeeById),
    [permissions, role, linkedEmployeeId, getEmployeeById],
  );

  return {
    permissions,
    isAdmin,
    isManager,
    isManagerOrAdmin,
    profile,
    linkedEmployeeId,
    canLogTime,
    canEditSchedule,
    canEditEntry,
    canEditAllocationFor,
    authLoading,
    localMode,
  };
}

export type { AppPermissions };
