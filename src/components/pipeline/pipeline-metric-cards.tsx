"use client";

import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export type PipelineMetricAccent =
  | "slate"
  | "amber"
  | "sky"
  | "emerald"
  | "teal"
  | "violet"
  | "rose";

export interface PipelineMetricItem {
  label: string;
  value: string;
  sub: string;
  icon?: LucideIcon;
  accent?: PipelineMetricAccent;
  onClick?: () => void;
}

const ACCENT: Record<
  PipelineMetricAccent,
  { value: string; iconWrap: string; icon: string }
> = {
  slate: {
    value: "text-slate-900",
    iconWrap: "bg-slate-100",
    icon: "text-slate-600",
  },
  amber: {
    value: "text-amber-600",
    iconWrap: "bg-amber-50",
    icon: "text-amber-600",
  },
  sky: {
    value: "text-sky-700",
    iconWrap: "bg-sky-50",
    icon: "text-sky-600",
  },
  emerald: {
    value: "text-emerald-700",
    iconWrap: "bg-emerald-50",
    icon: "text-emerald-600",
  },
  teal: {
    value: "text-teal-700",
    iconWrap: "bg-teal-50",
    icon: "text-teal-600",
  },
  violet: {
    value: "text-violet-700",
    iconWrap: "bg-violet-50",
    icon: "text-violet-600",
  },
  rose: {
    value: "text-rose-700",
    iconWrap: "bg-rose-50",
    icon: "text-rose-600",
  },
};

interface PipelineMetricCardsProps {
  items: PipelineMetricItem[];
  columns?: 4 | 5 | 6;
}

export function PipelineMetricCards({ items, columns = 6 }: PipelineMetricCardsProps) {
  const grid =
    columns === 4
      ? "grid-cols-2 lg:grid-cols-4"
      : columns === 5
        ? "grid-cols-2 lg:grid-cols-3 xl:grid-cols-5"
        : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-6";

  return (
    <div className={cn("grid min-w-0 gap-2 sm:gap-3", grid)}>
      {items.map((item) => {
        const accent = ACCENT[item.accent ?? "slate"];
        const Icon = item.icon;
        const body = (
          <>
            <div className="flex items-start justify-between gap-2">
              <p className="text-[11px] font-medium leading-snug text-muted-foreground sm:text-xs">
                {item.label}
              </p>
              {Icon ? (
                <span
                  className={cn(
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg sm:h-8 sm:w-8",
                    accent.iconWrap,
                  )}
                >
                  <Icon className={cn("h-3.5 w-3.5 sm:h-4 sm:w-4", accent.icon)} />
                </span>
              ) : null}
            </div>
            <p
              className={cn(
                "mt-1.5 text-xl font-bold tabular-nums tracking-tight sm:mt-2 sm:text-2xl",
                accent.value,
              )}
            >
              {item.value}
            </p>
            <p
              className={cn(
                "mt-0.5 text-[11px] sm:mt-1 sm:text-xs",
                item.onClick
                  ? "font-medium text-emerald-700 group-hover:underline"
                  : "text-muted-foreground",
              )}
            >
              {item.sub}
            </p>
          </>
        );

        if (item.onClick) {
          return (
            <button
              key={item.label}
              type="button"
              onClick={item.onClick}
              className="group rounded-xl border border-slate-200/80 bg-white p-3 text-left shadow-sm transition-colors hover:border-slate-300 sm:p-3.5"
            >
              {body}
            </button>
          );
        }

        return (
          <div
            key={item.label}
            className="rounded-xl border border-slate-200/80 bg-white p-3 shadow-sm sm:p-3.5"
          >
            {body}
          </div>
        );
      })}
    </div>
  );
}
