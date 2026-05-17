"use client";

import Link from "next/link";
import { useMemo } from "react";
import { AlertTriangle, ArrowRight } from "lucide-react";

import { DepartmentSummaryCard } from "@/components/dashboard/department-summary-card";
import { PersonalWeekSection } from "@/components/dashboard/personal-week-section";
import { Button } from "@/components/ui/button";
import { useScheduling } from "@/context/scheduling-context";
import { usePermissions } from "@/hooks/use-permissions";
import {
  departmentFilterLabel,
  getEmployeeDepartmentKey,
} from "@/lib/departments";
import {
  getDepartmentDashboardSummaries,
  getMemberDepartmentEmployees,
  getPersonalWeekSummary,
} from "@/lib/dashboard";
import { formatWeekRange, getEmployeeFullName } from "@/lib/week";

export function DashboardPageClient() {
  const { employees, allocations, timeEntries, selectedWeekStart, settings } = useScheduling();
  const { isManagerOrAdmin, linkedEmployeeId } = usePermissions();

  const weekLabel = formatWeekRange(selectedWeekStart, settings);

  const linkedEmployee = useMemo(
    () => employees.find((e) => e.id === linkedEmployeeId),
    [employees, linkedEmployeeId],
  );

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

  const memberDepartmentSummaries = useMemo(() => {
    if (!linkedEmployee) return [];
    const deptKey = getEmployeeDepartmentKey(linkedEmployee);
    return departmentSummaries.filter((d) => d.departmentKey === deptKey);
  }, [departmentSummaries, linkedEmployee]);

  const personalSummary = useMemo(() => {
    if (!linkedEmployee) return null;
    return getPersonalWeekSummary(
      linkedEmployee,
      allocations,
      timeEntries,
      selectedWeekStart,
      settings,
    );
  }, [linkedEmployee, allocations, timeEntries, selectedWeekStart, settings]);

  const deptLabel = linkedEmployee
    ? departmentFilterLabel(getEmployeeDepartmentKey(linkedEmployee))
    : null;

  const totalOverallocated = departmentSummaries.reduce(
    (n, d) => n + d.overallocated.length,
    0,
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

  const personalWeekSection =
    linkedEmployee && personalSummary ? (
      <PersonalWeekSection
        employee={linkedEmployee}
        summary={personalSummary}
        weekStart={selectedWeekStart}
      />
    ) : null;

  const headerSubtitle = linkedEmployee
    ? `${getEmployeeFullName(linkedEmployee)} · ${weekLabel}`
    : isManagerOrAdmin
      ? `Team overview by department · ${weekLabel}`
      : weekLabel;

  if (isManagerOrAdmin) {
    return (
      <div className="space-y-5 p-4 md:space-y-6 md:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
            <p className="mt-1 text-sm text-muted-foreground">{headerSubtitle}</p>
          </div>
          <Button asChild className="w-full sm:w-auto">
            <Link href="/scheduling">
              Open Team Scheduling
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>

        {linkProfileBanner}
        {personalWeekSection}

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

        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-slate-900">By department</h2>
          <div className="grid gap-4 lg:grid-cols-2">
            {departmentSummaries.map((summary) => (
              <DepartmentSummaryCard key={summary.departmentKey} summary={summary} />
            ))}
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-5 p-4 md:space-y-6 md:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">{headerSubtitle}</p>
        </div>
        <Button asChild className="w-full sm:w-auto">
          <Link href="/scheduling">
            Open Team Scheduling
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>

      {linkProfileBanner}
      {personalWeekSection}

      {deptLabel && memberDepartmentSummaries.length > 0 && (
        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">{deptLabel} department</h2>
            <p className="text-sm text-muted-foreground">
              {getMemberDepartmentEmployees(employees, linkedEmployee).length} team members in your
              department
            </p>
          </div>
          {memberDepartmentSummaries.map((summary) => (
            <DepartmentSummaryCard key={summary.departmentKey} summary={summary} />
          ))}
        </section>
      )}
    </div>
  );
}
