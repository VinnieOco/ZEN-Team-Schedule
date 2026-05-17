import type { ProjectPhase, ProjectStatus } from "@/types";

export const PROJECT_STATUSES: ProjectStatus[] = [
  "Lead",
  "Proposal",
  "Active Design",
  "Estimating",
  "Client Review",
  "Construction Documents",
  "Permit / Approvals",
  "Construction Support",
  "On Hold",
  "Completed",
  "Lost / Cancelled",
];

export const PROJECT_PHASES: ProjectPhase[] = [
  "Concept",
  "Schematic Design",
  "Design Development",
  "Construction Documents",
  "Estimating",
  "Revisions",
  "Construction Support",
  "Closeout",
];
