"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
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
import { Textarea } from "@/components/ui/textarea";
import { useScheduling } from "@/context/scheduling-context";
import { getEmployeeFullName } from "@/lib/week";
import type { Project, ProjectFormValues, ProjectPhase, ProjectStatus } from "@/types";

const statuses: ProjectStatus[] = [
  "Lead", "Proposal", "Active Design", "Estimating", "Client Review",
  "Construction Documents", "Permit / Approvals", "Construction Support",
  "On Hold", "Completed", "Lost / Cancelled",
];

const phases: ProjectPhase[] = [
  "Concept", "Schematic Design", "Design Development", "Construction Documents",
  "Estimating", "Revisions", "Construction Support", "Closeout",
];

interface ProjectFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project?: Project | null;
}

export function ProjectFormDialog({ open, onOpenChange, project }: ProjectFormDialogProps) {
  const { employees, addProject, updateProject } = useScheduling();
  const form = useForm<ProjectFormValues>({
    defaultValues: {
      project_name: "",
      client_name: "",
      status: "Active Design",
      phase: "Concept",
      budgeted_design_hours: 80,
    },
  });

  useEffect(() => {
    if (!open) return;
    if (project) {
      form.reset({
        project_name: project.project_name,
        client_name: project.client_name,
        status: project.status,
        phase: project.phase,
        lead_employee_id: project.lead_employee_id,
        budgeted_design_hours: project.budgeted_design_hours,
        target_completion_date: project.target_completion_date,
        project_number: project.project_number,
        notes: project.notes,
      });
    } else {
      form.reset({
        project_name: "",
        client_name: "",
        status: "Active Design",
        phase: "Concept",
        budgeted_design_hours: 80,
      });
    }
  }, [open, project, form]);

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
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{project ? "Edit Project" : "Add Project"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-2">
              <Label>Project name</Label>
              <Input {...form.register("project_name", { required: true })} />
            </div>
            <div className="col-span-2 space-y-2">
              <Label>Client name</Label>
              <Input {...form.register("client_name", { required: true })} />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={form.watch("status")} onValueChange={(v) => form.setValue("status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {statuses.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Phase</Label>
              <Select value={form.watch("phase")} onValueChange={(v) => form.setValue("phase", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {phases.map((p) => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Lead designer</Label>
              <Select
                value={form.watch("lead_employee_id") ?? ""}
                onValueChange={(v) => form.setValue("lead_employee_id", v)}
              >
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {employees.map((e) => (
                    <SelectItem key={e.id} value={e.id}>{getEmployeeFullName(e)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Budgeted hours</Label>
              <Input type="number" {...form.register("budgeted_design_hours", { valueAsNumber: true })} />
            </div>
            <div className="col-span-2 space-y-2">
              <Label>Target date</Label>
              <Input type="date" {...form.register("target_completion_date")} />
            </div>
            <div className="col-span-2 space-y-2">
              <Label>Notes</Label>
              <Textarea {...form.register("notes")} rows={2} />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit">{project ? "Save" : "Add project"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
