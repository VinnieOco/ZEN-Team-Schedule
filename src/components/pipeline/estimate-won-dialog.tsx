"use client";

import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { useRouter } from "next/navigation";

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
import { useScheduling } from "@/context/scheduling-context";
import { normalizeClientName } from "@/lib/clients";
import { estimateDisplayName } from "@/lib/estimating/metrics";
import { formatProjectAmount, getProjectEstimateValue } from "@/lib/project-format";
import { buildGroupedProjectSelectOptions } from "@/lib/project-picker-options";
import { cn } from "@/lib/utils";
import type { Estimate } from "@/types";

type WonMode = "existing" | "new";

interface EstimateWonDialogProps {
  estimate: Estimate | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called after a successful apply (project is linked/created). */
  onApplied?: (projectId: string) => void;
}

export function EstimateWonDialog({
  estimate,
  open,
  onOpenChange,
  onApplied,
}: EstimateWonDialogProps) {
  const router = useRouter();
  const { projects, applyWonEstimateToProject } = useScheduling();
  const [mode, setMode] = useState<WonMode>("new");
  const [projectId, setProjectId] = useState("");
  const [wonDate, setWonDate] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !estimate) return;
    setError(null);
    setWonDate(estimate.won_date || format(new Date(), "yyyy-MM-dd"));
    if (estimate.project_id && projects.some((p) => p.id === estimate.project_id)) {
      setMode("existing");
      setProjectId(estimate.project_id);
    } else {
      setMode("new");
      setProjectId("");
    }
  }, [open, estimate, projects]);

  const projectOptions = useMemo(() => {
    const active = projects
      .filter((p) => p.active)
      .sort((a, b) => a.project_name.localeCompare(b.project_name));

    if (!estimate) {
      return buildGroupedProjectSelectOptions(active, {
        formatParentLabel: (project) => project.project_name,
      });
    }

    const clientKey = normalizeClientName(estimate.client_name);
    const matching = active.filter((p) => normalizeClientName(p.client_name) === clientKey);
    const others = active.filter((p) => normalizeClientName(p.client_name) !== clientKey);
    const ordered = matching.length > 0 ? [...matching, ...others] : active;

    return buildGroupedProjectSelectOptions(ordered, {
      formatParentLabel: (project) => project.project_name,
    });
  }, [projects, estimate]);

  const selectedProject = projectId ? projects.find((p) => p.id === projectId) : undefined;
  const selectedEstimateValue = selectedProject
    ? getProjectEstimateValue(selectedProject)
    : undefined;
  const wonAmount = estimate?.amount;

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setError(null);
      setProjectId("");
    }
    onOpenChange(next);
  };

  const handleConfirm = () => {
    if (!estimate) return;
    if (!wonDate.trim()) {
      setError("Enter the date this estimate was won.");
      return;
    }
    if (mode === "existing" && !projectId) {
      setError("Select a project to add this won estimate to.");
      return;
    }

    const project = applyWonEstimateToProject(
      estimate.id,
      mode === "existing" ? { mode: "existing", projectId } : { mode: "new" },
      wonDate,
    );
    if (!project) {
      setError("Could not update the project. Try again.");
      return;
    }

    handleOpenChange(false);
    onApplied?.(project.id);
    router.push(`/projects/${project.id}`);
  };

  if (!estimate) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="flex max-h-[90vh] flex-col overflow-visible sm:max-w-md">
        <DialogHeader className="shrink-0">
          <DialogTitle>Estimate won</DialogTitle>
          <DialogDescription>
            Link <span className="font-medium text-slate-800">{estimateDisplayName(estimate)}</span>{" "}
            to a project and update the project&apos;s estimate amount
            {wonAmount != null ? ` (${formatProjectAmount(wonAmount)})` : ""}.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto">
          <div className="space-y-1.5">
            <Label htmlFor="estimate-won-date">Date won</Label>
            <Input
              id="estimate-won-date"
              type="date"
              value={wonDate}
              onChange={(e) => {
                setWonDate(e.target.value);
                setError(null);
              }}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                setMode("new");
                setError(null);
              }}
              className={cn(
                "rounded-md border px-3 py-2.5 text-left text-sm transition-colors",
                mode === "new"
                  ? "border-emerald-600 bg-emerald-50 text-emerald-900"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
              )}
            >
              <span className="font-medium">Create new project</span>
              <span className="mt-0.5 block text-xs text-muted-foreground">
                Start a job from this package
              </span>
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("existing");
                setError(null);
              }}
              className={cn(
                "rounded-md border px-3 py-2.5 text-left text-sm transition-colors",
                mode === "existing"
                  ? "border-emerald-600 bg-emerald-50 text-emerald-900"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
              )}
            >
              <span className="font-medium">Add to existing</span>
              <span className="mt-0.5 block text-xs text-muted-foreground">
                Update a project already in CRM
              </span>
            </button>
          </div>

          {mode === "existing" ? (
            <div className="space-y-1.5">
              <Label>Project</Label>
              <SearchableSelect
                options={projectOptions}
                value={projectId}
                onValueChange={(value) => {
                  setProjectId(value);
                  setError(null);
                }}
                placeholder="Search projects…"
                searchPlaceholder="Search by name or client…"
              />
              {selectedProject &&
              wonAmount != null &&
              selectedEstimateValue != null &&
              selectedEstimateValue !== wonAmount ? (
                <p className="text-xs text-amber-800">
                  This will change the project estimate amount from{" "}
                  {formatProjectAmount(selectedEstimateValue)} to{" "}
                  {formatProjectAmount(wonAmount)}.
                </p>
              ) : selectedProject && wonAmount != null ? (
                <p className="text-xs text-muted-foreground">
                  The project estimate amount will be set to {formatProjectAmount(wonAmount)}.
                </p>
              ) : null}
            </div>
          ) : (
            <p className="rounded-md border border-dashed border-slate-200 bg-slate-50 px-3 py-3 text-sm text-muted-foreground">
              Creates <span className="font-medium text-slate-800">{estimateDisplayName(estimate)}</span>{" "}
              for {estimate.client_name}
              {wonAmount != null
                ? ` with estimate amount ${formatProjectAmount(wonAmount)}`
                : ""}
              .
            </p>
          )}

          {error ? <p className="text-sm text-red-600">{error}</p> : null}
        </div>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={handleConfirm}>
            {mode === "new" ? "Create project" : "Update project"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
