import { groupProjectsByClient, normalizeClientName } from "@/lib/clients";
import { getChangeOrdersForParent, isChangeOrder, isParentProject } from "@/lib/change-orders";
import type { Project } from "@/types";

export interface ProjectHierarchyJob {
  project: Project;
  changeOrders: Project[];
}

export interface ProjectClientHierarchyGroup {
  clientKey: string;
  clientName: string;
  jobs: ProjectHierarchyJob[];
  /** Total visible jobs including nested change orders. */
  jobCount: number;
}

/**
 * Build Client → parent job → change-order hierarchy from an already-filtered
 * project list. Orphan COs (parent missing from the filtered set) appear as
 * top-level jobs under their client. Projects with blank client names land in
 * an “Unassigned client” group.
 */
export function buildProjectClientHierarchy(
  filteredProjects: Project[],
): ProjectClientHierarchyGroup[] {
  const byId = new Map(filteredProjects.map((p) => [p.id, p]));
  const withClient = filteredProjects.filter((p) => normalizeClientName(p.client_name ?? ""));
  const withoutClient = filteredProjects.filter((p) => !normalizeClientName(p.client_name ?? ""));

  const clientGroups = groupProjectsByClient(withClient, { showInactive: true });
  const groups: ProjectClientHierarchyGroup[] = clientGroups.map((summary) =>
    buildClientGroup(summary.key, summary.displayName, summary.projects, byId, filteredProjects),
  );

  if (withoutClient.length > 0) {
    groups.push(
      buildClientGroup(
        "__unassigned__",
        "Unassigned client",
        withoutClient,
        byId,
        filteredProjects,
      ),
    );
    groups.sort((a, b) => {
      if (a.clientKey === "__unassigned__") return 1;
      if (b.clientKey === "__unassigned__") return -1;
      return a.clientName.localeCompare(b.clientName);
    });
  }

  return groups;
}

function buildClientGroup(
  clientKey: string,
  clientName: string,
  clientProjects: Project[],
  byId: Map<string, Project>,
  filteredProjects: Project[],
): ProjectClientHierarchyGroup {
  const parents = clientProjects
    .filter((p) => isParentProject(p))
    .sort((a, b) => a.project_name.localeCompare(b.project_name));

  const parentIds = new Set(parents.map((p) => p.id));
  const orphanCos = clientProjects
    .filter((p) => {
      if (!isChangeOrder(p)) return false;
      const parentId = p.parent_project_id;
      return !parentId || !parentIds.has(parentId) || !byId.has(parentId);
    })
    .sort((a, b) => a.project_name.localeCompare(b.project_name));

  const jobs: ProjectHierarchyJob[] = [
    ...parents.map((project) => ({
      project,
      changeOrders: getChangeOrdersForParent(filteredProjects, project.id).sort((a, b) =>
        a.project_name.localeCompare(b.project_name),
      ),
    })),
    ...orphanCos.map((project) => ({ project, changeOrders: [] as Project[] })),
  ];

  const jobCount = jobs.reduce((sum, job) => sum + 1 + job.changeOrders.length, 0);

  return {
    clientKey,
    clientName,
    jobs,
    jobCount,
  };
}

/** Flat list of selectable project ids in hierarchy display order. */
export function flattenHierarchyProjectIds(
  groups: ProjectClientHierarchyGroup[],
): string[] {
  const ids: string[] = [];
  for (const group of groups) {
    for (const job of group.jobs) {
      ids.push(job.project.id);
      for (const co of job.changeOrders) ids.push(co.id);
    }
  }
  return ids;
}
