"use client";

import { useMemo, useState } from "react";
import { Clock, Pencil, Search, Trash2 } from "lucide-react";

import { WeeklyTimesheetDialog } from "@/components/time-tracking/weekly-timesheet-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { useScheduling } from "@/context/scheduling-context";
import { usePermissions } from "@/hooks/use-permissions";
import { formatProjectHours } from "@/lib/project-format";
import { filterTimeEntriesForWeek } from "@/lib/time-tracking";
import {
  buildEmployeeTimesheetSummaries,
  filterTimesheetsBySearch,
  getTimesheetLineLabel,
  rowTotalHours,
} from "@/lib/timesheet";
import { formatDateKey, formatWeekRange, getEmployeeFullName, getTimesheetSettings, getWeekDays } from "@/lib/week";

export function TimeEntriesList() {
  const {
    getProjectById,
    getCategoryById,
    getEmployeeById,
    deleteTimeEntry,
    settings,
    selectedWeekStart,
    timeEntries,
  } = useScheduling();
  const { canEditEntry, canLogTime, permissions, linkedEmployeeId, isManagerOrAdmin } =
    usePermissions();

  const [editEmployeeId, setEditEmployeeId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [entriesSearch, setEntriesSearch] = useState("");

  const timesheetSettings = useMemo(() => getTimesheetSettings(settings), [settings]);

  const weekTimeEntries = useMemo(
    () => filterTimeEntriesForWeek(timeEntries, selectedWeekStart, timesheetSettings),
    [timeEntries, selectedWeekStart, timesheetSettings],
  );

  const scopedWeekEntries = useMemo(() => {
    if (permissions.logTimeForAnyone) return weekTimeEntries;
    if (!linkedEmployeeId) return [];
    return weekTimeEntries.filter((e) => e.employee_id === linkedEmployeeId);
  }, [weekTimeEntries, permissions.logTimeForAnyone, linkedEmployeeId]);

  const canSearchEntries = isManagerOrAdmin;

  const weekDays = useMemo(
    () => getWeekDays(selectedWeekStart, timesheetSettings),
    [selectedWeekStart, timesheetSettings],
  );
  const weekDateKeys = useMemo(() => weekDays.map(formatDateKey), [weekDays]);

  const timesheets = useMemo(() => {
    const summaries = buildEmployeeTimesheetSummaries(scopedWeekEntries, weekDateKeys);
    const withEmployees = summaries
      .map((summary) => {
        const employee = getEmployeeById(summary.employeeId);
        return employee ? { ...summary, employee } : null;
      })
      .filter((t): t is NonNullable<typeof t> => t != null)
      .sort((a, b) => getEmployeeFullName(a.employee).localeCompare(getEmployeeFullName(b.employee)));

    if (!canSearchEntries) return withEmployees;

    return filterTimesheetsBySearch(
      withEmployees,
      entriesSearch,
      weekDateKeys,
      getProjectById,
      getCategoryById,
    );
  }, [
    scopedWeekEntries,
    weekDateKeys,
    getEmployeeById,
    canSearchEntries,
    entriesSearch,
    getProjectById,
    getCategoryById,
  ]);

  const weekLabel = formatWeekRange(selectedWeekStart, timesheetSettings);

  const openEdit = (employeeId: string) => {
    setEditEmployeeId(employeeId);
    setDialogOpen(true);
  };

  const handleDialogChange = (open: boolean) => {
    setDialogOpen(open);
    if (!open) setEditEmployeeId(null);
  };

  const deleteTimesheet = (employeeId: string, entryIds: string[]) => {
    if (!canEditEntry(employeeId)) return;
    if (
      !window.confirm(
        "Delete this entire timesheet for the week? All logged hours for this person will be removed.",
      )
    ) {
      return;
    }
    for (const id of entryIds) {
      deleteTimeEntry(id);
    }
  };

  if (timesheets.length === 0) {
    const hasEntriesSearch = canSearchEntries && entriesSearch.trim().length > 0;
    return (
      <>
        {canSearchEntries && (
          <div className="relative mb-4 max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search name, job, class, project, date, notes…"
              value={entriesSearch}
              onChange={(e) => setEntriesSearch(e.target.value)}
            />
          </div>
        )}
        <EmptyState
          icon={Clock}
          title={hasEntriesSearch ? "No entries match your search" : "No timesheets this week"}
          description={
            hasEntriesSearch
              ? "Try a different name, project, date, or note."
              : "No time has been logged for this week yet."
          }
          actionLabel={hasEntriesSearch ? "Clear search" : undefined}
          onAction={hasEntriesSearch ? () => setEntriesSearch("") : undefined}
        />
        <WeeklyTimesheetDialog
          open={dialogOpen}
          onOpenChange={handleDialogChange}
          employeeId={editEmployeeId}
        />
      </>
    );
  }

  return (
    <>
      {canSearchEntries && (
        <div className="relative mb-4 max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search name, job, class, project, date, notes…"
            value={entriesSearch}
            onChange={(e) => setEntriesSearch(e.target.value)}
          />
        </div>
      )}
      <p className="mb-3 text-sm text-muted-foreground">
        Time is grouped by weekly timesheet ({weekLabel}). Select <span className="font-medium">Edit timesheet</span> to change the full week at once.
      </p>
      <div className="space-y-4">
        {timesheets.map(({ employee, employeeId, rows, totalHours }) => {
          const entryIds = rows.flatMap((row) =>
            Object.values(row.entryIdsByDay).filter((id): id is string => Boolean(id)),
          );
          const editable = canEditEntry(employeeId);

          return (
            <Card key={employeeId}>
              <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3 space-y-0 pb-3">
                <div>
                  <CardTitle className="text-base">{getEmployeeFullName(employee)}</CardTitle>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {weekLabel} · {formatProjectHours(totalHours)}h total · {rows.length}{" "}
                    {rows.length === 1 ? "line" : "lines"}
                  </p>
                </div>
                {canLogTime && editable && (
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => openEdit(employeeId)}>
                      <Pencil className="mr-2 h-3.5 w-3.5" />
                      Edit timesheet
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="text-red-600 hover:text-red-700"
                      onClick={() => deleteTimesheet(employeeId, entryIds)}
                    >
                      <Trash2 className="mr-2 h-3.5 w-3.5" />
                      Delete
                    </Button>
                  </div>
                )}
              </CardHeader>
              <CardContent className="pt-0">
                <div className="scroll-x-contained max-w-full overflow-x-auto rounded-md border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-slate-50 text-left text-xs text-muted-foreground">
                        <th className="px-3 py-2 font-medium">Job</th>
                        <th className="px-3 py-2 font-medium">Category</th>
                        <th className="hidden px-3 py-2 font-medium sm:table-cell">Notes</th>
                        <th className="hidden px-3 py-2 font-medium md:table-cell">Class</th>
                        <th className="px-3 py-2 text-right font-medium">Hours</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row) => {
                        const category = getCategoryById(row.allocation_category_id);
                        const lineTotal = rowTotalHours(row, weekDateKeys);
                        const jobLabel = getTimesheetLineLabel(row, (id) => {
                          const p = getProjectById(id);
                          return p
                            ? { client_name: p.client_name, project_name: p.project_name }
                            : undefined;
                        });

                        return (
                          <tr key={row.key} className="border-b last:border-b-0">
                            <td className="px-3 py-2 font-medium">{jobLabel}</td>
                            <td className="px-3 py-2">
                              {category ? (
                                <Badge variant="secondary" className="font-normal">
                                  {category.name}
                                </Badge>
                              ) : (
                                "—"
                              )}
                            </td>
                            <td className="hidden max-w-[200px] truncate px-3 py-2 text-muted-foreground sm:table-cell">
                              {row.notes?.trim() || "—"}
                            </td>
                            <td className="hidden px-3 py-2 font-medium text-muted-foreground md:table-cell">
                              {row.class_code?.trim() || "—"}
                            </td>
                            <td className="px-3 py-2 text-right font-semibold tabular-nums">
                              {formatProjectHours(lineTotal)}h
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <WeeklyTimesheetDialog
        open={dialogOpen}
        onOpenChange={handleDialogChange}
        employeeId={editEmployeeId}
      />
    </>
  );
}
