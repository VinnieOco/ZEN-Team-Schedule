"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { GanttDragMode } from "@/components/gantt/gantt-project-row";
import {
  describeGanttPhaseDateChanges,
  formatGanttPhaseDate,
  ganttDragModeLabel,
} from "@/lib/gantt/drag-confirm";
import type { ScheduledProjectPhase } from "@/types";

export interface GanttPendingPhaseDrag {
  projectId: string;
  phaseId: string;
  mode: GanttDragMode;
  previousPhases: ScheduledProjectPhase[];
  nextPhases: ScheduledProjectPhase[];
}

interface GanttPhaseDragConfirmDialogProps {
  open: boolean;
  pending: GanttPendingPhaseDrag | null;
  projectLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function GanttPhaseDragConfirmDialog({
  open,
  pending,
  projectLabel,
  onConfirm,
  onCancel,
}: GanttPhaseDragConfirmDialogProps) {
  if (!pending) return null;

  const changes = describeGanttPhaseDateChanges(pending.previousPhases, pending.nextPhases);
  const primaryPhase = pending.previousPhases.find((phase) => phase.id === pending.phaseId);

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onCancel();
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Confirm schedule change?</DialogTitle>
          <DialogDescription>
            {projectLabel ? (
              <>
                Review the updated dates for <span className="font-medium text-slate-700">{projectLabel}</span>{" "}
                before saving. Cancel to keep the previous schedule.
              </>
            ) : (
              "Review the updated dates before saving. Cancel to keep the previous schedule."
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 text-sm">
          <p className="text-muted-foreground">
            {ganttDragModeLabel(pending.mode)}
            {primaryPhase ? (
              <>
                {" "}
                — <span className="font-medium text-slate-800">{primaryPhase.phase_key}</span>
              </>
            ) : null}
          </p>

          <ul className="max-h-56 space-y-2 overflow-y-auto rounded-md border border-slate-200 bg-slate-50/80 p-3">
            {changes.map((change) => (
              <li key={change.phaseId}>
                <p className="font-medium text-slate-900">{change.phaseKey}</p>
                <p className="text-muted-foreground">
                  {formatGanttPhaseDate(change.previousStart)} →{" "}
                  {formatGanttPhaseDate(change.previousEnd)}
                </p>
                <p className="text-emerald-800">
                  {formatGanttPhaseDate(change.nextStart)} → {formatGanttPhaseDate(change.nextEnd)}
                </p>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="button" onClick={onConfirm}>
            Confirm change
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
