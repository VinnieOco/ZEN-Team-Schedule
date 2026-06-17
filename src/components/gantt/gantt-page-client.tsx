"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { startOfMonth, startOfWeek, subWeeks } from "date-fns";

import { GanttMilestonesView } from "@/components/gantt/gantt-milestones-view";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useScheduling } from "@/context/scheduling-context";
import { usePermissions } from "@/hooks/use-permissions";
import { useGanttDrag } from "@/hooks/use-gantt-drag";
import { useGanttTimelineLayout } from "@/hooks/use-gantt-timeline-layout";
import { useGanttTimelinePan } from "@/hooks/use-gantt-timeline-pan";
import { buildGanttRows, filterGanttRows } from "@/lib/gantt/build-gantt-rows";
import {
  filterFirmMilestones,
  milestonesForProject,
  openMilestonesForProject,
} from "@/lib/gantt/milestones";
import {
  defaultGanttFilters,
  projectFiltersActive,
  type ProjectFilters,
} from "@/lib/filter-projects";
import {
  GANTT_PROJECT_COLUMN_WIDTH_PX,
  todayOffsetPx,
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
    employees,
    replaceProjectPhases,
    replaceProjectMilestones,
    toggleProjectMilestoneCompleted,
    updateProjectMilestoneAssigned,
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
  const [activeTab, setActiveTab] = useState<"timeline" | "milestones">("timeline");
  const seededRef = useRef(false);
  const scrollRef = useRef<HTMLDivElement>(null);
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

  const { columnCount, timelineWidth } = useGanttTimelineLayout(
    scrollRef,
    zoom,
    GANTT_PROJECT_COLUMN_WIDTH_PX,
  );

  const { dragState, setDragState, effectivePhases } = useGanttDrag({
    projectPhases,
    zoom,
    onCommit: replaceProjectPhases,
  });

  const { onPanLayerPointerDown, isPanning } = useGanttTimelinePan({
    rangeStart,
    zoom,
    onRangeStartChange: setRangeStart,
    disabled: dragState !== null,
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
  const filteredMilestones = useMemo(
    () => filterFirmMilestones(projectMilestones, projects, filters, getEmployeeById),
    [projectMilestones, projects, filters, getEmployeeById],
  );
  const openMilestoneCount = useMemo(
    () => filteredMilestones.filter((m) => !m.completed_at).length,
    [filteredMilestones],
  );
  const totalOpenMilestones = useMemo(
    () => projectMilestones.filter((m) => !m.completed_at).length,
    [projectMilestones],
  );

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
        resultCount={activeTab === "milestones" ? openMilestoneCount : resultCount}
        totalCount={activeTab === "milestones" ? totalOpenMilestones : totalCount}
        resultNoun={activeTab === "milestones" ? "open milestone" : "project"}
      />

      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as "timeline" | "milestones")}
      >
        <TabsList>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="milestones">Milestones</TabsTrigger>
        </TabsList>

        <TabsContent value="timeline" className="mt-4 space-y-4">
          <div className="flex justify-end">
            <GanttZoomControls
              rangeStart={rangeStart}
              zoom={zoom}
              onRangeStartChange={setRangeStart}
              onZoomChange={setZoom}
            />
          </div>

          {rows.length > 0 && (
            <p className="text-xs text-muted-foreground">
              Drag empty timeline space to move through earlier or later dates. Use the arrows or
              Today button for larger jumps.
              {canEdit &&
                " Drag phase bars to move schedules, drag bar edges to resize, and right-click a timeline to add a milestone."}
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
            <div
              ref={scrollRef}
              className={`schedule-scroll schedule-scroll-fade relative overflow-x-auto rounded-lg border bg-white shadow-sm ${
                isPanning ? "cursor-grabbing select-none" : ""
              }`}
            >
              <div style={{ minWidth: GANTT_PROJECT_COLUMN_WIDTH_PX + timelineWidth }}>
                <GanttTimelineHeader
                  rangeStart={rangeStart}
                  columnCount={columnCount}
                  zoom={zoom}
                  timelineWidth={timelineWidth}
                  onPanLayerPointerDown={onPanLayerPointerDown}
                  isPanning={isPanning}
                />
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
                        milestones={openMilestonesForProject(projectMilestones, row.project.id)}
                        dragState={dragState}
                        onDragStart={setDragState}
                        onTimelineContextMenu={
                          canEdit
                            ? (request) => handleTimelineContextMenu(row.project.id, request)
                            : undefined
                        }
                        onPanLayerPointerDown={onPanLayerPointerDown}
                      />
                    ))}
                  </div>
                </GanttTooltipProvider>
              </div>
            </div>
          )}

          <GanttProgressLegend />

          <p className="text-xs text-muted-foreground">
            Phase bars show hours and fee burn from logged time. Change orders appear indented
            under their parent project. Completed milestones are hidden from the timeline — manage
            them on the Milestones tab.
          </p>
        </TabsContent>

        <TabsContent value="milestones" className="mt-4 space-y-4">
          {canEdit && (
            <p className="text-xs text-muted-foreground">
              Check off milestones when they are done. Completed items move to the section below and
              disappear from the Gantt timeline.
            </p>
          )}
          <GanttMilestonesView
            milestones={projectMilestones}
            projects={projects}
            employees={employees}
            filters={filters}
            getEmployeeById={getEmployeeById}
            canEdit={canEdit}
            hasActiveFilters={hasActiveFilters}
            onClearFilters={() => setFilters(defaultGanttFilters())}
            onToggleCompleted={toggleProjectMilestoneCompleted}
            onAssignedChange={updateProjectMilestoneAssigned}
          />
        </TabsContent>
      </Tabs>

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
    </div>
  );
}
