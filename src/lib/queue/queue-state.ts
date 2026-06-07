import type { DesignQueueStage, EstimatingQueueStage } from "@/lib/queue/types";
import type { QueueStageOverride } from "@/lib/queue/queue-state-types";
import type {
  QueueColumnPositionRow,
  QueueMembershipRow,
  QueueStageRow,
  QueueStateSnapshot,
} from "@/lib/queue/queue-state-types";
import type { QueueKind } from "@/lib/queue/types";

const STAGE_STORAGE_KEY = "zen-queue-stage-overrides";
const COLUMN_STORAGE_KEY = "zen-queue-column-order";
const MEMBER_KEYS: Record<QueueKind, string> = {
  design: "zen-queue-design-members",
  estimating: "zen-queue-estimating-members",
};
const EXCLUDED_KEYS: Record<QueueKind, string> = {
  design: "zen-queue-design-excluded",
  estimating: "zen-queue-estimating-excluded",
};

type OverrideMap = Record<string, QueueStageOverride>;
type ColumnOrderMap = Record<string, string[]>;

export interface QueueStatePersistence {
  upsertStage(projectId: string, kind: QueueKind, stage: string): Promise<void>;
  deleteStage(projectId: string, kind: QueueKind): Promise<void>;
  upsertMembership(
    projectId: string,
    kind: QueueKind,
    membership: "member" | "excluded",
  ): Promise<void>;
  deleteMembership(projectId: string, kind: QueueKind): Promise<void>;
  replaceColumnOrder(kind: QueueKind, stage: string, projectIds: string[]): Promise<void>;
  replaceAll(snapshot: QueueStateSnapshot): Promise<void>;
}

let stageOverrides: OverrideMap = {};
let members: Record<QueueKind, Set<string>> = {
  design: new Set(),
  estimating: new Set(),
};
let excluded: Record<QueueKind, Set<string>> = {
  design: new Set(),
  estimating: new Set(),
};
let columnOrders: ColumnOrderMap = {};
let persistence: QueueStatePersistence | null = null;
let useRemotePersistence = false;

function columnKey(kind: QueueKind, stage: string): string {
  return `${kind}::${stage}`;
}

function loadLocalStageOverrides(): OverrideMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STAGE_STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as OverrideMap;
  } catch {
    return {};
  }
}

function saveLocalStageOverrides(map: OverrideMap): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STAGE_STORAGE_KEY, JSON.stringify(map));
}

function loadLocalSet(key: string): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as string[]);
  } catch {
    return new Set();
  }
}

function saveLocalSet(key: string, ids: Set<string>): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify([...ids]));
}

function loadLocalColumnOrders(): ColumnOrderMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(COLUMN_STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as ColumnOrderMap;
  } catch {
    return {};
  }
}

function saveLocalColumnOrders(map: ColumnOrderMap): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(COLUMN_STORAGE_KEY, JSON.stringify(map));
}

function persistLocalSnapshot(): void {
  saveLocalStageOverrides(stageOverrides);
  saveLocalSet(MEMBER_KEYS.design, members.design);
  saveLocalSet(MEMBER_KEYS.estimating, members.estimating);
  saveLocalSet(EXCLUDED_KEYS.design, excluded.design);
  saveLocalSet(EXCLUDED_KEYS.estimating, excluded.estimating);
  saveLocalColumnOrders(columnOrders);
}

function applySnapshot(snapshot: QueueStateSnapshot): void {
  const nextOverrides: OverrideMap = {};
  for (const row of snapshot.stages) {
    nextOverrides[row.project_id] =
      row.queue_kind === "design"
        ? { kind: "design", stage: row.stage as DesignQueueStage }
        : { kind: "estimating", stage: row.stage as EstimatingQueueStage };
  }

  stageOverrides = nextOverrides;
  members = { design: new Set(), estimating: new Set() };
  excluded = { design: new Set(), estimating: new Set() };
  for (const row of snapshot.memberships) {
    if (row.membership === "member") {
      members[row.queue_kind].add(row.project_id);
    } else {
      excluded[row.queue_kind].add(row.project_id);
    }
  }

  const nextColumnOrders: ColumnOrderMap = {};
  const grouped = new Map<string, QueueColumnPositionRow[]>();
  for (const row of snapshot.columnPositions) {
    const key = columnKey(row.queue_kind, row.stage);
    const list = grouped.get(key) ?? [];
    list.push(row);
    grouped.set(key, list);
  }
  for (const [key, rows] of grouped) {
    nextColumnOrders[key] = rows
      .sort((a, b) => a.position - b.position)
      .map((row) => row.project_id);
  }
  columnOrders = nextColumnOrders;
}

export function snapshotFromMemory(): QueueStateSnapshot {
  const stages: QueueStageRow[] = Object.entries(stageOverrides).map(([projectId, override]) => ({
    project_id: projectId,
    queue_kind: override.kind,
    stage: override.stage,
  }));

  const memberships: QueueMembershipRow[] = [];
  for (const kind of ["design", "estimating"] as const) {
    for (const projectId of members[kind]) {
      memberships.push({ project_id: projectId, queue_kind: kind, membership: "member" });
    }
    for (const projectId of excluded[kind]) {
      memberships.push({ project_id: projectId, queue_kind: kind, membership: "excluded" });
    }
  }

  const columnPositions: QueueColumnPositionRow[] = [];
  for (const [key, projectIds] of Object.entries(columnOrders)) {
    const [kind, stage] = key.split("::") as [QueueKind, string];
    projectIds.forEach((projectId, position) => {
      columnPositions.push({ queue_kind: kind, stage, project_id: projectId, position });
    });
  }

  return { stages, memberships, columnPositions };
}

export function isQueueStateEmpty(snapshot: QueueStateSnapshot): boolean {
  return (
    snapshot.stages.length === 0 &&
    snapshot.memberships.length === 0 &&
    snapshot.columnPositions.length === 0
  );
}

export function loadLocalQueueSnapshot(): QueueStateSnapshot {
  stageOverrides = loadLocalStageOverrides();
  members = {
    design: loadLocalSet(MEMBER_KEYS.design),
    estimating: loadLocalSet(MEMBER_KEYS.estimating),
  };
  excluded = {
    design: loadLocalSet(EXCLUDED_KEYS.design),
    estimating: loadLocalSet(EXCLUDED_KEYS.estimating),
  };
  columnOrders = loadLocalColumnOrders();
  return snapshotFromMemory();
}

export function clearLocalQueueStorage(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STAGE_STORAGE_KEY);
  localStorage.removeItem(COLUMN_STORAGE_KEY);
  localStorage.removeItem(MEMBER_KEYS.design);
  localStorage.removeItem(MEMBER_KEYS.estimating);
  localStorage.removeItem(EXCLUDED_KEYS.design);
  localStorage.removeItem(EXCLUDED_KEYS.estimating);
}

export function hydrateQueueState(snapshot: QueueStateSnapshot): void {
  applySnapshot(snapshot);
}

export function initQueuePersistence(
  remote: QueueStatePersistence | null,
  options?: { useRemote?: boolean },
): void {
  persistence = remote;
  useRemotePersistence = Boolean(options?.useRemote && remote);
}

function runPersist(task: () => Promise<void>): void {
  if (!useRemotePersistence || !persistence) {
    persistLocalSnapshot();
    return;
  }
  void task().catch((err) => {
    console.error("Failed to persist queue state", err);
    persistLocalSnapshot();
  });
}

export function readStageOverride(projectId: string): QueueStageOverride | undefined {
  return stageOverrides[projectId];
}

export function writeStageOverride(projectId: string, override: QueueStageOverride): void {
  stageOverrides = { ...stageOverrides, [projectId]: override };
  runPersist(() => persistence!.upsertStage(projectId, override.kind, override.stage));
}

export function removeStageOverride(projectId: string): void {
  const existing = stageOverrides[projectId];
  if (!existing) return;
  const next = { ...stageOverrides };
  delete next[projectId];
  stageOverrides = next;
  if (existing) {
    runPersist(() => persistence!.deleteStage(projectId, existing.kind));
  } else {
    persistLocalSnapshot();
  }
}

export function readIsMember(kind: QueueKind, projectId: string): boolean {
  return members[kind].has(projectId);
}

export function readIsExcluded(kind: QueueKind, projectId: string): boolean {
  return excluded[kind].has(projectId);
}

export function writeAddToQueue(kind: QueueKind, projectId: string): void {
  const nextExcluded = new Set(excluded[kind]);
  nextExcluded.delete(projectId);
  excluded = { ...excluded, [kind]: nextExcluded };

  const nextMembers = new Set(members[kind]);
  nextMembers.add(projectId);
  members = { ...members, [kind]: nextMembers };

  runPersist(() => persistence!.upsertMembership(projectId, kind, "member"));
}

export function writeRemoveFromQueue(kind: QueueKind, projectId: string): void {
  const nextMembers = new Set(members[kind]);
  nextMembers.delete(projectId);
  members = { ...members, [kind]: nextMembers };

  const nextExcluded = new Set(excluded[kind]);
  nextExcluded.add(projectId);
  excluded = { ...excluded, [kind]: nextExcluded };

  runPersist(() => persistence!.upsertMembership(projectId, kind, "excluded"));
}

export function readColumnOrder(kind: QueueKind, stage: string): string[] | undefined {
  return columnOrders[columnKey(kind, stage)];
}

export function writeColumnOrder(kind: QueueKind, stage: string, projectIds: string[]): void {
  columnOrders = { ...columnOrders, [columnKey(kind, stage)]: projectIds };
  runPersist(() => persistence!.replaceColumnOrder(kind, stage, projectIds));
}

export function writeRemoveFromColumnOrder(
  kind: QueueKind,
  stage: string,
  projectId: string,
): void {
  const existing = readColumnOrder(kind, stage);
  if (!existing) return;
  writeColumnOrder(
    kind,
    stage,
    existing.filter((id) => id !== projectId),
  );
}

export async function migrateLocalQueueToRemote(): Promise<boolean> {
  if (!useRemotePersistence || !persistence) return false;
  const localSnapshot = loadLocalQueueSnapshot();
  if (!isQueueStateEmpty(localSnapshot)) {
    await persistence.replaceAll(localSnapshot);
    clearLocalQueueStorage();
    return true;
  }
  return false;
}
