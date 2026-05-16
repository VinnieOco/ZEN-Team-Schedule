"use client";

import type { ScheduleCalendarView } from "@/components/scheduling/scheduling-header";
import { useFilteredEmployeeRows } from "@/components/scheduling/use-filtered-employee-rows";
import { useScheduling } from "@/context/scheduling-context";
import { getEmployeeDayHours } from "@/lib/utilization";
import { getEmployeeFullName } from "@/lib/week";
import { AlertTriangle } from "lucide-react";

interface CapacityAlertsProps {
  calendarView: ScheduleCalendarView;
}

export function CapacityAlerts({ calendarView }: CapacityAlertsProps) {
  const { allocations } = useScheduling();
  const period = calendarView === "month" ? "month" : "week";
  const { rows, weekDays } = useFilteredEmployeeRows({ period });

  const overallocated = rows.filter((r) => r.stats.status === "over");

  let dayOverflowCount = 0;
  if (calendarView === "week") {
    for (const { employee } of rows) {
      for (const day of weekDays) {
        const hours = getEmployeeDayHours(allocations, employee.id, day);
        if (hours > employee.daily_capacity_hours) dayOverflowCount += 1;
      }
    }
  }

  if (overallocated.length === 0 && dayOverflowCount === 0) {
    return null;
  }

  const names = overallocated
    .slice(0, 2)
    .map((r) => getEmployeeFullName(r.employee))
    .join(", ");
  const moreOver = overallocated.length > 2 ? ` +${overallocated.length - 2}` : "";

  const parts: string[] = [];
  if (overallocated.length > 0) {
    parts.push(
      `${overallocated.length} over weekly cap${overallocated.length === 1 ? "" : "s"} (${names}${moreOver})`,
    );
  }
  if (dayOverflowCount > 0 && calendarView === "week") {
    parts.push(
      `${dayOverflowCount} day${dayOverflowCount === 1 ? "" : "s"} over daily cap`,
    );
  }

  return (
    <p
      role="status"
      className="flex items-start gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-muted-foreground print:hidden"
    >
      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" aria-hidden />
      <span>{parts.join(" · ")}</span>
    </p>
  );
}
