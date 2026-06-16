"use client";

import Link from "next/link";

import type { GanttProjectRow } from "@/lib/gantt/build-gantt-rows";
import { GANTT_PROJECT_COLUMN_WIDTH_PX } from "@/lib/gantt/timeline";

interface GanttProjectLabelProps {
  row: GanttProjectRow;
}

export function GanttProjectLabel({ row }: GanttProjectLabelProps) {
  const { project } = row;
  return (
    <div
      className="flex shrink-0 flex-col justify-center border-b border-r border-slate-200 bg-white px-3"
      style={{ width: GANTT_PROJECT_COLUMN_WIDTH_PX, height: 52 }}
    >
      <Link
        href={`/projects/${project.id}`}
        className="truncate text-sm font-medium text-slate-900 hover:text-emerald-700 hover:underline"
      >
        {project.project_number ? `${project.project_number} ` : ""}
        {project.project_name}
      </Link>
      <p className="truncate text-xs text-muted-foreground">{project.client_name}</p>
    </div>
  );
}
