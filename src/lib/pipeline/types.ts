import type { QueueHealth } from "@/lib/queue/types";

export type PipelineStage =
  | "design"
  | "estimating"
  | "construction"
  | "closeout";

export const PIPELINE_STAGES: { id: PipelineStage; label: string }[] = [
  { id: "design", label: "Design" },
  { id: "estimating", label: "Estimating" },
  { id: "construction", label: "Construction" },
  { id: "closeout", label: "Closeout" },
];

export type PipelineTab = "overview" | "leads" | "design" | "estimating";

export const PIPELINE_TABS: { id: PipelineTab; label: string; ready: boolean }[] = [
  { id: "overview", label: "Overview", ready: true },
  { id: "leads", label: "Leads", ready: true },
  { id: "design", label: "Design", ready: true },
  { id: "estimating", label: "Estimating", ready: true },
];

export interface PipelineJob {
  projectId: string;
  projectName: string;
  clientName: string;
  projectNumber?: string;
  stage: PipelineStage;
  phase: string;
  department?: string;
  ownerName?: string;
  ownerId?: string;
  dueDate?: string;
  value?: number;
  health: QueueHealth;
  active: boolean;
}

export interface PipelineStageRollup {
  stage: PipelineStage;
  label: string;
  count: number;
  value: number;
}

export interface PipelineKpiSummary {
  activeJobs: number;
  designCount: number;
  estimatingCount: number;
  constructionCount: number;
  totalPipelineValue: number;
  atRiskCount: number;
}
