import { describe, expect, it } from "vitest";

import {
  buildProjectClientHierarchy,
  flattenHierarchyProjectIds,
} from "@/lib/projects/list-hierarchy";
import type { Project } from "@/types";

function project(
  partial: Partial<Project> & Pick<Project, "id" | "project_name" | "client_name">,
): Project {
  return {
    phase: "Construction",
    budgeted_design_hours: 0,
    active: true,
    ...partial,
  };
}

describe("buildProjectClientHierarchy", () => {
  it("groups parents under clients and nests change orders under parents", () => {
    const projects = [
      project({ id: "p1", project_name: "Kitchen", client_name: "Acme" }),
      project({
        id: "co1",
        project_name: "Kitchen CO",
        client_name: "Acme",
        parent_project_id: "p1",
        is_change_order: true,
      }),
      project({ id: "p2", project_name: "Bath", client_name: "Beta Co" }),
    ];

    const groups = buildProjectClientHierarchy(projects);
    expect(groups.map((g) => g.clientName)).toEqual(["Acme", "Beta Co"]);
    expect(groups[0]!.jobs).toHaveLength(1);
    expect(groups[0]!.jobs[0]!.project.id).toBe("p1");
    expect(groups[0]!.jobs[0]!.changeOrders.map((c) => c.id)).toEqual(["co1"]);
    expect(groups[0]!.jobCount).toBe(2);
    expect(flattenHierarchyProjectIds(groups)).toEqual(["p1", "co1", "p2"]);
  });

  it("lists orphan change orders as top-level jobs when parent is absent", () => {
    const projects = [
      project({
        id: "co1",
        project_name: "Orphan CO",
        client_name: "Acme",
        parent_project_id: "missing",
        is_change_order: true,
      }),
    ];
    const groups = buildProjectClientHierarchy(projects);
    expect(groups[0]!.jobs).toHaveLength(1);
    expect(groups[0]!.jobs[0]!.project.id).toBe("co1");
    expect(groups[0]!.jobs[0]!.changeOrders).toEqual([]);
  });

  it("puts blank client names in an Unassigned client group", () => {
    const projects = [project({ id: "p1", project_name: "Solo", client_name: "  " })];
    const groups = buildProjectClientHierarchy(projects);
    expect(groups).toHaveLength(1);
    expect(groups[0]!.clientName).toBe("Unassigned client");
    expect(groups[0]!.jobs[0]!.project.id).toBe("p1");
  });
});
