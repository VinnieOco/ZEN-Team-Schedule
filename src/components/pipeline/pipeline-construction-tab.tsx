"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import {
  DndContext,
  PointerSensor,
  TouchSensor,
  closestCenter,
  type DragEndEvent,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  AlertTriangle,
  CalendarClock,
  DollarSign,
  GripVertical,
  Hammer,
  MoreHorizontal,
  Sparkles,
  UserRound,
} from "lucide-react";

import { HealthStatusBadge } from "@/components/queue/health-status-badge";
import { PipelineDueBuckets } from "@/components/pipeline/pipeline-due-buckets";
import { PipelineMetricCards } from "@/components/pipeline/pipeline-metric-cards";
import {
  PriorityColGroup,
  constructionPriorityColWidths,
  priorityCellClass,
  priorityHeadClass,
} from "@/components/pipeline/priority-table-layout";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useScheduling } from "@/context/scheduling-context";
import { useIsNarrowViewport } from "@/hooks/use-is-narrow-viewport";
import { usePermissions } from "@/hooks/use-permissions";
import { usePipelineListFocus } from "@/hooks/use-pipeline-list-focus";
import { buildEmployeeSelectOptions } from "@/lib/employee-picker-options";
import { estimateDisplayName } from "@/lib/estimating/metrics";
import { latestMilestoneDateForTag } from "@/lib/gantt/milestones";
import {
  getConstructionPmPriorityOrder,
  setConstructionPmPriorityOrder,
} from "@/lib/pipeline/construction-priority-order";
import {
  UNASSIGNED_CONSTRUCTION_PM_ID,
  buildConstructionDueBuckets,
  buildConstructionKpis,
  buildConstructionPhaseDistribution,
  buildConstructionWorkload,
  constructionDaysLeft,
  constructionDueThisWeek,
  constructionJobs,
  constructionPhaseColor,
  constructionRowAccentClass,
  daysLeftClass,
  listFilteredConstructionJobs,
  recentWonEstimatesForConstruction,
  sortConstructionJobsByOrder,
  type ConstructionTableFilters,
} from "@/lib/pipeline/construction";
import {
  pipelineFocusLabel,
  togglePipelineFocus,
} from "@/lib/pipeline/focus";
import { formatPipelineValue, buildPipelineJobs } from "@/lib/pipeline/stages";
import type { PipelineJob } from "@/lib/pipeline/types";
import { projectToFormValues } from "@/lib/project-form";
import { formatProjectAmount } from "@/lib/project-format";
import { cn } from "@/lib/utils";
import { getEmployeeFullName } from "@/lib/week";

function formatShortDate(date?: string): string {
  if (!date?.trim()) return "—";
  try {
    return format(parseISO(date), "MMM d");
  } catch {
    return date;
  }
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0]}${parts[parts.length - 1]![0]}`.toUpperCase();
}

const DEFAULT_FILTERS: Omit<ConstructionTableFilters, "focus"> = {
  search: "",
  pmId: "all",
  health: "all",
};

function PhaseDonut({ buckets }: { buckets: { phase: string; count: number }[] }) {
  const total = buckets.reduce((sum, b) => sum + b.count, 0) || 1;
  let offset = 0;
  const stops = buckets.map((bucket, index) => {
    const pct = (bucket.count / total) * 100;
    const start = offset;
    offset += pct;
    return `${constructionPhaseColor(index)} ${start}% ${offset}%`;
  });

  if (buckets.length === 0) {
    return <p className="text-sm text-muted-foreground">No phase data yet.</p>;
  }

  return (
    <div className="flex items-center gap-4">
      <div
        className="h-24 w-24 shrink-0 rounded-full"
        style={{
          background:
            stops.length > 0
              ? `conic-gradient(${stops.join(", ")})`
              : constructionPhaseColor(0),
        }}
        aria-hidden
      />
      <ul className="min-w-0 flex-1 space-y-1.5">
        {buckets.slice(0, 6).map((bucket, index) => (
          <li key={bucket.phase} className="flex items-center justify-between gap-2 text-sm">
            <span className="flex min-w-0 items-center gap-2 truncate">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ background: constructionPhaseColor(index) }}
              />
              <span className="truncate">{bucket.phase}</span>
            </span>
            <span className="tabular-nums text-muted-foreground">{bucket.count}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ConstructionActionsMenu({
  projectId,
  canEdit,
  onAssignPm,
  onCloseout,
}: {
  projectId: string;
  canEdit: boolean;
  onAssignPm: () => void;
  onCloseout: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-slate-500"
          aria-label="Construction job actions"
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem asChild>
          <Link href={`/projects/${projectId}`}>Open project</Link>
        </DropdownMenuItem>
        {canEdit ? (
          <>
            <DropdownMenuItem onClick={onAssignPm}>Assign PM</DropdownMenuItem>
            <DropdownMenuItem onClick={onCloseout}>Mark closeout</DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

const CONSTRUCTION_LIST_ORDER_KEY = "all";

function SortableConstructionRow({
  job,
  index,
  dueDate,
  canManage,
  layout = "table",
  onAssignPm,
  onCloseout,
}: {
  job: PipelineJob;
  index: number;
  dueDate?: string;
  canManage: boolean;
  layout?: "table" | "card";
  onAssignPm: () => void;
  onCloseout: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: job.projectId,
    disabled: !canManage,
  });
  const days = constructionDaysLeft(dueDate);
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 20 : undefined,
    position: isDragging ? ("relative" as const) : undefined,
  };

  const dragHandle = canManage ? (
    <button
      type="button"
      className="flex h-8 w-7 cursor-grab touch-none items-center justify-center rounded text-slate-400 hover:bg-slate-100 hover:text-slate-700 active:cursor-grabbing"
      aria-label={`Drag ${job.projectName} to change priority`}
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
          "relative rounded-xl border border-slate-200/80 bg-white p-3 shadow-sm",
          isDragging && "z-20 opacity-90 shadow-lg",
        )}
      >
        <span
          className={cn(
            "absolute inset-y-2 left-0 w-1 rounded-r-full",
            constructionRowAccentClass(job.health, dueDate),
          )}
        />
        <div className="flex items-start gap-1.5 pl-1">
          <div className="flex shrink-0 flex-col items-center gap-0.5 pt-0.5">
            {dragHandle}
            <span className="text-[10px] tabular-nums text-muted-foreground">{index + 1}</span>
          </div>
          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <Link
                  href={`/projects/${job.projectId}`}
                  className="block truncate font-medium text-emerald-700 hover:underline"
                >
                  {job.projectName}
                </Link>
                <p className="truncate text-xs text-muted-foreground">{job.clientName}</p>
              </div>
              <ConstructionActionsMenu
                projectId={job.projectId}
                canEdit={canManage}
                onAssignPm={onAssignPm}
                onCloseout={onCloseout}
              />
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge variant="secondary" className="font-normal">
                {job.phase}
              </Badge>
              <HealthStatusBadge health={job.health} />
              <span className="text-[11px] text-muted-foreground">
                {job.ownerName?.trim() || "Unassigned"}
              </span>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground">
              <span className={cn("tabular-nums", daysLeftClass(days))}>
                {dueDate ? formatShortDate(dueDate) : "No due date"}
                {days != null ? ` · ${days}d` : ""}
              </span>
              <span className="tabular-nums font-medium text-slate-800">
                {job.value != null ? formatProjectAmount(job.value) : "—"}
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
      className={cn("group", isDragging && "bg-white opacity-90 shadow-lg")}
    >
      <TableCell className={priorityCellClass("pr-1")}>
        <div className="flex items-center gap-0.5">
          {dragHandle}
          <span className="w-5 text-center text-xs tabular-nums text-muted-foreground">
            {index + 1}
          </span>
        </div>
      </TableCell>
      <TableCell className={priorityCellClass()}>
        <Link href={`/projects/${job.projectId}`} className="block min-w-0 hover:underline">
          <p className="truncate font-medium text-slate-900">{job.projectName}</p>
          {job.projectNumber ? (
            <p className="truncate text-xs text-muted-foreground">{job.projectNumber}</p>
          ) : null}
        </Link>
      </TableCell>
      <TableCell className={priorityCellClass()}>
        <span className="truncate text-sm text-slate-700">{job.clientName}</span>
      </TableCell>
      <TableCell className={priorityCellClass()}>
        <span className="truncate text-sm text-slate-700">
          {job.ownerName?.trim() || "Unassigned"}
        </span>
      </TableCell>
      <TableCell className={priorityCellClass()}>
        <Badge variant="secondary" className="max-w-full truncate font-normal">
          {job.phase}
        </Badge>
      </TableCell>
      <TableCell className={priorityCellClass()}>
        <span className={cn("tabular-nums text-sm", daysLeftClass(days))}>
          {dueDate ? formatShortDate(dueDate) : "—"}
        </span>
      </TableCell>
      <TableCell className={priorityCellClass("text-right tabular-nums")}>
        {job.value != null ? formatProjectAmount(job.value) : "—"}
      </TableCell>
      <TableCell className={priorityCellClass()}>
        <HealthStatusBadge health={job.health} />
      </TableCell>
      <TableCell className={priorityCellClass("text-right")}>
        <ConstructionActionsMenu
          projectId={job.projectId}
          canEdit={canManage}
          onAssignPm={onAssignPm}
          onCloseout={onCloseout}
        />
      </TableCell>
    </TableRow>
  );
}

export function PipelineConstructionTab() {
  const {
    projects,
    employees,
    allocations,
    timeEntries,
    estimates,
    projectMilestones,
    settings,
    getEmployeeById,
    getProjectById,
    updateProject,
    isLoading,
  } = useScheduling();
  const { permissions } = usePermissions();
  const canEdit = permissions.editProjects;
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [focus, setFocus] = usePipelineListFocus();
  const tableFilters: ConstructionTableFilters = useMemo(
    () => ({ ...filters, focus }),
    [filters, focus],
  );
  const [orderRevision, setOrderRevision] = useState(0);
  const [assignProjectId, setAssignProjectId] = useState<string | null>(null);
  const [assignPmId, setAssignPmId] = useState<string>("");
  const isNarrow = useIsNarrowViewport();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
  );

  const jobs = useMemo(
    () => buildPipelineJobs(projects, timeEntries, getEmployeeById, { includeChangeOrders: true }),
    [projects, timeEntries, getEmployeeById],
  );

  const constructionMilestoneDates = useMemo(() => {
    const map = new Map<string, string>();
    for (const project of projects) {
      const date = latestMilestoneDateForTag(projectMilestones, project.id, "construction");
      if (date) map.set(project.id, date);
    }
    return map;
  }, [projects, projectMilestones]);

  const kpis = useMemo(
    () => buildConstructionKpis(jobs, estimates, constructionMilestoneDates),
    [jobs, estimates, constructionMilestoneDates],
  );

  const recentWon = useMemo(() => recentWonEstimatesForConstruction(estimates), [estimates]);

  const constructionJobsList = useMemo(() => {
    let items = listFilteredConstructionJobs(
      jobs,
      tableFilters,
      constructionMilestoneDates,
    );
    if (focus === "recent_won") {
      const linkedIds = new Set(
        recentWon
          .map((estimate) => estimate.project_id)
          .filter((id): id is string => Boolean(id)),
      );
      items = items.filter((job) => linkedIds.has(job.projectId));
    }
    return sortConstructionJobsByOrder(
      items,
      getConstructionPmPriorityOrder(CONSTRUCTION_LIST_ORDER_KEY),
    );
  }, [jobs, tableFilters, constructionMilestoneDates, orderRevision, focus, recentWon]);

  const workload = useMemo(
    () =>
      buildConstructionWorkload(
        jobs,
        allocations,
        employees,
        settings,
        getEmployeeFullName,
      ),
    [jobs, allocations, employees, settings],
  );
  const phases = useMemo(() => buildConstructionPhaseDistribution(jobs), [jobs]);
  const dueBuckets = useMemo(
    () => buildConstructionDueBuckets(jobs, constructionMilestoneDates),
    [jobs, constructionMilestoneDates],
  );
  const dueThisWeekRows = useMemo(
    () => constructionDueThisWeek(jobs, constructionMilestoneDates),
    [jobs, constructionMilestoneDates],
  );
  const workloadMax = Math.max(1, ...workload.map((w) => w.projectCount));

  const activeCount = constructionJobs(jobs).length;
  const priorityCount = constructionJobsList.length;

  const pmOptions = useMemo(() => {
    const fromJobs = constructionJobs(jobs);
    const ids = new Set<string>();
    for (const job of fromJobs) {
      if (job.ownerId) ids.add(job.ownerId);
    }
    return [...ids]
      .map((id) => {
        const employee = getEmployeeById(id);
        return employee
          ? { id, name: getEmployeeFullName(employee) }
          : { id, name: "PM" };
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [jobs, getEmployeeById]);

  const employeeOptions = useMemo(() => buildEmployeeSelectOptions(employees), [employees]);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      if (!canEdit) return;
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      const ids = constructionJobsList.map((item) => item.projectId);
      const from = ids.indexOf(String(active.id));
      const to = ids.indexOf(String(over.id));
      if (from < 0 || to < 0) return;
      setConstructionPmPriorityOrder(CONSTRUCTION_LIST_ORDER_KEY, arrayMove(ids, from, to));
      setOrderRevision((n) => n + 1);
    },
    [canEdit, constructionJobsList],
  );

  const openAssign = (projectId: string) => {
    const project = getProjectById(projectId);
    setAssignProjectId(projectId);
    setAssignPmId(project?.lead_employee_id ?? "");
  };

  const confirmAssign = () => {
    if (!assignProjectId) return;
    const project = getProjectById(assignProjectId);
    if (!project) return;
    updateProject(assignProjectId, {
      ...projectToFormValues(project),
      lead_employee_id: assignPmId || undefined,
    });
    setAssignProjectId(null);
  };

  const markCloseout = (projectId: string) => {
    const project = getProjectById(projectId);
    if (!project) return;
    updateProject(projectId, {
      ...projectToFormValues(project),
      phase: "Closeout",
      department: "Closeout",
    });
  };

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading construction…</p>;
  }

  const colWidths = constructionPriorityColWidths(true);

  return (
    <div className="space-y-5">
      <PipelineMetricCards
        columns={6}
        items={[
          {
            label: "Active Construction",
            value: String(kpis.activeCount),
            sub: focus === "all" ? "In construction" : "Clear focus",
            icon: Hammer,
            accent: "amber",
            onClick: () => setFocus("all"),
          },
          {
            label: "Contract value",
            value: formatPipelineValue(kpis.contractValue),
            sub: "Estimate / contract $",
            icon: DollarSign,
            accent: "emerald",
          },
          {
            label: "Due This Week",
            value: String(kpis.dueThisWeek),
            sub: "Construction milestones",
            icon: CalendarClock,
            accent: "sky",
            onClick: () => setFocus(togglePipelineFocus(focus, "due_week")),
          },
          {
            label: "Overdue",
            value: String(kpis.overdueCount),
            sub: "Past due",
            icon: AlertTriangle,
            accent: kpis.overdueCount > 0 ? "rose" : "slate",
            onClick: () => setFocus(togglePipelineFocus(focus, "overdue")),
          },
          {
            label: "Unassigned",
            value: String(kpis.unassignedCount),
            sub: "No PM",
            icon: UserRound,
            accent: "slate",
            onClick: () => setFocus(togglePipelineFocus(focus, "unassigned")),
          },
          {
            label: "Recently won",
            value: String(kpis.recentlyWonCount),
            sub: "Last 30 days",
            icon: Sparkles,
            accent: "violet",
            onClick: () => setFocus(togglePipelineFocus(focus, "recent_won")),
          },
        ]}
      />

      {recentWon.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm">
          <div className="border-b bg-amber-50/60 px-4 py-2.5">
            <h3 className="text-sm font-semibold text-slate-900">Recently won</h3>
            <p className="text-xs text-muted-foreground">
              Estimates marked won — linked projects should be in Construction.
            </p>
          </div>
          <ul className="divide-y">
            {recentWon.map((estimate) => {
              const project = estimate.project_id
                ? getProjectById(estimate.project_id)
                : undefined;
              const estimator = estimate.estimator_id
                ? getEmployeeById(estimate.estimator_id)
                : undefined;
              return (
                <li key={estimate.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-900">
                      {estimateDisplayName(estimate)}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      Won {formatShortDate(estimate.won_date)}
                      {estimator ? ` · ${getEmployeeFullName(estimator)}` : ""}
                      {estimate.amount != null
                        ? ` · ${formatProjectAmount(estimate.amount)}`
                        : ""}
                    </p>
                  </div>
                  {project ? (
                    <Link
                      href={`/projects/${project.id}`}
                      className="shrink-0 text-xs font-medium text-emerald-700 hover:underline"
                    >
                      {project.project_name}
                    </Link>
                  ) : (
                    <Badge variant="secondary" className="shrink-0 text-xs">
                      No project
                    </Badge>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <div className="flex flex-col gap-3 rounded-xl border border-slate-200/80 bg-white p-3 shadow-sm lg:flex-row lg:items-end">
        <div className="min-w-0 flex-1 space-y-1.5 sm:min-w-[160px]">
          <Label htmlFor="construction-search" className="text-xs">
            Search
          </Label>
          <Input
            id="construction-search"
            value={filters.search}
            onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
            placeholder="Project, client, PM…"
          />
        </div>
        <div className="w-full space-y-1.5 sm:w-44">
          <Label className="text-xs">PM</Label>
          <Select
            value={filters.pmId}
            onValueChange={(value) => setFilters((f) => ({ ...f, pmId: value }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="All PMs" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All PMs</SelectItem>
              <SelectItem value={UNASSIGNED_CONSTRUCTION_PM_ID}>Unassigned</SelectItem>
              {pmOptions.map((pm) => (
                <SelectItem key={pm.id} value={pm.id}>
                  {pm.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="w-full space-y-1.5 sm:w-40">
          <Label className="text-xs">Health</Label>
          <Select
            value={filters.health}
            onValueChange={(value) =>
              setFilters((f) => ({
                ...f,
                health: value as ConstructionTableFilters["health"],
              }))
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="on_track">On track</SelectItem>
              <SelectItem value="at_risk">At risk</SelectItem>
              <SelectItem value="overdue">Overdue</SelectItem>
              <SelectItem value="blocked">Blocked</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <p className="text-xs text-muted-foreground lg:pb-2">
          {priorityCount} job{priorityCount === 1 ? "" : "s"}
          {canEdit ? " · drag to set priority" : ""}
          {focus !== "all" ? ` · focus: ${pipelineFocusLabel(focus)}` : ""}
        </p>
      </div>

      {constructionJobsList.length === 0 ? (
        <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b bg-slate-50/80 px-4 py-2.5">
            <h3 className="text-sm font-semibold text-slate-900">Construction jobs</h3>
          </div>
          <div className="space-y-3 px-4 py-12 text-center">
            <p className="text-sm text-muted-foreground">
              {activeCount === 0
                ? "No construction projects yet. Mark an estimate as won to create a construction job, or set a project phase/department to Construction."
                : "No construction projects match these filters."}
            </p>
            {activeCount === 0 ? (
              <Button asChild variant="outline" size="sm">
                <Link href="/pipeline?tab=estimating">Go to Estimating</Link>
              </Button>
            ) : (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setFilters(DEFAULT_FILTERS);
                  setFocus("all");
                }}
              >
                Clear filters
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b bg-slate-50/80 px-4 py-2.5">
            <h3 className="text-sm font-semibold text-slate-900">Construction jobs</h3>
            <p className="text-xs text-muted-foreground">
              {priorityCount} job{priorityCount === 1 ? "" : "s"}
            </p>
          </div>

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={constructionJobsList.map((item) => item.projectId)}
              strategy={verticalListSortingStrategy}
            >
              {isNarrow ? (
                <div className="space-y-2 p-3">
                  {constructionJobsList.map((job, index) => (
                    <SortableConstructionRow
                      key={job.projectId}
                      job={job}
                      index={index}
                      layout="card"
                      canManage={canEdit}
                      dueDate={
                        constructionMilestoneDates.get(job.projectId) ?? job.dueDate
                      }
                      onAssignPm={() => openAssign(job.projectId)}
                      onCloseout={() => markCloseout(job.projectId)}
                    />
                  ))}
                </div>
              ) : (
                <Table className="min-w-[920px] table-fixed">
                  <PriorityColGroup widths={colWidths} />
                  <TableHeader>
                    <TableRow>
                      <TableHead className={priorityHeadClass()}>#</TableHead>
                      <TableHead className={priorityHeadClass()}>Project</TableHead>
                      <TableHead className={priorityHeadClass()}>Client</TableHead>
                      <TableHead className={priorityHeadClass()}>PM</TableHead>
                      <TableHead className={priorityHeadClass()}>Phase</TableHead>
                      <TableHead className={priorityHeadClass()}>Due</TableHead>
                      <TableHead className={priorityHeadClass("text-right")}>
                        Contract $
                      </TableHead>
                      <TableHead className={priorityHeadClass()}>Health</TableHead>
                      <TableHead className={priorityHeadClass("text-right")} />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {constructionJobsList.map((job, index) => (
                      <SortableConstructionRow
                        key={job.projectId}
                        job={job}
                        index={index}
                        canManage={canEdit}
                        dueDate={
                          constructionMilestoneDates.get(job.projectId) ?? job.dueDate
                        }
                        onAssignPm={() => openAssign(job.projectId)}
                        onCloseout={() => markCloseout(job.projectId)}
                      />
                    ))}
                  </TableBody>
                </Table>
              )}
            </SortableContext>
          </DndContext>
        </div>
      )}

      <div className="grid min-w-0 gap-3 lg:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-900">Workload by PM</h3>
          <div className="mt-4 space-y-3">
            {workload.length === 0 ? (
              <p className="text-sm text-muted-foreground">No assigned PMs this week.</p>
            ) : (
              workload.slice(0, 8).map((row) => (
                <div key={row.employeeId} className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <span className="flex min-w-0 items-center gap-2 truncate font-medium text-slate-900">
                      <Avatar className="h-6 w-6">
                        <AvatarFallback className="bg-amber-50 text-[10px] font-semibold text-amber-800">
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
                  <span className="text-right">Value</span>
                </div>
                {dueThisWeekRows.slice(0, 5).map((job) => (
                  <Link
                    key={job.projectId}
                    href={`/projects/${job.projectId}`}
                    className="grid w-full grid-cols-[52px_1fr_auto] items-center gap-2 border-t border-slate-100 py-2 text-sm first:border-t-0"
                  >
                    <span className="tabular-nums text-muted-foreground">
                      {formatShortDate(
                        constructionMilestoneDates.get(job.projectId) ?? job.dueDate,
                      )}
                    </span>
                    <span className="min-w-0 truncate font-medium text-emerald-700">
                      {job.projectName}
                    </span>
                    <span className="tabular-nums text-slate-800">
                      {job.value != null ? formatProjectAmount(job.value) : "—"}
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

        <PipelineDueBuckets
          buckets={dueBuckets}
          focus={focus}
          onFocusChange={setFocus}
        />
      </div>

      <Dialog
        open={assignProjectId != null}
        onOpenChange={(open) => {
          if (!open) setAssignProjectId(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Assign construction PM</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label>Project manager</Label>
            <Select value={assignPmId || "__none__"} onValueChange={(v) => setAssignPmId(v === "__none__" ? "" : v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select PM" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Unassigned</SelectItem>
                {employeeOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setAssignProjectId(null)}>
              Cancel
            </Button>
            <Button type="button" onClick={confirmAssign}>
              Save
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
