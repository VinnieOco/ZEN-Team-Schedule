import { isInDesignQueue, isInEstimatingQueue } from "@/lib/queue/queue-membership";
import {
  defaultDesignStage,
  defaultEstimatingStage,
  normalizeEstimatingStage,
} from "@/lib/queue/stages";
import { getProjectDesignAmount, getProjectEstimateValue } from "@/lib/project-format";
import { deriveQueueHealth } from "@/lib/queue/health";
import { calculateDesignPriority, calculateEstimatingPriority } from "@/lib/queue/priority";
import { getStageOverride } from "@/lib/queue/overrides";
import type {
  DesignQueueItem,
  DesignQueueStage,
  EstimatingQueueItem,
  EstimatingQueueStage,
  QueueItemMetrics,
  QueueKpiSummary,
  QueueItem,
} from "@/lib/queue/types";
import { differenceInDays, parseISO } from "date-fns";

import {
  getProjectActualHours,
  getProjectScheduledHours,
} from "@/lib/utilization";
import { getEmployeeFullName } from "@/lib/week";
import type { Allocation, Employee, Project, TimeEntry } from "@/types";

function leadSearchText(employee: Employee | undefined): string | undefined {
  if (!employee) return undefined;
  return [getEmployeeFullName(employee), employee.email, employee.department]
    .filter(Boolean)
    .join(" ");
}

function projectMetrics(
  project: Project,
  allocations: Allocation[],
  timeEntries: TimeEntry[],
): QueueItemMetrics {
  const budgetHours = project.budgeted_design_hours;
  const hoursUsed = Math.round(getProjectActualHours(timeEntries, project.id) * 10) / 10;
  const hoursScheduled = Math.round(getProjectScheduledHours(allocations, project.id) * 10) / 10;
  const remainingHours = Math.round((budgetHours - hoursUsed) * 10) / 10;
  const percentUsed = budgetHours > 0 ? Math.round((hoursUsed / budgetHours) * 100) : 0;

  return { budgetHours, hoursUsed, hoursScheduled, remainingHours, percentUsed };
}

function estimatingMissingDocs(project: Project): string[] {
  const missing: string[] = [];
  if (!project.scope_of_work?.trim()) missing.push("Scope of work");
  if (!project.address?.trim()) missing.push("Site address");
  if (!project.contract_date?.trim()) missing.push("Bid documents");
  return missing;
}

export function buildDesignQueueItems(
  projects: Project[],
  allocations: Allocation[],
  timeEntries: TimeEntry[],
  getEmployeeById: (id: string) => Employee | undefined,
): DesignQueueItem[] {
  return projects
    .filter((p) => isInDesignQueue(p))
    .map((project) => {
      const metrics = projectMetrics(project, allocations, timeEntries);
      const override = getStageOverride(project.id);
      let stage: DesignQueueStage = defaultDesignStage(project.phase);
      if (override?.kind === "design") {
        stage = override.stage;
      }

      const lead = project.lead_employee_id
        ? getEmployeeById(project.lead_employee_id)
        : undefined;

      return {
        kind: "design" as const,
        project,
        stage,
        priorityScore: calculateDesignPriority(project, metrics.hoursUsed, metrics.budgetHours),
        health: deriveQueueHealth(
          project.target_completion_date,
          metrics.hoursUsed,
          metrics.budgetHours,
          Boolean(lead),
        ),
        dueDate: project.target_completion_date,
        metrics,
        leadName: lead ? getEmployeeFullName(lead) : undefined,
        leadSearchText: leadSearchText(lead),
        estimatedValue: getProjectDesignAmount(project),
      };
    })
    .sort((a, b) => b.priorityScore - a.priorityScore);
}

export function buildEstimatingQueueItems(
  projects: Project[],
  allocations: Allocation[],
  timeEntries: TimeEntry[],
  getEmployeeById: (id: string) => Employee | undefined,
): EstimatingQueueItem[] {
  return projects
    .filter((p) => isInEstimatingQueue(p))
    .map((project) => {
      const metrics = projectMetrics(project, allocations, timeEntries);
      const override = getStageOverride(project.id);
      let stage: EstimatingQueueStage = defaultEstimatingStage(
        project.phase,
        metrics.hoursUsed,
        metrics.budgetHours,
      );
      if (override?.kind === "estimating") {
        stage = normalizeEstimatingStage(override.stage);
      }

      const lead = project.lead_estimator_id
        ? getEmployeeById(project.lead_estimator_id)
        : undefined;
      const missingDocuments = estimatingMissingDocs(project);
      const bidDueDate = project.target_completion_date ?? project.contract_date;

      return {
        kind: "estimating" as const,
        project,
        stage,
        priorityScore: calculateEstimatingPriority(project, metrics.hoursUsed, metrics.budgetHours),
        health: deriveQueueHealth(
          bidDueDate,
          metrics.hoursUsed,
          metrics.budgetHours,
          Boolean(lead),
        ),
        bidDueDate,
        metrics,
        leadName: lead ? getEmployeeFullName(lead) : undefined,
        leadSearchText: leadSearchText(lead),
        estimatedValue: getProjectEstimateValue(project) ?? getProjectDesignAmount(project),
        missingDocuments,
        followUpStatus:
          stage === "follow_up" || stage === "submitted" ? "Follow-up due" : undefined,
      };
    })
    .sort((a, b) => b.priorityScore - a.priorityScore);
}

export function buildQueueKpis(items: QueueItem[]): QueueKpiSummary {
  const active = items.filter((i) => i.project.active);
  const atRisk = items.filter((i) => i.health === "at_risk" || i.health === "overdue");
  const dueSoon = items.filter((i) => {
    const due = i.kind === "design" ? i.dueDate : i.bidDueDate;
    if (!due) return false;
    try {
      const days = differenceInDays(parseISO(due), new Date());
      return days >= 0 && days <= 14;
    } catch {
      return false;
    }
  });
  const unassigned = items.filter((i) => !i.leadName);

  return {
    total: items.length,
    active: active.length,
    atRisk: atRisk.length,
    dueSoon: dueSoon.length,
    unassigned: unassigned.length,
  };
}
