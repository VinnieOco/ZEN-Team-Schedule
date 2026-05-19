"use client";

import { useState } from "react";

import { AppPage } from "@/components/layout/app-page";
import { ProjectBudgetReport } from "@/components/reports/project-budget-report";
import { ReportsPeriodNavigator } from "@/components/reports/reports-period-navigator";
import { ReportsSummaryCards } from "@/components/reports/reports-summary-cards";
import { ScheduledVsActualReport } from "@/components/reports/scheduled-vs-actual-report";
import { TeamUtilizationReport } from "@/components/reports/team-utilization-report";
import { useReportsExportContext } from "@/components/reports/use-reports-export-context";
import { usePermissions } from "@/hooks/use-permissions";
import { periodLabel, type ReportsPeriod } from "@/lib/reports-export";

export default function ReportsPage() {
  const [period, setPeriod] = useState<ReportsPeriod>("week");
  const { permissions } = usePermissions();
  const periodRangeLabel = periodLabel(useReportsExportContext(period));

  return (
    <AppPage>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-slate-900">Reports</h1>
          <p className="mt-0.5 text-sm font-medium text-slate-700">{periodRangeLabel}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Team utilization, scheduled vs actual, and project budgets.
          </p>
        </div>
        <ReportsPeriodNavigator
          period={period}
          onPeriodChange={setPeriod}
          showExport={permissions.exportReports}
        />
      </div>

      <ReportsSummaryCards period={period} />
      <ScheduledVsActualReport period={period} />
      <TeamUtilizationReport period={period} />
      <ProjectBudgetReport />
    </AppPage>
  );
}
