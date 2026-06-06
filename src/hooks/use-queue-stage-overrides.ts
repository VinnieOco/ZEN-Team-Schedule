"use client";

import { useCallback, useState } from "react";

import {
  clearStageOverride,
  setStageOverride,
  type QueueStageOverride,
} from "@/lib/queue/overrides";

export function useQueueStageOverrides() {
  const [revision, setRevision] = useState(0);

  const bump = useCallback(() => setRevision((n) => n + 1), []);

  const updateStage = useCallback(
    (projectId: string, override: QueueStageOverride) => {
      setStageOverride(projectId, override);
      bump();
    },
    [bump],
  );

  const resetStage = useCallback(
    (projectId: string) => {
      clearStageOverride(projectId);
      bump();
    },
    [bump],
  );

  return { revision, updateStage, resetStage };
}
