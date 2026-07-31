"use client";

import { useEffect, useMemo, useState } from "react";

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
import { SearchableCombobox } from "@/components/ui/searchable-combobox";
import { SearchableSelect } from "@/components/ui/searchable-select";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useScheduling } from "@/context/scheduling-context";
import { clientComboboxOptions } from "@/lib/clients";
import { ESTIMATE_STAGES, ESTIMATE_TYPES } from "@/lib/estimating/metrics";
import { getEmployeeFullName } from "@/lib/week";
import type {
  Estimate,
  EstimateFormValues,
  EstimateStage,
  EstimateType,
} from "@/types";

const UNASSIGNED = "__unassigned__";
const NO_PROJECT = "__none__";

interface EstimateFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  estimate?: Estimate | null;
}

function emptyValues(): EstimateFormValues {
  return {
    client_name: "",
    project_id: "",
    title: "",
    estimate_type: "budget",
    estimator_id: "",
    received_date: "",
    due_date: "",
    submitted_date: "",
    amount: undefined,
    stage: "backlog",
    notes: "",
  };
}

function fromEstimate(estimate: Estimate): EstimateFormValues {
  return {
    client_name: estimate.client_name,
    project_id: estimate.project_id ?? "",
    title: estimate.title ?? "",
    estimate_type: estimate.estimate_type,
    estimator_id: estimate.estimator_id ?? "",
    received_date: estimate.received_date ?? "",
    due_date: estimate.due_date ?? "",
    submitted_date: estimate.submitted_date ?? "",
    amount: estimate.amount,
    stage: estimate.stage,
    notes: estimate.notes ?? "",
  };
}

export function EstimateFormDialog({
  open,
  onOpenChange,
  estimate,
}: EstimateFormDialogProps) {
  const { employees, projects, clients, addEstimate, updateEstimate } = useScheduling();
  const [values, setValues] = useState<EstimateFormValues>(emptyValues);
  const [error, setError] = useState<string | null>(null);

  const isEdit = Boolean(estimate);

  useEffect(() => {
    if (!open) return;
    setValues(estimate ? fromEstimate(estimate) : emptyValues());
    setError(null);
  }, [open, estimate]);

  const estimatorOptions = useMemo(
    () =>
      employees
        .filter((e) => e.active)
        .sort((a, b) => getEmployeeFullName(a).localeCompare(getEmployeeFullName(b))),
    [employees],
  );

  const clientOptions = useMemo(
    () => clientComboboxOptions(projects, clients),
    [projects, clients],
  );

  const projectOptions = useMemo(
    () => [
      { value: NO_PROJECT, label: "No linked project" },
      ...projects
        .filter((p) => p.active)
        .sort((a, b) => a.project_name.localeCompare(b.project_name))
        .map((p) => ({
          value: p.id,
          label: p.project_name,
          keywords: [p.client_name, p.project_number].filter(Boolean).join(" "),
        })),
    ],
    [projects],
  );

  const patch = <K extends keyof EstimateFormValues>(
    key: K,
    value: EstimateFormValues[K],
  ) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleProjectChange = (projectId: string) => {
    if (projectId === NO_PROJECT) {
      patch("project_id", "");
      return;
    }
    const project = projects.find((p) => p.id === projectId);
    setValues((prev) => ({
      ...prev,
      project_id: projectId,
      client_name: prev.client_name.trim() || (project?.client_name ?? ""),
      title: prev.title?.trim() || (project?.project_name ?? ""),
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!values.client_name.trim()) {
      setError("Client name is required.");
      return;
    }
    const payload: EstimateFormValues = {
      ...values,
      client_name: values.client_name.trim(),
      title: values.title?.trim() || undefined,
      project_id: values.project_id || undefined,
      estimator_id: values.estimator_id || undefined,
      received_date: values.received_date || undefined,
      due_date: values.due_date || undefined,
      submitted_date: values.submitted_date || undefined,
      notes: values.notes?.trim() || undefined,
    };
    if (estimate) updateEstimate(estimate.id, payload);
    else addEstimate(payload);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit estimate" : "New estimate"}</DialogTitle>
          <DialogDescription>
            Track an estimate package through pricing, submittal, and follow-up.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="estimate-client">Client</Label>
            <SearchableCombobox
              id="estimate-client"
              options={clientOptions}
              value={values.client_name}
              onValueChange={(value) => patch("client_name", value)}
              placeholder="Search or type client name…"
              searchPlaceholder="Search clients…"
              emptyMessage="No matching clients"
              customOptionLabel={(query) => `Add new client "${query}"`}
              required
            />
            <p className="text-xs text-muted-foreground">
              Search existing CRM clients or choose Add new client in the list.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="estimate-title">Package name</Label>
            <Input
              id="estimate-title"
              value={values.title ?? ""}
              onChange={(e) => patch("title", e.target.value)}
              placeholder="Optional — defaults to client name"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="estimate-project">Linked project</Label>
            <SearchableSelect
              id="estimate-project"
              options={projectOptions}
              value={values.project_id || NO_PROJECT}
              onValueChange={handleProjectChange}
              placeholder="No linked project"
              searchPlaceholder="Search projects…"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select
                value={values.estimate_type}
                onValueChange={(v) => patch("estimate_type", v as EstimateType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ESTIMATE_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Stage</Label>
              <Select
                value={values.stage}
                onValueChange={(v) => patch("stage", v as EstimateStage)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ESTIMATE_STAGES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Estimator</Label>
              <Select
                value={values.estimator_id || UNASSIGNED}
                onValueChange={(v) => patch("estimator_id", v === UNASSIGNED ? "" : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Unassigned" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={UNASSIGNED}>Unassigned</SelectItem>
                  {estimatorOptions.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {getEmployeeFullName(e)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="estimate-amount">Amount</Label>
              <Input
                id="estimate-amount"
                type="number"
                min={0}
                step="0.01"
                value={values.amount ?? ""}
                onChange={(e) =>
                  patch("amount", e.target.value === "" ? undefined : Number(e.target.value))
                }
              />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="estimate-received">Received</Label>
              <Input
                id="estimate-received"
                type="date"
                value={values.received_date ?? ""}
                onChange={(e) => patch("received_date", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="estimate-due">Due</Label>
              <Input
                id="estimate-due"
                type="date"
                value={values.due_date ?? ""}
                onChange={(e) => patch("due_date", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="estimate-submitted">Submitted</Label>
              <Input
                id="estimate-submitted"
                type="date"
                value={values.submitted_date ?? ""}
                onChange={(e) => patch("submitted_date", e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="estimate-notes">Notes</Label>
            <Textarea
              id="estimate-notes"
              value={values.notes ?? ""}
              onChange={(e) => patch("notes", e.target.value)}
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">{isEdit ? "Save" : "Add estimate"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
