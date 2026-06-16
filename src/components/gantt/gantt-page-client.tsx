"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { startOfMonth, startOfWeek, subWeeks } from "date-fns";

import { GanttProgressLegend } from "@/components/gantt/gantt-progress-legend";
import {
  buildProjectMilestone,
  GanttMilestoneFormDialog,
  type GanttMilestoneFormValues,
} from "@/components/gantt/gantt-milestone-form-dialog";
import { GanttTimelineContextMenu } from "@/components/gantt/gantt-timeline-context-menu";
import { GanttTooltipProvider } from "@/components/gantt/gantt-chart-tooltip";
import { GanttProjectRowView } from "@/components/gantt/gantt-project-row";
import { GanttTimelineHeader } from "@/components/gantt/gantt-timeline-header";
import { GanttZoomControls } from "@/components/gantt/gantt-zoom-controls";
import { ProjectsFilters } from "@/components/projects/projects-filters";
import { EmptyState } from "@/components/ui/empty-state";
import { useScheduling } from "@/context/scheduling-context";
import { usePermissions } from "@/hooks/use-permissions";
import { useGanttDrag } from "@/hooks/use-gantt-drag";
import { buildGanttRows, filterGanttRows } from "@/lib/gantt/build-gantt-rows";
import { milestonesForProject } from "@/lib/gantt/milestones";
import {
  defaultGanttFilters,
  projectFiltersActive,
  type ProjectFilters,
} from "@/lib/filter-projects";
import {
  GANTT_PROJECT_COLUMN_WIDTH_PX,
  todayOffsetPx,
  timelineWidthPx,
  visibleColumnCount,
  type GanttZoom,
} from "@/lib/gantt/timeline";

function countParentRows(rows: ReturnType<typeof buildGanttRows>): number {
  return rows.filter((row) => !row.isChangeOrder).length;
}

export function GanttPageClient() {
  const {
    projects,
    projectPhases,
    timeEntries,
    isLoading,
    projectMilestones,
    replaceProjectPhases,
    replaceProjectMilestones,
    seedMissingProjectPhases,
    getEmployeeById,
  } = useScheduling();
  const { permissions } = usePermissions();
  const canEdit = permissions.editProjects;

  const [rangeStart, setRangeStart] = useState(() =>
    startOfWeek(subWeeks(new Date(), 2), { weekStartsOn: 1 }),
  );
  const [zoom, setZoom] = useState<GanttZoom>("weeks");
  const [filters, setFilters] = useState<ProjectFilters>(defaultGanttFilters);
  const seededRef = useRef(false);
  const [timelineMenu, setTimelineMenu] = useState<{
    projectId: string;
    projectLabel: string;
    clientX: number;
    clientY: number;
    date: string;
  } | null>(null);
  const [milestoneDialog, setMilestoneDialog] = useState<{
    projectId: string;
    projectLabel: string;
    date: string;
  } | null>(null);

  const columnCount = visibleColumnCount(zoom);

  const { dragState, setDragState, effectivePhases } = useGanttDrag({
    projectPhases,
    zoom,
    onCommit: replaceProjectPhases,
  });

  useEffect(() => {
    if (seededRef.current || isLoading) return;
    seededRef.current = true;
    void seedMissingProjectPhases();
  }, [isLoading, seedMissingProjectPhases]);

  useEffect(() => {
    setRangeStart((current) =>
      zoom === "months" ? startOfMonth(current) : startOfWeek(current, { weekStartsOn: 1 }),
    );
  }, [zoom]);

  const builtRows = useMemo(
    () =>
      buildGanttRows(projects, effectivePhases, timeEntries, {
        activeOnly: !filters.showInactive,
      }),
    [projects, effectivePhases, timeEntries, filters.showInactive],
  );

  const rows = useMemo(
    () => filterGanttRows(builtRows, projects, filters, getEmployeeById),
    [builtRows, projects, filters, getEmployeeById],
  );

  const totalCount = useMemo(() => countParentRows(builtRows), [builtRows]);
  const resultCount = useMemo(() => countParentRows(rows), [rows]);
  const hasActiveFilters = projectFiltersActive(filters);

  const timelineWidth = timelineWidthPx(columnCount, zoom);
  const todayLeft = todayOffsetPx(rangeStart, zoom);

  const updateFilters = (partial: Partial<ProjectFilters>) => {
    setFilters((prev) => ({ ...prev, ...partial }));
  };

  const projectLabelForRow = (projectId: string): string => {
    const project = projects.find((p) => p.id === projectId);
    if (!project) return "Project";
    return project.project_number
      ? `${project.project_number} ${project.project_name}`
      : project.project_name;
  };

  const handleTimelineContextMenu = (
    projectId: string,
    request: { clientX: number; clientY: number; date: string },
  ) => {
    setTimelineMenu({
      projectId,
      projectLabel: projectLabelForRow(projectId),
      clientX: request.clientX,
      clientY: request.clientY,
      date: request.date,
    });
  };

  const handleSaveMilestone = (values: GanttMilestoneFormValues) => {
    if (!milestoneDialog) return;
    const existing = milestonesForProject(projectMilestones, milestoneDialog.projectId);
    const milestone = buildProjectMilestone(
      milestoneDialog.projectId,
      values,
      existing.length,
    );
    replaceProjectMilestones(milestoneDialog.projectId, [...existing, milestone]);
    setMilestoneDialog(null);
  };

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading schedules…</p>;
  }

  return (
    <div className="space-y-4">
      <ProjectsFilters
        filters={filters}
        onChange={updateFilters}
        onClear={() => setFilters(defaultGanttFilters())}
        resultCount={resultCount}
        totalCount={totalCount}
      />

      <div className="flex justify-end">
        <GanttZoomControls
          rangeStart={rangeStart}
          zoom={zoom}
          onRangeStartChange={setRangeStart}
          onZoomChange={setZoom}
        />
      </div>

      {canEdit && (
        <p className="text-xs text-muted-foreground">
          Drag phase bars to move schedules. Drag bar edges to resize. Linked phases shift
          automatically when you change a predecessor. Right-click a project timeline to add a
          milestone.
        </p>
      )}

      {rows.length === 0 ? (
        <EmptyState
          title={hasActiveFilters ? "No schedules match your filters" : "No project schedules yet"}
          description={
            hasActiveFilters
              ? "Try a different search term, department, lead, or clear filters to see more schedules."
              : "Active projects without phase schedules are seeded automatically on first visit."
          }
          actionLabel={hasActiveFilters ? "Clear filters" : undefined}
          onAction={hasActiveFilters ? () => setFilters(defaultGanttFilters()) : undefined}
        />
      ) : (
        <div className="schedule-scroll schedule-scroll-fade relative overflow-x-auto rounded-lg border bg-white shadow-sm">
          <div style={{ minWidth: GANTT_PROJECT_COLUMN_WIDTH_PX + timelineWidth }}>
            <GanttTimelineHeader rangeStart={rangeStart} columnCount={columnCount} zoom={zoom} />
            <GanttTooltipProvider>
              <div className="relative">
                <div
                  className="pointer-events-none absolute bottom-0 top-0 z-10 w-px bg-red-400/80"
                  style={{ left: GANTT_PROJECT_COLUMN_WIDTH_PX + todayLeft }}
                />
                {rows.map((row) => (
                  <GanttProjectRowView
                    key={row.project.id}
                    row={row}
                    rangeStart={rangeStart}
                    zoom={zoom}
                    timelineWidth={timelineWidth}
                    canEdit={canEdit}
                    projectPhases={effectivePhases}
                    milestones={milestonesForProject(projectMilestones, row.project.id)}
                    dragState={dragState}
                    onDragStart={setDragState}
                    onTimelineContextMenu={
                      canEdit
                        ? (request) => handleTimelineContextMenu(row.project.id, request)
                        : undefined
                    }
                  />
                ))}
              </div>
            </GanttTooltipProvider>
          </div>
        </div>
      )}

      <GanttProgressLegend />

      <GanttTimelineContextMenu
        open={timelineMenu !== null}
        x={timelineMenu?.clientX ?? 0}
        y={timelineMenu?.clientY ?? 0}
        date={timelineMenu?.date ?? ""}
        onClose={() => setTimelineMenu(null)}
        onAddMilestone={() => {
          if (!timelineMenu) return;
          setMilestoneDialog({
            projectId: timelineMenu.projectId,
            projectLabel: timelineMenu.projectLabel,
            date: timelineMenu.date,
          });
        }}
      />

      <GanttMilestoneFormDialog
        open={milestoneDialog !== null}
        onOpenChange={(open) => {
          if (!open) setMilestoneDialog(null);
        }}
        projectLabel={milestoneDialog?.projectLabel ?? ""}
        initialDate={milestoneDialog?.date ?? new Date().toISOString().slice(0, 10)}
        onSave={handleSaveMilestone}
      />

      <p className="text-xs text-muted-foreground">
        Phase bars show hours and fee burn from logged time. Change orders appear indented under
        their parent project. Open a project Schedule tab to see phase staffing. Click a project
        name to open its{" "}
        <Link href="/projects" className="text-emerald-700 hover:underline">
          Schedule tab
        </Link>
        .
      </p>
    </div>
  );
}
