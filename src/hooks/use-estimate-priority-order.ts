"use client";

import { useCallback, useState } from "react";

import { setEstimatePriorityOrder } from "@/lib/estimating/estimate-priority-order";

export function useEstimatePriorityOrder() {
  const [revision, setRevision] = useState(0);

  const bump = useCallback(() => setRevision((n) => n + 1), []);

  const updateEstimatePriorityOrder = useCallback(
    (estimatorId: string, estimateIds: string[]) => {
      setEstimatePriorityOrder(estimatorId, estimateIds);
      bump();
    },
    [bump],
  );

  return { revision, updateEstimatePriorityOrder };
}
