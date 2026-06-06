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

export function filterProjects(
  projects: Project[],
  filters: ProjectFilters,
  getEmployeeById: (id: string) => Employee | undefined,
): Project[] {
  const query = filters.search.trim().toLowerCase();

  return projects.filter((project) => {
    if (!filters.showInactive && !project.active) return false;
    if (!filters.showChangeOrders && isChangeOrder(project)) return false;
    if (filters.department && (project.department?.trim() ?? "") !== filters.department) {
      return false;
    }
    if (filters.phase && project.phase !== filters.phase) return false;
    if (filters.leadEmployeeId && project.lead_employee_id !== filters.leadEmployeeId) {
      return false;
    }

    if (!query) return true;

    const lead = project.lead_employee_id
      ? getEmployeeById(project.lead_employee_id)
      : undefined;
    const haystack = [
      project.project_name,
      project.client_name,
      getProjectDesignAmount(project) != null ? String(getProjectDesignAmount(project)) : "",
      getProjectEstimateValue(project) != null ? String(getProjectEstimateValue(project)) : "",
      project.department,
      project.phase,
      lead ? getEmployeeFullName(lead) : "",
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return haystack.includes(query);
  });
}
