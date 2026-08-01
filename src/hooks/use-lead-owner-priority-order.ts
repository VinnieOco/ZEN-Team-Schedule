"use client";

import { useCallback, useState } from "react";

import { setLeadOwnerPriorityOrder } from "@/lib/pipeline/lead-priority-order";

export function useLeadOwnerPriorityOrder() {
  const [revision, setRevision] = useState(0);

  const bump = useCallback(() => setRevision((n) => n + 1), []);

  const updateLeadPriorityOrder = useCallback(
    (ownerId: string, leadIds: string[]) => {
      setLeadOwnerPriorityOrder(ownerId, leadIds);
      bump();
    },
    [bump],
  );

  return { revision, updateLeadPriorityOrder };
}
