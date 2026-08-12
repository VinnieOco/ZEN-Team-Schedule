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
import { isParentProject } from "@/lib/change-orders";
import { normalizeClientName } from "@/lib/clients";
import { estimateDisplayName } from "@/lib/estimating/metrics";
import { formatProjectAmount, getProjectEstimateValue } from "@/lib/project-format";
import { buildGroupedProjectSelectOptions } from "@/lib/project-picker-options";
import { cn } from "@/lib/utils";
import type { Estimate } from "@/types";

type WonMode = "existing" | "new" | "change_order";

interface EstimateWonDialogProps {
  estimate: Estimate | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called after a successful apply (project is linked/created). */
  onApplied?: (projectId: string) => void;
}

function resolveParentId(estimate: Estimate, projects: { id: string; parent_project_id?: string; is_change_order?: boolean }[]): string {
  if (!estimate.project_id) return "";
  const linked = projects.find((p) => p.id === estimate.project_id);
  if (!linked) return "";
  if (isParentProject(linked)) return linked.id;
  return linked.parent_project_id ?? "";
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
  const [parentProjectId, setParentProjectId] = useState("");
  const [wonDate, setWonDate] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [error, setError] = useState<string | null>(null);

  const isChangeOrderEstimate = estimate?.estimate_type === "change_order";

  useEffect(() => {
    if (!open || !estimate) return;
    setError(null);
    setWonDate(estimate.won_date || format(new Date(), "yyyy-MM-dd"));

    const linkedParentId = resolveParentId(estimate, projects);
    if (estimate.estimate_type === "change_order") {
      // Already linked to the parent job (e.g. from project Change Orders) — keep it there.
      if (
        estimate.project_id &&
        projects.some((p) => p.id === estimate.project_id && isParentProject(p))
      ) {
        setMode("existing");
        setProjectId(estimate.project_id);
        setParentProjectId(estimate.project_id);
        return;
      }
      setMode("change_order");
      setParentProjectId(linkedParentId);
      setProjectId("");
      return;
    }

    if (estimate.project_id && projects.some((p) => p.id === estimate.project_id)) {
      setMode("existing");
      setProjectId(estimate.project_id);
      setParentProjectId(linkedParentId);
    } else {
      setMode("new");
      setProjectId("");
      setParentProjectId("");
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

  const parentProjectOptions = useMemo(() => {
    const parents = projects
      .filter((p) => p.active && isParentProject(p))
      .sort((a, b) => a.project_name.localeCompare(b.project_name));

    if (!estimate) {
      return parents.map((p) => ({
        value: p.id,
        label: p.project_name,
        keywords: [p.client_name, p.project_number].filter(Boolean).join(" "),
      }));
    }

    const clientKey = normalizeClientName(estimate.client_name);
    const matching = parents.filter((p) => normalizeClientName(p.client_name) === clientKey);
    const others = parents.filter((p) => normalizeClientName(p.client_name) !== clientKey);
    const ordered = matching.length > 0 ? [...matching, ...others] : parents;

    return ordered.map((p) => ({
      value: p.id,
      label: p.project_name,
      keywords: [p.client_name, p.project_number].filter(Boolean).join(" "),
    }));
  }, [projects, estimate]);

  const selectedProject = projectId ? projects.find((p) => p.id === projectId) : undefined;
  const selectedParent = parentProjectId
    ? projects.find((p) => p.id === parentProjectId)
    : undefined;
  const selectedEstimateValue = selectedProject
    ? getProjectEstimateValue(selectedProject)
    : undefined;
  const wonAmount = estimate?.amount;

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setError(null);
      setProjectId("");
      setParentProjectId("");
    }
    onOpenChange(next);
  };

  const handleConfirm = () => {
    if (!estimate) {
      setError("This estimate is still saving. Close and mark it won again in a moment.");
      return;
    }
    if (!wonDate.trim()) {
      setError("Enter the date this estimate was won.");
      return;
    }
    if (mode === "existing" && !projectId) {
      setError("Select a project to add this won estimate to.");
      return;
    }
    if (mode === "change_order" && !parentProjectId) {
      setError("Select the parent project for this change order.");
      return;
    }

    const choice =
      mode === "existing"
        ? ({ mode: "existing", projectId } as const)
        : mode === "change_order"
          ? ({ mode: "change_order", parentProjectId } as const)
          : ({ mode: "new" } as const);

    const project = applyWonEstimateToProject(estimate.id, choice, wonDate);
    if (!project) {
      setError("Could not update the project. Try again.");
      return;
    }

    handleOpenChange(false);
    onApplied?.(project.id);
    router.push(`/projects/${project.id}`);
  };

  if (!estimate) return null;

  const modeButtonClass = (active: boolean) =>
    cn(
      "rounded-md border px-3 py-2.5 text-left text-sm transition-colors",
      active
        ? "border-emerald-600 bg-emerald-50 text-emerald-900"
        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
    );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="flex max-h-[90vh] flex-col overflow-visible sm:max-w-md">
        <DialogHeader className="shrink-0">
          <DialogTitle>Estimate won</DialogTitle>
          <DialogDescription>
            {isChangeOrderEstimate ? (
              <>
                Add{" "}
                <span className="font-medium text-slate-800">{estimateDisplayName(estimate)}</span>{" "}
                as a change order
                {wonAmount != null ? ` (${formatProjectAmount(wonAmount)})` : ""}.
              </>
            ) : (
              <>
                Link <span className="font-medium text-slate-800">{estimateDisplayName(estimate)}</span>{" "}
                to a project as a contract and update the project&apos;s estimate amount
                {wonAmount != null ? ` (${formatProjectAmount(wonAmount)})` : ""}.
              </>
            )}
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

          <div className="grid gap-2 sm:grid-cols-3">
            <button
              type="button"
              onClick={() => {
                setMode("change_order");
                setError(null);
              }}
              className={modeButtonClass(mode === "change_order")}
            >
              <span className="font-medium">Change order</span>
              <span className="mt-0.5 block text-xs text-muted-foreground">
                Create CO under a parent
              </span>
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("existing");
                setError(null);
              }}
              className={modeButtonClass(mode === "existing")}
            >
              <span className="font-medium">Add to existing</span>
              <span className="mt-0.5 block text-xs text-muted-foreground">
                Update a project already in CRM
              </span>
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("new");
                setError(null);
              }}
              className={modeButtonClass(mode === "new")}
            >
              <span className="font-medium">New project</span>
              <span className="mt-0.5 block text-xs text-muted-foreground">
                Start a standalone job
              </span>
            </button>
          </div>

          {mode === "change_order" ? (
            <div className="space-y-1.5">
              <Label>Parent project</Label>
              <SearchableSelect
                options={parentProjectOptions}
                value={parentProjectId}
                onValueChange={(value) => {
                  setParentProjectId(value);
                  setError(null);
                }}
                placeholder="Search parent projects…"
                searchPlaceholder="Search by name or client…"
              />
              {selectedParent ? (
                <p className="text-xs text-muted-foreground">
                  Creates a change order under {selectedParent.project_name}
                  {wonAmount != null
                    ? ` with estimate amount ${formatProjectAmount(wonAmount)}`
                    : ""}
                  . The amount rolls up on the parent project page.
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Choose the main project this change order belongs to.
                </p>
              )}
            </div>
          ) : null}

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
              {isChangeOrderEstimate && selectedProject && wonAmount != null ? (
                <p className="text-xs text-muted-foreground">
                  Links this change order to {selectedProject.project_name}
                  {` (${formatProjectAmount(wonAmount)})`}. The amount rolls up with other change
                  orders — it does not replace the base contract amount.
                </p>
              ) : selectedProject &&
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
          ) : null}

          {mode === "new" ? (
            <p className="rounded-md border border-dashed border-slate-200 bg-slate-50 px-3 py-3 text-sm text-muted-foreground">
              Creates <span className="font-medium text-slate-800">{estimateDisplayName(estimate)}</span>{" "}
              for {estimate.client_name}
              {wonAmount != null
                ? ` with estimate amount ${formatProjectAmount(wonAmount)}`
                : ""}
              . The won package becomes a Contract on that project.
            </p>
          ) : null}

          {error ? <p className="text-sm text-red-600">{error}</p> : null}
        </div>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={handleConfirm}>
            {mode === "change_order"
              ? "Create change order"
              : mode === "new"
                ? "Create project"
                : "Update project"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
