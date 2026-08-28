import { describe, expect, it } from "vitest";

import { getClientTotalProjectValue } from "@/lib/clients";
import type { Estimate, Project } from "@/types";

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

function estimate(
  partial: Partial<Estimate> & Pick<Estimate, "id" | "project_id" | "estimate_type">,
): Estimate {
  return {
    client_name: "Acme",
    title: "Contract",
    stage: "won",
    result: "won",
    amount: 0,
    revision_number: 1,
    checklist: [],
    updated_at: "2026-01-01T00:00:00Z",
    ...partial,
  } as Estimate;
}

describe("getClientTotalProjectValue", () => {
  it("uses parent rollup with contracts instead of summing CO design amounts separately", () => {
    const projects = [
      project({
        id: "p1",
        project_name: "Kitchen",
        client_name: "Acme",
        design_amount: 10_000,
        estimate_value: 50_000,
      }),
      project({
        id: "co1",
        project_name: "Kitchen CO",
        client_name: "Acme",
        parent_project_id: "p1",
        is_change_order: true,
        design_amount: 5_000,
        estimate_value: 15_000,
      }),
    ];
    const estimates = [
      estimate({
        id: "e1",
        project_id: "p1",
        estimate_type: "contract",
        amount: 100_000,
      }),
    ];

    expect(getClientTotalProjectValue(projects, projects, estimates)).toBe(115_000);
  });

  it("falls back to rolled-up design amount when no estimate/contracts exist", () => {
    const projects = [
      project({
        id: "p1",
        project_name: "Kitchen",
        client_name: "Acme",
        design_amount: 10_000,
      }),
      project({
        id: "co1",
        project_name: "Kitchen CO",
        client_name: "Acme",
        parent_project_id: "p1",
        is_change_order: true,
        design_amount: 2_500,
      }),
    ];

    expect(getClientTotalProjectValue(projects, projects)).toBe(12_500);
  });

  it("counts orphan change orders when their parent is not on the client", () => {
    const projects = [
      project({
        id: "co1",
        project_name: "Orphan CO",
        client_name: "Acme",
        parent_project_id: "missing",
        is_change_order: true,
        design_amount: 7_500,
      }),
    ];

    expect(getClientTotalProjectValue(projects, projects)).toBe(7_500);
  });
});
