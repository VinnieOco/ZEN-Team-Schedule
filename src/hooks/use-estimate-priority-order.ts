"use client";

import { useCallback, useState, useSyncExternalStore } from "react";

import {
  getEstimatePriorityRevision,
  setEstimatePriorityOrder,
  subscribeEstimatePriorityOrders,
} from "@/lib/estimating/estimate-priority-order";

export function useEstimatePriorityOrder() {
  const revision = useSyncExternalStore(
    subscribeEstimatePriorityOrders,
    getEstimatePriorityRevision,
    getEstimatePriorityRevision,
  );
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const updateEstimatePriorityOrder = useCallback(
    async (estimatorId: string, estimateIds: string[]) => {
      setSaving(true);
      setSaveMessage(null);
      try {
        // Memory updates synchronously so the table reorders immediately.
        const persist = setEstimatePriorityOrder(estimatorId, estimateIds);
        await persist;
        setSaveMessage("Priority saved.");
      } catch {
        setSaveMessage("Could not save priority. Try again.");
      } finally {
        setSaving(false);
      }
    },
    [],
  );

  return { revision, saving, saveMessage, updateEstimatePriorityOrder };
}
