import { isChangeOrder } from "@/lib/change-orders";
import {
  readIsExcluded,
  readIsMember,
  writeAddToQueue,
  writeRemoveFromQueue,
} from "@/lib/queue/queue-state";
import { isEstimatingProject } from "@/lib/queue/stages";
import type { QueueKind } from "@/lib/queue/types";
import type { Project } from "@/types";

/** Design queue: non-Estimating projects by default, plus explicit adds, minus removals. */
export function isInDesignQueue(project: Project): boolean {
  if (readIsExcluded("design", project.id)) return false;
  if (readIsMember("design", project.id)) return true;
  if (isChangeOrder(project)) return false;
  return !isEstimatingProject(project.department, project.phase);
}

/** Estimating queue: Estimating dept/phase by default, plus explicit adds, minus removals. */
export function isInEstimatingQueue(project: Project): boolean {
  if (readIsExcluded("estimating", project.id)) return false;
  if (readIsMember("estimating", project.id)) return true;
  if (isChangeOrder(project)) return false;
  return isEstimatingProject(project.department, project.phase);
}

export function isInQueue(kind: QueueKind, project: Project): boolean {
  return kind === "design" ? isInDesignQueue(project) : isInEstimatingQueue(project);
}

export function addProjectToQueue(kind: QueueKind, projectId: string): void {
  writeAddToQueue(kind, projectId);
}

export function removeProjectFromQueue(kind: QueueKind, projectId: string): void {
  writeRemoveFromQueue(kind, projectId);
}
