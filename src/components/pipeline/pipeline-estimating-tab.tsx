"use client";

import { useCallback, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { format, parseISO } from "date-fns";
import {
  BarChart3,
  Briefcase,
  CalendarClock,
  Clock3,
  DollarSign,
  MoreHorizontal,
  Plus,
  Send,
} from "lucide-react";

import { ScrollableTabsList } from "@/components/layout/scrollable-tabs-list";
import { EstimateDetailDialog } from "@/components/pipeline/estimate-detail-dialog";
import { EstimateFormDialog } from "@/components/pipeline/estimate-form-dialog";
import { EstimateKanban } from "@/components/pipeline/estimate-kanban";
import { PipelineMetricCards } from "@/components/pipeline/pipeline-metric-cards";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { Tabs, TabsContent, TabsTrigger } from "@/components/ui/tabs";
import { useScheduling } from "@/context/scheduling-context";
import { usePermissions } from "@/hooks/use-permissions";
import {
  ESTIMATE_STAGES,
  ESTIMATE_TYPES,
  buildEstimateDueBuckets,
  buildEstimateKpis,
  buildEstimateTypeBuckets,
  buildEstimatorWorkload,
  compareEstimatesForQueue,
  daysLeftClass,
  estimateDaysLeft,
  estimateDisplayName,
  estimateRevisionLabel,
  estimateRowAccentClass,
  estimateStageBadgeClass,
  estimateStageLabel,
  estimateTypeBadgeClass,
  estimateTypeLabel,
  isEstimateDueOverdue,
  isOpenEstimate,
  submittedThisWeek,
} from "@/lib/estimating/metrics";
import { formatPipelineValue } from "@/lib/pipeline/stages";
import { formatProjectAmount } from "@/lib/project-format";
import { cn } from "@/lib/utils";
import { getEmployeeFullName } from "@/lib/week";
import type { Estimate } from "@/types";

const ALL = "__all__";
const OPEN_ONLY = "__open__";

type EstimatingView = "table" | "kanban" | "submitted";

const TYPE_COLORS: Record<string, string> = {
  budget: "#059669",
  cost_proposal: "#0284c7",
  contract: "#7c3aed",
};

function parseView(value: string | null): EstimatingView {
  if (value === "kanban" || value === "submitted") return value;
  return "table";
}

function formatShortDate(value?: string): string {
  if (!value?.trim()) return "—";
  try {
    return format(parseISO(value), "MMM d");
  } catch {
    return value;
  }
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function TypeDonut({
  buckets,
}: {
  buckets: { type: string; label: string; count: number }[];
}) {
  const total = buckets.reduce((sum, b) => sum + b.count, 0);
  if (total === 0) {
    return (
      <div className="flex h-[120px] items-center justify-center text-sm text-muted-foreground">
        No open packages
      </div>
    );
  }

  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;
  const slices = buckets
    .filter((b) => b.count > 0)
    .map((b) => {
      const length = (b.count / total) * circumference;
      const slice = {
        ...b,
        dash: length,
        offset,
        color: TYPE_COLORS[b.type] ?? "#64748b",
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
              key={slice.type}
              cx="50"
              cy="50"
              r={radius}
              fill="none"
              stroke={slice.color}
              strokeWidth="12"
              strokeDasharray={`${slice.dash} ${circumference - slice.dash}`}
              strokeDashoffset={-slice.offset}
              strokeLinecap="butt"
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
        {buckets.map((b) => (
          <li key={b.type} className="flex items-center justify-between gap-2 text-sm">
            <span className="flex min-w-0 items-center gap-2 truncate">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: TYPE_COLORS[b.type] ?? "#64748b" }}
              />
              <span className="truncate text-slate-700">{b.label}</span>
            </span>
            <span className="shrink-0 tabular-nums text-muted-foreground">{b.count}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function PipelineEstimatingTab() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const view = parseView(searchParams.get("view"));

  const { estimates, employees, getEmployeeById, isLoading, setEstimateStage, deleteEstimate } =
    useScheduling();
  const { permissions } = usePermissions();
  const canEdit = permissions.editQueue || permissions.editProjects;

  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState(OPEN_ONLY);
  const [typeFilter, setTypeFilter] = useState(ALL);
  const [estimatorFilter, setEstimatorFilter] = useState(ALL);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Estimate | null>(null);
  const [detail, setDetail] = useState<Estimate | null>(null);

  const kpis = useMemo(() => buildEstimateKpis(estimates), [estimates]);
  const workload = useMemo(() => buildEstimatorWorkload(estimates), [estimates]);
  const typeBuckets = useMemo(() => buildEstimateTypeBuckets(estimates), [estimates]);
  const dueBuckets = useMemo(() => buildEstimateDueBuckets(estimates), [estimates]);
  const submitted = useMemo(() => submittedThisWeek(estimates), [estimates]);
  const workloadMax = Math.max(1, ...workload.map((w) => w.openCount));

  const estimatorName = useCallback(
    (estimate: Estimate) => {
      if (!estimate.estimator_id) return undefined;
      const employee = getEmployeeById(estimate.estimator_id);
      return employee ? getEmployeeFullName(employee) : undefined;
    },
    [getEmployeeById],
  );

  const estimatorOptions = useMemo(() => {
    const ids = new Set(
      estimates.map((e) => e.estimator_id).filter((id): id is string => Boolean(id)),
    );
    return employees
      .filter((e) => ids.has(e.id))
      .sort((a, b) => getEmployeeFullName(a).localeCompare(getEmployeeFullName(b)))
      .map((e) => ({ value: e.id, label: getEmployeeFullName(e) }));
  }, [estimates, employees]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return estimates
      .filter((estimate) => {
        if (stageFilter === OPEN_ONLY && !isOpenEstimate(estimate)) return false;
        if (stageFilter !== OPEN_ONLY && stageFilter !== ALL && estimate.stage !== stageFilter) {
          return false;
        }
        if (typeFilter !== ALL && estimate.estimate_type !== typeFilter) return false;
        if (estimatorFilter !== ALL && estimate.estimator_id !== estimatorFilter) return false;
        if (!q) return true;
        const haystack = [
          estimateDisplayName(estimate),
          estimate.client_name,
          estimatorName(estimate),
          estimateTypeLabel(estimate.estimate_type),
          estimateStageLabel(estimate.stage),
          estimate.notes,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return haystack.includes(q);
      })
      .sort(compareEstimatesForQueue);
  }, [estimates, search, stageFilter, typeFilter, estimatorFilter, estimatorName]);

  const setView = useCallback(
    (next: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", "estimating");
      if (next === "table") params.delete("view");
      else params.set("view", next);
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const openNew = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (estimate: Estimate) => {
    setEditing(estimate);
    setDetail(null);
    setFormOpen(true);
  };

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading estimates…</p>;
  }

  return (
    <div className="space-y-5">
      <PipelineMetricCards
        items={[
          {
            label: "Active Estimates",
            value: String(kpis.activeCount),
            sub: "View all",
            icon: Briefcase,
            accent: "violet",
            onClick: () => {
              setStageFilter(OPEN_ONLY);
              setView("table");
            },
          },
          {
            label: "Due This Week",
            value: String(kpis.dueThisWeek),
            sub: "View all",
            icon: CalendarClock,
            accent: "amber",
            onClick: () => {
              setStageFilter(OPEN_ONLY);
              setView("table");
            },
          },
          {
            label: "Submitted This Week",
            value: String(kpis.submittedThisWeekCount),
            sub: formatPipelineValue(kpis.submittedThisWeekAmount),
            icon: Send,
            accent: "sky",
            onClick: () => setView("submitted"),
          },
          {
            label: "Pipeline Value",
            value: formatPipelineValue(kpis.pipelineValue),
            sub: "Open packages",
            icon: DollarSign,
            accent: "emerald",
          },
          {
            label: "Win Rate (YTD)",
            value: kpis.winRatePercent == null ? "—" : `${kpis.winRatePercent}%`,
            sub: "Won ÷ decided",
            icon: BarChart3,
            accent: "violet",
          },
          {
            label: "Avg. Turnaround",
            value: kpis.avgTurnaroundDays == null ? "—" : `${kpis.avgTurnaroundDays} Days`,
            sub: "Received → submitted",
            icon: Clock3,
            accent: "sky",
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
            <TabsTrigger
              value="submitted"
              className="rounded-none border-b-2 border-transparent px-3 pb-2.5 pt-1 data-[state=active]:border-emerald-600 data-[state=active]:bg-transparent data-[state=active]:text-emerald-800 data-[state=active]:shadow-none"
            >
              Submitted
            </TabsTrigger>
          </ScrollableTabsList>
          {canEdit && (
            <Button type="button" className="mb-2 shrink-0 sm:mb-1.5" onClick={openNew}>
              <Plus className="mr-1.5 h-4 w-4" />
              New Estimate
            </Button>
          )}
        </div>

        <TabsContent value="table" className="mt-4 min-w-0 space-y-4">
          <div className="flex flex-col gap-3 rounded-xl border border-slate-200/80 bg-white p-3 shadow-sm sm:flex-row sm:flex-wrap sm:items-end">
            <div className="min-w-[180px] flex-1 space-y-1.5">
              <Label htmlFor="estimating-search" className="text-xs">
                Search
              </Label>
              <Input
                id="estimating-search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Package, client, estimator…"
              />
            </div>
            <div className="w-full space-y-1.5 sm:w-[160px]">
              <Label className="text-xs">Stage</Label>
              <Select value={stageFilter} onValueChange={setStageFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={OPEN_ONLY}>Open only</SelectItem>
                  <SelectItem value={ALL}>All stages</SelectItem>
                  {ESTIMATE_STAGES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-full space-y-1.5 sm:w-[150px]">
              <Label className="text-xs">Type</Label>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>All types</SelectItem>
                  {ESTIMATE_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-full space-y-1.5 sm:w-[170px]">
              <Label className="text-xs">Estimator</Label>
              <Select value={estimatorFilter} onValueChange={setEstimatorFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>All estimators</SelectItem>
                  {estimatorOptions.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b bg-slate-50/80 px-4 py-2.5">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-slate-900">Priority Queue</h3>
                <span className="rounded-full bg-slate-200/80 px-2 py-0.5 text-[11px] font-medium tabular-nums text-slate-600">
                  {filtered.length}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                {filtered.length} of {estimates.length} packages
              </p>
            </div>

            {filtered.length === 0 ? (
              <p className="px-4 py-12 text-center text-sm text-muted-foreground">
                {estimates.length === 0
                  ? "No estimates yet. Add a package to start pricing work."
                  : "No estimates match these filters."}
              </p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="w-10">#</TableHead>
                      <TableHead>Project</TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead>Estimator</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Received</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead className="text-right">Days Left</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Value</TableHead>
                      {canEdit && <TableHead className="w-10" />}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((estimate, index) => {
                      const name = estimatorName(estimate);
                      const days = estimateDaysLeft(estimate);
                      const revision = estimateRevisionLabel(estimate);
                      return (
                        <TableRow
                          key={estimate.id}
                          className="group cursor-pointer"
                          onClick={() => setDetail(estimate)}
                        >
                          <TableCell className="relative py-3 pl-3">
                            <span
                              className={cn(
                                "absolute inset-y-2 left-0 w-1 rounded-r-full",
                                estimateRowAccentClass(estimate),
                              )}
                            />
                            <span className="pl-1 text-xs tabular-nums text-muted-foreground">
                              {index + 1}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5">
                              <span className="font-medium text-emerald-700 group-hover:underline">
                                {estimateDisplayName(estimate)}
                              </span>
                              {revision ? (
                                <Badge
                                  variant="secondary"
                                  className="px-1 py-0 text-[10px] font-normal"
                                >
                                  {revision}
                                </Badge>
                              ) : null}
                            </div>
                          </TableCell>
                          <TableCell className="text-slate-700">{estimate.client_name}</TableCell>
                          <TableCell>
                            {name ? (
                              <div className="flex items-center gap-2">
                                <Avatar className="h-6 w-6">
                                  <AvatarFallback className="bg-slate-100 text-[10px] font-semibold text-slate-600">
                                    {initials(name)}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="text-sm text-slate-800">{name}</span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">Unassigned</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <span
                              className={cn(
                                "inline-flex rounded-md px-2 py-0.5 text-xs font-medium",
                                estimateTypeBadgeClass(estimate.estimate_type),
                              )}
                            >
                              {estimateTypeLabel(estimate.estimate_type)}
                            </span>
                          </TableCell>
                          <TableCell className="tabular-nums text-slate-600">
                            {formatShortDate(estimate.received_date)}
                          </TableCell>
                          <TableCell
                            className={cn(
                              "tabular-nums",
                              isEstimateDueOverdue(estimate)
                                ? "font-semibold text-rose-600"
                                : "text-slate-700",
                            )}
                          >
                            {formatShortDate(estimate.due_date)}
                          </TableCell>
                          <TableCell className={cn("text-right tabular-nums", daysLeftClass(days))}>
                            {days == null ? "—" : days}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="secondary"
                              className={cn(
                                "font-semibold",
                                estimateStageBadgeClass(estimate.stage),
                              )}
                            >
                              {estimateStageLabel(estimate.stage)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right text-sm font-semibold tabular-nums text-slate-900">
                            {formatProjectAmount(estimate.amount)}
                          </TableCell>
                          {canEdit && (
                            <TableCell
                              onClick={(e) => e.stopPropagation()}
                              className="text-right"
                            >
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    aria-label="Estimate actions"
                                  >
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => setDetail(estimate)}>
                                    Open
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => openEdit(estimate)}>
                                    Edit
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    className="text-rose-700"
                                    onClick={() => {
                                      if (
                                        window.confirm(
                                          `Delete “${estimateDisplayName(estimate)}”?`,
                                        )
                                      ) {
                                        deleteEstimate(estimate.id);
                                      }
                                    }}
                                  >
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          )}
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}

            {canEdit && (
              <div className="border-t px-3 py-2">
                <Button
                  type="button"
                  variant="ghost"
                  className="h-9 w-full justify-start text-muted-foreground hover:text-emerald-800"
                  onClick={openNew}
                >
                  <Plus className="mr-1.5 h-4 w-4" />
                  Add Estimate
                </Button>
              </div>
            )}
          </div>

          <div className="grid min-w-0 gap-3 lg:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-900">Workload by Estimator</h3>
              <div className="mt-4 space-y-3">
                {workload.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No open packages.</p>
                ) : (
                  workload.map((row) => {
                    const employee = row.estimatorId
                      ? getEmployeeById(row.estimatorId)
                      : undefined;
                    const label = employee ? getEmployeeFullName(employee) : "Unassigned";
                    return (
                      <div key={row.estimatorId ?? "unassigned"} className="space-y-1.5">
                        <div className="flex items-center justify-between gap-2 text-sm">
                          <span className="flex min-w-0 items-center gap-2 truncate font-medium text-slate-900">
                            <Avatar className="h-6 w-6">
                              <AvatarFallback className="bg-slate-100 text-[10px] font-semibold text-slate-600">
                                {initials(label)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="truncate">{label}</span>
                          </span>
                          <span className="shrink-0 tabular-nums text-muted-foreground">
                            {row.openCount}
                          </span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full bg-emerald-500"
                            style={{
                              width: `${Math.round((row.openCount / workloadMax) * 100)}%`,
                            }}
                          />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-900">Submitted This Week</h3>
              <div className="mt-3 space-y-0">
                {submitted.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nothing submitted yet.</p>
                ) : (
                  <>
                    <div className="mb-1 grid grid-cols-[52px_1fr_auto] gap-2 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                      <span>Date</span>
                      <span>Project</span>
                      <span className="text-right">Value</span>
                    </div>
                    {submitted.slice(0, 5).map((estimate) => (
                      <button
                        key={estimate.id}
                        type="button"
                        onClick={() => setDetail(estimate)}
                        className="grid w-full grid-cols-[52px_1fr_auto] items-center gap-2 border-t border-slate-100 py-2 text-left text-sm first:border-t-0"
                      >
                        <span className="tabular-nums text-muted-foreground">
                          {formatShortDate(estimate.submitted_date)}
                        </span>
                        <span className="min-w-0 truncate font-medium text-emerald-700">
                          {estimateDisplayName(estimate)}
                        </span>
                        <span className="tabular-nums text-slate-800">
                          {formatProjectAmount(estimate.amount)}
                        </span>
                      </button>
                    ))}
                    <div className="mt-2 flex items-center justify-between border-t pt-2 text-sm font-semibold">
                      <span className="text-slate-700">Weekly Total</span>
                      <span className="tabular-nums text-emerald-700">
                        {formatPipelineValue(kpis.submittedThisWeekAmount)}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setView("submitted")}
                      className="mt-2 text-xs font-medium text-emerald-700 hover:underline"
                    >
                      View all submitted
                    </button>
                  </>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-900">Estimates by Type</h3>
              <div className="mt-3">
                <TypeDonut buckets={typeBuckets} />
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
          <div className="flex flex-col gap-3 rounded-xl border border-slate-200/80 bg-white p-3 shadow-sm sm:flex-row sm:items-end">
            <div className="min-w-[180px] flex-1 space-y-1.5">
              <Label htmlFor="estimating-kanban-search" className="text-xs">
                Search
              </Label>
              <Input
                id="estimating-kanban-search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Package, client, estimator…"
              />
            </div>
          </div>
          {estimates.length === 0 ? (
            <p className="rounded-xl border border-dashed bg-slate-50 px-4 py-10 text-center text-sm text-muted-foreground">
              No estimates yet. Add a package to start pricing work.
            </p>
          ) : (
            <EstimateKanban
              estimates={filtered}
              canEditStage={canEdit}
              estimatorName={estimatorName}
              onSelect={setDetail}
              onStageChange={setEstimateStage}
            />
          )}
        </TabsContent>

        <TabsContent value="submitted" className="mt-4 min-w-0 space-y-4">
          <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b bg-slate-50/80 px-4 py-2.5">
              <h3 className="text-sm font-semibold text-slate-900">Submitted This Week</h3>
              <span className="text-sm font-semibold tabular-nums text-emerald-700">
                {formatPipelineValue(kpis.submittedThisWeekAmount)}
              </span>
            </div>
            {submitted.length === 0 ? (
              <p className="px-4 py-12 text-center text-sm text-muted-foreground">
                Nothing submitted this week yet. Use Mark submitted on a package to log it.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Package</TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Estimator</TableHead>
                      <TableHead>Submitted</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Stage</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {submitted.map((estimate) => (
                      <TableRow
                        key={estimate.id}
                        className="cursor-pointer"
                        onClick={() => setDetail(estimate)}
                      >
                        <TableCell className="font-medium text-emerald-700">
                          {estimateDisplayName(estimate)}
                        </TableCell>
                        <TableCell>{estimate.client_name}</TableCell>
                        <TableCell>
                          <span
                            className={cn(
                              "inline-flex rounded-md px-2 py-0.5 text-xs font-medium",
                              estimateTypeBadgeClass(estimate.estimate_type),
                            )}
                          >
                            {estimateTypeLabel(estimate.estimate_type)}
                          </span>
                        </TableCell>
                        <TableCell>{estimatorName(estimate) ?? "—"}</TableCell>
                        <TableCell className="tabular-nums">
                          {formatShortDate(estimate.submitted_date)}
                        </TableCell>
                        <TableCell className="text-right font-semibold tabular-nums">
                          {formatProjectAmount(estimate.amount)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="secondary"
                            className={cn("font-semibold", estimateStageBadgeClass(estimate.stage))}
                          >
                            {estimateStageLabel(estimate.stage)}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      <EstimateFormDialog
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setEditing(null);
        }}
        estimate={editing}
      />

      <EstimateDetailDialog
        estimate={detail}
        open={Boolean(detail)}
        onOpenChange={(open) => {
          if (!open) setDetail(null);
        }}
        canEdit={canEdit}
        onEdit={openEdit}
        onRevised={(revision) => setDetail(revision)}
      />
    </div>
  );
}
