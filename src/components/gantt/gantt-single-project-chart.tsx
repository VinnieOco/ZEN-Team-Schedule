"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { GanttMilestoneMarkers } from "@/components/gantt/gantt-milestone-markers";
import { GanttTooltipProvider } from "@/components/gantt/gantt-chart-tooltip";
import { GanttPhaseRowView, PHASE_LABEL_WIDTH } from "@/components/gantt/gantt-phase-row";
import { GanttTimelineHeader } from "@/components/gantt/gantt-timeline-header";
import { GanttProgressLegend } from "@/components/gantt/gantt-progress-legend";
import { GanttZoomControls } from "@/components/gantt/gantt-zoom-controls";
import { useGanttDrag } from "@/hooks/use-gantt-drag";
import { useGanttTimelineLayout } from "@/hooks/use-gantt-timeline-layout";
import { useGanttTimelinePan } from "@/hooks/use-gantt-timeline-pan";
import { buildGanttRows } from "@/lib/gantt/build-gantt-rows";
import { applyPhaseDateChange } from "@/lib/gantt/phase-links";
import { openMilestonesForProject } from "@/lib/gantt/milestones";
import { phasesForProject } from "@/lib/gantt/seed-phases";
import {
  todayOffsetPx,
  type GanttZoom,
} from "@/lib/gantt/timeline";
import type { Allocation, Employee, Project, ProjectMilestone, ScheduledProjectPhase, TimeEntry } from "@/types";
import { startOfMonth, startOfWeek } from "date-fns";

interface GanttSingleProjectChartProps {
  project: Project;
  projectPhases: ScheduledProjectPhase[];
  projectMilestones: ProjectMilestone[];
  timeEntries: TimeEntry[];
  allocations: Allocation[];
  employees: Employee[];
  canEdit: boolean;
  rangeStart: Date;
  onRangeStartChange: (date: Date) => void;
  onCommitPhases: (phases: ScheduledProjectPhase[]) => void;
}

export function GanttSingleProjectChart({
  project,
  projectPhases,
  projectMilestones,
  timeEntries,
  allocations,
  employees,
  canEdit,
  rangeStart,
  onRangeStartChange,
  onCommitPhases,
}: GanttSingleProjectChartProps) {
  const [zoom, setZoom] = useState<GanttZoom>("weeks");
  const prevZoomRef = useRef(zoom);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { columnCount, timelineWidth } = useGanttTimelineLayout(
    scrollRef,
    zoom,
    PHASE_LABEL_WIDTH,
  );
  const todayLeft = todayOffsetPx(rangeStart, zoom);

  const { dragState, setDragState, effectivePhases } = useGanttDrag({
    projectPhases,
    zoom,
    onCommit: (_projectId, phases) => onCommitPhases(phases),
  });

  const { onPanLayerPointerDown, isPanning } = useGanttTimelinePan({
    rangeStart,
    zoom,
    onRangeStartChange,
    disabled: dragState !== null,
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
  const committedPhases = phasesForProject(projectPhases, project.id);
  const milestones = openMilestonesForProject(projectMilestones, project.id);
  const hasMilestones = milestones.length > 0;

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

      <GanttProgressLegend />

      <p className="text-xs text-muted-foreground">
        Drag empty timeline space to move through earlier or later dates.
        {canEdit && " Drag phase bars to adjust dates."}
      </p>

      <div
        ref={scrollRef}
        className={`schedule-scroll relative overflow-x-auto rounded-lg border bg-white shadow-sm ${
          isPanning ? "cursor-grabbing select-none" : ""
        }`}
      >
        <div style={{ minWidth: PHASE_LABEL_WIDTH + timelineWidth }}>
          <GanttTimelineHeader
            rangeStart={rangeStart}
            columnCount={columnCount}
            zoom={zoom}
            timelineWidth={timelineWidth}
            onPanLayerPointerDown={onPanLayerPointerDown}
            isPanning={isPanning}
            showProjectColumn={false}
            sideLabel="Phase"
            sideLabelWidth={PHASE_LABEL_WIDTH}
          />
          <GanttTooltipProvider>
            <div className="relative">
              <div
                className="pointer-events-none absolute bottom-0 top-0 z-10 w-px bg-red-400/80"
                style={{ left: PHASE_LABEL_WIDTH + todayLeft }}
              />
              {hasMilestones && (
              <div className="flex border-b border-slate-100" style={{ height: 28 }}>
                <div
                  className="shrink-0 border-r border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground"
                  style={{ width: PHASE_LABEL_WIDTH }}
                >
                  Milestones
                </div>
                <div
                  className="relative flex-1"
                  style={{ width: timelineWidth, minWidth: timelineWidth, height: 28 }}
                >
                  <div
                    className="absolute inset-0 z-0 touch-none cursor-grab active:cursor-grabbing"
                    aria-hidden
                    onPointerDown={onPanLayerPointerDown}
                  />
                  <GanttMilestoneMarkers
                    milestones={milestones}
                    rangeStart={rangeStart}
                    zoom={zoom}
                  />
                </div>
              </div>
            )}
            {row.phases.map((segment) => {
              const phase = phases.find((p) => p.id === segment.phase.id) ?? segment.phase;
              const committedPhase =
                committedPhases.find((p) => p.id === segment.phase.id) ?? segment.phase;
              return (
                <GanttPhaseRowView
                  key={segment.phase.id}
                  segment={segment}
                  projectId={project.id}
                  rangeStart={rangeStart}
                  zoom={zoom}
                  timelineWidth={timelineWidth}
                  canEdit={canEdit}
                  allocations={allocations}
                  employees={employees}
                  dragState={dragState}
                  onDragStart={setDragState}
                  phaseOverride={phase}
                  staffingPhase={committedPhase}
                  onPanLayerPointerDown={onPanLayerPointerDown}
                />
              );
            })}
            </div>
          </GanttTooltipProvider>
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
