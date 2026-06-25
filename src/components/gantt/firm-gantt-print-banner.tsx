"use client";

import type { GanttPrintLayout } from "@/lib/gantt/print-range";

interface FirmGanttPrintBannerProps {
  printLayout: GanttPrintLayout | null;
  projectCount: number;
}

export function FirmGanttPrintBanner({ printLayout, projectCount }: FirmGanttPrintBannerProps) {
  if (!printLayout) return null;

  const unitLabel = printLayout.zoom === "months" ? "Monthly view" : "Weekly view";

  return (
    <div className="gantt-print-header mb-3 hidden print:block">
      <h1 className="text-lg font-bold text-slate-900">Firm phase timeline</h1>
      <p className="mt-0.5 text-sm text-slate-600">
        {unitLabel} · {printLayout.rangeLabel}
      </p>
      <p className="mt-0.5 text-sm text-slate-600">
        {projectCount} project{projectCount === 1 ? "" : "s"}
      </p>
    </div>
  );
}
