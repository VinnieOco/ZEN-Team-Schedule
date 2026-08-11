"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DateInput } from "@/components/ui/date-input";
import { Label } from "@/components/ui/label";
import {
  createDefaultPipelinePeriod,
  formatPipelinePeriodLabel,
  goToTodayPipelinePeriod,
  shiftPipelinePeriod,
  type PipelinePeriod,
  type PipelinePeriodMode,
} from "@/lib/pipeline/period";
import { cn } from "@/lib/utils";

interface PipelinePeriodNavigatorProps {
  period: PipelinePeriod;
  onPeriodChange: (period: PipelinePeriod) => void;
  className?: string;
}

const MODES: { value: PipelinePeriodMode; label: string }[] = [
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
  { value: "year", label: "Year" },
  { value: "custom", label: "Custom" },
];

export function PipelinePeriodNavigator({
  period,
  onPeriodChange,
  className,
}: PipelinePeriodNavigatorProps) {
  const switchMode = (mode: PipelinePeriodMode) => {
    if (mode === period.mode) return;
    if (mode === "custom") {
      const defaults = createDefaultPipelinePeriod(period.anchor);
      onPeriodChange({
        ...period,
        mode,
        customStart: period.customStart ?? defaults.customStart,
        customEnd: period.customEnd ?? defaults.customEnd,
      });
      return;
    }
    onPeriodChange({ ...period, mode });
  };

  return (
    <div
      className={cn(
        "flex min-w-0 flex-col gap-3 rounded-xl border border-slate-200/80 bg-white p-3 shadow-sm sm:flex-row sm:flex-wrap sm:items-center sm:justify-between",
        className,
      )}
    >
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <div className="flex shrink-0 items-center gap-1.5">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => onPeriodChange(shiftPipelinePeriod(period, -1))}
            aria-label="Previous period"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8"
            onClick={() => onPeriodChange(goToTodayPipelinePeriod(period))}
          >
            Today
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => onPeriodChange(shiftPipelinePeriod(period, 1))}
            aria-label="Next period"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          {MODES.map((mode) => (
            <Button
              key={mode.value}
              type="button"
              variant="outline"
              size="sm"
              className={cn("h-8", period.mode === mode.value && "bg-slate-100")}
              onClick={() => switchMode(mode.value)}
            >
              {mode.label}
            </Button>
          ))}
        </div>

        <p className="min-w-0 text-sm font-medium tabular-nums text-slate-800">
          {formatPipelinePeriodLabel(period)}
        </p>
      </div>

      {period.mode === "custom" ? (
        <div className="flex flex-wrap items-end gap-2">
          <div className="space-y-1">
            <Label htmlFor="pipeline-period-from" className="text-xs">
              From
            </Label>
            <DateInput
              id="pipeline-period-from"
              value={period.customStart ?? ""}
              onChange={(event) =>
                onPeriodChange({
                  ...period,
                  customStart: event.target.value,
                  anchor: event.target.value
                    ? new Date(`${event.target.value}T12:00:00`)
                    : period.anchor,
                })
              }
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="pipeline-period-to" className="text-xs">
              To
            </Label>
            <DateInput
              id="pipeline-period-to"
              value={period.customEnd ?? ""}
              onChange={(event) =>
                onPeriodChange({
                  ...period,
                  customEnd: event.target.value,
                })
              }
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
