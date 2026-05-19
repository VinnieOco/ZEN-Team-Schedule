"use client";

import { useState } from "react";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import { Calendar, Clock } from "lucide-react";

import { TimesheetDialog } from "@/components/time-tracking/weekly-timesheet-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useScheduling } from "@/context/scheduling-context";
import { usePermissions } from "@/hooks/use-permissions";
import { filterTimeEntriesForWeek, varianceColorClass, varianceLabel } from "@/lib/time-tracking";
import { filterAllocationsForWeek } from "@/lib/utilization";
import type { PersonalWeekSummary } from "@/lib/dashboard";
import { utilizationStatusColor } from "@/lib/utilization";
import { cn } from "@/lib/utils";
import type { Employee } from "@/types";

interface PersonalWeekSectionProps {
  employee: Employee;
  summary: PersonalWeekSummary;
  weekStart: Date;
}

export function PersonalWeekSection({ employee, summary, weekStart }: PersonalWeekSectionProps) {
  const { allocations, timeEntries, settings, getProjectById, getCategoryById } =
    useScheduling();
  const { canLogTime } = usePermissions();
  const [logTimeOpen, setLogTimeOpen] = useState(false);

  const weekAllocations = filterAllocationsForWeek(allocations, weekStart, settings)
    .filter((a) => a.employee_id === employee.id)
    .sort((a, b) => a.allocation_date.localeCompare(b.allocation_date));

  const weekEntries = filterTimeEntriesForWeek(timeEntries, weekStart, settings)
    .filter((e) => e.employee_id === employee.id)
    .sort((a, b) => b.entry_date.localeCompare(a.entry_date));

  const { schedule, time } = summary;

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Your week</h2>
          <p className="text-sm text-muted-foreground">
            Scheduled work and time logged for this week
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/scheduling">
              <Calendar className="mr-2 h-3.5 w-3.5" />
              Schedule
            </Link>
          </Button>
          {canLogTime && (
            <Button variant="outline" size="sm" onClick={() => setLogTimeOpen(true)}>
              <Clock className="mr-2 h-3.5 w-3.5" />
              Log time
            </Button>
          )}
        </div>
      </div>

      <TimesheetDialog
        mode="log"
        open={logTimeOpen}
        onOpenChange={setLogTimeOpen}
        employeeId={employee.id}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Utilization
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p
              className={cn(
                "text-3xl font-bold tabular-nums",
                utilizationStatusColor(schedule.status),
              )}
            >
              {schedule.utilizationPercent}%
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {schedule.scheduledHours}h / {schedule.weeklyCapacity}h capacity
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Scheduled
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold tabular-nums">{schedule.scheduledHours}h</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {schedule.billableHours}h billable · {schedule.nonBillableHours}h non-billable
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Logged</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold tabular-nums">{time.actualHours}h</p>
            <p className="mt-1 text-xs text-muted-foreground">actual hours this week</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Variance</CardTitle>
          </CardHeader>
          <CardContent>
            <p className={cn("text-3xl font-bold tabular-nums", varianceColorClass(time.varianceHours))}>
              {varianceLabel(time.varianceHours)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">actual vs scheduled</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Your allocations</CardTitle>
          </CardHeader>
          <CardContent>
            {weekAllocations.length === 0 ? (
              <p className="text-sm text-muted-foreground">No allocations scheduled this week.</p>
            ) : (
              <ul className="space-y-2">
                {weekAllocations.map((a) => {
                  const project = a.project_id ? getProjectById(a.project_id) : null;
                  const category = getCategoryById(a.allocation_category_id);
                  const label = project?.project_name ?? a.task_name ?? "Task";
                  return (
                    <li
                      key={a.id}
                      className="flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium">{label}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(parseISO(a.allocation_date), "EEE M/d")}
                          {category ? ` · ${category.name}` : ""}
                        </p>
                      </div>
                      <span className="shrink-0 font-semibold tabular-nums">{a.hours}h</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Your time entries</CardTitle>
          </CardHeader>
          <CardContent>
            {weekEntries.length === 0 ? (
              <p className="text-sm text-muted-foreground">No time logged this week yet.</p>
            ) : (
              <ul className="space-y-2">
                {weekEntries.map((e) => {
                  const project = e.project_id ? getProjectById(e.project_id) : null;
                  const label = project?.project_name ?? e.task_name ?? "Task";
                  return (
                    <li
                      key={e.id}
                      className="flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium">{label}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(parseISO(e.entry_date), "EEE M/d")}
                        </p>
                      </div>
                      <span className="shrink-0 font-semibold tabular-nums">{e.hours}h</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
