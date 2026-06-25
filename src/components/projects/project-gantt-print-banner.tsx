"use client";

import type { GanttPrintLayout } from "@/lib/gantt/print-range";
import type { Project } from "@/types";

interface ProjectGanttPrintBannerProps {
  project: Project;
  printLayout: GanttPrintLayout | null;
}

export function ProjectGanttPrintBanner({ project, printLayout }: ProjectGanttPrintBannerProps) {
  if (!printLayout) return null;

  const unitLabel = printLayout.zoom === "months" ? "Monthly view" : "Weekly view";

  return (
    <div className="project-gantt-print-header mb-3 hidden print:block">
      <h1 className="text-lg font-bold text-slate-900">{project.project_name}</h1>
      <p className="mt-0.5 text-sm text-slate-600">
        {project.client_name?.trim() ? `${project.client_name.trim()} · ` : ""}
        Schedule timeline
      </p>
      <p className="mt-0.5 text-sm text-slate-600">
        {unitLabel} · {printLayout.rangeLabel}
      </p>
    </div>
  );
}
