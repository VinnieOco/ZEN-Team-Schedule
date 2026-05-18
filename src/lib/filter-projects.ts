import { getEmployeeFullName } from "@/lib/week";
import type { Employee, Project } from "@/types";

export interface ProjectFilters {
  search: string;
  status: string | null;
  phase: string | null;
  leadEmployeeId: string | null;
  showInactive: boolean;
}

export const defaultProjectFilters = (): ProjectFilters => ({
  search: "",
  status: null,
  phase: null,
  leadEmployeeId: null,
  showInactive: false,
});

export function projectFiltersActive(filters: ProjectFilters): boolean {
  return (
    Boolean(filters.search.trim()) ||
    Boolean(filters.status) ||
    Boolean(filters.phase) ||
    Boolean(filters.leadEmployeeId) ||
    filters.showInactive
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
    if (filters.status && project.status !== filters.status) return false;
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
      project.project_amount != null ? String(project.project_amount) : "",
      project.status,
      project.phase,
      lead ? getEmployeeFullName(lead) : "",
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return haystack.includes(query);
  });
}
