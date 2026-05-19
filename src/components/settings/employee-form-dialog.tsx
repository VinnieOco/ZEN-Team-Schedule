"use client";

import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";

import { CreatableOptionField } from "@/components/settings/creatable-option-field";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useScheduling } from "@/context/scheduling-context";
import {
  appendDepartment,
  appendJobRole,
  getDepartmentOptions,
  getJobRoleOptions,
} from "@/lib/team-options";
import type { CompanySettings, Employee, EmployeeFormValues } from "@/types";
import { DEFAULT_DEPARTMENTS, DEFAULT_JOB_ROLES } from "@/types";

interface EmployeeFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee?: Employee | null;
}

function buildAddDefaults(
  settings: CompanySettings,
  jobRoleOptions: string[],
  departmentOptions: string[],
): EmployeeFormValues {
  return {
    first_name: "",
    last_name: "",
    role: jobRoleOptions[0] ?? DEFAULT_JOB_ROLES[3] ?? "Junior Landscape Designer",
    email: "",
    department: departmentOptions[0] ?? DEFAULT_DEPARTMENTS[0] ?? "Design",
    daily_capacity_hours: settings.default_daily_capacity,
    weekly_capacity_hours: settings.default_weekly_capacity,
    active: true,
  };
}

function employeeToFormValues(employee: Employee): EmployeeFormValues {
  return {
    first_name: employee.first_name,
    last_name: employee.last_name,
    role: employee.role,
    email: employee.email ?? "",
    department: employee.department ?? "",
    daily_capacity_hours: employee.daily_capacity_hours,
    weekly_capacity_hours: employee.weekly_capacity_hours,
    active: employee.active,
  };
}

export function EmployeeFormDialog({ open, onOpenChange, employee }: EmployeeFormDialogProps) {
  const { employees, settings, addEmployee, updateEmployeeFromForm, updateSettings } =
    useScheduling();

  const jobRoleOptions = useMemo(
    () => getJobRoleOptions(settings, employees),
    [settings, employees],
  );
  const departmentOptions = useMemo(
    () => getDepartmentOptions(settings, employees),
    [settings, employees],
  );

  const form = useForm<EmployeeFormValues>({
    defaultValues: employee
      ? employeeToFormValues(employee)
      : buildAddDefaults(settings, jobRoleOptions, departmentOptions),
  });

  useEffect(() => {
    if (!open) return;
    if (employee) {
      form.reset(employeeToFormValues(employee));
      return;
    }
    form.reset(buildAddDefaults(settings, jobRoleOptions, departmentOptions));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset when dialog opens or member changes
  }, [open, employee?.id]);

  const addJobRoleOption = (role: string) => {
    const next = appendJobRole(settings, role);
    if (next) updateSettings({ job_roles: next });
  };

  const addDepartmentOption = (department: string) => {
    const next = appendDepartment(settings, department);
    if (next) updateSettings({ departments: next });
  };

  const onSubmit = form.handleSubmit((values) => {
    if (employee) {
      updateEmployeeFromForm(employee.id, values);
    } else {
      addEmployee(values);
    }
    onOpenChange(false);
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] flex-col overflow-visible sm:max-w-lg">
        <DialogHeader className="shrink-0">
          <DialogTitle>{employee ? "Edit team member" : "Add team member"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="min-h-0 flex-1 space-y-4 overflow-y-auto">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="first_name">First name</Label>
              <Input id="first_name" required {...form.register("first_name")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="last_name">Last name</Label>
              <Input id="last_name" required {...form.register("last_name")} />
            </div>
          </div>
          <CreatableOptionField
            label="Job role"
            value={form.watch("role")}
            options={jobRoleOptions}
            onChange={(v) => form.setValue("role", v)}
            onAddOption={addJobRoleOption}
            addPrompt="Add new job role…"
            placeholder="Select job role"
          />
          <div className="space-y-2">
            <Label htmlFor="email">Email (optional)</Label>
            <Input id="email" type="email" {...form.register("email")} />
            <p className="text-xs text-muted-foreground">
              Use the same email as their app login to link schedule and account automatically.
            </p>
          </div>
          <CreatableOptionField
            label="Department"
            value={form.watch("department") ?? ""}
            options={departmentOptions}
            onChange={(v) => form.setValue("department", v)}
            onAddOption={addDepartmentOption}
            addPrompt="Add new department…"
            placeholder="Select department"
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="daily_capacity_hours">Daily capacity (hrs)</Label>
              <Input
                id="daily_capacity_hours"
                type="number"
                min={1}
                max={24}
                required
                {...form.register("daily_capacity_hours", { valueAsNumber: true })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="weekly_capacity_hours">Weekly capacity (hrs)</Label>
              <Input
                id="weekly_capacity_hours"
                type="number"
                min={1}
                max={80}
                required
                {...form.register("weekly_capacity_hours", { valueAsNumber: true })}
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Switch
              id="active"
              checked={form.watch("active")}
              onCheckedChange={(v) => form.setValue("active", v)}
            />
            <Label htmlFor="active">Active on schedule</Label>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">{employee ? "Save changes" : "Add member"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
