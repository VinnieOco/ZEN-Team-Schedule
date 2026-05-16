"use client";

import { ChevronLeft, ChevronRight, Filter, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useScheduling } from "@/context/scheduling-context";
import { formatWeekRange } from "@/lib/week";
import { cn } from "@/lib/utils";

interface SchedulingHeaderProps {
  onAddAllocation: () => void;
  onToggleFilters?: () => void;
  filtersVisible?: boolean;
}

export function SchedulingHeader({
  onAddAllocation,
  onToggleFilters,
  filtersVisible,
}: SchedulingHeaderProps) {
  const { selectedWeekStart, settings, goToPreviousWeek, goToNextWeek, goToToday } = useScheduling();

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
          Team Scheduling
        </h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {formatWeekRange(selectedWeekStart, settings)}
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
        <div className="hidden items-center gap-0.5 rounded-lg border bg-white p-0.5 shadow-sm md:flex">
          <Button variant="secondary" size="sm" className="h-8">
            Week
          </Button>
          <Button variant="ghost" size="sm" className="h-8" disabled title="Month view coming soon">
            Month
          </Button>
        </div>
        {onToggleFilters && (
          <Button
            variant="outline"
            size="sm"
            onClick={onToggleFilters}
            className={cn(filtersVisible && "border-emerald-300 bg-emerald-50")}
          >
            <Filter className="mr-2 h-4 w-4" />
            <span className="hidden xs:inline">Filters</span>
          </Button>
        )}
        <Button onClick={onAddAllocation} className="shadow-sm">
          <Plus className="h-4 w-4 sm:mr-2" />
          <span className="hidden sm:inline">Add Allocation</span>
        </Button>
      </div>
    </div>
  );
}
