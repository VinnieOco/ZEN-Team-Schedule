"use client";

import { useCallback, useState } from "react";

import { setColumnOrder } from "@/lib/queue/column-order";
import type { QueueKind } from "@/lib/queue/types";

export function useQueueColumnOrder() {
  const [revision, setRevision] = useState(0);

  const bump = useCallback(() => setRevision((n) => n + 1), []);

  const updateColumnOrder = useCallback(
    (kind: QueueKind, stage: string, projectIds: string[]) => {
      setColumnOrder(kind, stage, projectIds);
      bump();
    },
    [bump],
  );

  return { revision, updateColumnOrder };
}
