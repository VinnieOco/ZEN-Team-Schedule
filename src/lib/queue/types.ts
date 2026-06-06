import type { Project } from "@/types";

export type QueueKind = "design" | "estimating";

export type DesignQueueStage =
  | "backlog"
  | "ready"
  | "active"
  | "active_dd_cd"
  | "in_review"
  | "client_review"
  | "complete";

export type EstimatingQueueStage =
  | "lead"
  | "waiting_docs"
  | "pricing"
  | "submitted"
  | "follow_up"
  | "won"
  | "lost";

export type QueueHealth = "on_track" | "at_risk" | "overdue" | "blocked";

export interface QueueItemMetrics {
  budgetHours: number;
  hoursUsed: number;
  hoursScheduled: number;
  remainingHours: number;
  percentUsed: number;
}

export interface DesignQueueItem {
  kind: "design";
  project: Project;
  stage: DesignQueueStage;
  priorityScore: number;
  health: QueueHealth;
  dueDate?: string;
  metrics: QueueItemMetrics;
  leadName?: string;
  leadSearchText?: string;
  estimatedValue?: number;
}

export interface EstimatingQueueItem {
  kind: "estimating";
  project: Project;
  stage: EstimatingQueueStage;
  priorityScore: number;
  health: QueueHealth;
  bidDueDate?: string;
  metrics: QueueItemMetrics;
  leadName?: string;
  leadSearchText?: string;
  estimatedValue?: number;
  missingDocuments: string[];
  followUpStatus?: string;
}

export type QueueItem = DesignQueueItem | EstimatingQueueItem;

export interface QueueFilters {
  search: string;
  health: QueueHealth | "all";
  department: string | null;
  sortBy: QueueSortBy;
  showInactive: boolean;
}

export type QueueSortBy = "priority" | "department";

export interface QueueKpiSummary {
  total: number;
  active: number;
  atRisk: number;
  dueSoon: number;
  unassigned: number;
}
