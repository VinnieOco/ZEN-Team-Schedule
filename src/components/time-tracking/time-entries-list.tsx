"use client";

import { useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { Clock, Pencil, Trash2 } from "lucide-react";

import { TimeEntryFormDialog } from "@/components/time-tracking/time-entry-form-dialog";
import { useFilteredTimeTrackingRows } from "@/components/time-tracking/use-filtered-time-tracking-rows";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { useScheduling } from "@/context/scheduling-context";
import { usePermissions } from "@/hooks/use-permissions";
import { getEmployeeFullName } from "@/lib/week";
import type { TimeEntry } from "@/types";

export function TimeEntriesList() {
  const { getProjectById, getCategoryById, getEmployeeById, deleteTimeEntry } = useScheduling();
  const { canEditEntry, canLogTime } = usePermissions();
  const { weekTimeEntries, clearFilters } = useFilteredTimeTrackingRows();
  const [editing, setEditing] = useState<TimeEntry | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const sorted = useMemo(() => {
    return [...weekTimeEntries].sort((a, b) => {
      const dateCmp = b.entry_date.localeCompare(a.entry_date);
      if (dateCmp !== 0) return dateCmp;
      const empA = getEmployeeById(a.employee_id);
      const empB = getEmployeeById(b.employee_id);
      const nameA = empA ? getEmployeeFullName(empA) : "";
      const nameB = empB ? getEmployeeFullName(empB) : "";
      return nameA.localeCompare(nameB);
    });
  }, [weekTimeEntries, getEmployeeById]);

  const openEdit = (entry: TimeEntry) => {
    setEditing(entry);
    setDialogOpen(true);
  };

  const handleDialogChange = (open: boolean) => {
    setDialogOpen(open);
    if (!open) setEditing(null);
  };

  if (sorted.length === 0) {
    return (
      <>
        <EmptyState
          icon={Clock}
          title="No entries match your filters"
          description="Try another search or clear filters to see time logged this week."
          actionLabel="Clear filters"
          onAction={clearFilters}
        />
        <TimeEntryFormDialog open={dialogOpen} onOpenChange={handleDialogChange} entry={editing} />
      </>
    );
  }

  return (
    <>
      <div className="overflow-hidden rounded-lg border bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-slate-50 text-left text-xs text-muted-foreground">
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium">Team member</th>
              <th className="hidden px-4 py-3 font-medium sm:table-cell">Project / task</th>
              <th className="hidden px-4 py-3 font-medium md:table-cell">Category</th>
              <th className="px-4 py-3 font-medium text-right">Hours</th>
              {canLogTime && <th className="px-4 py-3 font-medium text-right">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {sorted.map((entry) => {
              const employee = getEmployeeById(entry.employee_id);
              const project = entry.project_id ? getProjectById(entry.project_id) : null;
              const category = getCategoryById(entry.allocation_category_id);
              const label = project?.project_name ?? entry.task_name ?? "—";

              return (
                <tr key={entry.id} className="border-b last:border-b-0 hover:bg-slate-50/50">
                  <td className="px-4 py-3 tabular-nums text-muted-foreground">
                    {format(parseISO(entry.entry_date), "EEE M/d")}
                  </td>
                  <td className="px-4 py-3 font-medium">
                    {employee ? getEmployeeFullName(employee) : "—"}
                  </td>
                  <td className="hidden px-4 py-3 sm:table-cell">{label}</td>
                  <td className="hidden px-4 py-3 md:table-cell">
                    {category ? (
                      <Badge variant="secondary" className="font-normal">
                        {category.name}
                      </Badge>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold tabular-nums">
                    {entry.hours}h
                  </td>
                  {canLogTime && (
                    <td className="px-4 py-3">
                      {canEditEntry(entry.employee_id) ? (
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => openEdit(entry)}
                            aria-label="Edit entry"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-600 hover:text-red-700"
                            onClick={() => deleteTimeEntry(entry.id)}
                            aria-label="Delete entry"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ) : null}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <TimeEntryFormDialog open={dialogOpen} onOpenChange={handleDialogChange} entry={editing} />
    </>
  );
}
