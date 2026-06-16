import type { ProjectMilestone, ProjectMilestoneKind } from "@/types";

export const MILESTONE_KIND_OPTIONS: { value: ProjectMilestoneKind; label: string }[] = [
  { value: "submittal", label: "Submittal" },
  { value: "client_review", label: "Client review" },
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
    case "client_review":
      return { fill: "#fce7f3", stroke: "#db2777" };
    case "permit":
      return { fill: "#fef3c7", stroke: "#d97706" };
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
