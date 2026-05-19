"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

import { ReportsExportMenu } from "@/components/reports/reports-export-menu";
import { PageToolbar } from "@/components/layout/page-toolbar";
import { Button } from "@/components/ui/button";
import { useScheduling } from "@/context/scheduling-context";
import type { ReportsPeriod } from "@/lib/reports-export";
import { cn } from "@/lib/utils";

interface ReportsPeriodNavigatorProps {
  period: ReportsPeriod;
  onPeriodChange: (period: ReportsPeriod) => void;
  showExport?: boolean;
}

export function ReportsPeriodNavigator({
  period,
  onPeriodChange,
  showExport = false,
}: ReportsPeriodNavigatorProps) {
  const {
    goToPreviousWeek,
    goToNextWeek,
    goToPreviousMonth,
    goToNextMonth,
    goToToday,
    setWeek,
    setMonth,
    selectedWeekStart,
  } = useScheduling();

  const handleToday = () => {
    if (period === "month") setMonth(new Date());
    else goToToday();
  };

  const handlePrevious = () => {
    if (period === "month") goToPreviousMonth();
    else goToPreviousWeek();
  };

  const handleNext = () => {
    if (period === "month") goToNextMonth();
    else goToNextWeek();
  };

  const switchPeriod = (next: ReportsPeriod) => {
    if (next === period) return;
    if (next === "month") setMonth(selectedWeekStart);
    else setWeek(selectedWeekStart);
    onPeriodChange(next);
  };

  return (
    <PageToolbar className="ms-auto w-full justify-end sm:w-auto">
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
          className={cn(period === "week" && "bg-slate-100")}
          onClick={() => switchPeriod("week")}
        >
          Week
        </Button>
        <Button
          variant="outline"
          size="sm"
          className={cn(period === "month" && "bg-slate-100")}
          onClick={() => switchPeriod("month")}
        >
          Month
        </Button>
      </div>
      {showExport && <ReportsExportMenu period={period} />}
    </PageToolbar>
  );
}
