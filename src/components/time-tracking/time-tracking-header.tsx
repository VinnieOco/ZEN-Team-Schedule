"use client";

import { Plus } from "lucide-react";

import { PageToolbar } from "@/components/layout/page-toolbar";
import { WeekNavigator } from "@/components/layout/week-navigator";
import { Button } from "@/components/ui/button";
import { useScheduling } from "@/context/scheduling-context";
import { formatWeekRange, getTimesheetSettings } from "@/lib/week";

interface TimeTrackingHeaderProps {
  canLogTime?: boolean;
  onLogTime: () => void;
}

export function TimeTrackingHeader({
  canLogTime = true,
  onLogTime,
}: TimeTrackingHeaderProps) {
  const { selectedWeekStart, settings } = useScheduling();
  const weekLabel = formatWeekRange(selectedWeekStart, getTimesheetSettings(settings));

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">Time Tracking</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Timesheets · {weekLabel}
        </p>
      </div>
      <PageToolbar className="ms-auto w-full justify-end sm:w-auto">
        <WeekNavigator />
        {canLogTime && (
          <Button onClick={onLogTime} className="shrink-0">
            <Plus />
            <span className="hidden sm:inline">Log time</span>
          </Button>
        )}
      </PageToolbar>
    </div>
  );
}
