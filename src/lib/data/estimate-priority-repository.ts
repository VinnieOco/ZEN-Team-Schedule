import type { SupabaseClient } from "@supabase/supabase-js";

import {
  ordersFromPositionRows,
  positionRowsFromOrders,
  type EstimatePriorityOrderMap,
  type EstimatePriorityPersistence,
} from "@/lib/estimating/estimate-priority-order";

export async function listEstimatePriorityOrders(
  supabase: SupabaseClient,
): Promise<EstimatePriorityOrderMap> {
  const { data, error } = await supabase
    .from("estimate_priority_positions")
    .select("estimator_id, estimate_id, position")
    .order("position");
  if (error) throw error;
  return ordersFromPositionRows(
    (data ?? []).map((row) => ({
      estimator_id: row.estimator_id as string,
      estimate_id: row.estimate_id as string,
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
      const { error: deleteError } = await supabase
        .from("estimate_priority_positions")
        .delete()
        .eq("estimator_id", estimatorId);
      if (deleteError) throw deleteError;

      if (estimateIds.length === 0) return;

      const { error: insertError } = await supabase.from("estimate_priority_positions").insert(
        estimateIds.map((estimateId, position) => ({
          estimator_id: estimatorId,
          estimate_id: estimateId,
          position,
        })),
      );
      if (insertError) throw insertError;
    },

    async replaceAll(orders) {
      const { error: deleteError } = await supabase
        .from("estimate_priority_positions")
        .delete()
        .neq("estimator_id", "00000000-0000-0000-0000-000000000000");
      if (deleteError) throw deleteError;

      const rows = positionRowsFromOrders(orders);
      if (rows.length === 0) return;

      const { error: insertError } = await supabase
        .from("estimate_priority_positions")
        .insert(rows);
      if (insertError) throw insertError;
    },
  };
}
