"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { GanttPhaseRowView, PHASE_LABEL_WIDTH } from "@/components/gantt/gantt-phase-row";
import { GanttTimelineHeader } from "@/components/gantt/gantt-timeline-header";
import { GanttZoomControls } from "@/components/gantt/gantt-zoom-controls";
import { useGanttDrag } from "@/hooks/use-gantt-drag";
import { buildGanttRows } from "@/lib/gantt/build-gantt-rows";
import { applyPhaseDateChange } from "@/lib/gantt/phase-links";
import { phasesForProject } from "@/lib/gantt/seed-phases";
import {
  todayOffsetPx,
  timelineWidthPx,
  visibleColumnCount,
  type GanttZoom,
} from "@/lib/gantt/timeline";
import type { Project, ScheduledProjectPhase, TimeEntry } from "@/types";
import { startOfMonth, startOfWeek } from "date-fns";

interface GanttSingleProjectChartProps {
  project: Project;
  projectPhases: ScheduledProjectPhase[];
  timeEntries: TimeEntry[];
  canEdit: boolean;
  rangeStart: Date;
  onRangeStartChange: (date: Date) => void;
  onCommitPhases: (phases: ScheduledProjectPhase[]) => void;
}

export function GanttSingleProjectChart({
  project,
  projectPhases,
  timeEntries,
  canEdit,
  rangeStart,
  onRangeStartChange,
  onCommitPhases,
}: GanttSingleProjectChartProps) {
  const [zoom, setZoom] = useState<GanttZoom>("weeks");
  const prevZoomRef = useRef(zoom);
  const columnCount = visibleColumnCount(zoom);
  const timelineWidth = timelineWidthPx(columnCount, zoom);
  const todayLeft = todayOffsetPx(rangeStart, zoom);

  const { dragState, setDragState, effectivePhases } = useGanttDrag({
    projectPhases,
    zoom,
    onCommit: (_projectId, phases) => onCommitPhases(phases),
  });

  useEffect(() => {
    if (prevZoomRef.current === zoom) return;
    prevZoomRef.current = zoom;
    onRangeStartChange(
      zoom === "months"
        ? startOfMonth(rangeStart)
        : startOfWeek(rangeStart, { weekStartsOn: 1 }),
    );
  }, [zoom, rangeStart, onRangeStartChange]);

  const row = useMemo(() => {
    const rows = buildGanttRows([project], effectivePhases, timeEntries, { activeOnly: false });
    return rows[0];
  }, [project, effectivePhases, timeEntries]);

  const phases = phasesForProject(effectivePhases, project.id);

  if (!row) {
    return (
      <p className="text-sm text-muted-foreground">
        No phase schedule yet. Phases are created automatically when you open this tab.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <GanttZoomControls
        rangeStart={rangeStart}
        zoom={zoom}
        onRangeStartChange={onRangeStartChange}
        onZoomChange={setZoom}
      />

      <div className="schedule-scroll relative overflow-x-auto rounded-lg border bg-white shadow-sm">
        <div style={{ minWidth: PHASE_LABEL_WIDTH + timelineWidth }}>
          <GanttTimelineHeader
            rangeStart={rangeStart}
            columnCount={columnCount}
            zoom={zoom}
            showProjectColumn={false}
            sideLabel="Phase"
            sideLabelWidth={PHASE_LABEL_WIDTH}
          />
          <div className="relative">
            <div
              className="pointer-events-none absolute bottom-0 top-0 z-10 w-px bg-red-400/80"
              style={{ left: PHASE_LABEL_WIDTH + todayLeft }}
            />
            {row.phases.map((segment) => {
              const phase = phases.find((p) => p.id === segment.phase.id) ?? segment.phase;
              return (
                <GanttPhaseRowView
                  key={segment.phase.id}
                  segment={segment}
                  projectId={project.id}
                  rangeStart={rangeStart}
                  zoom={zoom}
                  timelineWidth={timelineWidth}
                  canEdit={canEdit}
                  dragState={dragState}
                  onDragStart={setDragState}
                  phaseOverride={phase}
                />
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export function togglePhaseLinked(
  phases: ScheduledProjectPhase[],
  phaseId: string,
  linked: boolean,
): ScheduledProjectPhase[] {
  return phases.map((p) => (p.id === phaseId ? { ...p, linked_to_previous: linked } : p));
}

export function updatePhaseField(
  phases: ScheduledProjectPhase[],
  phaseId: string,
  field: "start_date" | "end_date" | "budget_hours",
  value: string | number,
): ScheduledProjectPhase[] {
  const phase = phases.find((p) => p.id === phaseId);
  if (!phase) return phases;
  if (field === "budget_hours") {
    return phases.map((p) => (p.id === phaseId ? { ...p, budget_hours: Number(value) || 0 } : p));
  }
  const start = field === "start_date" ? String(value) : phase.start_date;
  const end = field === "end_date" ? String(value) : phase.end_date;
  if (!start || !end) {
    return phases.map((p) => (p.id === phaseId ? { ...p, [field]: String(value) } : p));
  }
  return applyPhaseDateChange(phases, phaseId, start, end);
}
