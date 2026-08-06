"use client";

import { cn } from "@/lib/utils";
import {
  togglePipelineFocus,
  type DueBucketFocus,
  type PipelineListFocus,
} from "@/lib/pipeline/focus";

export interface PipelineDueBucketCounts {
  overdue: number;
  today: number;
  tomorrow: number;
  thisWeek: number;
  nextWeek: number;
}

const ROWS: {
  label: string;
  key: keyof PipelineDueBucketCounts;
  focus: DueBucketFocus;
  className: string;
  dot: string;
}[] = [
  {
    label: "Overdue",
    key: "overdue",
    focus: "overdue",
    className: "bg-rose-50 text-rose-700",
    dot: "bg-rose-500",
  },
  {
    label: "Today",
    key: "today",
    focus: "today",
    className: "bg-rose-50 text-rose-700",
    dot: "bg-rose-500",
  },
  {
    label: "Tomorrow",
    key: "tomorrow",
    focus: "tomorrow",
    className: "bg-amber-50 text-amber-800",
    dot: "bg-amber-500",
  },
  {
    label: "This week",
    key: "thisWeek",
    focus: "this_week",
    className: "bg-sky-50 text-sky-800",
    dot: "bg-sky-500",
  },
  {
    label: "Next week",
    key: "nextWeek",
    focus: "next_week",
    className: "bg-slate-50 text-slate-700",
    dot: "bg-slate-400",
  },
];

interface PipelineDueBucketsProps {
  title?: string;
  buckets: PipelineDueBucketCounts;
  focus: PipelineListFocus;
  onFocusChange: (focus: PipelineListFocus) => void;
}

export function PipelineDueBuckets({
  title = "Upcoming Due Dates",
  buckets,
  focus,
  onFocusChange,
}: PipelineDueBucketsProps) {
  return (
    <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      <ul className="mt-4 space-y-2.5">
        {ROWS.map((row) => {
          const active = focus === row.focus;
          return (
            <li key={row.label}>
              <button
                type="button"
                onClick={() => onFocusChange(togglePipelineFocus(focus, row.focus))}
                className={cn(
                  "flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-sm transition-shadow",
                  row.className,
                  active && "ring-2 ring-emerald-500/60 ring-offset-1",
                )}
              >
                <span className="flex items-center gap-2 font-medium">
                  <span className={cn("h-2 w-2 rounded-full", row.dot)} />
                  {row.label}
                </span>
                <span className="tabular-nums font-semibold">{buckets[row.key]}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
