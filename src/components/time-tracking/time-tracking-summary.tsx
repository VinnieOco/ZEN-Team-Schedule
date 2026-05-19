"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useScheduling } from "@/context/scheduling-context";
import { getTeamTimeSummary, varianceColorClass, varianceLabel } from "@/lib/time-tracking";
import { cn } from "@/lib/utils";

export function TimeTrackingSummary() {
  const { employees, allocations, timeEntries, selectedWeekStart, settings } = useScheduling();
  const summary = getTeamTimeSummary(
    allocations,
    timeEntries,
    employees,
    selectedWeekStart,
    settings,
  );

  const items: {
    label: string;
    value: string;
    sub: string;
    valueClass?: string;
  }[] = [
    {
      label: "Scheduled",
      value: `${summary.scheduledHours}h`,
      sub: "planned this week",
    },
    {
      label: "Actual",
      value: `${summary.actualHours}h`,
      sub: "logged this week",
    },
    {
      label: "Variance",
      value: varianceLabel(summary.varianceHours),
      sub:
        summary.varianceHours > 0
          ? "over schedule"
          : summary.varianceHours < 0
            ? "under schedule"
            : "on track",
      valueClass: varianceColorClass(summary.varianceHours),
    },
    {
      label: "Schedule match",
      value: `${summary.matchPercent}%`,
      sub: "closer to 100% = better alignment",
    },
  ];

  return (
    <div className="grid min-w-0 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((item) => (
        <Card key={item.label}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{item.label}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className={cn("text-2xl font-bold tabular-nums", item.valueClass)}>{item.value}</p>
            <p className="mt-1 text-xs text-muted-foreground">{item.sub}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
