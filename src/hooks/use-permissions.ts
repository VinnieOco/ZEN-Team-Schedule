"use client";

import { useMemo } from "react";

import { useAuth } from "@/context/auth-context";
import { useScheduling } from "@/context/scheduling-context";
import {
  canEditTimeEntry,
  getPermissions,
  type AppPermissions,
} from "@/lib/auth/permissions";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export function usePermissions() {
  const { profile, isAdmin, isLoading: authLoading } = useAuth();
  const { employees, dataSource } = useScheduling();

  const localMode = !isSupabaseConfigured() || dataSource === "local";

  const permissions = useMemo(
    () => getPermissions(profile?.app_role, { localMode }),
    [profile?.app_role, localMode],
  );

  const linkedEmployeeId = useMemo(() => {
    if (!profile) return null;
    return employees.find((e) => e.profile_id === profile.id)?.id ?? null;
  }, [profile, employees]);

  const canLogTime = permissions.logTimeForAnyone || linkedEmployeeId != null;

  const canEditEntry = (employeeId: string) =>
    canEditTimeEntry(permissions, employeeId, linkedEmployeeId);

  return {
    permissions,
    isAdmin,
    profile,
    linkedEmployeeId,
    canLogTime,
    canEditEntry,
    authLoading,
    localMode,
  };
}

export type { AppPermissions };
