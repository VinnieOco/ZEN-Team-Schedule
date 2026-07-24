import { isChangeOrder } from "@/lib/change-orders";
import {
  formatProjectAmount,
  getProjectDesignAmount,
  getProjectEstimateValue,
} from "@/lib/project-format";
import { deriveQueueHealth } from "@/lib/queue/health";
import { isEstimatingProject } from "@/lib/queue/stages";
import { getProjectActualHours } from "@/lib/utilization";
import { getEmployeeFullName } from "@/lib/week";
import type { Employee, Project, TimeEntry } from "@/types";

import type {
  PipelineJob,
  PipelineKpiSummary,
  PipelineStage,
  PipelineStageRollup,
} from "@/lib/pipeline/types";
import { PIPELINE_STAGES } from "@/lib/pipeline/types";

const DESIGN_PHASES = new Set([
  "concept",
  "schematic design",
  "budgeting",
  "design development",
  "construction drawings",
  "construction documents",
  "revisions",
]);

const CONSTRUCTION_PHASES = new Set(["construction", "construction support"]);
const CLOSEOUT_PHASES = new Set(["closeout"]);

function normalize(value?: string): string {
  return value?.trim().toLowerCase() ?? "";
}

/** Map a project into the firm pipeline stage (Lead comes later as its own entity). */
export function getPipelineStage(project: Project): PipelineStage {
  const phase = normalize(project.phase);
  const dept = normalize(project.department);

  if (CLOSEOUT_PHASES.has(phase) || dept === "closeout") return "closeout";

  if (
    CONSTRUCTION_PHASES.has(phase) ||
    dept === "construction" ||
    dept.includes("construction")
  ) {
    return "construction";
  }

  if (isEstimatingProject(project.department, project.phase)) {
    return "estimating";
  }

  if (DESIGN_PHASES.has(phase) || dept === "design" || dept.includes("design")) {
    return "design";
  }

  // Default active work into design so nothing falls off the overview.
  return "design";
}

export function pipelineStageLabel(stage: PipelineStage): string {
  return PIPELINE_STAGES.find((s) => s.id === stage)?.label ?? stage;
}

function pipelineValue(project: Project, stage: PipelineStage): number | undefined {
  if (stage === "design") return getProjectDesignAmount(project);
  return getProjectEstimateValue(project) ?? getProjectDesignAmount(project);
}

function pipelineOwner(
  project: Project,
  stage: PipelineStage,
  getEmployeeById: (id: string) => Employee | undefined,
): { ownerId?: string; ownerName?: string } {
  const primaryId =
    stage === "estimating"
      ? project.lead_estimator_id ?? project.lead_employee_id
      : project.lead_employee_id ?? project.lead_estimator_id;
  if (!primaryId) return {};
  const employee = getEmployeeById(primaryId);
  return {
    ownerId: primaryId,
    ownerName: employee ? getEmployeeFullName(employee) : undefined,
  };
}

function pipelineDueDate(project: Project, stage: PipelineStage): string | undefined {
  if (stage === "estimating") {
    return project.estimating_completion_date ?? project.target_completion_date;
  }
  return project.target_completion_date ?? project.estimating_completion_date;
}

export function buildPipelineJobs(
  projects: Project[],
  timeEntries: TimeEntry[],
  getEmployeeById: (id: string) => Employee | undefined,
  options?: { includeInactive?: boolean; includeChangeOrders?: boolean },
): PipelineJob[] {
  const includeInactive = options?.includeInactive ?? false;
  const includeChangeOrders = options?.includeChangeOrders ?? false;

  return projects
    .filter((project) => {
      if (!includeInactive && !project.active) return false;
      if (!includeChangeOrders && isChangeOrder(project)) return false;
      return true;
    })
    .map((project) => {
      const stage = getPipelineStage(project);
      const hoursUsed = getProjectActualHours(timeEntries, project.id);
      const budgetHours = project.budgeted_design_hours;
      const dueDate = pipelineDueDate(project, stage);
      const { ownerId, ownerName } = pipelineOwner(project, stage, getEmployeeById);

      return {
        projectId: project.id,
        projectName: project.project_name,
        clientName: project.client_name,
        projectNumber: project.project_number,
        stage,
        phase: project.phase,
        department: project.department,
        ownerId,
        ownerName,
        dueDate,
        value: pipelineValue(project, stage),
        health: deriveQueueHealth(dueDate, hoursUsed, budgetHours, Boolean(ownerId)),
        active: project.active,
      };
    })
    .sort((a, b) => {
      const stageOrder =
        PIPELINE_STAGES.findIndex((s) => s.id === a.stage) -
        PIPELINE_STAGES.findIndex((s) => s.id === b.stage);
      if (stageOrder !== 0) return stageOrder;
      return a.projectName.localeCompare(b.projectName);
    });
}

export function buildPipelineStageRollups(jobs: PipelineJob[]): PipelineStageRollup[] {
  return PIPELINE_STAGES.map(({ id, label }) => {
    const stageJobs = jobs.filter((j) => j.stage === id);
    return {
      stage: id,
      label,
      count: stageJobs.length,
      value: stageJobs.reduce((sum, j) => sum + (j.value ?? 0), 0),
    };
  });
}

export function buildPipelineKpis(jobs: PipelineJob[]): PipelineKpiSummary {
  const active = jobs.filter((j) => j.active);
  return {
    activeJobs: active.length,
    designCount: active.filter((j) => j.stage === "design").length,
    estimatingCount: active.filter((j) => j.stage === "estimating").length,
    constructionCount: active.filter((j) => j.stage === "construction").length,
    totalPipelineValue: active.reduce((sum, j) => sum + (j.value ?? 0), 0),
    atRiskCount: active.filter(
      (j) => j.health === "at_risk" || j.health === "overdue" || j.health === "blocked",
    ).length,
  };
}

export function formatPipelineValue(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return formatProjectAmount(0);
  if (value >= 1_000_000) {
    const millions = value / 1_000_000;
    const rounded = millions >= 10 ? millions.toFixed(0) : millions.toFixed(1);
    return `$${rounded.replace(/\.0$/, "")}M`;
  }
  return formatProjectAmount(value);
}
