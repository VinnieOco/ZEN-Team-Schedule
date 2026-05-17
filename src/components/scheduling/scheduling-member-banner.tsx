"use client";

import { usePermissions } from "@/hooks/use-permissions";

export function SchedulingMemberBanner() {
  const { permissions, canEditSchedule, isManager } = usePermissions();

  if (permissions.editSchedulingForAnyone || canEditSchedule) {
    return null;
  }

  return (
    <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 print:hidden">
      <p className="font-medium">View-only schedule</p>
      <p className="mt-1 text-amber-800/90">
        {isManager
          ? "Link your login to your schedule profile in Settings to add or edit allocations for your department."
          : "Link your login to your schedule profile in Settings to add or edit allocations on your row."}
      </p>
    </div>
  );
}
