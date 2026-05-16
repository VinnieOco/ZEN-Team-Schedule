"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useScheduling } from "@/context/scheduling-context";
import { formatWeekRange } from "@/lib/week";

export function WeekNavigator() {
  const { selectedWeekStart, settings, goToPreviousWeek, goToNextWeek, goToToday } = useScheduling();

  return (
    <div className="flex flex-wrap items-center gap-3">
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
      <p className="text-sm font-medium text-slate-700">{formatWeekRange(selectedWeekStart, settings)}</p>
    </div>
  );
}
