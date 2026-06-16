"use client";

import {
  feeStripClass,
  hoursOverlayClass,
  hoursStripClass,
  progressStatus,
  type PhaseProgress,
} from "@/lib/gantt/phase-progress";
import { cn } from "@/lib/utils";

interface PhaseProgressBarProps {
  progress: PhaseProgress;
  /** Inline table variant — no fee strip, smaller height. */
  compact?: boolean;
  className?: string;
}

export function PhaseProgressBar({ progress, compact = false, className }: PhaseProgressBarProps) {
  const hoursStatus = progressStatus(progress.hoursPercent, progress.hoursBudget > 0);
  const feeStatus = progressStatus(progress.feePercent ?? 0, (progress.feeBudget ?? 0) > 0);
  const hoursWidth = Math.min(progress.hoursPercent, 100);
  const feeWidth = Math.min(progress.feePercent ?? 0, 100);
  const showFee = !compact && progress.feeBudget != null && progress.feeBudget > 0;

  if (hoursStatus === "none" && (!showFee || feeStatus === "none")) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }

  return (
    <div className={cn("space-y-1", className)}>
      <div
        className={cn(
          "relative w-full overflow-hidden rounded-full bg-slate-100",
          compact ? "h-1.5" : "h-2",
        )}
      >
        {hoursStatus !== "none" && (
          <div
            className={cn("absolute inset-y-0 left-0 rounded-full", hoursStripClass(hoursStatus))}
            style={{ width: `${hoursWidth}%` }}
          />
        )}
        {showFee && feeStatus !== "none" && (
          <div
            className={cn(
              "absolute inset-y-0 left-0 rounded-full opacity-60 mix-blend-multiply",
              feeStripClass(feeStatus),
            )}
            style={{ width: `${feeWidth}%` }}
          />
        )}
      </div>
      {!compact && (
        <p className="text-[10px] tabular-nums text-muted-foreground">
          {progress.hoursBudget > 0 ? `${progress.hoursPercent}% hrs` : null}
          {progress.hoursBudget > 0 && showFee ? " · " : null}
          {showFee && progress.feePercent != null ? `${progress.feePercent}% fee` : null}
        </p>
      )}
    </div>
  );
}

interface GanttPhaseProgressOverlayProps {
  progress: PhaseProgress;
}

/** Fills inside a Gantt phase bar to show hours and fee burn. */
export function GanttPhaseProgressOverlay({ progress }: GanttPhaseProgressOverlayProps) {
  const hoursStatus = progressStatus(progress.hoursPercent, progress.hoursBudget > 0);
  const feeStatus = progressStatus(progress.feePercent ?? 0, (progress.feeBudget ?? 0) > 0);
  const hoursWidth = Math.min(progress.hoursPercent, 100);
  const feeWidth = Math.min(progress.feePercent ?? 0, 100);
  const showFee = progress.feeBudget != null && progress.feeBudget > 0;

  if (hoursStatus === "none" && (!showFee || feeStatus === "none")) {
    return null;
  }

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-md">
      {hoursStatus !== "none" && (
        <div
          className={cn("absolute inset-y-0 left-0 opacity-20", hoursOverlayClass(hoursStatus))}
          style={{ width: `${hoursWidth}%` }}
        />
      )}
      {showFee && feeStatus !== "none" && (
        <div
          className={cn("absolute bottom-0 left-0 h-1 opacity-90", feeStripClass(feeStatus))}
          style={{ width: `${feeWidth}%` }}
        />
      )}
      {hoursStatus !== "none" && (
        <div
          className={cn(
            "absolute bottom-0 left-0 h-0.5 opacity-80",
            showFee ? "mb-1" : "",
            hoursStripClass(hoursStatus),
          )}
          style={{ width: `${hoursWidth}%` }}
        />
      )}
    </div>
  );
}
