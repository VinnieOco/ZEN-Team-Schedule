"use client";

import Link from "next/link";
import { useMemo } from "react";

import { PersonalWeekSection } from "@/components/dashboard/personal-week-section";
import { MyTodosSection } from "@/components/dashboard/my-todos-section";
import { AppPage } from "@/components/layout/app-page";
import { Button } from "@/components/ui/button";
import { useScheduling } from "@/context/scheduling-context";
import { usePermissions } from "@/hooks/use-permissions";
import { formatWeekRange, getEmployeeFullName } from "@/lib/week";

export function DashboardPageClient() {
  const { employees, selectedWeekStart, settings } = useScheduling();
  const { isManagerOrAdmin, linkedEmployeeId } = usePermissions();

  const weekLabel = formatWeekRange(selectedWeekStart, settings);

  const linkedEmployee = useMemo(
    () => employees.find((e) => e.id === linkedEmployeeId),
    [employees, linkedEmployeeId],
  );

  const linkProfileBanner = !linkedEmployee && (
    <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
      <p className="font-medium">Link your schedule profile</p>
      <p className="mt-1 text-amber-800/90">
        Connect your login to your team member record in Settings to see your personal week
        summary.
      </p>
      <Button variant="outline" size="sm" className="mt-3 border-amber-300 bg-white" asChild>
        <Link href="/settings">Go to Settings</Link>
      </Button>
    </div>
  );

  const personalWeekSection = linkedEmployee ? (
    <PersonalWeekSection employee={linkedEmployee} weekStart={selectedWeekStart} />
  ) : null;

  const headerSubtitle = linkedEmployee
    ? `${getEmployeeFullName(linkedEmployee)} · ${weekLabel}`
    : weekLabel;

  return (
    <AppPage>
      <div className="min-w-0">
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">{headerSubtitle}</p>
      </div>

      {linkProfileBanner}
      {personalWeekSection}
      {linkedEmployee && <MyTodosSection employee={linkedEmployee} />}

      {isManagerOrAdmin && !linkedEmployee && (
        <p className="text-sm text-muted-foreground">
          View department utilization on the{" "}
          <Link href="/scheduling" className="font-medium text-emerald-700 hover:underline">
            Utilization
          </Link>{" "}
          tab in Team Scheduling.
        </p>
      )}
    </AppPage>
  );
}
