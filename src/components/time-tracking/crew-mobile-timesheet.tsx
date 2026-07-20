"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { format, isSameDay, isToday } from "date-fns";
import { ChevronDown, Minus, Pencil, Plus, Save, Trash2, X } from "lucide-react";

import { CategorySearchSelect } from "@/components/time-tracking/category-search-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Switch } from "@/components/ui/switch";
import { useScheduling } from "@/context/scheduling-context";
import { usePermissions } from "@/hooks/use-permissions";
import { formatProjectHours } from "@/lib/project-format";
import { buildGroupedProjectSelectOptions } from "@/lib/project-picker-options";
import { getClassCodeOptions, resolveClassCodes } from "@/lib/time-class-options";
import { filterTimeEntriesForWeek } from "@/lib/time-tracking";
import {
  TIMESHEET_HOUR_STEP,
  createEmptyTimesheetRow,
  dayTotalHours,
  entriesToTimesheetRows,
  isTimesheetRowLocked,
  parseHoursInput,
  rowToFormValues,
  timesheetGrandTotal,
  type TimesheetRow,
} from "@/lib/timesheet";
import { cn } from "@/lib/utils";
import { formatDateKey, formatWeekRange, getEmployeeFullName, getWeekDays } from "@/lib/week";

const UNSELECTED_PROJECT = "__unselected__";
const TASK_PROJECT_VALUE = "__task__";

function rowJobSelectValue(row: TimesheetRow): string {
  if (row.project_id) return row.project_id;
  if (row.is_non_project) return TASK_PROJECT_VALUE;
  return UNSELECTED_PROJECT;
}

function snapHours(hours: number): number {
  if (!Number.isFinite(hours) || hours < 0) return 0;
  const quarters = Math.round(hours / TIMESHEET_HOUR_STEP);
  return Math.min(24, Math.max(0, quarters * TIMESHEET_HOUR_STEP));
}

export function CrewMobileTimesheet() {
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
  const { permissions, linkedEmployeeId, canEditEntry, authLoading } = usePermissions();

  /** Always include Sat/Sun so weekend hours can be logged on mobile. */
  const timesheetSettings = useMemo(
    () => ({ ...settings, include_weekends: true }),
    [settings],
  );

  const weekDays = useMemo(
    () => getWeekDays(selectedWeekStart, timesheetSettings),
    [selectedWeekStart, timesheetSettings],
  );
  const weekDateKeys = useMemo(() => weekDays.map(formatDateKey), [weekDays]);

  const activeEmployees = useMemo(
    () => employees.filter((e) => e.active),
    [employees],
  );

  const lockEmployee = !permissions.logTimeForAnyone && linkedEmployeeId != null;

  const [employeeId, setEmployeeId] = useState("");
  const [selectedDateKey, setSelectedDateKey] = useState(() => weekDateKeys[0] ?? "");
  const [rows, setRows] = useState<TimesheetRow[]>([]);
  const [editingRowKeys, setEditingRowKeys] = useState<Set<string>>(() => new Set());
  const [expandedRowKeys, setExpandedRowKeys] = useState<Set<string>>(() => new Set());
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  useEffect(() => {
    if (lockEmployee && linkedEmployeeId) {
      setEmployeeId(linkedEmployeeId);
      return;
    }
    if (authLoading) return;
    setEmployeeId((prev) => {
      if (prev && activeEmployees.some((e) => e.id === prev)) return prev;
      if (linkedEmployeeId && activeEmployees.some((e) => e.id === linkedEmployeeId)) {
        return linkedEmployeeId;
      }
      return activeEmployees[0]?.id ?? "";
    });
  }, [lockEmployee, linkedEmployeeId, activeEmployees, authLoading]);

  const canEdit = employeeId ? canEditEntry(employeeId) : false;

  const weekEntries = useMemo(() => {
    if (!employeeId) return [];
    const forWeek = filterTimeEntriesForWeek(timeEntries, selectedWeekStart, timesheetSettings);
    return forWeek.filter((e) => e.employee_id === employeeId);
  }, [timeEntries, selectedWeekStart, timesheetSettings, employeeId]);

  const employeeSelectOptions = useMemo(
    () =>
      activeEmployees.map((e) => ({
        value: e.id,
        label: getEmployeeFullName(e),
        keywords: e.department ?? undefined,
      })),
    [activeEmployees],
  );

  useEffect(() => {
    if (weekDateKeys.length === 0) return;
    const todayInWeek = weekDays.find((d) => isToday(d));
    const preferred = todayInWeek ? formatDateKey(todayInWeek) : weekDateKeys[0]!;
    setSelectedDateKey((prev) => (weekDateKeys.includes(prev) ? prev : preferred));
  }, [weekDateKeys, weekDays]);

  useEffect(() => {
    setRows(entriesToTimesheetRows(weekEntries, weekDateKeys));
    setEditingRowKeys(new Set());
  }, [weekEntries, weekDateKeys]);

  const isRowLocked = (row: TimesheetRow) =>
    isTimesheetRowLocked(row) && !editingRowKeys.has(row.key);
  const canEditRowMetadata = (row: TimesheetRow) => canEdit && !isRowLocked(row);
  const canEditRowHours = (row: TimesheetRow) => canEdit && !isRowLocked(row);

  const loadRows = useCallback(() => {
    setRows(entriesToTimesheetRows(weekEntries, weekDateKeys));
    setEditingRowKeys(new Set());
    setSaveMessage(null);
  }, [weekEntries, weekDateKeys]);

  const startEditingRow = (rowKey: string) => {
    setEditingRowKeys((prev) => new Set(prev).add(rowKey));
    setExpandedRowKeys((prev) => new Set(prev).add(rowKey));
    setSaveMessage(null);
  };

  const cancelEditingRow = (rowKey: string) => {
    setEditingRowKeys((prev) => {
      const next = new Set(prev);
      next.delete(rowKey);
      return next;
    });
    const refreshed = entriesToTimesheetRows(weekEntries, weekDateKeys);
    const restored = refreshed.find((row) => row.key === rowKey);
    setRows((prev) => {
      if (!restored) return prev.filter((row) => row.key !== rowKey);
      return prev.map((row) => (row.key === rowKey ? restored : row));
    });
    setSaveMessage(null);
  };

  const updateRow = (rowKey: string, patch: Partial<TimesheetRow>) => {
    const row = rows.find((r) => r.key === rowKey);
    if (!row) return;
    const metadataOnly = !("hoursByDay" in patch) && !("entryIdsByDay" in patch);
    if (metadataOnly ? !canEditRowMetadata(row) : isRowLocked(row)) return;
    setRows((prev) =>
      prev.map((r) => (r.key === rowKey ? { ...r, ...patch, key: r.key } : r)),
    );
    setSaveMessage(null);
  };

  const setDayHours = (rowKey: string, hours: number) => {
    const row = rows.find((r) => r.key === rowKey);
    if (!row || isRowLocked(row) || !selectedDateKey) return;
    const nextHours = snapHours(hours);
    setRows((prev) =>
      prev.map((r) =>
        r.key === rowKey
          ? { ...r, hoursByDay: { ...r.hoursByDay, [selectedDateKey]: nextHours } }
          : r,
      ),
    );
    setSaveMessage(null);
  };

  const nudgeDayHours = (rowKey: string, delta: number) => {
    const row = rows.find((r) => r.key === rowKey);
    if (!row || !selectedDateKey) return;
    setDayHours(rowKey, (row.hoursByDay[selectedDateKey] ?? 0) + delta);
  };

  const defaultRowClassCode = resolveClassCodes(settings)[0] ?? "";

  const addRow = () => {
    const row = createEmptyTimesheetRow(weekDateKeys, {
      allocation_category_id: "",
      is_billable: true,
      class_code: defaultRowClassCode,
    });
    setRows((prev) => [...prev, row]);
    setExpandedRowKeys((prev) => new Set(prev).add(row.key));
    setSaveMessage(null);
  };

  const removeRow = (rowKey: string) => {
    const row = rows.find((r) => r.key === rowKey);
    if (!row || isRowLocked(row)) return;
    const hasSavedEntries = Object.values(row.entryIdsByDay).some((id) => id != null);
    if (hasSavedEntries) {
      if (!window.confirm("Delete this saved timesheet line? This cannot be undone.")) {
        return;
      }
    }
    if (canEdit) {
      for (const id of Object.values(row.entryIdsByDay)) {
        if (id) deleteTimeEntry(id);
      }
    }
    setEditingRowKeys((prev) => {
      const next = new Set(prev);
      next.delete(rowKey);
      return next;
    });
    setExpandedRowKeys((prev) => {
      const next = new Set(prev);
      next.delete(rowKey);
      return next;
    });
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
          const configuredClasses = resolveClassCodes(settings);
          if (configuredClasses.length > 0 && !row.class_code?.trim()) {
            setSaveMessage("Select a class for each line with hours.");
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

      setEditingRowKeys(new Set());
      setSaveMessage("Timesheet saved.");
    } catch {
      setSaveMessage("Could not save timesheet. Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  };

  const hasDraftToSave = rows.some((row) => {
    if (isRowLocked(row)) return false;
    if (editingRowKeys.has(row.key)) return true;
    return weekDateKeys.some((d) => (row.hoursByDay[d] ?? 0) > 0);
  });

  const activeProjects = useMemo(
    () => projects.filter((p) => p.active).sort((a, b) => a.project_name.localeCompare(b.project_name)),
    [projects],
  );

  const classSelectOptions = useMemo(() => {
    const codes = getClassCodeOptions(
      settings,
      rows.map((r) => r.class_code?.trim() ?? "").filter(Boolean),
    );
    return codes.map((code) => ({ value: code, label: code }));
  }, [settings, rows]);

  const jobSelectOptions = useMemo(() => {
    const activeIds = new Set(activeProjects.map((p) => p.id));
    const inactiveFromRows = rows
      .map((r) => (r.project_id && !activeIds.has(r.project_id) ? getProjectById(r.project_id) : null))
      .filter((p): p is NonNullable<typeof p> => p != null);

    const projectOptions = buildGroupedProjectSelectOptions(projects, {
      extraProjects: inactiveFromRows,
    });

    return [
      { value: UNSELECTED_PROJECT, label: "Select job…" },
      ...projectOptions,
      { value: TASK_PROJECT_VALUE, label: "Non-project time" },
    ];
  }, [activeProjects, projects, rows, getProjectById]);

  const visibleRows = useMemo(() => {
    if (!selectedDateKey) return rows;
    // Day-scoped: only this day's hours, plus new/unlocked drafts being filled in.
    return rows.filter((row) => {
      if ((row.hoursByDay[selectedDateKey] ?? 0) > 0) return true;
      if (editingRowKeys.has(row.key)) return true;
      return !isTimesheetRowLocked(row);
    });
  }, [rows, selectedDateKey, editingRowKeys]);

  const otherDayRows = useMemo(() => {
    if (!selectedDateKey) return [];
    const visibleKeys = new Set(visibleRows.map((r) => r.key));
    return rows.filter((row) => {
      if (visibleKeys.has(row.key)) return false;
      return weekDateKeys.some((d) => (row.hoursByDay[d] ?? 0) > 0);
    });
  }, [rows, selectedDateKey, visibleRows, weekDateKeys]);

  const hoursOnDaysLabel = (row: TimesheetRow, options?: { excludeSelected?: boolean }) => {
    const parts = weekDays
      .map((day) => {
        const dateKey = formatDateKey(day);
        if (options?.excludeSelected && dateKey === selectedDateKey) return null;
        const hours = row.hoursByDay[dateKey] ?? 0;
        if (hours <= 0) return null;
        return `${format(day, "EEE")} ${formatProjectHours(hours)}h`;
      })
      .filter((part): part is string => part != null);
    return parts.length > 0 ? parts.join(" · ") : null;
  };

  const otherDayHoursLabel = (row: TimesheetRow): string | null => {
    const label = hoursOnDaysLabel(row, { excludeSelected: true });
    return label ? `Also: ${label}` : null;
  };

  const dayTotal = selectedDateKey ? dayTotalHours(rows, selectedDateKey) : 0;
  const weekTotal = timesheetGrandTotal(rows, weekDateKeys);
  const selectedDay = weekDays.find((d) => formatDateKey(d) === selectedDateKey);

  if (authLoading) {
    return <p className="text-sm text-muted-foreground">Loading timesheet…</p>;
  }

  if (activeEmployees.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Add an active team member in Settings before logging time.
      </p>
    );
  }

  if (!employeeId) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        <p className="font-medium">Link your schedule profile</p>
        <p className="mt-1 text-amber-800/90">
          Connect your login to your team member record in Settings before logging time.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-4 pb-24">
      <div className="rounded-lg border bg-white px-4 py-3 shadow-sm">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Week of {formatWeekRange(selectedWeekStart, timesheetSettings)}
        </p>
        {permissions.logTimeForAnyone && (
          <div className="mt-3 space-y-1.5">
            <Label htmlFor="mobile-timesheet-employee" className="text-xs">
              Name
            </Label>
            <SearchableSelect
              id="mobile-timesheet-employee"
              options={employeeSelectOptions}
              value={employeeId}
              onValueChange={(id) => {
                setEmployeeId(id);
                setSaveMessage(null);
              }}
              disabled={lockEmployee}
              placeholder="Select team member"
              searchPlaceholder="Search team members…"
            />
          </div>
        )}
        <div className="mt-2 flex items-end justify-between gap-3">
          <div>
            <p className="text-2xl font-bold tabular-nums text-slate-900">
              {formatProjectHours(weekTotal)}
              <span className="ml-1 text-base font-semibold text-muted-foreground">h</span>
            </p>
            <p className="text-xs text-muted-foreground">logged this week</p>
          </div>
          {canEdit && (
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" onClick={loadRows} disabled={saving}>
                Reset
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleSave}
                disabled={saving || !hasDraftToSave}
              >
                <Save className="mr-1.5 h-4 w-4" />
                {saving ? "Saving…" : "Save"}
              </Button>
            </div>
          )}
        </div>
      </div>

      {saveMessage && (
        <p
          className={cn(
            "text-sm",
            saveMessage.includes("saved") ? "text-emerald-700" : "text-red-600",
          )}
        >
          {saveMessage}
        </p>
      )}

      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {weekDays.map((day) => {
          const dateKey = formatDateKey(day);
          const total = dayTotalHours(rows, dateKey);
          const selected = dateKey === selectedDateKey;
          const today = isToday(day);
          return (
            <button
              key={dateKey}
              type="button"
              onClick={() => setSelectedDateKey(dateKey)}
              className={cn(
                "flex min-w-[4.25rem] shrink-0 flex-col items-center rounded-xl border px-2 py-2.5 text-center transition-colors",
                selected
                  ? "border-emerald-600 bg-emerald-600 text-white shadow-sm"
                  : "border-slate-200 bg-white text-slate-800 hover:border-slate-300",
              )}
            >
              <span
                className={cn(
                  "text-[10px] font-semibold uppercase tracking-wide",
                  selected ? "text-emerald-100" : "text-muted-foreground",
                )}
              >
                {format(day, "EEE")}
              </span>
              <span className="text-lg font-bold leading-none">{format(day, "d")}</span>
              <span
                className={cn(
                  "mt-1 text-xs font-semibold tabular-nums",
                  selected ? "text-white" : total > 0 ? "text-emerald-700" : "text-muted-foreground",
                )}
              >
                {total > 0 ? formatProjectHours(total) : "—"}
              </span>
              {today && !selected && (
                <span className="mt-1 h-1 w-1 rounded-full bg-emerald-600" aria-hidden />
              )}
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold text-slate-900">
            {selectedDay
              ? isSameDay(selectedDay, new Date())
                ? "Today"
                : format(selectedDay, "EEEE, MMM d")
              : "Select a day"}
          </h2>
          <p className="text-xs text-muted-foreground">
            {formatProjectHours(dayTotal)}h this day
          </p>
        </div>
        {canEdit && (
          <Button type="button" variant="outline" size="sm" onClick={addRow}>
            <Plus className="mr-1.5 h-4 w-4" />
            Add
          </Button>
        )}
      </div>

      {visibleRows.length === 0 ? (
        <div className="rounded-lg border border-dashed bg-slate-50 px-4 py-10 text-center">
          <p className="text-sm font-medium text-slate-700">No time logged for this day</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Tap Add to log hours for a job.
          </p>
          {canEdit && (
            <Button type="button" className="mt-4" size="sm" onClick={addRow}>
              <Plus className="mr-1.5 h-4 w-4" />
              Add line
            </Button>
          )}
        </div>
      ) : (
        <ul className="space-y-3">
          {visibleRows.map((row) => {
            const locked = isRowLocked(row);
            const metadataEditable = canEditRowMetadata(row);
            const hoursEditable = canEditRowHours(row);
            const expanded = expandedRowKeys.has(row.key) || metadataEditable;
            const project = row.project_id ? getProjectById(row.project_id) : null;
            const category = getCategoryById(row.allocation_category_id);
            const hours = selectedDateKey ? (row.hoursByDay[selectedDateKey] ?? 0) : 0;
            const alsoLogged = otherDayHoursLabel(row);
            const jobLabel = row.is_non_project
              ? row.task_name.trim() || "Non-project time"
              : project
                ? `${project.client_name} · ${project.project_name}`
                : "Select a job";

            return (
              <li
                key={row.key}
                className={cn(
                  "rounded-xl border bg-white p-3 shadow-sm",
                  locked && "border-slate-200 bg-slate-50",
                  hours === 0 && !locked && "border-dashed",
                )}
              >
                <div className="flex items-start gap-2">
                  <div className="min-w-0 flex-1">
                    {!metadataEditable ? (
                      <p className="text-sm font-semibold leading-snug text-slate-900">{jobLabel}</p>
                    ) : (
                      <div className="space-y-2">
                        <SearchableSelect
                          options={jobSelectOptions}
                          value={rowJobSelectValue(row)}
                          disabled={!metadataEditable}
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
                            className="h-9 text-sm"
                            placeholder="Task (PTO, Admin…)"
                            value={row.task_name}
                            disabled={!metadataEditable}
                            onChange={(e) =>
                              updateRow(row.key, {
                                task_name: e.target.value,
                                project_id: null,
                                is_non_project: true,
                              })
                            }
                          />
                        )}
                      </div>
                    )}
                    {!expanded && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {[category?.name, row.is_billable ? "Billable" : "Non-billable"]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    )}
                    {alsoLogged && (
                      <p className="mt-1 text-xs font-medium text-slate-600">{alsoLogged}</p>
                    )}
                  </div>

                  {canEdit && (
                    <div className="flex shrink-0 items-center gap-0.5">
                      {locked && isTimesheetRowLocked(row) && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 text-slate-600"
                          onClick={() => startEditingRow(row.key)}
                          aria-label="Edit line"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      )}
                      {!locked && editingRowKeys.has(row.key) && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 text-muted-foreground"
                          onClick={() => cancelEditingRow(row.key)}
                          aria-label="Cancel edit"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                      {!locked && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 text-red-600"
                          onClick={() => removeRow(row.key)}
                          aria-label="Remove line"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  )}
                </div>

                <div className="mt-3 flex items-center justify-between gap-3">
                  <Label className="text-xs text-muted-foreground">Hours</Label>
                  {!hoursEditable ? (
                    <p className="text-xl font-bold tabular-nums text-slate-800">
                      {hours > 0 ? formatProjectHours(hours) : "—"}
                    </p>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-10 w-10"
                        onClick={() => nudgeDayHours(row.key, -TIMESHEET_HOUR_STEP)}
                        aria-label="Decrease hours"
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <Input
                        type="number"
                        min={0}
                        max={24}
                        step={0.25}
                        inputMode="decimal"
                        className="h-10 w-20 text-center text-base font-semibold tabular-nums"
                        value={hours > 0 ? String(hours) : ""}
                        placeholder="0"
                        onChange={(e) => setDayHours(row.key, parseHoursInput(e.target.value))}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-10 w-10"
                        onClick={() => nudgeDayHours(row.key, TIMESHEET_HOUR_STEP)}
                        aria-label="Increase hours"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  className="mt-3 flex w-full items-center justify-between text-xs font-medium text-muted-foreground"
                  onClick={() =>
                    setExpandedRowKeys((prev) => {
                      const next = new Set(prev);
                      if (next.has(row.key)) next.delete(row.key);
                      else next.add(row.key);
                      return next;
                    })
                  }
                >
                  <span>{expanded ? "Hide details" : "Category, class, billable"}</span>
                  <ChevronDown
                    className={cn("h-4 w-4 transition-transform", expanded && "rotate-180")}
                  />
                </button>

                {expanded && (
                  <div className="mt-3 space-y-3 border-t pt-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Category</Label>
                      {!metadataEditable ? (
                        <p className="text-sm">{category?.name ?? "—"}</p>
                      ) : (
                        <CategorySearchSelect
                          categories={categories}
                          value={row.allocation_category_id}
                          disabled={!metadataEditable}
                          onValueChange={(v) => {
                            const cat = getCategoryById(v);
                            updateRow(row.key, {
                              allocation_category_id: v,
                              is_billable: cat?.is_billable_default ?? row.is_billable,
                            });
                          }}
                        />
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs">Class</Label>
                      {!metadataEditable ? (
                        <p className="text-sm font-medium">{row.class_code?.trim() || "—"}</p>
                      ) : classSelectOptions.length === 0 ? (
                        <p className="text-xs text-muted-foreground">
                          Add class codes in Settings.
                        </p>
                      ) : (
                        <SearchableSelect
                          options={classSelectOptions}
                          value={row.class_code?.trim() ?? ""}
                          disabled={!metadataEditable}
                          size="sm"
                          placeholder="Select class"
                          searchPlaceholder="Search class codes…"
                          emptyMessage="No class codes found"
                          onValueChange={(v) => updateRow(row.key, { class_code: v })}
                        />
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs">Notes</Label>
                      {!metadataEditable ? (
                        <p className="text-sm text-muted-foreground">{row.notes?.trim() || "—"}</p>
                      ) : (
                        <Input
                          className="h-9 text-sm"
                          placeholder="Optional notes"
                          value={row.notes ?? ""}
                          disabled={!metadataEditable}
                          onChange={(e) => updateRow(row.key, { notes: e.target.value })}
                        />
                      )}
                    </div>

                    <div className="flex items-center justify-between">
                      <Label className="text-xs">Billable</Label>
                      {!metadataEditable ? (
                        <span className="text-sm">{row.is_billable ? "Yes" : "No"}</span>
                      ) : (
                        <Switch
                          checked={row.is_billable}
                          disabled={!metadataEditable}
                          onCheckedChange={(v) => updateRow(row.key, { is_billable: v })}
                          aria-label="Billable"
                        />
                      )}
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {otherDayRows.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Logged on other days
          </p>
          <ul className="space-y-2">
            {otherDayRows.map((row) => {
              const project = row.project_id ? getProjectById(row.project_id) : null;
              const jobLabel = row.is_non_project
                ? row.task_name.trim() || "Non-project time"
                : project
                  ? `${project.client_name} · ${project.project_name}`
                  : "—";
              const daysLabel = hoursOnDaysLabel(row);
              return (
                <li
                  key={row.key}
                  className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-800">{jobLabel}</p>
                    {daysLabel && (
                      <p className="mt-0.5 text-xs font-medium text-slate-600">{daysLabel}</p>
                    )}
                  </div>
                  {canEdit && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="shrink-0"
                      onClick={() => startEditingRow(row.key)}
                    >
                      Add hours
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {!canEdit && (
        <p className="text-xs text-muted-foreground">
          You can view this timesheet but cannot edit time for this team member.
        </p>
      )}

      {canEdit && rows.some((r) => isTimesheetRowLocked(r) && isRowLocked(r)) && (
        <p className="text-xs text-muted-foreground">
          Saved lines are locked. Tap the pencil to edit, then Save.
        </p>
      )}

      {canEdit && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-white/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-white/80 md:hidden">
          <div className="mx-auto flex max-w-lg gap-2">
            <Button type="button" variant="outline" className="flex-1" onClick={addRow}>
              <Plus className="mr-1.5 h-4 w-4" />
              Add line
            </Button>
            <Button
              type="button"
              className="flex-1"
              onClick={handleSave}
              disabled={saving || !hasDraftToSave}
            >
              <Save className="mr-1.5 h-4 w-4" />
              {saving ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
