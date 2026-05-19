"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

import { PageToolbar } from "@/components/layout/page-toolbar";
import { Button } from "@/components/ui/button";
import { useScheduling } from "@/context/scheduling-context";
import type { ReportsPeriod } from "@/lib/reports-export";
import { periodLabel } from "@/lib/reports-export";
import { useReportsExportContext } from "@/components/reports/use-reports-export-context";

interface ReportsPeriodNavigatorProps {
  period: ReportsPeriod;
  onPeriodChange: (period: ReportsPeriod) => void;
}

export function ReportsPeriodNavigator({ period, onPeriodChange }: ReportsPeriodNavigatorProps) {
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

  const exportCtx = useReportsExportContext(period);
  const label = periodLabel(exportCtx);

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
    <PageToolbar>
      <div className="flex shrink-0 items-center rounded-lg border bg-white p-0.5 shadow-sm">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handlePrevious}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="sm" className="h-8 px-3 text-xs" onClick={handleToday}>
          Today
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleNext}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
      <div className="flex shrink-0 items-center gap-0.5 rounded-lg border bg-white p-0.5 shadow-sm">
        <Button
          variant={period === "week" ? "secondary" : "ghost"}
          size="sm"
          className="h-8"
          onClick={() => switchPeriod("week")}
        >
          Week
        </Button>
        <Button
          variant={period === "month" ? "secondary" : "ghost"}
          size="sm"
          className="h-8"
          onClick={() => switchPeriod("month")}
        >
          Month
        </Button>
      </div>
      <p className="shrink-0 text-sm font-medium whitespace-nowrap text-slate-700">{label}</p>
    </PageToolbar>
  );
}
