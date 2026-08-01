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
import { Label } from "@/components/ui/label";
import { SearchableCombobox } from "@/components/ui/searchable-combobox";
import { useScheduling } from "@/context/scheduling-context";
import { isChangeOrder } from "@/lib/change-orders";
import { countProjectMergeImpact } from "@/lib/projects/merge";
import type { Project } from "@/types";

interface ProjectMergeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  source: Project;
  onMerged: (targetId: string) => void;
}

function projectOptionLabel(project: Project): string {
  const bits = [project.project_name];
  if (project.project_number?.trim()) bits.push(`#${project.project_number.trim()}`);
  bits.push(project.client_name);
  if (isChangeOrder(project)) bits.push("CO");
  if (!project.active) bits.push("inactive");
  return bits.join(" · ");
}

export function ProjectMergeDialog({
  open,
  onOpenChange,
  source,
  onMerged,
}: ProjectMergeDialogProps) {
  const {
    projects,
    allocations,
    timeEntries,
    projectNotes,
    estimates,
    todos,
    leads,
    projectPhases,
    projectMilestones,
    mergeProjects,
  } = useScheduling();
  const [targetId, setTargetId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const targetOptions = useMemo(
    () =>
      projects
        .filter((project) => project.id !== source.id)
        .slice()
        .sort((a, b) => a.project_name.localeCompare(b.project_name))
        .map((project) => ({
          value: project.id,
          label: projectOptionLabel(project),
          keywords: [
            project.project_name,
            project.client_name,
            project.project_number,
            project.phase,
          ]
            .filter(Boolean)
            .join(" "),
        })),
    [projects, source.id],
  );

  const impact = useMemo(
    () =>
      countProjectMergeImpact(
        source.id,
        projects,
        allocations,
        timeEntries,
        projectNotes,
        estimates,
        todos,
        leads,
        projectPhases,
        projectMilestones,
      ),
    [
      source.id,
      projects,
      allocations,
      timeEntries,
      projectNotes,
      estimates,
      todos,
      leads,
      projectPhases,
      projectMilestones,
    ],
  );

  useEffect(() => {
    if (!open) return;
    setTargetId("");
    setError(null);
  }, [open, source.id]);

  const handleMerge = () => {
    setSaving(true);
    setError(null);
    try {
      const result = mergeProjects(source.id, targetId);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      onOpenChange(false);
      onMerged(result.targetId);
    } finally {
      setSaving(false);
    }
  };

  const moveParts = [
    impact.allocations > 0
      ? `${impact.allocations} allocation${impact.allocations === 1 ? "" : "s"}`
      : null,
    impact.timeEntries > 0
      ? `${impact.timeEntries} time entr${impact.timeEntries === 1 ? "y" : "ies"}`
      : null,
    impact.notes > 0 ? `${impact.notes} note${impact.notes === 1 ? "" : "s"}` : null,
    impact.estimates > 0
      ? `${impact.estimates} estimate${impact.estimates === 1 ? "" : "s"}`
      : null,
    impact.todos > 0 ? `${impact.todos} todo${impact.todos === 1 ? "" : "s"}` : null,
    impact.changeOrders > 0
      ? `${impact.changeOrders} change order${impact.changeOrders === 1 ? "" : "s"}`
      : null,
    impact.leads > 0 ? `${impact.leads} lead link${impact.leads === 1 ? "" : "s"}` : null,
  ].filter(Boolean);

  const discardParts = [
    impact.phases > 0 ? `${impact.phases} phase${impact.phases === 1 ? "" : "s"}` : null,
    impact.milestones > 0
      ? `${impact.milestones} milestone${impact.milestones === 1 ? "" : "s"}`
      : null,
  ].filter(Boolean);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] flex-col overflow-visible sm:max-w-md">
        <DialogHeader className="shrink-0">
          <DialogTitle>Merge project</DialogTitle>
          <DialogDescription>
            Move{" "}
            <span className="font-medium text-slate-900">{source.project_name}</span> into
            another project, then remove this one. Hours, notes, estimates, and related links go
            to the target. Budget hours and fees are added together.
            {moveParts.length > 0 ? <> This will move {moveParts.join(", ")}.</> : null}
          </DialogDescription>
        </DialogHeader>
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto">
          <div className="space-y-2">
            <Label htmlFor="merge-target-project">Merge into</Label>
            <SearchableCombobox
              id="merge-target-project"
              options={targetOptions}
              value={targetId}
              onValueChange={setTargetId}
              placeholder="Search projects…"
              searchPlaceholder="Search projects…"
              emptyMessage="No other projects found"
              allowCustom={false}
            />
            {error && <p className="text-xs text-red-600">{error}</p>}
          </div>
          {discardParts.length > 0 ? (
            <p className="text-xs text-amber-800">
              This project’s schedule ({discardParts.join(" and ")}) will not be moved — the target
              keeps its own phases and milestones.
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              The target keeps its name, client, and schedule. Blank contact fields on the target
              are filled from this project when possible.
            </p>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleMerge}
              disabled={saving || !targetId}
            >
              {saving ? "Merging…" : "Merge projects"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
