"use client";

import { useState } from "react";

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
    <div className="space-y-5 p-4 md:space-y-6 md:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Reports</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Team utilization, scheduled vs actual, and project budgets.
            {permissions.exportReports
              ? " Export any report as CSV."
              : " View-only for members; CSV export requires an admin."}{" "}
            Uses the same period as Team Scheduling.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <ReportsPeriodNavigator period={period} onPeriodChange={setPeriod} />
          {permissions.exportReports && <ReportsExportMenu period={period} />}
        </div>
      </div>

      <ReportsSummaryCards period={period} />
      <ScheduledVsActualReport period={period} />
      <TeamUtilizationReport period={period} />
      <ProjectBudgetReport />
    </div>
  );
}
