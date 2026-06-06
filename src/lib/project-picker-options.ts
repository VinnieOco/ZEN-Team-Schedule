import type { SearchableSelectOption } from "@/components/ui/searchable-select";
import {
  getChangeOrdersForParent,
  isChangeOrder,
  isParentProject,
} from "@/lib/change-orders";
import type { Project } from "@/types";

export interface BuildGroupedProjectSelectOptionsConfig {
  /** Include inactive projects when true. Defaults to active-only. */
  activeOnly?: boolean;
  /** Always include these projects (e.g. current selection when inactive). */
  extraProjects?: Project[];
  formatParentLabel?: (project: Project) => string;
  formatChangeOrderLabel?: (changeOrder: Project, parent: Project) => string;
}

function isEligibleProject(
  project: Project,
  activeOnly: boolean,
  extraIds: Set<string>,
): boolean {
  if (extraIds.has(project.id)) return true;
  if (activeOnly && !project.active) return false;
  return true;
}

export function shortChangeOrderLabel(changeOrder: Project, parent: Project): string {
  const prefix = `${parent.project_name} — `;
  if (changeOrder.project_name.startsWith(prefix)) {
    return changeOrder.project_name.slice(prefix.length);
  }
  const marker = " — CO-";
  const markerIndex = changeOrder.project_name.indexOf(marker);
  if (markerIndex >= 0) {
    return changeOrder.project_name.slice(markerIndex + 3);
  }
  return changeOrder.project_name;
}

function projectKeywords(project: Project, parent?: Project): string {
  return [
    project.client_name,
    project.project_name,
    project.project_number,
    parent?.project_name,
    parent?.client_name,
  ]
    .filter(Boolean)
    .join(" ");
}

export function buildGroupedProjectSelectOptions(
  projects: Project[],
  config: BuildGroupedProjectSelectOptionsConfig = {},
): SearchableSelectOption[] {
  const activeOnly = config.activeOnly ?? true;
  const extraProjects = config.extraProjects ?? [];
  const extraIds = new Set(extraProjects.map((project) => project.id));
  const eligible = projects.filter((project) =>
    isEligibleProject(project, activeOnly, extraIds),
  );

  const parentIds = new Set(
    eligible.filter(isParentProject).map((project) => project.id),
  );

  const parents = eligible
    .filter(isParentProject)
    .sort((a, b) => a.project_name.localeCompare(b.project_name));

  const options: SearchableSelectOption[] = [];

  for (const parent of parents) {
    const changeOrders = getChangeOrdersForParent(eligible, parent.id).filter((co) =>
      isEligibleProject(co, activeOnly, extraIds),
    );

    if (changeOrders.length > 0) {
      options.push({
        value: `__group__${parent.id}`,
        label: parent.project_name,
        disabled: true,
        isGroupHeader: true,
        keywords: projectKeywords(parent),
      });

      const parentLabel =
        config.formatParentLabel?.(parent) ??
        `${parent.client_name} · ${parent.project_name}${!parent.active ? " (inactive)" : ""}`;

      options.push({
        value: parent.id,
        label: parentLabel,
        keywords: projectKeywords(parent),
      });

      for (const changeOrder of changeOrders) {
        const coLabel =
          config.formatChangeOrderLabel?.(changeOrder, parent) ??
          shortChangeOrderLabel(changeOrder, parent);
        options.push({
          value: changeOrder.id,
          label: `↳ ${coLabel}${!changeOrder.active ? " (inactive)" : ""}`,
          keywords: projectKeywords(changeOrder, parent),
        });
      }
      continue;
    }

    options.push({
      value: parent.id,
      label:
        config.formatParentLabel?.(parent) ??
        `${parent.client_name} · ${parent.project_name}${!parent.active ? " (inactive)" : ""}`,
      keywords: projectKeywords(parent),
    });
  }

  const orphanChangeOrders = eligible
    .filter(
      (project) =>
        isChangeOrder(project) &&
        (!project.parent_project_id || !parentIds.has(project.parent_project_id)),
    )
    .sort((a, b) => a.project_name.localeCompare(b.project_name));

  for (const changeOrder of orphanChangeOrders) {
    options.push({
      value: changeOrder.id,
      label: `${changeOrder.client_name} · ${changeOrder.project_name}${!changeOrder.active ? " (inactive)" : ""}`,
      keywords: projectKeywords(changeOrder),
    });
  }

  return options;
}
