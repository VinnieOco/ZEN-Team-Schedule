"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Save, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { CategorySearchSelect } from "@/components/time-tracking/category-search-select";
import { useScheduling } from "@/context/scheduling-context";
import { usePermissions } from "@/hooks/use-permissions";
import { formatProjectHours } from "@/lib/project-format";
import {
  createEmptyTimesheetRow,
  dayTotalHours,
  entriesToTimesheetRows,
  isTimesheetRowLocked,
  parseHoursInput,
  rowToFormValues,
  rowTotalHours,
  timesheetGrandTotal,
  type TimesheetRow,
} from "@/lib/timesheet";
import { filterTimeEntriesForWeek } from "@/lib/time-tracking";
import {
  formatDateKey,
  formatTimesheetDayHeader,
  formatWeekRange,
  getEmployeeFullName,
  getWeekDays,
} from "@/lib/week";
import { cn } from "@/lib/utils";

const UNSELECTED_PROJECT = "__unselected__";
const TASK_PROJECT_VALUE = "__task__";

function rowJobSelectValue(row: TimesheetRow): string {
  if (row.project_id) return row.project_id;
  if (row.is_non_project) return TASK_PROJECT_VALUE;
  return UNSELECTED_PROJECT;
}

export interface WeeklyTimesheetProps {
  /** Locks to one employee (hides name selector). Used in the edit dialog. */
  fixedEmployeeId?: string;
  /** All rows editable — used when editing from the Entries tab. */
  editMode?: boolean;
  /** Compact layout without the top name/week card. */
  embedded?: boolean;
  onSaved?: () => void;
}

export function WeeklyTimesheet({
  fixedEmployeeId,
  editMode = false,
  embedded = false,
  onSaved,
}: WeeklyTimesheetProps = {}) {
  const {
    employees,
    projects,
    categories,
    timeEntries,
    settings,
    selectedWeekStart,
    addTimeEntry,
    updateTimeEntry,
    deleteTimeEntry,
    getCategoryById,
    getProjectById,
  } = useScheduling();
  const { permissions, linkedEmployeeId, canEditEntry } = usePermissions();

  const weekDays = useMemo(
    () => getWeekDays(selectedWeekStart, settings),
    [selectedWeekStart, settings],
  );
  const weekDateKeys = useMemo(() => weekDays.map(formatDateKey), [weekDays]);

  const activeEmployees = useMemo(
    () => employees.filter((e) => e.active),
    [employees],
  );

  const defaultEmployeeId =
    linkedEmployeeId && activeEmployees.some((e) => e.id === linkedEmployeeId)
      ? linkedEmployeeId
      : (activeEmployees[0]?.id ?? "");

  const [employeeId, setEmployeeId] = useState(fixedEmployeeId ?? defaultEmployeeId);
  const [rows, setRows] = useState<TimesheetRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const lockEmployee =
    !editMode && !permissions.logTimeForAnyone && linkedEmployeeId != null;
  const canEdit = employeeId ? canEditEntry(employeeId) : false;

  const isRowLocked = (row: TimesheetRow) => !editMode && isTimesheetRowLocked(row);

  const weekEntries = useMemo(() => {
    const forWeek = filterTimeEntriesForWeek(timeEntries, selectedWeekStart, settings);
    return forWeek.filter((e) => e.employee_id === employeeId);
  }, [timeEntries, selectedWeekStart, settings, employeeId]);

  const loadRows = useCallback(() => {
    setRows(entriesToTimesheetRows(weekEntries, weekDateKeys));
  }, [weekEntries, weekDateKeys]);

  useEffect(() => {
    loadRows();
  }, [loadRows]);

  useEffect(() => {
    if (fixedEmployeeId) {
      setEmployeeId(fixedEmployeeId);
      return;
    }
    if (lockEmployee && linkedEmployeeId) {
      setEmployeeId(linkedEmployeeId);
    }
  }, [fixedEmployeeId, lockEmployee, linkedEmployeeId]);

  const updateRow = (rowKey: string, patch: Partial<TimesheetRow>) => {
    const row = rows.find((r) => r.key === rowKey);
    if (row && isRowLocked(row)) return;
    setRows((prev) =>
      prev.map((r) => (r.key === rowKey ? { ...r, ...patch, key: r.key } : r)),
    );
    setSaveMessage(null);
  };

  const setCellHours = (rowKey: string, dateKey: string, value: string) => {
    const row = rows.find((r) => r.key === rowKey);
    if (row && isRowLocked(row)) return;
    const hours = parseHoursInput(value);
    setRows((prev) =>
      prev.map((row) =>
        row.key === rowKey
          ? { ...row, hoursByDay: { ...row.hoursByDay, [dateKey]: hours } }
          : row,
      ),
    );
    setSaveMessage(null);
  };

  const commitCellHours = (rowKey: string, dateKey: string, value: string) => {
    setCellHours(rowKey, dateKey, value);
  };

  const addRow = () => {
    setRows((prev) => [
      ...prev,
      createEmptyTimesheetRow(weekDateKeys, {
        allocation_category_id: "",
        is_billable: true,
      }),
    ]);
    setSaveMessage(null);
  };

  const removeRow = (rowKey: string) => {
    const row = rows.find((r) => r.key === rowKey);
    if (!row || isRowLocked(row)) return;
    if (editMode && canEdit) {
      for (const id of Object.values(row.entryIdsByDay)) {
        if (id) deleteTimeEntry(id);
      }
    }
    setRows((prev) => prev.filter((r) => r.key !== rowKey));
    setSaveMessage(null);
  };

  const handleSave = async () => {
    if (!canEdit || !employeeId) return;
    setSaving(true);
    setSaveMessage(null);

    try {
      for (const row of rows) {
        if (isRowLocked(row)) continue;

        const hasHours = weekDateKeys.some((d) => (row.hoursByDay[d] ?? 0) > 0);

        if (hasHours) {
        if (!row.project_id && !row.is_non_project) {
          setSaveMessage("Select a job for each line with hours.");
          setSaving(false);
          return;
        }
        if (row.is_non_project && !row.task_name.trim()) {
          setSaveMessage("Enter a task name for non-project rows with hours.");
          setSaving(false);
          return;
        }
        if (!row.allocation_category_id) {
          setSaveMessage("Select a category for each line with hours.");
          setSaving(false);
          return;
        }
        }

        for (const dateKey of weekDateKeys) {
          const hours = row.hoursByDay[dateKey] ?? 0;
          const entryId = row.entryIdsByDay[dateKey];

          if (hours > 0) {
            const values = rowToFormValues(row, employeeId, dateKey, hours);
            if (entryId) {
              updateTimeEntry(entryId, values);
            } else {
              addTimeEntry(values);
            }
          } else if (entryId) {
            deleteTimeEntry(entryId);
          }
        }
      }

      loadRows();
      if (editMode) {
        setSaveMessage("Timesheet updated.");
      } else {
        setSaveMessage(
          "Timesheet saved. Saved lines are locked here — edit or delete them in the Entries tab.",
        );
      }
      onSaved?.();
    } finally {
      setSaving(false);
    }
  };

  const hasDraftToSave = rows.some(
    (row) =>
      !isRowLocked(row) && weekDateKeys.some((d) => (row.hoursByDay[d] ?? 0) > 0),
  );

  const activeProjects = useMemo(
    () => projects.filter((p) => p.active).sort((a, b) => a.project_name.localeCompare(b.project_name)),
    [projects],
  );

  const employeeSelectOptions = useMemo(
    () =>
      activeEmployees.map((e) => ({
        value: e.id,
        label: getEmployeeFullName(e),
        keywords: e.department ?? undefined,
      })),
    [activeEmployees],
  );

  const jobSelectOptions = useMemo(
    () => [
      { value: UNSELECTED_PROJECT, label: "Select job…" },
      ...activeProjects.map((p) => ({
        value: p.id,
        label: `${p.client_name} · ${p.project_name}`,
        keywords: [p.client_name, p.project_name, p.project_number].filter(Boolean).join(" "),
      })),
      { value: TASK_PROJECT_VALUE, label: "Non-project time" },
    ],
    [activeProjects],
  );

  if (!employeeId || activeEmployees.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Add an active team member in Settings before logging time.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {!embedded && (
      <div className="flex flex-col gap-4 rounded-lg border bg-white p-4 shadow-sm sm:flex-row sm:items-end sm:justify-between">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="timesheet-employee">Name</Label>
            <SearchableSelect
              id="timesheet-employee"
              options={employeeSelectOptions}
              value={employeeId}
              onValueChange={setEmployeeId}
              disabled={lockEmployee || Boolean(fixedEmployeeId)}
              placeholder="Select team member"
              searchPlaceholder="Search team members…"
              className="w-full sm:min-w-[220px]"
            />
          </div>
          <div className="space-y-2">
            <Label>Week of</Label>
            <p className="rounded-md border bg-slate-50 px-3 py-2 text-sm font-medium text-slate-800">
              {formatWeekRange(selectedWeekStart, settings)}
            </p>
          </div>
        </div>
        {canEdit && (
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" onClick={loadRows} disabled={saving}>
              Clear changes
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSave}
              disabled={saving || (!editMode && !hasDraftToSave)}
            >
              <Save className="mr-2 h-4 w-4" />
              {saving ? "Saving…" : editMode ? "Save changes" : "Save timesheet"}
            </Button>
          </div>
        )}
      </div>
      )}

      {embedded && !fixedEmployeeId && (
        <div className="grid gap-3 rounded-lg border bg-slate-50 p-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="timesheet-employee-embedded">Name</Label>
            <SearchableSelect
              id="timesheet-employee-embedded"
              options={employeeSelectOptions}
              value={employeeId}
              onValueChange={setEmployeeId}
              disabled={lockEmployee}
              placeholder="Select team member"
              searchPlaceholder="Search team members…"
              triggerClassName="bg-white"
            />
          </div>
          <div className="space-y-2">
            <Label>Week of</Label>
            <p className="rounded-md border bg-white px-3 py-2 text-sm font-medium text-slate-800">
              {formatWeekRange(selectedWeekStart, settings)}
            </p>
          </div>
        </div>
      )}

      {embedded && canEdit && (
        <div className="flex flex-wrap justify-end gap-2">
          <Button type="button" variant="outline" size="sm" onClick={loadRows} disabled={saving}>
            Clear changes
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleSave}
            disabled={saving || (!editMode && !hasDraftToSave)}
          >
            <Save className="mr-2 h-4 w-4" />
            {saving ? "Saving…" : editMode ? "Save changes" : "Save timesheet"}
          </Button>
        </div>
      )}

      {saveMessage && (
        <p
          className={cn(
            "text-sm",
            saveMessage.includes("saved") || saveMessage.includes("updated")
              ? "text-emerald-700"
              : "text-red-600",
          )}
        >
          {saveMessage}
        </p>
      )}

      <div className="schedule-scroll relative max-w-full overflow-x-auto rounded-lg border bg-white shadow-sm">
        <table className="w-full min-w-[900px] border-collapse text-sm">
          <thead>
            <tr className="border-b bg-slate-50">
              <th className="sticky left-0 z-20 min-w-[200px] border-r bg-slate-50 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Job
              </th>
              <th className="min-w-[140px] border-r px-2 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Category
              </th>
              <th className="min-w-[120px] border-r px-2 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Notes
              </th>
              {weekDays.map((day) => (
                <th
                  key={day.toISOString()}
                  className="min-w-[52px] border-r px-1 py-2 text-center text-xs font-semibold uppercase text-muted-foreground last:border-r-0"
                >
                  {formatTimesheetDayHeader(day)}
                </th>
              ))}
              <th className="min-w-[56px] border-r bg-slate-50 px-2 py-2 text-center text-xs font-semibold uppercase text-muted-foreground">
                Total
              </th>
              <th className="min-w-[52px] bg-slate-50 px-2 py-2 text-center text-xs font-semibold uppercase text-muted-foreground">
                Bill
              </th>
              {canEdit && <th className="w-10 bg-slate-50" />}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={weekDays.length + 5 + (canEdit ? 1 : 0)}
                  className="px-4 py-8 text-center text-muted-foreground"
                >
                  No time logged this week. Add a line to start your timesheet.
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                const rowTotal = rowTotalHours(row, weekDateKeys);
                const locked = isRowLocked(row);
                const rowEditable = canEdit && !locked;
                const project = row.project_id ? getProjectById(row.project_id) : null;
                const category = getCategoryById(row.allocation_category_id);
                const jobLabel = row.is_non_project
                  ? row.task_name.trim() || "Non-project time"
                  : project
                    ? `${project.client_name} · ${project.project_name}`
                    : "—";

                return (
                  <tr
                    key={row.key}
                    className={cn(
                      "border-b align-top",
                      locked
                        ? "bg-slate-100/90 text-slate-600"
                        : "hover:bg-slate-50/50",
                    )}
                  >
                    <td
                      className={cn(
                        "sticky left-0 z-10 border-r px-2 py-2 shadow-[4px_0_8px_-2px_rgba(0,0,0,0.06)]",
                        locked ? "bg-slate-100" : "bg-white",
                      )}
                    >
                      {locked ? (
                        <p className="text-xs font-medium leading-snug">{jobLabel}</p>
                      ) : (
                        <>
                      <SearchableSelect
                        options={jobSelectOptions}
                        value={rowJobSelectValue(row)}
                        disabled={!rowEditable}
                        size="sm"
                        placeholder="Select job"
                        searchPlaceholder="Search jobs…"
                        emptyMessage="No jobs found"
                        onValueChange={(v) => {
                          if (v === UNSELECTED_PROJECT) {
                            updateRow(row.key, {
                              project_id: null,
                              is_non_project: false,
                              task_name: "",
                            });
                          } else if (v === TASK_PROJECT_VALUE) {
                            updateRow(row.key, {
                              project_id: null,
                              is_non_project: true,
                              task_name: row.task_name,
                            });
                          } else {
                            updateRow(row.key, {
                              project_id: v,
                              is_non_project: false,
                              task_name: "",
                            });
                          }
                        }}
                      />
                      {row.is_non_project && (
                        <Input
                          className="mt-1 h-8 text-xs"
                          placeholder="Task (PTO, Admin…)"
                          value={row.task_name}
                          disabled={!rowEditable}
                          onChange={(e) =>
                            updateRow(row.key, {
                              task_name: e.target.value,
                              project_id: null,
                              is_non_project: true,
                            })
                          }
                        />
                      )}
                        </>
                      )}
                    </td>
                    <td className="border-r px-2 py-2">
                      {locked ? (
                        <p className="text-xs">{category?.name ?? "—"}</p>
                      ) : (
                      <CategorySearchSelect
                        categories={categories}
                        value={row.allocation_category_id}
                        disabled={!rowEditable}
                        onValueChange={(v) => {
                          const cat = getCategoryById(v);
                          updateRow(row.key, {
                            allocation_category_id: v,
                            is_billable: cat?.is_billable_default ?? row.is_billable,
                          });
                        }}
                      />
                      )}
                    </td>
                    <td className="border-r px-2 py-2">
                      {locked ? (
                        <p className="text-xs text-muted-foreground">{row.notes?.trim() || "—"}</p>
                      ) : (
                        <Input
                          className="h-8 text-xs"
                          placeholder="Notes"
                          value={row.notes ?? ""}
                          disabled={!rowEditable}
                          onChange={(e) => updateRow(row.key, { notes: e.target.value })}
                        />
                      )}
                    </td>
                    {weekDateKeys.map((dateKey) => (
                      <td key={dateKey} className="border-r px-1 py-2 last:border-r-0">
                        {locked ? (
                          <p className="text-center text-xs font-medium tabular-nums">
                            {row.hoursByDay[dateKey]
                              ? formatProjectHours(row.hoursByDay[dateKey])
                              : "—"}
                          </p>
                        ) : (
                          <Input
                            type="number"
                            min={0}
                            max={24}
                            step={0.25}
                            className="h-8 px-1 text-center text-xs tabular-nums"
                            value={
                              row.hoursByDay[dateKey]
                                ? String(row.hoursByDay[dateKey])
                                : ""
                            }
                            disabled={!rowEditable}
                            onChange={(e) => setCellHours(row.key, dateKey, e.target.value)}
                            onBlur={(e) => commitCellHours(row.key, dateKey, e.target.value)}
                          />
                        )}
                      </td>
                    ))}
                    <td
                      className={cn(
                        "border-r px-2 py-2 text-center text-xs font-semibold tabular-nums",
                        locked ? "bg-slate-100" : "bg-slate-50/50",
                      )}
                    >
                      {formatProjectHours(rowTotal)}
                    </td>
                    <td
                      className={cn(
                        "px-2 py-2 text-center",
                        locked ? "bg-slate-100" : "bg-slate-50/50",
                      )}
                    >
                      {locked ? (
                        <span className="text-xs">{row.is_billable ? "Yes" : "No"}</span>
                      ) : (
                        <Switch
                          checked={row.is_billable}
                          disabled={!rowEditable}
                          onCheckedChange={(v) => updateRow(row.key, { is_billable: v })}
                          aria-label="Billable"
                        />
                      )}
                    </td>
                    {canEdit && (
                      <td className="px-1 py-2">
                        {!locked && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-600"
                            onClick={() => removeRow(row.key)}
                            aria-label="Remove line"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
          <tfoot>
            <tr className="border-t-2 bg-slate-100">
              <td
                colSpan={3}
                className="sticky left-0 z-10 border-r bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700 shadow-[4px_0_8px_-2px_rgba(0,0,0,0.06)]"
              >
                Totals
              </td>
              {weekDateKeys.map((dateKey) => (
                <td
                  key={dateKey}
                  className="border-r px-1 py-2 text-center text-xs font-semibold tabular-nums last:border-r-0"
                >
                  {formatProjectHours(dayTotalHours(rows, dateKey))}
                </td>
              ))}
              <td className="border-r bg-slate-100 px-2 py-2 text-center text-xs font-bold tabular-nums">
                {formatProjectHours(timesheetGrandTotal(rows, weekDateKeys))}
              </td>
              <td colSpan={canEdit ? 2 : 1} className="bg-slate-100" />
            </tr>
          </tfoot>
        </table>
      </div>

      {canEdit && (
        <Button type="button" variant="outline" size="sm" onClick={addRow}>
          <Plus className="mr-2 h-4 w-4" />
          Add line
        </Button>
      )}

      {!canEdit && (
        <p className="text-xs text-muted-foreground">
          You can view this timesheet but cannot edit time for this team member.
        </p>
      )}

      {canEdit && !editMode && rows.some((r) => isRowLocked(r)) && (
        <p className="text-xs text-muted-foreground">
          Grey rows are saved and locked on this screen. Use the{" "}
          <span className="font-medium">Entries</span> tab to change or remove them.
        </p>
      )}
    </div>
  );
}
