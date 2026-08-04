"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import {
  DndContext,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { format, parseISO } from "date-fns";
import {
  AlertTriangle,
  CalendarClock,
  Clock3,
  GripVertical,
  Layers,
  ListOrdered,
  MoreHorizontal,
  Plus,
  UserRound,
  Users,
} from "lucide-react";

import { ScrollableTabsList } from "@/components/layout/scrollable-tabs-list";
import { AddToQueueDialog } from "@/components/queue/add-to-queue-dialog";
import { HealthStatusBadge } from "@/components/queue/health-status-badge";
import { QueueBoard } from "@/components/queue/queue-board";
import { QueueFiltersBar } from "@/components/queue/queue-filters";
import { PipelineMetricCards } from "@/components/pipeline/pipeline-metric-cards";
import {
  PriorityColGroup,
  designPriorityColWidths,
  priorityCellClass,
  priorityHeadClass,
} from "@/components/pipeline/priority-table-layout";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsTrigger } from "@/components/ui/tabs";
import { useScheduling } from "@/context/scheduling-context";
import { useIsNarrowViewport } from "@/hooks/use-is-narrow-viewport";
import { useOptimisticUrlView } from "@/hooks/use-optimistic-url-tab";
import { usePermissions } from "@/hooks/use-permissions";
import { useQueueColumnOrder } from "@/hooks/use-queue-column-order";
import { useQueueMembership } from "@/hooks/use-queue-membership";
import { useQueueStageOverrides } from "@/hooks/use-queue-stage-overrides";
import {
  defaultQueueFilters,
  filterDesignQueueItems,
  queueFiltersActive,
} from "@/lib/filter-queue";
import {
  buildDesignDueBuckets,
  buildDesignKpis,
  buildDesignPhaseDistribution,
  buildDesignPriorityGroups,
  buildDesignWorkload,
  daysLeftClass,
  designDaysLeft,
  designDueThisWeek,
  designPhaseColor,
  designPriorityStageKey,
  designQueueStageBadgeClass,
  designRowAccentClass,
  designStageLabel,
} from "@/lib/pipeline/design";
import { latestMilestoneDateForTag } from "@/lib/gantt/milestones";
import { buildDesignQueueItems } from "@/lib/queue/build-queue-items";
import { arrayMoveIds, sortQueueColumnItems } from "@/lib/queue/column-order";
import { writeQueueDragCommit, type QueueDragCommit } from "@/lib/queue/queue-state";
import type { DesignQueueItem } from "@/lib/queue/types";
import { cn } from "@/lib/utils";
import { getEmployeeFullName } from "@/lib/week";

function parseView(value: string | null): "table" | "kanban" {
  return value === "kanban" ? "kanban" : "table";
}

function formatShortDate(date?: string): string {
  if (!date?.trim()) return "—";
  try {
    return format(parseISO(date), "MMM d");
  } catch {
    return date;
  }
}

function formatHoursPair(used: number, budget: number): string {
  const u = Number.isFinite(used) ? used : 0;
  const b = Number.isFinite(budget) ? budget : 0;
  return `${u} / ${b}h`;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function PhaseDonut({
  buckets,
}: {
  buckets: { phase: string; count: number }[];
}) {
  const total = buckets.reduce((sum, b) => sum + b.count, 0);
  if (total === 0) {
    return (
      <div className="flex h-[120px] items-center justify-center text-sm text-muted-foreground">
        No active phases
      </div>
    );
  }

  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;
  const slices = buckets
    .filter((b) => b.count > 0)
    .map((b, index) => {
      const length = (b.count / total) * circumference;
      const slice = {
        ...b,
        dash: length,
        offset,
        color: designPhaseColor(index),
      };
      offset += length;
      return slice;
    });

  return (
    <div className="flex items-center gap-4">
      <div className="relative h-[120px] w-[120px] shrink-0">
        <svg viewBox="0 0 100 100" className="-rotate-90 h-full w-full">
          <circle cx="50" cy="50" r={radius} fill="none" stroke="#f1f5f9" strokeWidth="12" />
          {slices.map((slice) => (
            <circle
              key={slice.phase}
              cx="50"
              cy="50"
              r={radius}
              fill="none"
              stroke={slice.color}
              strokeWidth="12"
              strokeDasharray={`${slice.dash} ${circumference - slice.dash}`}
              strokeDashoffset={-slice.offset}
            />
          ))}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            Total
          </p>
          <p className="text-xl font-bold tabular-nums text-slate-900">{total}</p>
        </div>
      </div>
      <ul className="min-w-0 flex-1 space-y-2">
        {buckets.slice(0, 5).map((b, index) => (
          <li key={b.phase} className="flex items-center justify-between gap-2 text-sm">
            <span className="flex min-w-0 items-center gap-2 truncate">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: designPhaseColor(index) }}
              />
              <span className="truncate text-slate-700">{b.phase}</span>
            </span>
            <span className="shrink-0 tabular-nums text-muted-foreground">{b.count}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function DesignActionsMenu({
  projectId,
  onRemove,
}: {
  projectId: string;
  onRemove: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          aria-label="Project actions"
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem asChild>
          <Link href={`/projects/${projectId}`}>Open project</Link>
        </DropdownMenuItem>
        <DropdownMenuItem className="text-rose-700" onClick={onRemove}>
          Remove from queue
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function SortableDesignPriorityRow({
  item,
  index,
  milestoneDate,
  canManageQueue,
  layout = "table",
  onRemove,
}: {
  item: DesignQueueItem;
  index: number;
  milestoneDate?: string;
  canManageQueue: boolean;
  layout?: "table" | "card";
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.project.id,
    disabled: !canManageQueue,
  });
  const days = designDaysLeft(item);
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 20 : undefined,
    position: isDragging ? ("relative" as const) : undefined,
  };

  const dragHandle = canManageQueue ? (
    <button
      type="button"
      className="flex h-8 w-7 cursor-grab touch-none items-center justify-center rounded text-slate-400 hover:bg-slate-100 hover:text-slate-700 active:cursor-grabbing"
      aria-label={`Drag ${item.project.project_name} to change priority`}
      {...attributes}
      {...listeners}
    >
      <GripVertical className="h-4 w-4" />
    </button>
  ) : null;

  if (layout === "card") {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className={cn(
          "relative px-3 py-3",
          !item.project.active && "opacity-60",
          isDragging && "z-20 bg-white opacity-90 shadow-lg",
        )}
      >
        <span
          className={cn(
            "absolute inset-y-2 left-0 w-1 rounded-r-full",
            designRowAccentClass(item),
          )}
        />
        <div className="flex items-start gap-1.5">
          <div className="flex shrink-0 flex-col items-center gap-0.5 pt-0.5">
            {dragHandle}
            <span className="text-[10px] tabular-nums text-muted-foreground">{index + 1}</span>
          </div>
          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <Link
                  href={`/projects/${item.project.id}`}
                  className="block truncate font-medium text-emerald-700 hover:underline"
                >
                  {item.project.project_name}
                </Link>
                <p className="truncate text-xs text-muted-foreground">
                  {item.project.client_name}
                  {item.project.project_number ? ` · ${item.project.project_number}` : ""}
                </p>
              </div>
              {canManageQueue ? (
                <div className="shrink-0">
                  <DesignActionsMenu projectId={item.project.id} onRemove={onRemove} />
                </div>
              ) : null}
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge
                variant="secondary"
                className={cn("font-semibold", designQueueStageBadgeClass(item.stage))}
              >
                {designStageLabel(item.stage)}
              </Badge>
              <Badge variant="secondary" className="font-normal">
                {item.project.phase}
              </Badge>
              <HealthStatusBadge health={item.health} />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground">
              <span
                className={cn(
                  "tabular-nums",
                  days != null && days < 0 && "font-semibold text-rose-600",
                )}
              >
                Due {formatShortDate(item.dueDate)}
                {milestoneDate ? ` · MS ${formatShortDate(milestoneDate)}` : ""}
              </span>
              <span className="flex items-center gap-2 tabular-nums">
                <span className={daysLeftClass(days)}>
                  {days == null ? "—" : `${days}d left`}
                </span>
                <span className="font-medium text-slate-700">
                  {formatHoursPair(item.metrics.hoursUsed, item.metrics.budgetHours)}
                </span>
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <TableRow
      ref={setNodeRef}
      style={style}
      className={cn(
        !item.project.active && "opacity-60",
        isDragging && "bg-white opacity-80 shadow-lg",
      )}
    >
      <TableCell className={priorityCellClass("relative py-3 pl-2")}>
        <span
          className={cn(
            "absolute inset-y-2 left-0 w-1 rounded-r-full",
            designRowAccentClass(item),
          )}
        />
        <div className="flex items-center gap-1">
          {dragHandle}
          <span className="text-xs tabular-nums text-muted-foreground">{index + 1}</span>
        </div>
      </TableCell>
      <TableCell className={priorityCellClass()}>
        <Link
          href={`/projects/${item.project.id}`}
          className="block max-w-full truncate font-medium text-emerald-700 hover:underline"
        >
          {item.project.project_name}
        </Link>
        {item.project.project_number ? (
          <p className="truncate text-xs text-muted-foreground">{item.project.project_number}</p>
        ) : null}
      </TableCell>
      <TableCell className={priorityCellClass()}>{item.project.client_name}</TableCell>
      <TableCell className={priorityCellClass()}>
        <Badge variant="secondary" className="max-w-full truncate font-normal">
          {item.project.phase}
        </Badge>
      </TableCell>
      <TableCell className={priorityCellClass("tabular-nums text-slate-700")}>
        {formatShortDate(milestoneDate)}
      </TableCell>
      <TableCell
        className={priorityCellClass(
          cn("tabular-nums", days != null && days < 0 && "font-semibold text-rose-600"),
        )}
      >
        {formatShortDate(item.dueDate)}
      </TableCell>
      <TableCell className={priorityCellClass("text-right tabular-nums font-medium")}>
        {formatHoursPair(item.metrics.hoursUsed, item.metrics.budgetHours)}
      </TableCell>
      <TableCell className={priorityCellClass()}>
        <Badge
          variant="secondary"
          className={cn("max-w-full truncate font-semibold", designQueueStageBadgeClass(item.stage))}
        >
          {designStageLabel(item.stage)}
        </Badge>
      </TableCell>
      <TableCell className={priorityCellClass()}>
        <HealthStatusBadge health={item.health} />
      </TableCell>
      {canManageQueue && (
        <TableCell className={priorityCellClass("text-right")}>
          <DesignActionsMenu projectId={item.project.id} onRemove={onRemove} />
        </TableCell>
      )}
    </TableRow>
  );
}

export function PipelineDesignTab() {
  const applyDesignView = useCallback((next: "table" | "kanban", params: URLSearchParams) => {
    params.set("tab", "design");
    if (next === "table") params.delete("view");
    else params.set("view", next);
  }, []);

  const [view, setView] = useOptimisticUrlView(parseView, applyDesignView);

  const {
    projects,
    allocations,
    timeEntries,
    employees,
    settings,
    projectMilestones,
    getEmployeeById,
    isLoading,
    queueRevision,
  } = useScheduling();
  const { permissions } = usePermissions();
  const { revision, updateStage } = useQueueStageOverrides();
  const { revision: membershipRevision, addToQueue, removeFromQueue } = useQueueMembership();
  const { revision: orderRevision, updateColumnOrder } = useQueueColumnOrder();

  const [filters, setFilters] = useState(defaultQueueFilters);
  const [tableSearch, setTableSearch] = useState("");
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [dragRevision, setDragRevision] = useState(0);
  const isNarrow = useIsNarrowViewport();
  const priorityLayout = isNarrow ? "card" : "table";
  const prioritySensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
  );

  const designMilestoneDates = useMemo(() => {
    const map = new Map<string, string>();
    for (const project of projects) {
      const date = latestMilestoneDateForTag(projectMilestones, project.id, "design");
      if (date) map.set(project.id, date);
    }
    return map;
  }, [projects, projectMilestones]);

  const designItems = useMemo(
    () => buildDesignQueueItems(projects, allocations, timeEntries, getEmployeeById),
    [
      projects,
      allocations,
      timeEntries,
      getEmployeeById,
      revision,
      membershipRevision,
      queueRevision,
      dragRevision,
    ],
  );

  const filteredKanban = useMemo(
    () => filterDesignQueueItems(designItems, filters),
    [designItems, filters],
  );

  const kpis = useMemo(
    () => buildDesignKpis(designItems, allocations, employees, settings, new Date(), designMilestoneDates),
    [designItems, allocations, employees, settings, designMilestoneDates],
  );

  const workload = useMemo(
    () =>
      buildDesignWorkload(designItems, allocations, employees, settings, getEmployeeFullName),
    [designItems, allocations, employees, settings],
  );

  const phases = useMemo(() => buildDesignPhaseDistribution(designItems), [designItems]);
  const dueBuckets = useMemo(() => buildDesignDueBuckets(designItems), [designItems]);
  const dueThisWeekRows = useMemo(
    () => designDueThisWeek(designItems, new Date(), designMilestoneDates),
    [designItems, designMilestoneDates],
  );
  const workloadMax = Math.max(1, ...workload.map((w) => w.projectCount));

  const priorityGroups = useMemo(() => {
    const groups = buildDesignPriorityGroups(designItems, tableSearch);
    return groups.map((group) => ({
      ...group,
      items: sortQueueColumnItems(
        "design",
        designPriorityStageKey(group.designerId),
        group.items,
        "priority",
      ),
    }));
  }, [designItems, tableSearch, orderRevision]);

  const priorityCount = priorityGroups.reduce((sum, g) => sum + g.items.length, 0);
  const unassignedActiveCount = designItems.filter(
    (i) => i.stage !== "complete" && !i.project.lead_employee_id,
  ).length;

  const handleDragCommit = useCallback((commit: QueueDragCommit) => {
    writeQueueDragCommit(commit);
    setDragRevision((n) => n + 1);
  }, []);

  const handleAddToQueue = (projectId: string) => {
    addToQueue("design", projectId);
    updateStage(projectId, { kind: "design", stage: "backlog" });
  };

  const handlePriorityDragEnd = (
    event: DragEndEvent,
    designerId: string,
  ) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const fullGroup = buildDesignPriorityGroups(designItems).find(
      (group) => group.designerId === designerId,
    );
    if (!fullGroup) return;
    const orderedItems = sortQueueColumnItems(
      "design",
      designPriorityStageKey(designerId),
      fullGroup.items,
      "priority",
    );
    const ids = orderedItems.map((item) => item.project.id);
    const oldIndex = ids.indexOf(String(active.id));
    const newIndex = ids.indexOf(String(over.id));
    if (oldIndex === -1 || newIndex === -1) return;
    updateColumnOrder(
      "design",
      designPriorityStageKey(designerId),
      arrayMoveIds(ids, oldIndex, newIndex),
    );
  };

  const handleRemoveFromPriority = (projectId: string, projectName: string) => {
    if (!window.confirm(`Remove “${projectName}” from the design queue?`)) return;
    removeFromQueue("design", projectId);
  };

  const canEditStage = permissions.editQueue;
  const canManageQueue = permissions.editQueue;
  const filtersActive = queueFiltersActive(filters);

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading design…</p>;
  }

  return (
    <div className="space-y-5">
      <PipelineMetricCards
        items={[
          {
            label: "Active Design",
            value: String(kpis.activeCount),
            sub: "In production",
            icon: Layers,
            accent: "sky",
          },
          {
            label: "Due This Week",
            value: String(kpis.dueThisWeek),
            sub: "Milestone dates",
            icon: CalendarClock,
            accent: "amber",
          },
          {
            label: "In Review",
            value: String(kpis.inReview),
            sub: "Internal + client",
            icon: Users,
            accent: "violet",
          },
          {
            label: "Hours vs Capacity",
            value: kpis.utilizationPercent == null ? "—" : `${kpis.utilizationPercent}%`,
            sub: `${kpis.hoursScheduled}h / ${kpis.hoursCapacity}h this week`,
            icon: Clock3,
            accent: "emerald",
          },
          {
            label: "Overdue",
            value: String(kpis.overdueCount),
            sub: "Past due or flagged",
            icon: AlertTriangle,
            accent: "rose",
          },
          {
            label: "Unassigned",
            value: String(kpis.unassignedCount),
            sub: "No lead designer",
            icon: UserRound,
            accent: "slate",
          },
        ]}
      />

      <Tabs value={view} onValueChange={setView} className="min-w-0">
        <div className="flex flex-col gap-3 border-b border-slate-200 pb-0 sm:flex-row sm:items-center sm:justify-between">
          <ScrollableTabsList className="h-auto rounded-none border-0 bg-transparent p-0 shadow-none">
            <TabsTrigger
              value="table"
              className="rounded-none border-b-2 border-transparent px-3 pb-2.5 pt-1 data-[state=active]:border-emerald-600 data-[state=active]:bg-transparent data-[state=active]:text-emerald-800 data-[state=active]:shadow-none"
            >
              Main Table
            </TabsTrigger>
            <TabsTrigger
              value="kanban"
              className="rounded-none border-b-2 border-transparent px-3 pb-2.5 pt-1 data-[state=active]:border-emerald-600 data-[state=active]:bg-transparent data-[state=active]:text-emerald-800 data-[state=active]:shadow-none"
            >
              Kanban
            </TabsTrigger>
          </ScrollableTabsList>
          {canManageQueue && (
            <Button
              type="button"
              className="mb-2 w-full shrink-0 sm:mb-1.5 sm:w-auto"
              onClick={() => setAddDialogOpen(true)}
            >
              <Plus className="mr-1.5 h-4 w-4" />
              Add to queue
            </Button>
          )}
        </div>

        <TabsContent value="table" className="mt-4 min-w-0 space-y-4">
          <div className="flex flex-col gap-3 rounded-xl border border-slate-200/80 bg-white p-3 shadow-sm sm:flex-row sm:items-end">
            <div className="min-w-0 flex-1 space-y-1.5 sm:min-w-[180px]">
              <Label htmlFor="design-search" className="text-xs">
                Search
              </Label>
              <Input
                id="design-search"
                value={tableSearch}
                onChange={(e) => setTableSearch(e.target.value)}
                placeholder="Project, client, designer…"
              />
            </div>
            <p className="text-xs text-muted-foreground sm:pb-2">
              {priorityCount} assigned · {priorityGroups.length} designer
              {priorityGroups.length === 1 ? "" : "s"}
              {unassignedActiveCount > 0
                ? ` · ${unassignedActiveCount} unassigned hidden`
                : ""}
            </p>
          </div>

          {priorityGroups.length === 0 ? (
            <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b bg-slate-50/80 px-4 py-2.5">
                <h3 className="text-sm font-semibold text-slate-900">Priority by Designer</h3>
              </div>
              <p className="px-4 py-12 text-center text-sm text-muted-foreground">
                {designItems.filter((i) => i.stage !== "complete").length === 0
                  ? "No design projects in the queue yet. Add a project or convert a lead."
                  : tableSearch.trim()
                    ? "No assigned design projects match this search."
                    : "Assign a lead designer on projects to build each designer's priority queue."}
              </p>
              {canManageQueue && (
                <div className="border-t px-3 py-2">
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-9 w-full justify-start text-muted-foreground hover:text-emerald-800"
                    onClick={() => setAddDialogOpen(true)}
                  >
                    <Plus className="mr-1.5 h-4 w-4" />
                    Add to queue
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {priorityGroups.map((group) => (
                <div
                  key={group.designerId}
                  className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm"
                >
                  <div className="flex items-center justify-between gap-3 border-b bg-slate-50/80 px-4 py-2.5">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-emerald-50 text-[11px] font-semibold text-emerald-800">
                          {initials(group.designerName)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <h3 className="truncate text-sm font-semibold text-slate-900">
                          {group.designerName}
                        </h3>
                        <p className="text-xs text-muted-foreground">
                          Priority queue · highest first
                        </p>
                      </div>
                    </div>
                    <span className="shrink-0 rounded-full bg-slate-200/80 px-2 py-0.5 text-[11px] font-medium tabular-nums text-slate-600">
                      {group.items.length}
                    </span>
                  </div>

                  <DndContext
                    sensors={prioritySensors}
                    collisionDetection={closestCenter}
                    onDragEnd={(event) => handlePriorityDragEnd(event, group.designerId)}
                  >
                    {isNarrow ? (
                      <div className="divide-y divide-slate-100">
                        <SortableContext
                          items={group.items.map((item) => item.project.id)}
                          strategy={verticalListSortingStrategy}
                        >
                          {group.items.map((item, index) => (
                            <SortableDesignPriorityRow
                              key={item.project.id}
                              item={item}
                              index={index}
                              milestoneDate={designMilestoneDates.get(item.project.id)}
                              canManageQueue={canManageQueue}
                              layout={priorityLayout}
                              onRemove={() =>
                                handleRemoveFromPriority(
                                  item.project.id,
                                  item.project.project_name,
                                )
                              }
                            />
                          ))}
                        </SortableContext>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <Table className="min-w-[1100px] table-fixed">
                          <PriorityColGroup widths={designPriorityColWidths(canManageQueue)} />
                          <TableHeader>
                            <TableRow className="hover:bg-transparent">
                              <TableHead className={priorityHeadClass()}>Priority</TableHead>
                              <TableHead className={priorityHeadClass()}>Project</TableHead>
                              <TableHead className={priorityHeadClass()}>Client</TableHead>
                              <TableHead className={priorityHeadClass()}>Phase</TableHead>
                              <TableHead className={priorityHeadClass()}>Milestone</TableHead>
                              <TableHead className={priorityHeadClass()}>Due</TableHead>
                              <TableHead className={priorityHeadClass("text-right")}>Hours</TableHead>
                              <TableHead className={priorityHeadClass()}>Status</TableHead>
                              <TableHead className={priorityHeadClass()}>Health</TableHead>
                              {canManageQueue && <TableHead className={priorityHeadClass()} />}
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            <SortableContext
                              items={group.items.map((item) => item.project.id)}
                              strategy={verticalListSortingStrategy}
                            >
                              {group.items.map((item, index) => (
                                <SortableDesignPriorityRow
                                  key={item.project.id}
                                  item={item}
                                  index={index}
                                  milestoneDate={designMilestoneDates.get(item.project.id)}
                                  canManageQueue={canManageQueue}
                                  layout={priorityLayout}
                                  onRemove={() =>
                                    handleRemoveFromPriority(
                                      item.project.id,
                                      item.project.project_name,
                                    )
                                  }
                                />
                              ))}
                            </SortableContext>
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </DndContext>
                </div>
              ))}

              {canManageQueue && (
                <div className="overflow-hidden rounded-xl border border-dashed border-slate-200 bg-white">
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-10 w-full justify-start rounded-none text-muted-foreground hover:text-emerald-800"
                    onClick={() => setAddDialogOpen(true)}
                  >
                    <Plus className="mr-1.5 h-4 w-4" />
                    Add to queue
                  </Button>
                </div>
              )}
            </div>
          )}

          <div className="grid min-w-0 gap-3 lg:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-900">Workload by Designer</h3>
              <div className="mt-4 space-y-3">
                {workload.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No assigned designers this week.</p>
                ) : (
                  workload.slice(0, 8).map((row) => (
                    <div key={row.employeeId} className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2 text-sm">
                        <span className="flex min-w-0 items-center gap-2 truncate font-medium text-slate-900">
                          <Avatar className="h-6 w-6">
                            <AvatarFallback className="bg-slate-100 text-[10px] font-semibold text-slate-600">
                              {initials(row.name)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="truncate">{row.name}</span>
                        </span>
                        <span className="shrink-0 tabular-nums text-muted-foreground">
                          {row.projectCount}
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className={cn(
                            "h-full rounded-full",
                            (row.utilizationPercent ?? 0) > 100
                              ? "bg-rose-500"
                              : (row.utilizationPercent ?? 0) >= 85
                                ? "bg-amber-500"
                                : "bg-emerald-500",
                          )}
                          style={{
                            width: `${Math.round((row.projectCount / workloadMax) * 100)}%`,
                          }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {row.hoursScheduled}h
                        {row.weeklyCapacity > 0 ? ` / ${row.weeklyCapacity}h` : ""}
                        {row.utilizationPercent != null ? ` · ${row.utilizationPercent}%` : ""}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-900">Due This Week</h3>
              <div className="mt-3 space-y-0">
                {dueThisWeekRows.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nothing due this week.</p>
                ) : (
                  <>
                    <div className="mb-1 grid grid-cols-[52px_1fr_auto] gap-2 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                      <span>Due</span>
                      <span>Project</span>
                      <span className="text-right">Hours</span>
                    </div>
                    {dueThisWeekRows.slice(0, 5).map((item) => (
                      <Link
                        key={item.project.id}
                        href={`/projects/${item.project.id}`}
                        className="grid w-full grid-cols-[52px_1fr_auto] items-center gap-2 border-t border-slate-100 py-2 text-sm first:border-t-0"
                      >
                        <span className="tabular-nums text-muted-foreground">
                          {formatShortDate(designMilestoneDates.get(item.project.id))}
                        </span>
                        <span className="min-w-0 truncate font-medium text-emerald-700">
                          {item.project.project_name}
                        </span>
                        <span className="tabular-nums text-slate-800">
                          {formatHoursPair(item.metrics.hoursUsed, item.metrics.budgetHours)}
                        </span>
                      </Link>
                    ))}
                  </>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-900">By Phase</h3>
              <div className="mt-3">
                <PhaseDonut buckets={phases} />
              </div>
            </div>

            <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-900">Upcoming Due Dates</h3>
              <ul className="mt-4 space-y-2.5">
                {[
                  {
                    label: "Overdue",
                    count: dueBuckets.overdue,
                    className: "bg-rose-50 text-rose-700",
                    dot: "bg-rose-500",
                  },
                  {
                    label: "Today",
                    count: dueBuckets.today,
                    className: "bg-rose-50 text-rose-700",
                    dot: "bg-rose-500",
                  },
                  {
                    label: "Tomorrow",
                    count: dueBuckets.tomorrow,
                    className: "bg-amber-50 text-amber-800",
                    dot: "bg-amber-500",
                  },
                  {
                    label: "This Week",
                    count: dueBuckets.thisWeek,
                    className: "bg-amber-50/70 text-amber-900",
                    dot: "bg-amber-400",
                  },
                  {
                    label: "Next Week",
                    count: dueBuckets.nextWeek,
                    className: "bg-emerald-50 text-emerald-800",
                    dot: "bg-emerald-500",
                  },
                ].map((row) => (
                  <li
                    key={row.label}
                    className={cn(
                      "flex items-center justify-between rounded-lg px-3 py-2 text-sm",
                      row.className,
                    )}
                  >
                    <span className="flex items-center gap-2 font-medium">
                      <span className={cn("h-2 w-2 rounded-full", row.dot)} />
                      {row.label}
                    </span>
                    <span className="tabular-nums font-semibold">{row.count}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="kanban" className="mt-4 min-w-0 space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 flex-1">
              <QueueFiltersBar
                kind="design"
                filters={filters}
                onChange={(partial) => setFilters((prev) => ({ ...prev, ...partial }))}
                resultCount={filteredKanban.length}
                totalCount={designItems.length}
              />
            </div>
          </div>

          {filteredKanban.length === 0 && filtersActive ? (
            <EmptyState
              icon={ListOrdered}
              title="No design projects match your filters"
              description="Try a different search term or clear filters, or add a project back to the queue."
              actionLabel="Clear filters"
              onAction={() => setFilters(defaultQueueFilters())}
            />
          ) : (
            <QueueBoard
              kind="design"
              designItems={filteredKanban}
              allDesignItems={designItems}
              orderRevision={orderRevision + queueRevision + dragRevision}
              sortBy={filters.sortBy}
              canEditStage={canEditStage}
              canManageQueue={canManageQueue}
              onDragCommit={handleDragCommit}
              onRemoveFromQueue={(projectId) => removeFromQueue("design", projectId)}
            />
          )}

          {filteredKanban.length === 0 && !filtersActive && canManageQueue && (
            <p className="text-center text-sm text-muted-foreground">
              No projects in the design queue. Use Add to queue to show projects here again.
            </p>
          )}
        </TabsContent>
      </Tabs>

      <AddToQueueDialog
        kind="design"
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        projects={projects}
        onAdd={handleAddToQueue}
      />
    </div>
  );
}
