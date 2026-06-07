import {
  readStageOverride,
  removeStageOverride,
  writeStageOverride,
} from "@/lib/queue/queue-state";
import type { QueueStageOverride } from "@/lib/queue/queue-state-types";
import type { QueueKind } from "@/lib/queue/types";

export type { QueueStageOverride } from "@/lib/queue/queue-state-types";

export function getStageOverride(projectId: string): QueueStageOverride | undefined {
  return readStageOverride(projectId);
}

export function setStageOverride(projectId: string, override: QueueStageOverride): void {
  writeStageOverride(projectId, override);
}

export function clearStageOverride(projectId: string): void {
  removeStageOverride(projectId);
}

export function overrideKindMatches(kind: QueueKind, override: QueueStageOverride): boolean {
  return override.kind === kind;
}
