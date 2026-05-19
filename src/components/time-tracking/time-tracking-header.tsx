"use client";

import { ChevronLeft, ChevronRight, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useScheduling } from "@/context/scheduling-context";
import { formatWeekRange } from "@/lib/week";

interface TimeTrackingHeaderProps {
  canLogTime?: boolean;
  onLogTime: () => void;
}

export function TimeTrackingHeader({
  canLogTime = true,
  onLogTime,
}: TimeTrackingHeaderProps) {
  const { selectedWeekStart, settings, goToPreviousWeek, goToNextWeek, goToToday } = useScheduling();

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">Time Tracking</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Compare scheduled vs actual hours · {formatWeekRange(selectedWeekStart, settings)}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center rounded-lg border bg-white p-0.5 shadow-sm">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={goToPreviousWeek}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" className="h-8 px-3 text-xs" onClick={goToToday}>
            Today
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={goToNextWeek}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        {canLogTime && (
          <Button onClick={onLogTime} className="shadow-sm">
            <Plus className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Log time</span>
          </Button>
        )}
      </div>
    </div>
  );
}
