"use client";

import { useMemo } from "react";
import { AlertTriangle } from "lucide-react";

import { DepartmentSummaryCard } from "@/components/dashboard/department-summary-card";
import { useScheduling } from "@/context/scheduling-context";
import { getDepartmentDashboardSummaries } from "@/lib/dashboard";
import { formatWeekRange } from "@/lib/week";

export function UtilizationView() {
  const { employees, allocations, timeEntries, selectedWeekStart, settings } = useScheduling();

  const departmentSummaries = useMemo(
    () =>
      getDepartmentDashboardSummaries(
        employees,
        allocations,
        timeEntries,
        selectedWeekStart,
        settings,
        settings.departments,
      ),
    [employees, allocations, timeEntries, selectedWeekStart, settings],
  );

  const totalOverallocated = departmentSummaries.reduce(
    (n, d) => n + d.overallocated.length,
    0,
  );

  const weekLabel = formatWeekRange(selectedWeekStart, settings);

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Utilization by department for the week of {weekLabel}.
      </p>

      {totalOverallocated > 0 && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900"
        >
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
          <p>
            <span className="font-semibold">{totalOverallocated}</span> team{" "}
            {totalOverallocated === 1 ? "member is" : "members are"} over capacity across
            departments this week.
          </p>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {departmentSummaries.map((summary) => (
          <DepartmentSummaryCard key={summary.departmentKey} summary={summary} />
        ))}
      </div>
    </div>
  );
}
