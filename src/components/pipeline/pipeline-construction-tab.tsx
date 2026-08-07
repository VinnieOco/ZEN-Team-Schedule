"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import {
  AlertTriangle,
  CalendarClock,
  DollarSign,
  Hammer,
  Sparkles,
  UserRound,
} from "lucide-react";

import { ConstructionWipSchedule } from "@/components/pipeline/construction-wip-schedule";
import { PipelineDueBuckets } from "@/components/pipeline/pipeline-due-buckets";
import { PipelineMetricCards } from "@/components/pipeline/pipeline-metric-cards";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useScheduling } from "@/context/scheduling-context";
import { usePermissions } from "@/hooks/use-permissions";
import { usePipelineListFocus } from "@/hooks/use-pipeline-list-focus";
import { estimateDisplayName } from "@/lib/estimating/metrics";
import { latestMilestoneDateForTag } from "@/lib/gantt/milestones";
import {
  UNASSIGNED_CONSTRUCTION_PM_ID,
  buildConstructionDueBuckets,
  buildConstructionKpis,
  buildConstructionPhaseDistribution,
  buildConstructionWorkload,
  constructionDueThisWeek,
  constructionJobs,
  constructionPhaseColor,
  listFilteredConstructionJobs,
  recentWonEstimatesForConstruction,
  type ConstructionTableFilters,
} from "@/lib/pipeline/construction";
import {
  pipelineFocusLabel,
  togglePipelineFocus,
} from "@/lib/pipeline/focus";
import { formatPipelineValue, buildPipelineJobs } from "@/lib/pipeline/stages";
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
    isLoading,
  } = useScheduling();
  const { permissions } = usePermissions();
  const canViewWip = permissions.viewWipSchedule;
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [focus, setFocus] = usePipelineListFocus();
  const tableFilters: ConstructionTableFilters = useMemo(
    () => ({ ...filters, focus }),
    [filters, focus],
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
    return items;
  }, [jobs, tableFilters, constructionMilestoneDates, focus, recentWon]);

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

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading construction…</p>;
  }

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
          {canViewWip ? " on WIP" : ""}
          {focus !== "all" ? ` · focus: ${pipelineFocusLabel(focus)}` : ""}
        </p>
      </div>

      {canViewWip ? (
        <ConstructionWipSchedule jobs={constructionJobsList} canEdit={canViewWip} />
      ) : null}

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

    </div>
  );
}
