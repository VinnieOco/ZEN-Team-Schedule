"use client";

import { useEffect, useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useScheduling } from "@/context/scheduling-context";
import { validateAllocationHours } from "@/lib/utilization";
import { getEmployeeFullName } from "@/lib/week";
import type { Allocation, AllocationFormValues } from "@/types";

const allocationFormSchema = z.object({
  employee_id: z.string().min(1, "Employee is required"),
  project_id: z.string().nullable(),
  task_name: z.string(),
  allocation_date: z.string().min(1, "Date is required"),
  hours: z.number().min(0.25, "Hours must be greater than 0").max(24, "Max 24 hours per day"),
  allocation_category_id: z.string().min(1, "Category is required"),
  is_billable: z.boolean(),
  phase: z.string().optional(),
  notes: z.string().optional(),
});

interface AllocationFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  allocation?: Allocation | null;
  defaultEmployeeId?: string;
  defaultDate?: string;
}

export function AllocationFormDialog({
  open,
  onOpenChange,
  allocation,
  defaultEmployeeId,
  defaultDate,
}: AllocationFormDialogProps) {
  const {
    employees,
    projects,
    categories,
    allocations,
    settings,
    selectedWeekStart,
    addAllocation,
    updateAllocation,
    getCategoryById,
  } = useScheduling();

  const [warnings, setWarnings] = useState<string[]>([]);
  const [useTaskName, setUseTaskName] = useState(false);

  const form = useForm<AllocationFormValues>({
    resolver: zodResolver(allocationFormSchema),
    defaultValues: {
      employee_id: defaultEmployeeId ?? "",
      project_id: null,
      task_name: "",
      allocation_date: defaultDate ?? format(new Date(), "yyyy-MM-dd"),
      hours: 4,
      allocation_category_id: categories[0]?.id ?? "",
      is_billable: true,
      phase: "",
      notes: "",
    },
  });

  useEffect(() => {
    if (!open) return;
    if (allocation) {
      setUseTaskName(!allocation.project_id);
      form.reset({
        employee_id: allocation.employee_id,
        project_id: allocation.project_id,
        task_name: allocation.task_name ?? "",
        allocation_date: allocation.allocation_date,
        hours: allocation.hours,
        allocation_category_id: allocation.allocation_category_id,
        is_billable: allocation.is_billable,
        phase: allocation.phase ?? "",
        notes: allocation.notes ?? "",
      });
    } else {
      setUseTaskName(false);
      form.reset({
        employee_id: defaultEmployeeId ?? employees[0]?.id ?? "",
        project_id: null,
        task_name: "",
        allocation_date: defaultDate ?? format(new Date(), "yyyy-MM-dd"),
        hours: 4,
        allocation_category_id: categories[0]?.id ?? "",
        is_billable: categories[0]?.is_billable_default ?? true,
        phase: "",
        notes: "",
      });
    }
  }, [open, allocation, defaultEmployeeId, defaultDate, employees, categories, form]);

  const watchCategory = form.watch("allocation_category_id");
  const watchEmployee = form.watch("employee_id");
  const watchHours = form.watch("hours");
  const watchDate = form.watch("allocation_date");

  useEffect(() => {
    const cat = getCategoryById(watchCategory);
    if (cat && !allocation) {
      form.setValue("is_billable", cat.is_billable_default);
    }
  }, [watchCategory, getCategoryById, form, allocation]);

  useEffect(() => {
    const employee = employees.find((e) => e.id === watchEmployee);
    if (!employee) {
      setWarnings([]);
      return;
    }
    const result = validateAllocationHours(
      Number(watchHours) || 0,
      employee,
      allocations,
      watchDate,
      selectedWeekStart,
      settings,
      allocation?.id,
    );
    setWarnings(result.warnings);
  }, [watchEmployee, watchHours, watchDate, employees, allocations, selectedWeekStart, settings, allocation]);

  const onSubmit = form.handleSubmit((values) => {
    if (useTaskName && !values.task_name.trim()) {
      form.setError("task_name", { message: "Task name is required when no project is selected" });
      return;
    }
    if (!useTaskName && !values.project_id) {
      form.setError("project_id", { message: "Project is required" });
      return;
    }
    const payload: AllocationFormValues = {
      ...values,
      project_id: useTaskName ? null : values.project_id,
      task_name: useTaskName ? values.task_name : "",
    };
    if (allocation) {
      updateAllocation(allocation.id, payload);
    } else {
      addAllocation(payload);
    }
    onOpenChange(false);
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{allocation ? "Edit Allocation" : "Add Allocation"}</DialogTitle>
          <DialogDescription>
            Assign project work to a team member for a specific day.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Employee</Label>
            <Select value={form.watch("employee_id")} onValueChange={(v) => form.setValue("employee_id", v)}>
              <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
              <SelectContent>
                {employees.filter((e) => e.active).map((e) => (
                  <SelectItem key={e.id} value={e.id}>{getEmployeeFullName(e)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <Switch checked={useTaskName} onCheckedChange={setUseTaskName} id="use-task" />
            <Label htmlFor="use-task">Use task name instead of project</Label>
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
              <Select
                value={form.watch("project_id") ?? ""}
                onValueChange={(v) => form.setValue("project_id", v)}
              >
                <SelectTrigger><SelectValue placeholder="Select project" /></SelectTrigger>
                <SelectContent>
                  {projects.filter((p) => p.active).map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.project_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Date</Label>
              <Input type="date" {...form.register("allocation_date")} />
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
            <Select
              value={form.watch("allocation_category_id")}
              onValueChange={(v) => form.setValue("allocation_category_id", v)}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
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

          {warnings.length > 0 && (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              {warnings.map((w) => (
                <p key={w}>{w}</p>
              ))}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">{allocation ? "Save changes" : "Add allocation"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
