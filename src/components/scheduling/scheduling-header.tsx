"use client";

import { ChevronLeft, ChevronRight, Filter, Plus, Printer } from "lucide-react";

import { PageToolbar } from "@/components/layout/page-toolbar";
import { Button } from "@/components/ui/button";
import { useScheduling } from "@/context/scheduling-context";
import { departmentFilterLabel } from "@/lib/departments";
import { schedulingViewSettings } from "@/lib/scheduling-view";
import { formatMonthRange, formatWeekRange } from "@/lib/week";
import { cn } from "@/lib/utils";

export type ScheduleCalendarView = "week" | "month";

interface SchedulingHeaderProps {
  calendarView: ScheduleCalendarView;
  onCalendarViewChange: (view: ScheduleCalendarView) => void;
  canEditSchedule?: boolean;
  onAddAllocation?: () => void;
  onToggleFilters?: () => void;
  filtersVisible?: boolean;
}

export function SchedulingHeader({
  calendarView,
  onCalendarViewChange,
  canEditSchedule = true,
  onAddAllocation,
  onToggleFilters,
  filtersVisible,
}: SchedulingHeaderProps) {
  const {
    selectedWeekStart,
    settings,
    goToPreviousWeek,
    goToNextWeek,
    goToPreviousMonth,
    goToNextMonth,
    goToToday,
    setWeek,
    setMonth,
    filters,
  } = useScheduling();

  const isMonth = calendarView === "month";
  const viewSettings = schedulingViewSettings(settings, filters);
  const periodLabel = isMonth
    ? formatMonthRange(selectedWeekStart)
    : formatWeekRange(selectedWeekStart, viewSettings);
  const departmentSuffix = filters.department
    ? ` · ${departmentFilterLabel(filters.department)}`
    : "";

  const handleToday = () => {
    if (isMonth) {
      setMonth(new Date());
    } else {
      goToToday();
    }
  };

  const handlePrevious = () => {
    if (isMonth) goToPreviousMonth();
    else goToPreviousWeek();
  };

  const handleNext = () => {
    if (isMonth) goToNextMonth();
    else goToNextWeek();
  };

  const switchView = (view: ScheduleCalendarView) => {
    if (view === calendarView) return;
    if (view === "month") {
      setMonth(selectedWeekStart);
    } else {
      setWeek(selectedWeekStart);
    }
    onCalendarViewChange(view);
  };

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
          Team Scheduling
        </h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {periodLabel}
          {departmentSuffix && (
            <span className="font-medium text-emerald-700">{departmentSuffix}</span>
          )}
        </p>
      </div>
      <PageToolbar className="print:hidden ms-auto w-full justify-end sm:w-auto">
        <div className="flex shrink-0 items-center gap-2">
          <Button variant="outline" size="icon" onClick={handlePrevious} aria-label="Previous period">
            <ChevronLeft />
          </Button>
          <Button variant="outline" size="sm" onClick={handleToday}>
            Today
          </Button>
          <Button variant="outline" size="icon" onClick={handleNext} aria-label="Next period">
            <ChevronRight />
          </Button>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className={cn(calendarView === "week" && "bg-slate-100")}
            onClick={() => switchView("week")}
          >
            Week
          </Button>
          <Button
            variant="outline"
            size="sm"
            className={cn(calendarView === "month" && "bg-slate-100")}
            onClick={() => switchView("month")}
          >
            Month
          </Button>
        </div>
        {onToggleFilters && (
          <Button
            variant="outline"
            size="sm"
            className={cn("shrink-0", filtersVisible && "border-emerald-300 bg-emerald-50")}
            onClick={onToggleFilters}
          >
            <Filter />
            Filters
          </Button>
        )}
        <Button variant="outline" size="sm" className="hidden shrink-0 sm:inline-flex" onClick={() => window.print()}>
          <Printer />
          Print
        </Button>
        {canEditSchedule && onAddAllocation && (
          <Button onClick={onAddAllocation} className="shrink-0">
            <Plus />
            <span className="hidden sm:inline">Add Schedule</span>
          </Button>
        )}
      </PageToolbar>
    </div>
  );
}
