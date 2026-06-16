import { isChangeOrder } from "@/lib/change-orders";
import { getProjectDesignAmount, getProjectEstimateValue } from "@/lib/project-format";
import { getEmployeeFullName } from "@/lib/week";
import type { Employee, Project } from "@/types";

export interface ProjectFilters {
  search: string;
  department: string | null;
  phase: string | null;
  leadEmployeeId: string | null;
  showInactive: boolean;
  showChangeOrders: boolean;
}

export const defaultProjectFilters = (): ProjectFilters => ({
  search: "",
  department: null,
  phase: null,
  leadEmployeeId: null,
  showInactive: false,
  showChangeOrders: false,
});

export function projectFiltersActive(filters: ProjectFilters): boolean {
  return (
    Boolean(filters.search.trim()) ||
    Boolean(filters.department) ||
    Boolean(filters.phase) ||
    Boolean(filters.leadEmployeeId) ||
    filters.showInactive ||
    filters.showChangeOrders
  );
}

export function projectMatchesFilterCriteria(
  project: Project,
  filters: Pick<ProjectFilters, "search" | "department" | "phase" | "leadEmployeeId">,
  getEmployeeById: (id: string) => Employee | undefined,
): boolean {
  if (filters.department && (project.department?.trim() ?? "") !== filters.department) {
    return false;
  }
  if (filters.phase && project.phase !== filters.phase) return false;
  if (filters.leadEmployeeId && project.lead_employee_id !== filters.leadEmployeeId) {
    return false;
  }

  const query = filters.search.trim().toLowerCase();
  if (!query) return true;

  const lead = project.lead_employee_id
    ? getEmployeeById(project.lead_employee_id)
    : undefined;
  const leadEstimator = project.lead_estimator_id
    ? getEmployeeById(project.lead_estimator_id)
    : undefined;
  const haystack = [
    project.project_name,
    project.client_name,
    project.project_number,
    getProjectDesignAmount(project) != null ? String(getProjectDesignAmount(project)) : "",
    getProjectEstimateValue(project) != null ? String(getProjectEstimateValue(project)) : "",
    project.department,
    project.phase,
    lead ? getEmployeeFullName(lead) : "",
    leadEstimator ? getEmployeeFullName(leadEstimator) : "",
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return haystack.includes(query);
}

export function projectMatchesFilters(
  project: Project,
  filters: ProjectFilters,
  getEmployeeById: (id: string) => Employee | undefined,
): boolean {
  if (!filters.showInactive && !project.active) return false;
  if (!filters.showChangeOrders && isChangeOrder(project)) return false;
  return projectMatchesFilterCriteria(project, filters, getEmployeeById);
}

export function filterProjects(
  projects: Project[],
  filters: ProjectFilters,
  getEmployeeById: (id: string) => Employee | undefined,
): Project[] {
  return projects.filter((project) => projectMatchesFilters(project, filters, getEmployeeById));
}

/** Gantt defaults — change orders are shown on the timeline by default. */
export function defaultGanttFilters(): ProjectFilters {
  return {
    ...defaultProjectFilters(),
    showChangeOrders: true,
  };
}
