import type { ProjectMilestone, ProjectMilestoneKind } from "@/types";
import { isChangeOrder } from "@/lib/change-orders";
import type { ProjectFilters } from "@/lib/filter-projects";
import { projectMatchesFilterCriteria } from "@/lib/filter-projects";
import type { Employee, Project } from "@/types";

export const MILESTONE_KIND_OPTIONS: { value: ProjectMilestoneKind; label: string }[] = [
  { value: "submittal", label: "Submittal" },
  { value: "meeting", label: "Meeting" },
  { value: "presentation", label: "Presentation" },
  { value: "budget", label: "Budget" },
  { value: "cost_proposal", label: "Cost Proposal" },
  { value: "contract", label: "Contract" },
  { value: "review", label: "Review" },
  { value: "permit", label: "Permit" },
  { value: "delivery", label: "Delivery" },
  { value: "other", label: "Other" },
];

export function milestoneKindLabel(kind: ProjectMilestoneKind): string {
  return MILESTONE_KIND_OPTIONS.find((o) => o.value === kind)?.label ?? "Other";
}

export function milestoneKindColors(kind: ProjectMilestoneKind): {
  fill: string;
  stroke: string;
} {
  switch (kind) {
    case "submittal":
      return { fill: "#dbeafe", stroke: "#2563eb" };
    case "meeting":
      return { fill: "#ede9fe", stroke: "#7c3aed" };
    case "presentation":
      return { fill: "#e0e7ff", stroke: "#4f46e5" };
    case "budget":
      return { fill: "#fef3c7", stroke: "#d97706" };
    case "cost_proposal":
      return { fill: "#ffedd5", stroke: "#ea580c" };
    case "contract":
      return { fill: "#ccfbf1", stroke: "#0d9488" };
    case "review":
      return { fill: "#fce7f3", stroke: "#db2777" };
    case "permit":
      return { fill: "#fef9c3", stroke: "#ca8a04" };
    case "delivery":
      return { fill: "#d1fae5", stroke: "#059669" };
    default:
      return { fill: "#f1f5f9", stroke: "#64748b" };
  }
}

export function milestonesForProject(
  allMilestones: ProjectMilestone[],
  projectId: string,
): ProjectMilestone[] {
  return allMilestones
    .filter((m) => m.project_id === projectId)
    .sort((a, b) => {
      const byDate = a.milestone_date.localeCompare(b.milestone_date);
      if (byDate !== 0) return byDate;
      return a.sort_order - b.sort_order;
    });
}

export function openMilestonesForProject(
  allMilestones: ProjectMilestone[],
  projectId: string,
): ProjectMilestone[] {
  return milestonesForProject(allMilestones, projectId).filter((m) => !m.completed_at);
}

export const FIRM_MILESTONE_COMPLETED_VISIBLE = 10;

export function partitionFirmMilestones(milestones: ProjectMilestone[]): {
  open: ProjectMilestone[];
  completedRecent: ProjectMilestone[];
  completedHiddenCount: number;
} {
  const open: ProjectMilestone[] = [];
  const completed: ProjectMilestone[] = [];

  for (const milestone of milestones) {
    if (milestone.completed_at) {
      completed.push(milestone);
    } else {
      open.push(milestone);
    }
  }

  open.sort((a, b) => {
    const byDate = a.milestone_date.localeCompare(b.milestone_date);
    if (byDate !== 0) return byDate;
    return a.sort_order - b.sort_order;
  });

  completed.sort((a, b) => {
    const aCompleted = a.completed_at ?? "";
    const bCompleted = b.completed_at ?? "";
    return bCompleted.localeCompare(aCompleted);
  });

  const completedRecent = completed.slice(0, FIRM_MILESTONE_COMPLETED_VISIBLE);
  const completedHiddenCount = Math.max(0, completed.length - completedRecent.length);

  return { open, completedRecent, completedHiddenCount };
}

export function filterFirmMilestones(
  milestones: ProjectMilestone[],
  projects: Project[],
  filters: ProjectFilters,
  getEmployeeById: (id: string) => Employee | undefined,
): ProjectMilestone[] {
  const projectById = new Map(projects.map((project) => [project.id, project]));

  return milestones.filter((milestone) => {
    const project = projectById.get(milestone.project_id);
    if (!project) return false;
    if (!filters.showInactive && !project.active) return false;
    if (!filters.showChangeOrders && isChangeOrder(project)) return false;
    return projectMatchesFilterCriteria(project, filters, getEmployeeById);
  });
}
