/**
 * Per-estimator priority order for the Pipeline Estimating main table.
 * Synced to Supabase when configured; falls back to localStorage in demo mode.
 */

const STORAGE_KEY = "zen-estimate-estimator-priority";

export type EstimatePriorityOrderMap = Record<string, string[]>;

export interface EstimatePriorityPersistence {
  listOrders(): Promise<EstimatePriorityOrderMap>;
  replaceOrder(estimatorId: string, estimateIds: string[]): Promise<void>;
  replaceAll(orders: EstimatePriorityOrderMap): Promise<void>;
}

let orders: EstimatePriorityOrderMap = {};
let persistence: EstimatePriorityPersistence | null = null;
let useRemotePersistence = false;
let persistChain: Promise<void> = Promise.resolve();
/** Bumps on every local edit so a slower fetch cannot overwrite a newer queue. */
let mutationEpoch = 0;
/** False until the first hydrate or local load. Drags before that are display-only. */
let loaded = false;
/** Bumps whenever the in-memory order changes so open views can re-sort. */
let revision = 0;
const listeners = new Set<() => void>();

export function subscribeEstimatePriorityOrders(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getEstimatePriorityRevision(): number {
  return revision;
}

export function getEstimatePriorityMutationEpoch(): number {
  return mutationEpoch;
}

function publishOrders(next: EstimatePriorityOrderMap): void {
  orders = next;
  saveLocalOrders(orders);
  revision += 1;
  for (const listener of listeners) listener();
}

export function estimatePriorityStageKey(estimatorId: string): string {
  return `priority:${estimatorId}`;
}

function loadLocalOrders(): EstimatePriorityOrderMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as EstimatePriorityOrderMap;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function saveLocalOrders(map: EstimatePriorityOrderMap): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
}

function estimatorIdFromStageKey(key: string): string | null {
  return key.startsWith("priority:") ? key.slice("priority:".length) : null;
}

export function snapshotEstimatePriorityOrders(): EstimatePriorityOrderMap {
  return { ...orders };
}

export function isEstimatePriorityOrdersEmpty(map: EstimatePriorityOrderMap): boolean {
  return Object.values(map).every((ids) => !ids?.length);
}

/**
 * Replace in-memory order with a fetched snapshot.
 * Pass `epochAtFetch` from before the request; a drag that landed while it was
 * in flight is kept instead of being overwritten by the stale snapshot.
 */
export function hydrateEstimatePriorityOrders(
  map: EstimatePriorityOrderMap,
  epochAtFetch?: number,
): boolean {
  // A drag before the first load is display-only, so the snapshot still wins.
  if (loaded && epochAtFetch != null && epochAtFetch !== mutationEpoch) return false;
  loaded = true;
  publishOrders({ ...map });
  return true;
}

export function loadLocalEstimatePriorityOrders(): EstimatePriorityOrderMap {
  loaded = true;
  publishOrders(loadLocalOrders());
  return snapshotEstimatePriorityOrders();
}

export function initEstimatePriorityPersistence(
  remote: EstimatePriorityPersistence | null,
  options?: { useRemote?: boolean },
): void {
  persistence = remote;
  useRemotePersistence = Boolean(options?.useRemote && remote);
}

export function flushEstimatePriorityPersistQueue(): Promise<void> {
  return persistChain;
}

function enqueuePersist(task: () => Promise<void>): Promise<void> {
  saveLocalOrders(orders);
  if (!useRemotePersistence || !persistence) return Promise.resolve();
  const active = persistence;
  const next = persistChain
    .then(task)
    .catch(async (err) => {
      console.error("Failed to persist estimate priority order", err);
      try {
        await active.replaceAll(snapshotEstimatePriorityOrders());
      } catch (retryErr) {
        console.error("Failed to sync estimate priority after error", retryErr);
        throw retryErr instanceof Error ? retryErr : err;
      }
    });
  persistChain = next.then(
    () => undefined,
    () => undefined,
  );
  return next;
}

export async function migrateLocalEstimatePriorityToRemote(): Promise<void> {
  if (!useRemotePersistence || !persistence) return;
  const epoch = mutationEpoch;
  const local = loadLocalOrders();
  if (isEstimatePriorityOrdersEmpty(local)) return;
  await persistence.replaceAll(local);
  if (epoch !== mutationEpoch) {
    // A drag landed while local data was uploading. Put that newer queue back.
    await persistence.replaceAll(snapshotEstimatePriorityOrders());
    return;
  }
  publishOrders({ ...local });
}

export function getEstimatePriorityOrder(estimatorId: string): string[] | undefined {
  const order = orders[estimatePriorityStageKey(estimatorId)];
  return order?.length ? order : undefined;
}

export function setEstimatePriorityOrder(
  estimatorId: string,
  estimateIds: string[],
): Promise<void> {
  mutationEpoch += 1;
  const next = {
    ...orders,
    [estimatePriorityStageKey(estimatorId)]: estimateIds,
  };
  if (!loaded) {
    // Don't write over a queue that hasn't been read yet. The load will publish.
    orders = next;
    revision += 1;
    for (const listener of listeners) listener();
    return Promise.resolve();
  }
  publishOrders(next);
  return enqueuePersist(async () => {
    await persistence!.replaceOrder(estimatorId, estimateIds);
  });
}

/** Rebuild a stage-key map from flat DB rows. */
export function ordersFromPositionRows(
  rows: Array<{ estimator_id: string; estimate_id: string; position: number }>,
): EstimatePriorityOrderMap {
  const grouped = new Map<string, Array<{ estimate_id: string; position: number }>>();
  for (const row of rows) {
    const list = grouped.get(row.estimator_id) ?? [];
    list.push(row);
    grouped.set(row.estimator_id, list);
  }
  const map: EstimatePriorityOrderMap = {};
  for (const [estimatorId, list] of grouped) {
    map[estimatePriorityStageKey(estimatorId)] = list
      .sort(
        (a, b) => a.position - b.position || a.estimate_id.localeCompare(b.estimate_id),
      )
      .map((row) => row.estimate_id);
  }
  return map;
}

export function positionRowsFromOrders(
  map: EstimatePriorityOrderMap,
): Array<{ estimator_id: string; estimate_id: string; position: number }> {
  const rows: Array<{ estimator_id: string; estimate_id: string; position: number }> = [];
  for (const [key, estimateIds] of Object.entries(map)) {
    const estimatorId = estimatorIdFromStageKey(key);
    if (!estimatorId || !estimateIds?.length) continue;
    estimateIds.forEach((estimateId, position) => {
      rows.push({ estimator_id: estimatorId, estimate_id: estimateId, position });
    });
  }
  return rows;
}
