import type { DesignQueueStage, EstimatingQueueStage, QueueKind } from "@/lib/queue/types";

const STORAGE_KEY = "zen-queue-stage-overrides";

export type QueueStageOverride =
  | { kind: "design"; stage: DesignQueueStage }
  | { kind: "estimating"; stage: EstimatingQueueStage };

type OverrideMap = Record<string, QueueStageOverride>;

function loadOverrides(): OverrideMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as OverrideMap;
  } catch {
    return {};
  }
}

function saveOverrides(map: OverrideMap): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
}

export function getStageOverride(projectId: string): QueueStageOverride | undefined {
  return loadOverrides()[projectId];
}

export function setStageOverride(projectId: string, override: QueueStageOverride): void {
  const map = loadOverrides();
  map[projectId] = override;
  saveOverrides(map);
}

export function clearStageOverride(projectId: string): void {
  const map = loadOverrides();
  delete map[projectId];
  saveOverrides(map);
}

export function overrideKindMatches(kind: QueueKind, override: QueueStageOverride): boolean {
  return override.kind === kind;
}
