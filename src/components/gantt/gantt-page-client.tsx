"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { startOfMonth, startOfWeek, subWeeks } from "date-fns";
import { Search } from "lucide-react";

import { GanttProjectRowView } from "@/components/gantt/gantt-project-row";
import { GanttTimelineHeader } from "@/components/gantt/gantt-timeline-header";
import { GanttZoomControls } from "@/components/gantt/gantt-zoom-controls";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { useScheduling } from "@/context/scheduling-context";
import { usePermissions } from "@/hooks/use-permissions";
import { useGanttDrag } from "@/hooks/use-gantt-drag";
import { buildGanttRows } from "@/lib/gantt/build-gantt-rows";
import {
  GANTT_PROJECT_COLUMN_WIDTH_PX,
  todayOffsetPx,
  timelineWidthPx,
  visibleColumnCount,
  type GanttZoom,
} from "@/lib/gantt/timeline";

export function GanttPageClient() {
  const {
    projects,
    projectPhases,
    timeEntries,
    isLoading,
    replaceProjectPhases,
    seedMissingProjectPhases,
  } = useScheduling();
  const { permissions } = usePermissions();
  const canEdit = permissions.editProjects;

  const [rangeStart, setRangeStart] = useState(() =>
    startOfWeek(subWeeks(new Date(), 2), { weekStartsOn: 1 }),
  );
  const [zoom, setZoom] = useState<GanttZoom>("weeks");
  const [search, setSearch] = useState("");
  const [showInactive, setShowInactive] = useState(false);
  const seededRef = useRef(false);

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

  const rows = useMemo(() => {
    const built = buildGanttRows(projects, effectivePhases, timeEntries, {
      activeOnly: !showInactive,
    });
    const q = search.trim().toLowerCase();
    if (!q) return built;
    return built.filter(
      (r) =>
        r.project.project_name.toLowerCase().includes(q) ||
        r.project.client_name.toLowerCase().includes(q) ||
        r.project.project_number?.toLowerCase().includes(q),
    );
  }, [projects, effectivePhases, timeEntries, showInactive, search]);

  const timelineWidth = timelineWidthPx(columnCount, zoom);
  const todayLeft = todayOffsetPx(rangeStart, zoom);

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading schedules…</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search projects…"
            className="pl-9"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <GanttZoomControls
            rangeStart={rangeStart}
            zoom={zoom}
            onRangeStartChange={setRangeStart}
            onZoomChange={setZoom}
          />
          <Button
            type="button"
            variant={showInactive ? "secondary" : "outline"}
            size="sm"
            onClick={() => setShowInactive((v) => !v)}
          >
            {showInactive ? "Showing all" : "Active only"}
          </Button>
        </div>
      </div>

      {canEdit && (
        <p className="text-xs text-muted-foreground">
          Drag phase bars to move schedules. Drag bar edges to resize. Linked phases shift
          automatically when you change a predecessor.
        </p>
      )}

      {rows.length === 0 ? (
        <EmptyState
          title="No project schedules yet"
          description="Active projects without phase schedules are seeded automatically on first visit."
        />
      ) : (
        <div className="schedule-scroll schedule-scroll-fade relative overflow-x-auto rounded-lg border bg-white shadow-sm">
          <div style={{ minWidth: GANTT_PROJECT_COLUMN_WIDTH_PX + timelineWidth }}>
            <GanttTimelineHeader rangeStart={rangeStart} columnCount={columnCount} zoom={zoom} />
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
                  dragState={dragState}
                  onDragStart={setDragState}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Thin bar under each phase shows hours logged vs phase budget. Click a project name to open
        its{" "}
        <Link href="/projects" className="text-emerald-700 hover:underline">
          Schedule tab
        </Link>
        .
      </p>
    </div>
  );
}
