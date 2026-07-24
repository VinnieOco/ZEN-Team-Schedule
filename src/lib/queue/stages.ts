import type { DesignQueueStage, EstimatingQueueStage } from "@/lib/queue/types";

export const DESIGN_STAGES: { id: DesignQueueStage; label: string }[] = [
  { id: "backlog", label: "Backlog" },
  { id: "ready", label: "Ready To Start" },
  { id: "active", label: "Active Production SD" },
  { id: "active_dd_cd", label: "Active Production DD/CD" },
  { id: "in_review", label: "In Review" },
  { id: "client_review", label: "Client Review" },
  { id: "complete", label: "Complete" },
];

export const ESTIMATING_STAGES: { id: EstimatingQueueStage; label: string }[] = [
  { id: "lead", label: "Backlog" },
  { id: "waiting_docs", label: "Waiting On Documents" },
  { id: "pricing", label: "Pricing" },
  { id: "submitted", label: "Submitted" },
  { id: "follow_up", label: "Follow-Up" },
  { id: "won", label: "Won" },
  { id: "lost", label: "Lost" },
];

/** Remap removed estimating stages saved in localStorage. */
const LEGACY_ESTIMATING_STAGE: Record<string, EstimatingQueueStage> = {
  pre_bid: "lead",
  ready_estimate: "waiting_docs",
  takeoff: "pricing",
  internal_review: "submitted",
};

export function normalizeEstimatingStage(stage: string): EstimatingQueueStage {
  if (ESTIMATING_STAGES.some((s) => s.id === stage)) {
    return stage as EstimatingQueueStage;
  }
  return LEGACY_ESTIMATING_STAGE[stage] ?? "lead";
}

/** Map existing project phase to an estimating queue stage. */
const PHASE_TO_ESTIMATING: Record<string, EstimatingQueueStage> = {
  Concept: "lead",
  "Schematic Design": "lead",
  Budgeting: "waiting_docs",
  "Design Development": "waiting_docs",
  "Construction Drawings": "pricing",
  "Construction Documents": "pricing",
  Estimating: "pricing",
  Revisions: "submitted",
  Construction: "submitted",
  "Construction Support": "submitted",
  Closeout: "won",
};

/** Map existing project phase to a design queue stage. */
const PHASE_TO_DESIGN: Record<string, DesignQueueStage> = {
  Concept: "backlog",
  "Schematic Design": "ready",
  Budgeting: "active",
  "Design Development": "active_dd_cd",
  "Construction Drawings": "active_dd_cd",
  "Construction Documents": "active_dd_cd",
  Revisions: "client_review",
  Construction: "complete",
  "Construction Support": "complete",
  Closeout: "complete",
};

export function normalizeDesignStage(stage: string): DesignQueueStage {
  if (DESIGN_STAGES.some((s) => s.id === stage)) {
    return stage as DesignQueueStage;
  }
  return "backlog";
}

export function defaultDesignStage(phase: string): DesignQueueStage {
  return PHASE_TO_DESIGN[phase] ?? "backlog";
}

export function defaultEstimatingStage(
  phase: string,
  hoursUsed: number,
  budgetHours: number,
): EstimatingQueueStage {
  if (phase === "Estimating" && budgetHours > 0 && hoursUsed / budgetHours >= 0.5) {
    return "pricing";
  }
  return PHASE_TO_ESTIMATING[phase] ?? "lead";
}

export function isEstimatingProject(department?: string, phase?: string): boolean {
  const dept = department?.trim().toLowerCase();
  if (dept === "estimating") return true;
  return phase?.trim().toLowerCase() === "estimating";
}

export function designStageLabel(stage: DesignQueueStage): string {
  return DESIGN_STAGES.find((s) => s.id === stage)?.label ?? stage;
}

export function estimatingStageLabel(stage: EstimatingQueueStage): string {
  return ESTIMATING_STAGES.find((s) => s.id === stage)?.label ?? stage;
}
