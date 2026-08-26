"use client";

import { useEffect, useMemo, useState, type KeyboardEvent } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

import { isChangeOrder } from "@/lib/change-orders";
import type { ProjectClientHierarchyGroup } from "@/lib/projects/list-hierarchy";
import { cn } from "@/lib/utils";
import type { Project } from "@/types";

interface ProjectListPaneProps {
  groups: ProjectClientHierarchyGroup[];
  selectedId: string | null;
  onSelect: (projectId: string) => void;
  /** Ordered ids for keyboard navigation. */
  selectableIds: string[];
}

function ProjectRow({
  project,
  selected,
  indented,
  onSelect,
}: {
  project: Project;
  selected: boolean;
  indented?: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "flex w-full items-center gap-2 py-2 pr-3 text-left transition-colors",
        // Match client header: px-3 + chevron (w-3.5) + gap-2
        indented ? "pl-12" : "pl-[2.125rem]",
        selected
          ? "bg-emerald-50 text-emerald-950"
          : "hover:bg-slate-50",
        !project.active && !selected && "text-muted-foreground",
      )}
      aria-current={selected ? "true" : undefined}
    >
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
        <span
          className={cn(
            "truncate text-sm font-medium",
            selected ? "text-emerald-900" : project.active ? "text-slate-900" : "text-slate-600",
          )}
        >
          {project.project_name}
        </span>
        {isChangeOrder(project) && (
          <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-amber-900">
            CO
          </span>
        )}
        {!project.active && (
          <span className="rounded bg-slate-200 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-600">
            Inactive
          </span>
        )}
      </div>
    </button>
  );
}

export function ProjectListPane({
  groups,
  selectedId,
  onSelect,
  selectableIds,
}: ProjectListPaneProps) {
  const allKeys = useMemo(() => groups.map((g) => g.clientKey), [groups]);
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    setCollapsed((prev) => {
      const next = new Set<string>();
      for (const key of prev) {
        if (allKeys.includes(key)) next.add(key);
      }
      return next;
    });
  }, [allKeys]);

  const toggleClient = (key: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (selectableIds.length === 0) return;
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    event.preventDefault();
    const currentIndex = selectedId ? selectableIds.indexOf(selectedId) : -1;
    let nextIndex: number;
    if (event.key === "ArrowDown") {
      nextIndex = currentIndex < 0 ? 0 : Math.min(currentIndex + 1, selectableIds.length - 1);
    } else {
      nextIndex = currentIndex < 0 ? selectableIds.length - 1 : Math.max(currentIndex - 1, 0);
    }
    const nextId = selectableIds[nextIndex];
    if (nextId) onSelect(nextId);
  };

  return (
    <div
      className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm"
      onKeyDown={handleKeyDown}
      role="listbox"
      aria-label="Projects by client"
      tabIndex={0}
    >
      <div className="min-h-0 flex-1 overflow-y-auto">
        {groups.map((group) => {
          const isCollapsed = collapsed.has(group.clientKey);
          return (
            <div key={group.clientKey} className="border-b border-slate-100 last:border-b-0">
              <button
                type="button"
                onClick={() => toggleClient(group.clientKey)}
                className="flex w-full items-center gap-2 bg-slate-50/80 px-3 py-2.5 text-left hover:bg-slate-100/80"
                aria-expanded={!isCollapsed}
              >
                {isCollapsed ? (
                  <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-900">
                    {group.clientName}
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-slate-200/80 px-2 py-0.5 text-[11px] font-medium tabular-nums text-slate-600">
                  {group.jobCount}
                </span>
              </button>

              {!isCollapsed && (
                <div className="divide-y divide-slate-50">
                  {group.jobs.map((job) => (
                    <div key={job.project.id}>
                      <ProjectRow
                        project={job.project}
                        selected={selectedId === job.project.id}
                        onSelect={() => onSelect(job.project.id)}
                      />
                      {job.changeOrders.map((co) => (
                        <ProjectRow
                          key={co.id}
                          project={co}
                          selected={selectedId === co.id}
                          indented
                          onSelect={() => onSelect(co.id)}
                        />
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
