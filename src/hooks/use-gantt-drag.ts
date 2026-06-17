"use client";

import { useCallback, useEffect, useState } from "react";

import type { GanttPendingPhaseDrag } from "@/components/gantt/gantt-phase-drag-confirm-dialog";
import { commitGanttDrag, type GanttDragState } from "@/components/gantt/gantt-project-row";
import { projectPhasesDateChanged } from "@/lib/gantt/drag-confirm";
import { movePhaseByDays, resizePhaseEnd, resizePhaseStart } from "@/lib/gantt/phase-links";
import { phasesForProject } from "@/lib/gantt/seed-phases";
import { dayDeltaFromPixels, type GanttZoom } from "@/lib/gantt/timeline";
import type { ScheduledProjectPhase } from "@/types";

interface UseGanttDragOptions {
  projectPhases: ScheduledProjectPhase[];
  zoom?: GanttZoom;
  onCommit: (projectId: string, phases: ScheduledProjectPhase[]) => void;
}

export function useGanttDrag({
  projectPhases,
  zoom = "weeks",
  onCommit,
}: UseGanttDragOptions) {
  const [dragState, setDragState] = useState<GanttDragState | null>(null);
  const [previewPhases, setPreviewPhases] = useState<ScheduledProjectPhase[] | null>(null);
  const [pendingDrag, setPendingDrag] = useState<GanttPendingPhaseDrag | null>(null);

  const effectivePhases = previewPhases ?? projectPhases;

  const beginDrag = useCallback(
    (state: GanttDragState) => {
      if (pendingDrag) return;
      setDragState(state);
    },
    [pendingDrag],
  );

  const clearDrag = useCallback(() => {
    setDragState(null);
    setPreviewPhases(null);
    setPendingDrag(null);
  }, []);

  const confirmPendingDrag = useCallback(() => {
    if (!pendingDrag) return;
    onCommit(pendingDrag.projectId, pendingDrag.nextPhases);
    clearDrag();
  }, [pendingDrag, onCommit, clearDrag]);

  const cancelPendingDrag = useCallback(() => {
    clearDrag();
  }, [clearDrag]);

  const handlePointerMove = useCallback(
    (e: PointerEvent) => {
      if (!dragState) return;
      const deltaPx = e.clientX - dragState.startX;
      const phases = phasesForProject(projectPhases, dragState.projectId);
      const dayDelta = dayDeltaFromPixels(deltaPx, zoom);
      let next: ScheduledProjectPhase[];
      if (dragState.mode === "move") {
        next = movePhaseByDays(phases, dragState.phaseId, dayDelta);
      } else if (dragState.mode === "resize-end" && dragState.originEnd) {
        const end = new Date(dragState.originEnd);
        end.setDate(end.getDate() + dayDelta);
        next = resizePhaseEnd(phases, dragState.phaseId, end.toISOString().slice(0, 10));
      } else if (dragState.mode === "resize-start" && dragState.originStart) {
        const start = new Date(dragState.originStart);
        start.setDate(start.getDate() + dayDelta);
        next = resizePhaseStart(phases, dragState.phaseId, start.toISOString().slice(0, 10));
      } else {
        return;
      }
      setPreviewPhases([
        ...projectPhases.filter((p) => p.project_id !== dragState.projectId),
        ...next,
      ]);
    },
    [dragState, projectPhases, zoom],
  );

  const handlePointerUp = useCallback(
    (e: PointerEvent) => {
      if (!dragState) return;
      const deltaPx = e.clientX - dragState.startX;
      const previousPhases = phasesForProject(projectPhases, dragState.projectId);
      const nextPhases = commitGanttDrag(projectPhases, dragState, deltaPx, zoom);

      setDragState(null);

      if (!projectPhasesDateChanged(previousPhases, nextPhases)) {
        setPreviewPhases(null);
        return;
      }

      setPreviewPhases([
        ...projectPhases.filter((p) => p.project_id !== dragState.projectId),
        ...nextPhases,
      ]);
      setPendingDrag({
        projectId: dragState.projectId,
        phaseId: dragState.phaseId,
        mode: dragState.mode,
        previousPhases,
        nextPhases,
      });
    },
    [dragState, projectPhases, zoom],
  );

  useEffect(() => {
    if (!dragState) return;
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [dragState, handlePointerMove, handlePointerUp]);

  return {
    dragState,
    setDragState: beginDrag,
    effectivePhases,
    pendingDrag,
    confirmPendingDrag,
    cancelPendingDrag,
  };
}
