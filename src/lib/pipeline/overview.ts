import {
  addWeeks,
  format,
  isWithinInterval,
  parseISO,
  startOfDay,
  startOfWeek,
} from "date-fns";

import { isEstimateDueOverdue, isOpenEstimate } from "@/lib/estimating/metrics";
import { isOpenLead } from "@/lib/pipeline/leads";
import type { PipelineJob } from "@/lib/pipeline/types";
import type { CompanySettings, Estimate, Lead } from "@/types";

export type OverviewStageBarId =
  | "leads"
  | "schematic"
  | "budgeting"
  | "dd_cd"
  | "estimating"
  | "construction";

export interface OverviewStageBar {
  id: OverviewStageBarId;
  label: string;
  count: number;
  value: number;
  /** Pipeline tab this bar links to. */
  tab?: "leads" | "design" | "estimating" | "construction";
}

function normalizePhase(phase?: string): string {
  return phase?.trim().toLowerCase() ?? "";
}

/** Early design: Concept + Schematic Design. */
const SCHEMATIC_PHASES = new Set(["concept", "schematic design"]);

/** Budgeting: dedicated phase, plus open budget-type estimate packages. */
const BUDGETING_PHASES = new Set(["budgeting"]);

/** Detailed design: Design Development + Construction Drawings/Documents. */
const DD_CD_PHASES = new Set([
  "design development",
  "construction drawings",
  "construction documents",
  "revisions",
]);

function jobsInPhases(jobs: PipelineJob[], phases: Set<string>): PipelineJob[] {
  return jobs.filter((j) => j.active && phases.has(normalizePhase(j.phase)));
}

function sumJobValue(jobs: PipelineJob[]): number {
  return jobs.reduce((sum, j) => sum + (j.value ?? 0), 0);
}

function sumEstimateAmount(list: Estimate[]): number {
  return list.reduce((sum, e) => sum + (e.amount ?? 0), 0);
}

/**
 * Design-build funnel for the Overview:
 * Leads → Schematic Design → Budgeting → DD/CD → Estimating → Construction.
 *
 * Budgeting = projects in Budgeting + open budget-type estimate packages.
 * Estimating = projects in Estimating + open cost-proposal / contract packages.
 * Project IDs linked to counted estimates are de-duped so a job is not double-counted.
 */
export function buildOverviewStageBars(
  leads: Lead[],
  estimates: Estimate[],
  jobs: PipelineJob[],
  settings?: CompanySettings,
): OverviewStageBar[] {
  const openLeads = leads.filter((l) => isOpenLead(l, settings));
  const openEstimates = estimates.filter(isOpenEstimate);

  const budgetEstimates = openEstimates.filter((e) => e.estimate_type === "budget");
  const pricingEstimates = openEstimates.filter(
    (e) =>
      e.estimate_type === "cost_proposal" ||
      e.estimate_type === "contract" ||
      e.estimate_type === "change_order",
  );

  const schematicJobs = jobsInPhases(jobs, SCHEMATIC_PHASES);
  const budgetingPhaseJobs = jobsInPhases(jobs, BUDGETING_PHASES);
  const ddCdJobs = jobsInPhases(jobs, DD_CD_PHASES);
  const estimatingPhaseJobs = jobs.filter(
    (j) => j.active && normalizePhase(j.phase) === "estimating",
  );
  const constructionJobs = jobs.filter((j) => j.active && j.stage === "construction");

  const budgetingLinkedIds = new Set(
    budgetEstimates.map((e) => e.project_id).filter((id): id is string => Boolean(id)),
  );
  const budgetingJobs = budgetingPhaseJobs.filter((j) => !budgetingLinkedIds.has(j.projectId));

  const estimatingLinkedIds = new Set(
    pricingEstimates.map((e) => e.project_id).filter((id): id is string => Boolean(id)),
  );
  const estimatingJobs = estimatingPhaseJobs.filter(
    (j) => !estimatingLinkedIds.has(j.projectId),
  );

  const budgetingCount = budgetingJobs.length + budgetEstimates.length;
  const budgetingValue = sumJobValue(budgetingJobs) + sumEstimateAmount(budgetEstimates);

  const estimatingCount = estimatingJobs.length + pricingEstimates.length;
  const estimatingValue = sumJobValue(estimatingJobs) + sumEstimateAmount(pricingEstimates);

  return [
    {
      id: "leads",
      label: "Leads",
      count: openLeads.length,
      value: openLeads.reduce((sum, l) => sum + (l.expected_value ?? 0), 0),
      tab: "leads",
    },
    {
      id: "schematic",
      label: "Schematic Design",
      count: schematicJobs.length,
      value: sumJobValue(schematicJobs),
      tab: "design",
    },
    {
      id: "budgeting",
      label: "Budgeting",
      count: budgetingCount,
      value: budgetingValue,
      tab: "estimating",
    },
    {
      id: "dd_cd",
      label: "Design Development / Construction Drawings",
      count: ddCdJobs.length,
      value: sumJobValue(ddCdJobs),
      tab: "design",
    },
    {
      id: "estimating",
      label: "Estimating",
      count: estimatingCount,
      value: estimatingValue,
      tab: "estimating",
    },
    {
      id: "construction",
      label: "Construction",
      count: constructionJobs.length,
      value: sumJobValue(constructionJobs),
      tab: "construction",
    },
  ];
}

export interface OverviewMoney {
  /** Uncontracted work: open leads + open estimate packages. */
  pipelineValue: number;
  /** Contracted work: active design + construction jobs. */
  backlogValue: number;
}

export function buildOverviewMoney(
  leads: Lead[],
  estimates: Estimate[],
  jobs: PipelineJob[],
  settings?: CompanySettings,
): OverviewMoney {
  const pipelineValue =
    leads.filter((l) => isOpenLead(l, settings)).reduce((sum, l) => sum + (l.expected_value ?? 0), 0) +
    estimates.filter(isOpenEstimate).reduce((sum, e) => sum + (e.amount ?? 0), 0);

  const backlogValue = jobs
    .filter((j) => j.active && (j.stage === "design" || j.stage === "construction"))
    .reduce((sum, j) => sum + (j.value ?? 0), 0);

  return { pipelineValue, backlogValue };
}

export interface OverviewWeekActivity {
  weekStart: Date;
  label: string;
  leadsCreated: number;
  estimatesSubmitted: number;
  submittedAmount: number;
}

function parseDate(value?: string): Date | null {
  if (!value?.trim()) return null;
  try {
    const parsed = parseISO(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  } catch {
    return null;
  }
}

/** Weekly new-lead and submitted-estimate counts for the trailing N weeks (oldest first). */
export function buildWeeklyActivity(
  leads: Lead[],
  estimates: Estimate[],
  weeks = 8,
  now = new Date(),
): OverviewWeekActivity[] {
  const currentWeekStart = startOfWeek(now, { weekStartsOn: 1 });

  return Array.from({ length: weeks }, (_, i) => {
    const weekStart = addWeeks(currentWeekStart, i - (weeks - 1));
    const weekEnd = addWeeks(weekStart, 1);
    const interval = { start: weekStart, end: weekEnd };

    const leadsCreated = leads.filter((lead) => {
      const created = parseDate(lead.created_at);
      return created ? isWithinInterval(created, interval) && created < weekEnd : false;
    }).length;

    const submitted = estimates.filter((estimate) => {
      const date = parseDate(estimate.submitted_date);
      return date ? startOfDay(date) >= weekStart && startOfDay(date) < weekEnd : false;
    });

    return {
      weekStart,
      label: format(weekStart, "MMM d"),
      leadsCreated,
      estimatesSubmitted: submitted.length,
      submittedAmount: submitted.reduce((sum, e) => sum + (e.amount ?? 0), 0),
    };
  });
}

export interface OverviewAttention {
  followUpsDue: number;
  estimatesOverdue: number;
  designOverdue: number;
  unassignedJobs: number;
}

export function buildOverviewAttention(
  leads: Lead[],
  estimates: Estimate[],
  jobs: PipelineJob[],
  followUpsDue: number,
): OverviewAttention {
  return {
    followUpsDue,
    estimatesOverdue: estimates.filter((e) => isEstimateDueOverdue(e)).length,
    designOverdue: jobs.filter(
      (j) => j.active && j.stage === "design" && j.health === "overdue",
    ).length,
    unassignedJobs: jobs.filter(
      (j) => j.active && j.stage !== "closeout" && !j.ownerId,
    ).length,
  };
}
