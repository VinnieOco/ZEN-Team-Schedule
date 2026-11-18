import type { SupabaseClient } from "@supabase/supabase-js";

import { listAllRows } from "@/lib/data/list-all-rows";
import {
  ordersFromPositionRows,
  positionRowsFromOrders,
  type EstimatePriorityOrderMap,
  type EstimatePriorityPersistence,
} from "@/lib/estimating/estimate-priority-order";

type PositionRow = { estimator_id: string; estimate_id: string; position: number };

function positionRows(
  estimateIds: string[],
  estimatorId: string,
): PositionRow[] {
  return estimateIds.map((estimateId, position) => ({
    estimator_id: estimatorId,
    estimate_id: estimateId,
    position,
  }));
}

/**
 * Drop saved rows that are no longer in `keep`.
 * When `onlyEstimatorId` is set, other estimators' queues are left alone.
 */
async function deleteRemovedPositions(
  supabase: SupabaseClient,
  keep: PositionRow[],
  onlyEstimatorId?: string,
): Promise<void> {
  const keepIds = new Set(keep.map((row) => `${row.estimator_id}:${row.estimate_id}`));

  const existing = await listAllRows(supabase, "estimate_priority_positions", [
    { column: "estimator_id" },
    { column: "position" },
  ]);
  const removeByEstimator = new Map<string, string[]>();
  for (const row of existing) {
    const estimatorId = String(row.estimator_id);
    if (onlyEstimatorId && estimatorId !== onlyEstimatorId) continue;
    const estimateId = String(row.estimate_id);
    if (keepIds.has(`${estimatorId}:${estimateId}`)) continue;
    const ids = removeByEstimator.get(estimatorId) ?? [];
    ids.push(estimateId);
    removeByEstimator.set(estimatorId, ids);
  }

  await Promise.all(
    [...removeByEstimator.entries()].map(async ([estimatorId, estimateIds]) => {
      const { error } = await supabase
        .from("estimate_priority_positions")
        .delete()
        .eq("estimator_id", estimatorId)
        .in("estimate_id", estimateIds);
      if (error) throw error;
    }),
  );
}

async function upsertPositions(
  supabase: SupabaseClient,
  rows: PositionRow[],
): Promise<void> {
  if (rows.length === 0) return;
  const { error } = await supabase.from("estimate_priority_positions").upsert(rows, {
    onConflict: "estimator_id,estimate_id",
  });
  if (error) throw error;
}

export async function listEstimatePriorityOrders(
  supabase: SupabaseClient,
): Promise<EstimatePriorityOrderMap> {
  const data = await listAllRows(supabase, "estimate_priority_positions", [
    { column: "estimator_id" },
    { column: "position" },
    { column: "estimate_id" },
  ]);
  return ordersFromPositionRows(
    data.map((row) => ({
      estimator_id: String(row.estimator_id),
      estimate_id: String(row.estimate_id),
      position: Number(row.position),
    })),
  );
}

export function createEstimatePriorityPersistence(
  supabase: SupabaseClient,
): EstimatePriorityPersistence {
  return {
    async listOrders() {
      return listEstimatePriorityOrders(supabase);
    },

    async replaceOrder(estimatorId, estimateIds) {
      // Write the new positions before deleting leftovers so a failed save
      // cannot leave this estimator's queue empty.
      const rows = positionRows(estimateIds, estimatorId);
      await upsertPositions(supabase, rows);
      await deleteRemovedPositions(supabase, rows, estimatorId);
    },

    async replaceAll(orders) {
      const rows = positionRowsFromOrders(orders);
      await upsertPositions(supabase, rows);
      await deleteRemovedPositions(supabase, rows);
    },
  };
}
