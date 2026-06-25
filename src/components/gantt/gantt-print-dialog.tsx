"use client";

import { useEffect, useState } from "react";
import { parseISO, startOfMonth, startOfWeek } from "date-fns";

import { Button } from "@/components/ui/button";
import { DateInput } from "@/components/ui/date-input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  buildGanttPrintLayout,
  defaultGanttPrintDates,
  ganttColumnCountForRange,
  type GanttPrintLayout,
} from "@/lib/gantt/print-range";
import type { GanttZoom } from "@/lib/gantt/timeline";
import { cn } from "@/lib/utils";

interface GanttPrintDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rangeStart: Date;
  columnCount: number;
  zoom: GanttZoom;
  onPrint: (layout: GanttPrintLayout) => void;
  title?: string;
  description?: string;
}

export function GanttPrintDialog({
  open,
  onOpenChange,
  rangeStart,
  columnCount,
  zoom: initialZoom,
  onPrint,
  title = "Print schedule timeline",
  description = "Choose week or month view and the date range to include. Use your browser's print dialog to save as PDF.",
}: GanttPrintDialogProps) {
  const [zoom, setZoom] = useState<GanttZoom>(initialZoom);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setZoom(initialZoom);
    const defaults = defaultGanttPrintDates(rangeStart, columnCount, initialZoom);
    setFrom(defaults.from);
    setTo(defaults.to);
    setError(null);
  }, [open, initialZoom, rangeStart, columnCount]);

  const handleZoomChange = (next: GanttZoom) => {
    setZoom(next);
    const base = from ? parseISO(from) : rangeStart;
    const span = next === "months" ? 6 : 8;
    const defaults = defaultGanttPrintDates(
      next === "months" ? startOfMonth(base) : startOfWeek(base, { weekStartsOn: 1 }),
      span,
      next,
    );
    setFrom(defaults.from);
    setTo(defaults.to);
    setError(null);
  };

  const previewCount =
    from && to ? ganttColumnCountForRange(parseISO(from), parseISO(to), zoom) : 0;

  const handlePrint = () => {
    const result = buildGanttPrintLayout(from, to, zoom);
    if ("message" in result) {
      setError(result.message);
      return;
    }
    onPrint(result);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] flex-col overflow-visible sm:max-w-md">
        <DialogHeader className="shrink-0">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto">
          <div className="flex gap-2">
            <Button
              type="button"
              variant={zoom === "weeks" ? "secondary" : "outline"}
              size="sm"
              className="flex-1"
              onClick={() => handleZoomChange("weeks")}
            >
              Weeks
            </Button>
            <Button
              type="button"
              variant={zoom === "months" ? "secondary" : "outline"}
              size="sm"
              className="flex-1"
              onClick={() => handleZoomChange("months")}
            >
              Months
            </Button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="gantt-print-from">
                {zoom === "months" ? "From month" : "From week"}
              </Label>
              <DateInput
                id="gantt-print-from"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="gantt-print-to">{zoom === "months" ? "To month" : "To week"}</Label>
              <DateInput
                id="gantt-print-to"
                value={to}
                onChange={(e) => setTo(e.target.value)}
              />
            </div>
          </div>

          <p className={cn("text-xs text-muted-foreground", previewCount <= 0 && "invisible")}>
            {previewCount}{" "}
            {zoom === "months"
              ? `month${previewCount === 1 ? "" : "s"}`
              : `week${previewCount === 1 ? "" : "s"}`}{" "}
            will print. Dates are aligned to {zoom === "months" ? "month" : "week"} boundaries.
          </p>

          {error && <p className="text-xs text-red-600">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={handlePrint} disabled={!from || !to}>
              Print
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
