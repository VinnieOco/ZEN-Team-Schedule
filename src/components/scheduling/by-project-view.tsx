"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ExternalLink, FolderKanban } from "lucide-react";

import { AllocationFormDialog } from "@/components/scheduling/allocation-form-dialog";
import { ProjectDayCell } from "@/components/scheduling/project-day-cell";
import type { ScheduleCalendarView } from "@/components/scheduling/scheduling-header";
import { useFilteredProjectRows } from "@/components/scheduling/use-filtered-project-rows";
import { EmptyState } from "@/components/ui/empty-state";
import { usePermissions } from "@/hooks/use-permissions";
import { formatDateKey, formatDayHeader } from "@/lib/week";
import type { Allocation } from "@/types";

interface ByProjectViewProps {
  calendarView: ScheduleCalendarView;
}

export function ByProjectView({ calendarView }: ByProjectViewProps) {
  const { canEditAllocationFor, canEditSchedule } = usePermissions();
  const period = calendarView === "month" ? "month" : "week";
  const { rows, periodDays, periodAllocations, clearFilters } = useFilteredProjectRows(period);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAllocation, setEditingAllocation] = useState<Allocation | null>(null);
  const [defaultProjectId, setDefaultProjectId] = useState<string>();
  const [defaultDate, setDefaultDate] = useState<string>();

  const openAdd = (projectId: string, dateKey: string) => {
    setEditingAllocation(null);
    setDefaultProjectId(projectId);
    setDefaultDate(dateKey);
    setDialogOpen(true);
  };

  const openEdit = (allocation: Allocation) => {
    if (!canEditAllocationFor(allocation.employee_id)) return;
    setEditingAllocation(allocation);
    setDefaultProjectId(undefined);
    setDefaultDate(undefined);
    setDialogOpen(true);
  };

  const projectWeekHours = useMemo(() => {
    const map = new Map<string, number>();
    for (const project of rows) {
      const total = periodAllocations
        .filter((a) => a.project_id === project.id)
        .reduce((sum, a) => sum + a.hours, 0);
      map.set(project.id, Math.round(total * 10) / 10);
    }
    return map;
  }, [rows, periodAllocations]);

  if (rows.length === 0) {
    return (
      <EmptyState
        icon={FolderKanban}
        title="No projects match your filters"
        description="Adjust filters or clear them to schedule team members by project."
        actionLabel="Clear filters"
        onAction={clearFilters}
      />
    );
  }

  return (
    <>
      <p className="text-xs text-muted-foreground">
        Assign team members to each project by day. Click a cell to add or edit hours. Task-only
        entries (no project) appear on the Schedule tab.
        {period === "month" && (
          <span className="ml-1">Showing the full month — swipe horizontally on small screens.</span>
        )}
      </p>

      <div className="schedule-scroll schedule-scroll-fade relative overflow-x-auto rounded-lg border bg-white shadow-sm">
        <table className="w-full min-w-[720px] border-collapse text-sm sm:min-w-[960px]">
          <thead>
            <tr className="border-b bg-slate-50">
              <th className="sticky left-0 z-20 min-w-[220px] border-r bg-slate-50 px-4 py-3 text-left font-medium text-muted-foreground shadow-[4px_0_8px_-2px_rgba(0,0,0,0.06)]">
                Project
              </th>
              {periodDays.map((day) => (
                <th
                  key={day.toISOString()}
                  className="min-w-[120px] border-r px-1 py-3 text-center text-xs font-medium last:border-r-0"
                >
                  {formatDayHeader(day)}
                </th>
              ))}
              <th className="min-w-[72px] bg-slate-50 px-3 py-3 text-center text-xs font-medium text-muted-foreground">
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((project) => {
              const weekHours = projectWeekHours.get(project.id) ?? 0;

              return (
                <tr key={project.id} className="border-b align-top hover:bg-slate-50/40">
                  <td className="sticky left-0 z-10 border-r bg-white px-4 py-3 shadow-[4px_0_8px_-2px_rgba(0,0,0,0.06)] group-hover:bg-slate-50/40">
                    <Link
                      href={`/projects/${project.id}`}
                      className="inline-flex items-center gap-1 font-semibold text-emerald-700 hover:text-emerald-900 hover:underline"
                    >
                      {project.project_name}
                      <ExternalLink className="h-3 w-3 opacity-50" />
                    </Link>
                    <p className="mt-0.5 text-xs text-muted-foreground">{project.client_name}</p>
                    <p className="mt-1 text-[10px] text-slate-500">
                      {project.status} · {project.phase}
                    </p>
                  </td>
                  {periodDays.map((day) => {
                    const dateKey = formatDateKey(day);
                    const dayAllocs = periodAllocations.filter(
                      (a) => a.project_id === project.id && a.allocation_date === dateKey,
                    );

                    return (
                      <ProjectDayCell
                        key={dateKey}
                        allocations={dayAllocs}
                        canAdd={canEditSchedule}
                        canEditAllocation={canEditAllocationFor}
                        onAdd={() => openAdd(project.id, dateKey)}
                        onEdit={openEdit}
                      />
                    );
                  })}
                  <td className="bg-slate-50/30 px-3 py-3 text-center text-sm font-semibold text-slate-700">
                    {weekHours}h
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <AllocationFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        allocation={editingAllocation}
        defaultProjectId={defaultProjectId}
        defaultDate={defaultDate}
      />
    </>
  );
}
