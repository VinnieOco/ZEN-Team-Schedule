"use client";

import { useMemo } from "react";

import { formatProjectHours } from "@/lib/project-format";
import type { LoggedHoursSlice } from "@/lib/logged-hours-by-project";
import { cn } from "@/lib/utils";

const SLICE_COLORS = [
  "#059669",
  "#0284c7",
  "#7c3aed",
  "#db2777",
  "#ea580c",
  "#ca8a04",
  "#0d9488",
  "#4f46e5",
  "#be185d",
  "#64748b",
];

function buildConicGradient(
  slices: { hours: number; color: string }[],
  total: number,
): string {
  if (total <= 0) return "conic-gradient(#e2e8f0 0deg 360deg)";

  let angle = 0;
  const stops: string[] = [];

  for (const slice of slices) {
    const sweep = (slice.hours / total) * 360;
    const end = angle + sweep;
    stops.push(`${slice.color} ${angle}deg ${end}deg`);
    angle = end;
  }

  return `conic-gradient(${stops.join(", ")})`;
}

interface LoggedHoursPieChartProps {
  slices: LoggedHoursSlice[];
  className?: string;
}

export function LoggedHoursPieChart({ slices, className }: LoggedHoursPieChartProps) {
  const total = useMemo(
    () => Math.round(slices.reduce((sum, s) => sum + s.hours, 0) * 10) / 10,
    [slices],
  );

  const coloredSlices = useMemo(
    () =>
      slices.map((slice, index) => ({
        ...slice,
        color: SLICE_COLORS[index % SLICE_COLORS.length]!,
        percent: total > 0 ? (slice.hours / total) * 100 : 0,
      })),
    [slices, total],
  );

  const gradient = useMemo(
    () => buildConicGradient(coloredSlices, total),
    [coloredSlices, total],
  );

  if (slices.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No time logged this week yet. Log time to see hours by project.
      </p>
    );
  }

  return (
    <div className={cn("flex flex-col gap-6 sm:flex-row sm:items-center", className)}>
      <div className="relative mx-auto h-44 w-44 shrink-0 sm:mx-0">
        <div
          className="h-full w-full rounded-full shadow-inner"
          style={{ background: gradient }}
          role="img"
          aria-label={`Logged hours by project, ${formatProjectHours(total)} hours total`}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex h-24 w-24 flex-col items-center justify-center rounded-full bg-white text-center shadow-sm">
            <span className="text-xl font-bold tabular-nums text-slate-900">
              {formatProjectHours(total)}h
            </span>
            <span className="text-[10px] text-muted-foreground">logged</span>
          </div>
        </div>
      </div>

      <ul className="min-w-0 flex-1 space-y-2">
        {coloredSlices.map((slice) => (
          <li key={slice.key} className="flex items-start gap-2 text-sm">
            <span
              className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: slice.color }}
            />
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-slate-800">{slice.label}</p>
              <p className="text-xs text-muted-foreground tabular-nums">
                {formatProjectHours(slice.hours)}h · {Math.round(slice.percent)}%
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
