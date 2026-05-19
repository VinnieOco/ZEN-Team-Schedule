"use client";

import { useState } from "react";

import { AppPage } from "@/components/layout/app-page";
import { ProjectBudgetReport } from "@/components/reports/project-budget-report";
import { ReportsExportMenu } from "@/components/reports/reports-export-menu";
import { ReportsPeriodNavigator } from "@/components/reports/reports-period-navigator";
import { ReportsSummaryCards } from "@/components/reports/reports-summary-cards";
import { ScheduledVsActualReport } from "@/components/reports/scheduled-vs-actual-report";
import { TeamUtilizationReport } from "@/components/reports/team-utilization-report";
import { usePermissions } from "@/hooks/use-permissions";
import type { ReportsPeriod } from "@/lib/reports-export";

export default function ReportsPage() {
  const [period, setPeriod] = useState<ReportsPeriod>("week");
  const { permissions } = usePermissions();

  return (
    <AppPage>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-slate-900">Reports</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Team utilization, scheduled vs actual, and project budgets.
            {permissions.exportReports
              ? " Export any report as CSV."
              : " View-only for members."}{" "}
            Uses the same period as Team Scheduling.
          </p>
        </div>
        <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <ReportsPeriodNavigator period={period} onPeriodChange={setPeriod} />
          {permissions.exportReports && (
            <div className="shrink-0">
              <ReportsExportMenu period={period} />
            </div>
          )}
        </div>
      </div>

      <ReportsSummaryCards period={period} />
      <ScheduledVsActualReport period={period} />
      <TeamUtilizationReport period={period} />
      <ProjectBudgetReport />
    </AppPage>
  );
}
