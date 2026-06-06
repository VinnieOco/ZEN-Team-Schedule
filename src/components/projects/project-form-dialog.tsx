"use client";

import { useEffect, useMemo, useRef } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchableCombobox } from "@/components/ui/searchable-combobox";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useScheduling } from "@/context/scheduling-context";
import { isChangeOrder } from "@/lib/change-orders";
import { UNASSIGNED_DEPARTMENT } from "@/lib/departments";
import { getDepartmentOptions } from "@/lib/team-options";
import { PROJECT_PHASES } from "@/lib/project-options";
import {
  clientComboboxOptions,
  getClientContact,
  normalizeClientName,
} from "@/lib/clients";
import { getProjectDesignAmount, getProjectEstimateValue } from "@/lib/project-format";
import { getEmployeeFullName } from "@/lib/week";
import type { Project, ProjectFormValues } from "@/types";

interface ProjectFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project?: Project | null;
  /** Preset values when creating a new project (ignored when editing). */
  defaults?: Partial<ProjectFormValues>;
}

const NO_DEPARTMENT = "__none__";

export function ProjectFormDialog({ open, onOpenChange, project, defaults }: ProjectFormDialogProps) {
  const { employees, settings, projects, clients, addProject, updateProject } = useScheduling();
  const lastPrefilledClientKey = useRef<string | null>(null);
  const departmentOptions = [
    ...new Set([
      ...getDepartmentOptions(settings, employees).filter((d) => d !== UNASSIGNED_DEPARTMENT),
      ...projects.map((p) => p.department?.trim()).filter(Boolean) as string[],
    ]),
  ].sort((a, b) => a.localeCompare(b));

  const departmentSelectOptions = useMemo(
    () => [
      { value: NO_DEPARTMENT, label: "None" },
      ...departmentOptions.map((dept) => ({ value: dept, label: dept })),
    ],
    [departmentOptions],
  );

  const phaseSelectOptions = useMemo(
    () => PROJECT_PHASES.map((phase) => ({ value: phase, label: phase })),
    [],
  );

  const leadSelectOptions = useMemo(
    () =>
      employees.map((e) => ({
        value: e.id,
        label: getEmployeeFullName(e),
        keywords: [e.email, e.department].filter(Boolean).join(" "),
      })),
    [employees],
  );

  const form = useForm<ProjectFormValues>({
    defaultValues: {
      project_name: "",
      client_name: "",
      phase: "Concept",
      budgeted_design_hours: 80,
    },
  });

  const isCreatingChangeOrder = !project && Boolean(defaults?.is_change_order);
  const lockClientFields = Boolean(project && isChangeOrder(project)) || isCreatingChangeOrder;

  const clientName = useWatch({ control: form.control, name: "client_name" });

  const clientOptions = useMemo(
    () => clientComboboxOptions(projects, clients),
    [projects, clients],
  );

  useEffect(() => {
    if (!open) return;
    lastPrefilledClientKey.current = null;
    if (project) {
      form.reset({
        project_name: project.project_name,
        client_name: project.client_name,
        department: project.department,
        phase: project.phase,
        lead_employee_id: project.lead_employee_id,
        budgeted_design_hours: project.budgeted_design_hours,
        contract_date: project.contract_date,
        target_completion_date: project.target_completion_date,
        design_amount: getProjectDesignAmount(project),
        estimate_value: getProjectEstimateValue(project),
        scope_of_work: project.scope_of_work,
        address: project.address,
        phone: project.phone,
        email: project.email,
        active: project.active,
        parent_project_id: project.parent_project_id,
        is_change_order: project.is_change_order,
      });
    } else {
      form.reset({
        project_name: defaults?.project_name ?? "",
        client_name: defaults?.client_name ?? "",
        phase: defaults?.phase ?? "Concept",
        department: defaults?.department,
        lead_employee_id: defaults?.lead_employee_id,
        budgeted_design_hours: defaults?.budgeted_design_hours ?? 80,
        contract_date: defaults?.contract_date,
        target_completion_date: defaults?.target_completion_date,
        design_amount: defaults?.design_amount,
        estimate_value: defaults?.estimate_value,
        scope_of_work: defaults?.scope_of_work ?? "",
        address: defaults?.address ?? "",
        phone: defaults?.phone ?? "",
        email: defaults?.email ?? "",
        active: defaults?.active ?? true,
        parent_project_id: defaults?.parent_project_id,
        is_change_order: defaults?.is_change_order,
      });
    }
  }, [open, project, form, defaults]);

  useEffect(() => {
    if (!open || project || lockClientFields) return;

    const key = normalizeClientName(clientName ?? "");
    if (!key) {
      lastPrefilledClientKey.current = null;
      return;
    }
    if (key === lastPrefilledClientKey.current) return;

    const contact = getClientContact(projects, clients, clientName ?? "");
    if (!contact) {
      lastPrefilledClientKey.current = null;
      return;
    }

    lastPrefilledClientKey.current = key;
    if (contact.address) form.setValue("address", contact.address);
    if (contact.phone) form.setValue("phone", contact.phone);
    if (contact.email) form.setValue("email", contact.email);
  }, [open, project, clientName, projects, clients, form, lockClientFields]);

  const dialogTitle = project
    ? "Edit Project"
    : isCreatingChangeOrder
      ? "Add change order"
      : "Add Project";
  const submitLabel = project ? "Save" : isCreatingChangeOrder ? "Add change order" : "Add project";

  const onSubmit = form.handleSubmit((values) => {
    if (project) {
      updateProject(project.id, values);
    } else {
      addProject(values);
    }
    onOpenChange(false);
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] flex-col overflow-visible sm:max-w-lg">
        <DialogHeader className="shrink-0">
          <DialogTitle>{dialogTitle}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="min-h-0 flex-1 space-y-4 overflow-y-auto">
          {lockClientFields && (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              Client details are inherited from the parent project and cannot be changed here.
            </p>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-2">
              <Label>Project name</Label>
              <Input {...form.register("project_name", { required: true })} />
            </div>
            <div className="col-span-2 space-y-2">
              <Label>Client name</Label>
              {lockClientFields ? (
                <Input value={form.watch("client_name") ?? ""} readOnly disabled />
              ) : (
                <Controller
                  name="client_name"
                  control={form.control}
                  rules={{ required: true }}
                  render={({ field }) => (
                    <SearchableCombobox
                      options={clientOptions}
                      value={field.value ?? ""}
                      onValueChange={field.onChange}
                      placeholder="Search or type client name…"
                      searchPlaceholder="Search clients…"
                      emptyMessage="No matching clients"
                      customOptionLabel={(query) => `Add new client "${query}"`}
                      required
                    />
                  )}
                />
              )}
              {!project && !lockClientFields && (
                <p className="text-xs text-muted-foreground">
                  Search existing clients or choose Add new client in the list. Contact details fill
                  in automatically for known clients.
                </p>
              )}
            </div>
            <div className="col-span-2 space-y-2">
              <Label>Address</Label>
              <Textarea
                {...form.register("address")}
                rows={2}
                placeholder="Street, city, state, ZIP"
                readOnly={lockClientFields}
                disabled={lockClientFields}
              />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input
                type="tel"
                {...form.register("phone")}
                placeholder="(555) 555-5555"
                readOnly={lockClientFields}
                disabled={lockClientFields}
              />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                {...form.register("email")}
                placeholder="client@example.com"
                readOnly={lockClientFields}
                disabled={lockClientFields}
              />
            </div>
            <div className="space-y-2">
              <Label>Department</Label>
              <SearchableSelect
                options={departmentSelectOptions}
                value={form.watch("department")?.trim() || NO_DEPARTMENT}
                onValueChange={(v) =>
                  form.setValue("department", v === NO_DEPARTMENT ? undefined : v)
                }
                placeholder="Select department"
                searchPlaceholder="Search departments…"
              />
            </div>
            <div className="space-y-2">
              <Label>Phase</Label>
              <SearchableSelect
                options={phaseSelectOptions}
                value={form.watch("phase")}
                onValueChange={(v) => form.setValue("phase", v)}
                placeholder="Select phase"
                searchPlaceholder="Search phases…"
              />
            </div>
            <div className="space-y-2">
              <Label>Lead designer</Label>
              <SearchableSelect
                options={leadSelectOptions}
                value={form.watch("lead_employee_id") ?? ""}
                onValueChange={(v) => form.setValue("lead_employee_id", v)}
                placeholder="Select"
                searchPlaceholder="Search team members…"
              />
            </div>
            <div className="space-y-2">
              <Label>Design amount</Label>
              <Input
                type="number"
                min={0}
                step="0.01"
                placeholder="0"
                {...form.register("design_amount", { valueAsNumber: true })}
              />
            </div>
            <div className="space-y-2">
              <Label>Estimate amount</Label>
              <Input
                type="number"
                min={0}
                step="0.01"
                placeholder="0"
                {...form.register("estimate_value", { valueAsNumber: true })}
              />
            </div>
            <div className="space-y-2">
              <Label>Budgeted hours</Label>
              <Input type="number" {...form.register("budgeted_design_hours", { valueAsNumber: true })} />
            </div>
            <div className="space-y-2">
              <Label>Contract date</Label>
              <Input type="date" {...form.register("contract_date")} />
            </div>
            <div className="space-y-2">
              <Label>Target completion</Label>
              <Input type="date" {...form.register("target_completion_date")} />
            </div>
            <div className="col-span-2 space-y-2">
              <Label>Scope of work</Label>
              <Textarea
                {...form.register("scope_of_work")}
                rows={4}
                placeholder="Describe the project scope, deliverables, and key responsibilities…"
              />
            </div>
          </div>
          {project && (
            <div className="flex items-center justify-between gap-4 rounded-lg border bg-slate-50 px-4 py-3">
              <div className="space-y-0.5">
                <Label htmlFor="project-active" className="text-sm font-medium">
                  Active project
                </Label>
                <p className="text-xs text-muted-foreground">
                  Inactive projects are hidden unless you turn on “Show inactive projects”.
                </p>
              </div>
              <Switch
                id="project-active"
                checked={form.watch("active") ?? true}
                onCheckedChange={(checked) => form.setValue("active", checked)}
              />
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit">{submitLabel}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
