"use client";

import Link from "next/link";

import type { GanttProjectRow } from "@/lib/gantt/build-gantt-rows";
import { GANTT_PROJECT_COLUMN_WIDTH_PX } from "@/lib/gantt/timeline";
import { cn } from "@/lib/utils";

interface GanttProjectLabelProps {
  row: GanttProjectRow;
  className?: string;
}

export function GanttProjectLabel({ row, className }: GanttProjectLabelProps) {
  const { project, isChangeOrder } = row;

  return (
    <div
      className={cn(
        "flex h-full shrink-0 flex-col justify-center border-b border-r border-slate-200 px-3",
        isChangeOrder ? "bg-slate-50" : "bg-white",
        className,
      )}
      style={{
        width: GANTT_PROJECT_COLUMN_WIDTH_PX,
        paddingLeft: isChangeOrder ? 20 : 12,
      }}
    >
      {isChangeOrder && (
        <span className="mb-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700">
          Change order
        </span>
      )}
      <Link
        href={`/projects/${project.id}?tab=schedule`}
        className={cn(
          "truncate text-sm hover:text-emerald-700 hover:underline",
          isChangeOrder ? "font-medium text-slate-800" : "font-medium text-slate-900",
        )}
      >
        {project.project_number ? `${project.project_number} ` : ""}
        {project.project_name}
      </Link>
      <p className="truncate text-xs text-muted-foreground">
        {isChangeOrder ? "Linked scope" : project.client_name}
      </p>
    </div>
  );
}
