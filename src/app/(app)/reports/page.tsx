"use client";

import { ProjectBudgetReport } from "@/components/reports/project-budget-report";
import { ReportsSummaryCards } from "@/components/reports/reports-summary-cards";
import { TeamUtilizationReport } from "@/components/reports/team-utilization-report";
import { WeekNavigator } from "@/components/reports/week-navigator";

export default function ReportsPage() {
  return (
    <div className="space-y-5 p-4 md:space-y-6 md:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Reports</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Team utilization and project budget for the selected week. Uses the same week as Team
            Scheduling.
          </p>
        </div>
        <WeekNavigator />
      </div>

      <ReportsSummaryCards />
      <TeamUtilizationReport />
      <ProjectBudgetReport />
    </div>
  );
}
