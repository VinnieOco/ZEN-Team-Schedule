"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useScheduling } from "@/context/scheduling-context";
import { usePermissions } from "@/hooks/use-permissions";
import { getEmployeeFullName } from "@/lib/week";
import type { TimeEntry, TimeEntryFormValues } from "@/types";

const timeEntryFormSchema = z.object({
  employee_id: z.string().min(1, "Employee is required"),
  project_id: z.string().nullable(),
  task_name: z.string(),
  entry_date: z.string().min(1, "Date is required"),
  hours: z.number().min(0.25, "Hours must be greater than 0").max(24, "Max 24 hours per day"),
  allocation_category_id: z.string().min(1, "Category is required"),
  is_billable: z.boolean(),
  phase: z.string().optional(),
  notes: z.string().optional(),
});

interface TimeEntryFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entry?: TimeEntry | null;
  defaultEmployeeId?: string;
  defaultDate?: string;
}

export function TimeEntryFormDialog({
  open,
  onOpenChange,
  entry,
  defaultEmployeeId,
  defaultDate,
}: TimeEntryFormDialogProps) {
  const {
    employees,
    projects,
    categories,
    addTimeEntry,
    updateTimeEntry,
    getCategoryById,
  } = useScheduling();
  const { permissions, linkedEmployeeId } = usePermissions();
  const lockEmployee = !permissions.logTimeForAnyone && linkedEmployeeId != null;

  const employeeOptions = useMemo(
    () =>
      employees
        .filter((e) => e.active)
        .map((e) => ({
          value: e.id,
          label: getEmployeeFullName(e),
          keywords: [e.department, e.email].filter(Boolean).join(" "),
        })),
    [employees],
  );

  const projectOptions = useMemo(
    () =>
      projects
        .filter((p) => p.active)
        .map((p) => ({
          value: p.id,
          label: p.project_name,
          keywords: [p.client_name, p.project_number].filter(Boolean).join(" "),
        })),
    [projects],
  );

  const categoryOptions = useMemo(
    () =>
      categories.map((c) => ({
        value: c.id,
        label: c.name,
        leading: (
          <span
            className="h-2 w-2 shrink-0 rounded-full"
            style={{ backgroundColor: c.color }}
          />
        ),
      })),
    [categories],
  );

  const [useTaskName, setUseTaskName] = useState(false);

  const form = useForm<TimeEntryFormValues>({
    resolver: zodResolver(timeEntryFormSchema),
    defaultValues: {
      employee_id: defaultEmployeeId ?? "",
      project_id: null,
      task_name: "",
      entry_date: defaultDate ?? format(new Date(), "yyyy-MM-dd"),
      hours: 4,
      allocation_category_id: categories[0]?.id ?? "",
      is_billable: true,
      phase: "",
      notes: "",
    },
  });

  useEffect(() => {
    if (!open) return;
    if (entry) {
      setUseTaskName(!entry.project_id);
      form.reset({
        employee_id: entry.employee_id,
        project_id: entry.project_id,
        task_name: entry.task_name ?? "",
        entry_date: entry.entry_date,
        hours: entry.hours,
        allocation_category_id: entry.allocation_category_id,
        is_billable: entry.is_billable,
        phase: entry.phase ?? "",
        notes: entry.notes ?? "",
      });
    } else {
      setUseTaskName(false);
      form.reset({
        employee_id: defaultEmployeeId ?? linkedEmployeeId ?? employees[0]?.id ?? "",
        project_id: null,
        task_name: "",
        entry_date: defaultDate ?? format(new Date(), "yyyy-MM-dd"),
        hours: 4,
        allocation_category_id: categories[0]?.id ?? "",
        is_billable: categories[0]?.is_billable_default ?? true,
        phase: "",
        notes: "",
      });
    }
  }, [open, entry, defaultEmployeeId, defaultDate, employees, categories, linkedEmployeeId, form]);

  const watchCategory = form.watch("allocation_category_id");

  useEffect(() => {
    const cat = getCategoryById(watchCategory);
    if (cat && !entry) {
      form.setValue("is_billable", cat.is_billable_default);
    }
  }, [watchCategory, getCategoryById, form, entry]);

  const onSubmit = form.handleSubmit((values) => {
    if (
      !permissions.logTimeForAnyone &&
      linkedEmployeeId &&
      values.employee_id !== linkedEmployeeId
    ) {
      form.setError("employee_id", { message: "You can only log time for your own schedule profile" });
      return;
    }
    if (useTaskName && !values.task_name.trim()) {
      form.setError("task_name", { message: "Task name is required when no project is selected" });
      return;
    }
    if (!useTaskName && !values.project_id) {
      form.setError("project_id", { message: "Project is required" });
      return;
    }
    const payload: TimeEntryFormValues = {
      ...values,
      project_id: useTaskName ? null : values.project_id,
      task_name: useTaskName ? values.task_name : "",
    };
    if (entry) {
      updateTimeEntry(entry.id, payload);
    } else {
      addTimeEntry(payload);
    }
    onOpenChange(false);
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] flex-col overflow-visible sm:max-w-md">
        <DialogHeader className="shrink-0">
          <DialogTitle>{entry ? "Edit time entry" : "Log time"}</DialogTitle>
          <DialogDescription>
            Record actual hours worked for a team member on a specific day.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="min-h-0 flex-1 space-y-4 overflow-y-auto">
          <div className="space-y-2">
            <Label>Employee</Label>
            <SearchableSelect
              options={employeeOptions}
              value={form.watch("employee_id")}
              onValueChange={(v) => form.setValue("employee_id", v)}
              disabled={lockEmployee}
              placeholder="Select employee"
              searchPlaceholder="Search employees…"
            />
          </div>

          <div className="flex items-center gap-2">
            <Switch checked={useTaskName} onCheckedChange={setUseTaskName} id="time-use-task" />
            <Label htmlFor="time-use-task">Use task name instead of project</Label>
          </div>

          {useTaskName ? (
            <div className="space-y-2">
              <Label>Task name</Label>
              <Input {...form.register("task_name")} placeholder="PTO, Admin, etc." />
              {form.formState.errors.task_name && (
                <p className="text-xs text-red-600">{form.formState.errors.task_name.message}</p>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <Label>Project</Label>
              <SearchableSelect
                options={projectOptions}
                value={form.watch("project_id") ?? ""}
                onValueChange={(v) => form.setValue("project_id", v)}
                placeholder="Select project"
                searchPlaceholder="Search projects…"
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Date</Label>
              <Input type="date" {...form.register("entry_date")} />
            </div>
            <div className="space-y-2">
              <Label>Hours</Label>
              <Input
                type="number"
                step="0.25"
                min="0.25"
                max="24"
                {...form.register("hours", { valueAsNumber: true })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Category</Label>
            <SearchableSelect
              options={categoryOptions}
              value={form.watch("allocation_category_id")}
              onValueChange={(v) => form.setValue("allocation_category_id", v)}
              placeholder="Select category"
              searchPlaceholder="Search categories…"
            />
          </div>

          <div className="flex items-center justify-between rounded-md border p-3">
            <Label>Billable</Label>
            <Switch
              checked={form.watch("is_billable")}
              onCheckedChange={(v) => form.setValue("is_billable", v)}
            />
          </div>

          <div className="space-y-2">
            <Label>Phase (optional)</Label>
            <Input {...form.register("phase")} placeholder="e.g. Design Development" />
          </div>

          <div className="space-y-2">
            <Label>Notes (optional)</Label>
            <Textarea {...form.register("notes")} rows={2} />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">{entry ? "Save changes" : "Log time"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
