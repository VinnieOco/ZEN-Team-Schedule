"use client";

import { format, parseISO } from "date-fns";

import { GanttTooltip } from "@/components/gantt/gantt-chart-tooltip";
import { GanttPhaseProgressOverlay } from "@/components/gantt/phase-progress-bar";
import { phaseAbbreviation, phaseBarColors } from "@/lib/gantt/phase-display";
import { formatProjectAmount, formatProjectHours } from "@/lib/project-format";
import type { GanttPhaseSegment } from "@/lib/gantt/build-gantt-rows";
import type { PhaseProgress } from "@/lib/gantt/phase-progress";
import { cn } from "@/lib/utils";

interface GanttPhaseBarProps {
  segment: GanttPhaseSegment;
  left: number;
  width: number;
  canEdit: boolean;
  className?: string;
  onPointerDownMove: (e: React.PointerEvent) => void;
  onPointerDownResizeStart: (e: React.PointerEvent) => void;
  onPointerDownResizeEnd: (e: React.PointerEvent) => void;
}

function formatPhaseDate(value?: string): string | null {
  if (!value) return null;
  try {
    return format(parseISO(value), "MMM d, yyyy");
  } catch {
    return value;
  }
}

function PhaseBarTooltipContent({
  phaseKey,
  progress,
  startDate,
  endDate,
}: {
  phaseKey: string;
  progress: PhaseProgress;
  startDate?: string;
  endDate?: string;
}) {
  const start = formatPhaseDate(startDate);
  const end = formatPhaseDate(endDate);
  const dateLine =
    start && end ? `${start} → ${end}` : start ?? end ?? null;

  const detailLines: string[] = [];
  if (progress.hoursBudget > 0) {
    detailLines.push(
      `${formatProjectHours(progress.hoursUsed)}h / ${formatProjectHours(progress.hoursBudget)}h (${progress.hoursPercent}%)`,
    );
  } else if (progress.hoursUsed > 0) {
    detailLines.push(`${formatProjectHours(progress.hoursUsed)}h logged`);
  }
  if (progress.feeBudget != null && progress.feeBudget > 0 && progress.feeUsed != null) {
    detailLines.push(
      `${formatProjectAmount(progress.feeUsed)} / ${formatProjectAmount(progress.feeBudget)} fee (${progress.feePercent}%)`,
    );
  }

  return (
    <>
      <p className="font-semibold text-slate-900">{phaseKey}</p>
      {dateLine && <p className="text-muted-foreground">{dateLine}</p>}
      {detailLines.map((line) => (
        <p key={line} className={cn(dateLine ? "mt-1" : "", "leading-snug text-slate-600")}>
          {line}
        </p>
      ))}
    </>
  );
}

export function GanttPhaseBar({
  segment,
  left,
  width,
  canEdit,
  className,
  onPointerDownMove,
  onPointerDownResizeStart,
  onPointerDownResizeEnd,
}: GanttPhaseBarProps) {
  const isProjectSpan = segment.isProjectSpan === true;
  const editable = canEdit && !isProjectSpan;
  const colors = phaseBarColors(segment.phase.phase_key);
  const label = phaseAbbreviation(segment.phase.phase_key);
  const showLabel = width >= 28;
  const showPercent =
    width >= 52 &&
    segment.progress.hoursBudget > 0 &&
    segment.progress.hoursPercent > 0;

  return (
    <GanttTooltip
      content={
        <PhaseBarTooltipContent
          phaseKey={segment.phase.phase_key}
          progress={segment.progress}
          startDate={segment.phase.start_date}
          endDate={segment.phase.end_date}
        />
      }
    >
      <div className={cn("absolute top-2 z-10 h-8", className)} style={{ left, width }}>
        <div
          className={cn(
            "relative flex h-full items-center overflow-hidden rounded-md border border-slate-200/90 text-slate-900 shadow-sm",
            editable && "cursor-grab active:cursor-grabbing",
            isProjectSpan && "border-dashed",
          )}
          style={{ backgroundColor: colors.bg }}
          onPointerDown={editable ? onPointerDownMove : undefined}
        >
          <GanttPhaseProgressOverlay progress={segment.progress} />
          {editable && (
            <div
              className="absolute left-0 top-0 z-10 h-full w-2 cursor-ew-resize"
              onPointerDown={(e) => {
                e.stopPropagation();
                onPointerDownResizeStart(e);
              }}
            />
          )}
          {showLabel && (
            <span className="pointer-events-none relative z-[1] truncate px-1.5 text-[10px] font-semibold">
              {showPercent ? `${label} ${segment.progress.hoursPercent}%` : label}
            </span>
          )}
          {editable && (
            <div
              className="absolute right-0 top-0 z-10 h-full w-2 cursor-ew-resize"
              onPointerDown={(e) => {
                e.stopPropagation();
                onPointerDownResizeEnd(e);
              }}
            />
          )}
        </div>
      </div>
    </GanttTooltip>
  );
}
