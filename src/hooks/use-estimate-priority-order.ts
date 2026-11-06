"use client";

import { useCallback, useState } from "react";

import { setEstimatePriorityOrder } from "@/lib/estimating/estimate-priority-order";

export function useEstimatePriorityOrder() {
  const [revision, setRevision] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const bump = useCallback(() => setRevision((n) => n + 1), []);

  const updateEstimatePriorityOrder = useCallback(
    async (estimatorId: string, estimateIds: string[]) => {
      setSaving(true);
      setSaveMessage(null);
      try {
        // Memory updates synchronously so the table reorders immediately.
        const persist = setEstimatePriorityOrder(estimatorId, estimateIds);
        bump();
        await persist;
        setSaveMessage("Priority saved.");
      } catch {
        setSaveMessage("Could not save priority. Try again.");
      } finally {
        setSaving(false);
      }
    },
    [bump],
  );

  return { revision, saving, saveMessage, updateEstimatePriorityOrder };
}
