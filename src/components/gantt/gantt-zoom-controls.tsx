"use client";

import { addMonths, addWeeks, startOfMonth, startOfWeek, subMonths, subWeeks } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { GanttZoom } from "@/lib/gantt/timeline";

interface GanttZoomControlsProps {
  rangeStart: Date;
  zoom: GanttZoom;
  onRangeStartChange: (date: Date) => void;
  onZoomChange: (zoom: GanttZoom) => void;
}

export function GanttZoomControls({
  rangeStart,
  zoom,
  onRangeStartChange,
  onZoomChange,
}: GanttZoomControlsProps) {
  const stepBack = () => {
    onRangeStartChange(zoom === "months" ? subMonths(rangeStart, 3) : subWeeks(rangeStart, 4));
  };
  const stepForward = () => {
    onRangeStartChange(zoom === "months" ? addMonths(rangeStart, 3) : addWeeks(rangeStart, 4));
  };
  const goToday = () => {
    onRangeStartChange(
      zoom === "months"
        ? startOfMonth(new Date())
        : startOfWeek(new Date(), { weekStartsOn: 1 }),
    );
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button type="button" variant="outline" size="sm" onClick={stepBack}>
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <Button type="button" variant="outline" size="sm" onClick={goToday}>
        Today
      </Button>
      <Button type="button" variant="outline" size="sm" onClick={stepForward}>
        <ChevronRight className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant={zoom === "weeks" ? "secondary" : "outline"}
        size="sm"
        onClick={() => onZoomChange("weeks")}
      >
        Weeks
      </Button>
      <Button
        type="button"
        variant={zoom === "months" ? "secondary" : "outline"}
        size="sm"
        onClick={() => onZoomChange("months")}
      >
        Months
      </Button>
    </div>
  );
}
