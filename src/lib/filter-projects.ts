import { isChangeOrder } from "@/lib/change-orders";
import {
  departmentFilterLabel,
  getProjectDepartmentKey,
  UNASSIGNED_DEPARTMENT,
} from "@/lib/departments";
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

export function compareProjectsByDepartment(a: Project, b: Project): number {
  const deptA = getProjectDepartmentKey(a);
  const deptB = getProjectDepartmentKey(b);
  if (deptA !== deptB) {
    if (deptA === UNASSIGNED_DEPARTMENT) return 1;
    if (deptB === UNASSIGNED_DEPARTMENT) return -1;
    const byDept = deptA.localeCompare(deptB);
    if (byDept !== 0) return byDept;
  }
  return a.project_name.localeCompare(b.project_name);
}

export interface ProjectDepartmentGroup {
  departmentKey: string;
  departmentLabel: string;
  projects: Project[];
}

export function buildProjectDepartmentGroups(
  projects: Project[],
): ProjectDepartmentGroup[] {
  const sorted = [...projects].sort(compareProjectsByDepartment);
  const groups: ProjectDepartmentGroup[] = [];
  const byKey = new Map<string, ProjectDepartmentGroup>();

  for (const project of sorted) {
    const departmentKey = getProjectDepartmentKey(project);
    let group = byKey.get(departmentKey);
    if (!group) {
      group = {
        departmentKey,
        departmentLabel: departmentFilterLabel(departmentKey),
        projects: [],
      };
      byKey.set(departmentKey, group);
      groups.push(group);
    }
    group.projects.push(project);
  }

  return groups;
}

export function filterProjects(
  projects: Project[],
  filters: ProjectFilters,
  getEmployeeById: (id: string) => Employee | undefined,
): Project[] {
  return projects
    .filter((project) => projectMatchesFilters(project, filters, getEmployeeById))
    .sort(compareProjectsByDepartment);
}

/** Gantt defaults — hide change-order project rows (same as Projects list). */
export function defaultGanttFilters(): ProjectFilters {
  return {
    ...defaultProjectFilters(),
    showChangeOrders: false,
  };
}
