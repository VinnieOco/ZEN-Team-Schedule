"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import {
  AlertTriangle,
  CalendarClock,
  DollarSign,
  Hammer,
  UserRound,
} from "lucide-react";

import { HealthStatusBadge } from "@/components/queue/health-status-badge";
import { PipelineMetricCards } from "@/components/pipeline/pipeline-metric-cards";
import {
  CONSTRUCTION_PRIORITY_COL_WIDTHS,
  PriorityColGroup,
  priorityCellClass,
  priorityHeadClass,
} from "@/components/pipeline/priority-table-layout";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
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
import { useScheduling } from "@/context/scheduling-context";
import { useIsNarrowViewport } from "@/hooks/use-is-narrow-viewport";
import {
  UNASSIGNED_CONSTRUCTION_PM_ID,
  buildConstructionKpis,
  buildConstructionPriorityGroups,
  constructionDaysLeft,
  constructionJobs,
  constructionRowAccentClass,
  daysLeftClass,
  recentWonEstimatesForConstruction,
} from "@/lib/pipeline/construction";
import { formatPipelineValue, buildPipelineJobs } from "@/lib/pipeline/stages";
import { latestMilestoneDateForTag } from "@/lib/gantt/milestones";
import { estimateDisplayName } from "@/lib/estimating/metrics";
import { formatProjectAmount } from "@/lib/project-format";
import { cn } from "@/lib/utils";
import { getEmployeeFullName } from "@/lib/week";
import type { PipelineJob } from "@/lib/pipeline/types";

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

function JobCard({
  job,
  dueDate,
}: {
  job: PipelineJob;
  dueDate?: string;
}) {
  const days = constructionDaysLeft(dueDate);
  return (
    <Link
      href={`/projects/${job.projectId}`}
      className="block rounded-xl border border-slate-200/80 bg-white p-3 shadow-sm transition-colors hover:border-slate-300"
    >
      <div className="flex gap-2">
        <span
          className={cn(
            "mt-1 h-8 w-1 shrink-0 rounded-full",
            constructionRowAccentClass(job.health, dueDate),
          )}
        />
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-900">{job.projectName}</p>
              <p className="truncate text-xs text-muted-foreground">{job.clientName}</p>
            </div>
            <HealthStatusBadge health={job.health} />
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span>{job.phase}</span>
            <span className="tabular-nums font-medium text-slate-800">
              {job.value != null ? formatProjectAmount(job.value) : "—"}
            </span>
            <span className={cn("tabular-nums", daysLeftClass(days))}>
              {dueDate ? formatShortDate(dueDate) : "No due date"}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

export function PipelineConstructionTab() {
  const {
    projects,
    timeEntries,
    estimates,
    projectMilestones,
    getEmployeeById,
    getProjectById,
    isLoading,
  } = useScheduling();
  const [tableSearch, setTableSearch] = useState("");
  const isNarrow = useIsNarrowViewport();

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

  const priorityGroups = useMemo(
    () => buildConstructionPriorityGroups(jobs, tableSearch),
    [jobs, tableSearch],
  );

  const activeCount = constructionJobs(jobs).length;
  const priorityCount = priorityGroups.reduce((sum, g) => sum + g.items.length, 0);
  const recentWon = useMemo(() => recentWonEstimatesForConstruction(estimates), [estimates]);

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading construction…</p>;
  }

  return (
    <div className="space-y-5">
      <PipelineMetricCards
        columns={4}
        items={[
          {
            label: "Active Construction",
            value: String(kpis.activeCount),
            sub: "In construction",
            icon: Hammer,
            accent: "amber",
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
          },
          {
            label: "Needs attention",
            value: String(kpis.overdueCount + kpis.unassignedCount),
            sub: `${kpis.overdueCount} overdue · ${kpis.unassignedCount} unassigned`,
            icon: kpis.overdueCount > 0 ? AlertTriangle : UserRound,
            accent: kpis.overdueCount > 0 ? "rose" : "slate",
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

      <div className="flex flex-col gap-3 rounded-xl border border-slate-200/80 bg-white p-3 shadow-sm sm:flex-row sm:items-end">
        <div className="min-w-0 flex-1 space-y-1.5 sm:min-w-[180px]">
          <Label htmlFor="construction-search" className="text-xs">
            Search
          </Label>
          <Input
            id="construction-search"
            value={tableSearch}
            onChange={(e) => setTableSearch(e.target.value)}
            placeholder="Project, client, PM…"
          />
        </div>
        <p className="text-xs text-muted-foreground sm:pb-2">
          {priorityCount} job{priorityCount === 1 ? "" : "s"} · {priorityGroups.length} group
          {priorityGroups.length === 1 ? "" : "s"}
        </p>
      </div>

      {priorityGroups.length === 0 ? (
        <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b bg-slate-50/80 px-4 py-2.5">
            <h3 className="text-sm font-semibold text-slate-900">Construction by PM</h3>
          </div>
          <p className="px-4 py-12 text-center text-sm text-muted-foreground">
            {activeCount === 0
              ? "No construction projects yet. Mark an estimate as won to create a construction job, or set a project phase/department to Construction."
              : "No construction projects match this search."}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {priorityGroups.map((group) => {
            const isUnassigned = group.pmId === UNASSIGNED_CONSTRUCTION_PM_ID;
            return (
              <div
                key={group.pmId}
                className={cn(
                  "overflow-hidden rounded-xl border bg-white shadow-sm",
                  isUnassigned ? "border-amber-200/80" : "border-slate-200/80",
                )}
              >
                <div
                  className={cn(
                    "flex items-center justify-between gap-3 border-b px-4 py-2.5",
                    isUnassigned ? "bg-amber-50/80" : "bg-slate-50/80",
                  )}
                >
                  <div className="flex min-w-0 items-center gap-2.5">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback
                        className={cn(
                          "text-xs font-semibold",
                          isUnassigned
                            ? "bg-amber-100 text-amber-900"
                            : "bg-amber-50 text-amber-800",
                        )}
                      >
                        {isUnassigned ? "?" : initials(group.pmName)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-semibold text-slate-900">
                        {group.pmName}
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        {group.items.length} job{group.items.length === 1 ? "" : "s"}
                      </p>
                    </div>
                  </div>
                </div>

                {isNarrow ? (
                  <div className="space-y-2 p-3">
                    {group.items.map((job) => (
                      <JobCard
                        key={job.projectId}
                        job={job}
                        dueDate={
                          constructionMilestoneDates.get(job.projectId) ?? job.dueDate
                        }
                      />
                    ))}
                  </div>
                ) : (
                  <Table className="min-w-[720px] table-fixed">
                    <PriorityColGroup widths={CONSTRUCTION_PRIORITY_COL_WIDTHS} />
                    <TableHeader>
                      <TableRow>
                        <TableHead className={priorityHeadClass("w-8")} />
                        <TableHead className={priorityHeadClass()}>Project</TableHead>
                        <TableHead className={priorityHeadClass()}>Phase</TableHead>
                        <TableHead className={priorityHeadClass("text-right")}>
                          Contract $
                        </TableHead>
                        <TableHead className={priorityHeadClass()}>Due</TableHead>
                        <TableHead className={priorityHeadClass()}>Health</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {group.items.map((job) => {
                        const dueDate =
                          constructionMilestoneDates.get(job.projectId) ?? job.dueDate;
                        const days = constructionDaysLeft(dueDate);
                        return (
                          <TableRow key={job.projectId} className="group">
                            <TableCell className={priorityCellClass("pr-0")}>
                              <span
                                className={cn(
                                  "block h-8 w-1 rounded-full",
                                  constructionRowAccentClass(job.health, dueDate),
                                )}
                              />
                            </TableCell>
                            <TableCell className={priorityCellClass()}>
                              <Link
                                href={`/projects/${job.projectId}`}
                                className="block min-w-0 hover:underline"
                              >
                                <p className="truncate font-medium text-slate-900">
                                  {job.projectName}
                                </p>
                                <p className="truncate text-xs text-muted-foreground">
                                  {job.clientName}
                                  {job.projectNumber ? ` · ${job.projectNumber}` : ""}
                                </p>
                              </Link>
                            </TableCell>
                            <TableCell className={priorityCellClass()}>
                              <Badge variant="secondary" className="max-w-full truncate font-normal">
                                {job.phase}
                              </Badge>
                            </TableCell>
                            <TableCell className={priorityCellClass("text-right tabular-nums")}>
                              {job.value != null ? formatProjectAmount(job.value) : "—"}
                            </TableCell>
                            <TableCell className={priorityCellClass()}>
                              <span className={cn("tabular-nums text-sm", daysLeftClass(days))}>
                                {dueDate ? formatShortDate(dueDate) : "—"}
                              </span>
                            </TableCell>
                            <TableCell className={priorityCellClass()}>
                              <HealthStatusBadge health={job.health} />
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
