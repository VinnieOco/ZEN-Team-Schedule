import type { DesignQueueStage, EstimatingQueueStage, QueueKind } from "@/lib/queue/types";

export type QueueStageOverride =
  | { kind: "design"; stage: DesignQueueStage }
  | { kind: "estimating"; stage: EstimatingQueueStage };

export interface QueueStageRow {
  project_id: string;
  queue_kind: QueueKind;
  stage: string;
}

export interface QueueMembershipRow {
  project_id: string;
  queue_kind: QueueKind;
  membership: "member" | "excluded";
}

export interface QueueColumnPositionRow {
  queue_kind: QueueKind;
  stage: string;
  project_id: string;
  position: number;
}

export interface QueueStateSnapshot {
  stages: QueueStageRow[];
  memberships: QueueMembershipRow[];
  columnPositions: QueueColumnPositionRow[];
}
