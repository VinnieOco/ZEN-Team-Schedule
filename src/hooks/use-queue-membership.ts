"use client";

import { useCallback, useState } from "react";

import { addProjectToQueue, removeProjectFromQueue } from "@/lib/queue/queue-membership";
import type { QueueKind } from "@/lib/queue/types";

export function useQueueMembership() {
  const [revision, setRevision] = useState(0);

  const bump = useCallback(() => setRevision((n) => n + 1), []);

  const addToQueue = useCallback(
    (kind: QueueKind, projectId: string) => {
      addProjectToQueue(kind, projectId);
      bump();
    },
    [bump],
  );

  const removeFromQueue = useCallback(
    (kind: QueueKind, projectId: string) => {
      removeProjectFromQueue(kind, projectId);
      bump();
    },
    [bump],
  );

  return { revision, addToQueue, removeFromQueue };
}
