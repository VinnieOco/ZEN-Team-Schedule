"use client";

import { useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Calculator,
  ClipboardList,
  DraftingCompass,
  Hammer,
  Ruler,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { PipelineMetricCards } from "@/components/pipeline/pipeline-metric-cards";
import type { PipelineMetricAccent } from "@/components/pipeline/pipeline-metric-cards";
import { useScheduling } from "@/context/scheduling-context";
import { buildEstimateKpis } from "@/lib/estimating/metrics";
import type { PipelineListFocus } from "@/lib/pipeline/focus";
import { buildLeadKpis, buildLeadSourceBuckets } from "@/lib/pipeline/leads";
import {
  buildOverviewAttention,
  buildOverviewMoney,
  buildOverviewStageBars,
  buildWeeklyActivity,
  type OverviewStageBar,
  type OverviewStageBarId,
  type OverviewWeekActivity,
} from "@/lib/pipeline/overview";
import { buildPipelineJobs, formatPipelineValue } from "@/lib/pipeline/stages";
import { cn } from "@/lib/utils";

type PipelineTabTarget = "leads" | "design" | "estimating" | "construction";

const STAGE_CARD: Record<
  OverviewStageBarId,
  { accent: PipelineMetricAccent; icon: LucideIcon; shortLabel?: string }
> = {
  leads: { accent: "sky", icon: Users },
  schematic: { accent: "emerald", icon: DraftingCompass },
  budgeting: { accent: "teal", icon: ClipboardList },
  dd_cd: {
    accent: "emerald",
    icon: Ruler,
    shortLabel: "DD / Construction Drawings",
  },
  estimating: { accent: "violet", icon: Calculator },
  construction: { accent: "amber", icon: Hammer },
};

function Panel({
  title,
  sub,
  children,
  className,
}: {
  title: string;
  sub?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm", className)}>
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
        {sub ? <p className="text-xs text-muted-foreground">{sub}</p> : null}
      </div>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function ActivityChart({ weeks }: { weeks: OverviewWeekActivity[] }) {
  const max = Math.max(1, ...weeks.map((w) => Math.max(w.leadsCreated, w.estimatesSubmitted)));
  const hasAny = weeks.some((w) => w.leadsCreated > 0 || w.estimatesSubmitted > 0);

  if (!hasAny) {
    return (
      <div className="flex h-[160px] items-center justify-center text-sm text-muted-foreground">
        No activity in the last {weeks.length} weeks.
      </div>
    );
  }

  return (
    <div>
      <div className="flex h-[140px] items-end gap-2">
        {weeks.map((week) => (
          <div key={week.label} className="flex h-full min-w-0 flex-1 items-end justify-center gap-1">
            <div
              className="w-3 rounded-t bg-sky-500/90 sm:w-4"
              style={{ height: `${Math.round((week.leadsCreated / max) * 100)}%` }}
              title={`${week.label}: ${week.leadsCreated} new lead${week.leadsCreated === 1 ? "" : "s"}`}
            />
            <div
              className="w-3 rounded-t bg-violet-500/90 sm:w-4"
              style={{ height: `${Math.round((week.estimatesSubmitted / max) * 100)}%` }}
              title={`${week.label}: ${week.estimatesSubmitted} estimate${week.estimatesSubmitted === 1 ? "" : "s"} submitted (${formatPipelineValue(week.submittedAmount)})`}
            />
          </div>
        ))}
      </div>
      <div className="mt-1.5 flex gap-2 border-t border-slate-100 pt-1.5">
        {weeks.map((week) => (
          <p
            key={week.label}
            className="min-w-0 flex-1 truncate text-center text-[10px] tabular-nums text-muted-foreground"
          >
            {week.label}
          </p>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-sky-500/90" />
          New leads
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-violet-500/90" />
          Estimates submitted
        </span>
      </div>
    </div>
  );
}

function MoneyDonut({ pipeline, backlog }: { pipeline: number; backlog: number }) {
  const total = pipeline + backlog;
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const backlogDash = total > 0 ? (backlog / total) * circumference : 0;
  const pipelineDash = total > 0 ? (pipeline / total) * circumference : 0;

  return (
    <div className="flex items-center gap-4">
      <div className="relative h-[120px] w-[120px] shrink-0">
        <svg viewBox="0 0 100 100" className="-rotate-90 h-full w-full">
          <circle cx="50" cy="50" r={radius} fill="none" stroke="#f1f5f9" strokeWidth="12" />
          {backlogDash > 0 && (
            <circle
              cx="50"
              cy="50"
              r={radius}
              fill="none"
              stroke="#059669"
              strokeWidth="12"
              strokeDasharray={`${backlogDash} ${circumference - backlogDash}`}
            />
          )}
          {pipelineDash > 0 && (
            <circle
              cx="50"
              cy="50"
              r={radius}
              fill="none"
              stroke="#0ea5e9"
              strokeWidth="12"
              strokeDasharray={`${pipelineDash} ${circumference - pipelineDash}`}
              strokeDashoffset={-backlogDash}
            />
          )}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            Total
          </p>
          <p className="text-lg font-bold tabular-nums text-slate-900">
            {formatPipelineValue(total)}
          </p>
        </div>
      </div>
      <ul className="min-w-0 flex-1 space-y-2.5">
        <li className="flex items-center justify-between gap-2 text-sm">
          <span className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-600" />
            <span className="text-slate-700">Backlog</span>
          </span>
          <span className="shrink-0 font-semibold tabular-nums text-slate-800">
            {formatPipelineValue(backlog)}
          </span>
        </li>
        <li className="flex items-center justify-between gap-2 text-sm">
          <span className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-sky-500" />
            <span className="text-slate-700">Pipeline</span>
          </span>
          <span className="shrink-0 font-semibold tabular-nums text-slate-800">
            {formatPipelineValue(pipeline)}
          </span>
        </li>
        <li className="text-xs text-muted-foreground">
          Backlog is contracted design + construction. Pipeline is open leads + estimates.
        </li>
      </ul>
    </div>
  );
}

function SourceDonut({
  buckets,
}: {
  buckets: { source: string; label: string; count: number; color: string }[];
}) {
  const total = buckets.reduce((sum, b) => sum + b.count, 0);
  if (total === 0) {
    return (
      <div className="flex h-[120px] items-center justify-center text-sm text-muted-foreground">
        No open leads
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
      const slice = { ...b, dash: length, offset };
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
              key={slice.source}
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
            Open
          </p>
          <p className="text-xl font-bold tabular-nums text-slate-900">{total}</p>
        </div>
      </div>
      <ul className="min-w-0 flex-1 space-y-2">
        {buckets.map((b) => (
          <li key={b.source} className="flex items-center justify-between gap-2 text-sm">
            <span className="flex min-w-0 items-center gap-2 truncate">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: b.color }}
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

function RateRow({
  label,
  percent,
  barClass,
}: {
  label: string;
  percent: number | null;
  barClass: string;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2 text-sm">
        <span className="text-slate-700">{label}</span>
        <span className="font-semibold tabular-nums text-slate-900">
          {percent == null ? "—" : `${percent}%`}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className={cn("h-full rounded-full", barClass)}
          style={{ width: `${Math.min(100, percent ?? 0)}%` }}
        />
      </div>
    </div>
  );
}

function stageMetricItems(
  bars: OverviewStageBar[],
  onSelect: (tab: PipelineTabTarget) => void,
) {
  return bars.map((bar) => {
    const meta = STAGE_CARD[bar.id];
    return {
      label: meta.shortLabel ?? bar.label,
      value: String(bar.count),
      sub: formatPipelineValue(bar.value),
      icon: meta.icon,
      accent: meta.accent,
      onClick: bar.tab ? () => onSelect(bar.tab!) : undefined,
    };
  });
}

export function PipelineOverviewTab() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { projects, timeEntries, leads, estimates, settings, getEmployeeById, isLoading } =
    useScheduling();

  const jobs = useMemo(
    () => buildPipelineJobs(projects, timeEntries, getEmployeeById),
    [projects, timeEntries, getEmployeeById],
  );

  const leadKpis = useMemo(() => buildLeadKpis(leads, new Date(), settings), [leads, settings]);
  const estimateKpis = useMemo(() => buildEstimateKpis(estimates), [estimates]);
  const money = useMemo(
    () => buildOverviewMoney(leads, estimates, jobs, settings),
    [leads, estimates, jobs, settings],
  );
  const stageBars = useMemo(
    () => buildOverviewStageBars(leads, estimates, jobs, settings),
    [leads, estimates, jobs, settings],
  );
  const weeklyActivity = useMemo(() => buildWeeklyActivity(leads, estimates), [leads, estimates]);
  const sourceBuckets = useMemo(
    () => buildLeadSourceBuckets(leads, settings),
    [leads, settings],
  );
  const attention = useMemo(
    () => buildOverviewAttention(leads, estimates, jobs, leadKpis.followUpsDue),
    [leads, estimates, jobs, leadKpis.followUpsDue],
  );

  const goToTab = (tab: PipelineTabTarget, focus?: PipelineListFocus) => {
    const next = new URLSearchParams(searchParams.toString());
    next.set("tab", tab);
    next.delete("view");
    if (focus && focus !== "all") next.set("focus", focus);
    else next.delete("focus");
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  };

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading pipeline…</p>;
  }

  const attentionRows = [
    {
      label: "Follow-ups due",
      count: attention.followUpsDue,
      tab: "leads" as const,
      focus: "follow_ups" as const,
      chip: "bg-amber-50 text-amber-800",
      dot: "bg-amber-500",
    },
    {
      label: "Estimates past due",
      count: attention.estimatesOverdue,
      tab: "estimating" as const,
      focus: "overdue" as const,
      chip: "bg-rose-50 text-rose-700",
      dot: "bg-rose-500",
    },
    {
      label: "Design overdue",
      count: attention.designOverdue,
      tab: "design" as const,
      focus: "overdue" as const,
      chip: "bg-rose-50 text-rose-700",
      dot: "bg-rose-500",
    },
    {
      label: "Jobs without owner",
      count: attention.unassignedJobs,
      tab: "design" as const,
      focus: "unassigned" as const,
      chip: "bg-slate-50 text-slate-700",
      dot: "bg-slate-400",
    },
  ];

  return (
    <div className="space-y-5">
      <PipelineMetricCards items={stageMetricItems(stageBars, goToTab)} />

      <div className="grid min-w-0 gap-3 lg:grid-cols-3">
        <Panel title="Activity" sub="Last 8 weeks" className="lg:col-span-2">
          <ActivityChart weeks={weeklyActivity} />
        </Panel>
        <Panel title="Backlog vs Pipeline" sub="Contracted vs uncontracted $">
          <MoneyDonut pipeline={money.pipelineValue} backlog={money.backlogValue} />
        </Panel>
      </div>

      <div className="grid min-w-0 gap-3 lg:grid-cols-3">
        <Panel title="Lead Sources" sub="Open leads">
          <SourceDonut buckets={sourceBuckets} />
        </Panel>
        <Panel title="Conversion & Speed" className="lg:col-span-2">
          <div className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
            <RateRow
              label="Lead conversion"
              percent={leadKpis.winRatePercent}
              barClass="bg-amber-500"
            />
            <RateRow
              label="Estimate win rate (YTD)"
              percent={estimateKpis.winRatePercent}
              barClass="bg-violet-500"
            />
            <div className="flex items-center justify-between gap-2 border-t border-slate-100 pt-4 text-sm sm:border-t-0 sm:pt-0">
              <span className="text-slate-700">Avg estimate turnaround</span>
              <span className="font-semibold tabular-nums text-slate-900">
                {estimateKpis.avgTurnaroundDays == null
                  ? "—"
                  : `${estimateKpis.avgTurnaroundDays}d`}
              </span>
            </div>
            <div className="flex items-center justify-between gap-2 text-sm">
              <span className="text-slate-700">Avg open lead age</span>
              <span className="font-semibold tabular-nums text-slate-900">
                {leadKpis.avgAgeDays == null ? "—" : `${leadKpis.avgAgeDays}d`}
              </span>
            </div>
          </div>
        </Panel>
      </div>

      <Panel title="Needs Attention">
        <ul className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
          {attentionRows.map((row) => (
            <li key={row.label}>
              <button
                type="button"
                onClick={() => goToTab(row.tab, row.focus)}
                className={cn(
                  "flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-opacity hover:opacity-80",
                  row.count > 0 ? row.chip : "bg-slate-50/60 text-muted-foreground",
                )}
              >
                <span className="flex items-center gap-2 font-medium">
                  <span
                    className={cn(
                      "h-2 w-2 rounded-full",
                      row.count > 0 ? row.dot : "bg-slate-300",
                    )}
                  />
                  {row.label}
                </span>
                <span className="tabular-nums font-semibold">{row.count}</span>
              </button>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}
