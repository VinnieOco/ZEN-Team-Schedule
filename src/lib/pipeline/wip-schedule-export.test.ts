import { describe, expect, it } from "vitest";

import { computeWipScheduleRow } from "@/lib/pipeline/wip-schedule";
import { buildWipScheduleCsv } from "@/lib/pipeline/wip-schedule-export";
import type { Project } from "@/types";

function project(partial: Partial<Project> & Pick<Project, "id" | "project_name">): Project {
  return {
    client_name: "Client",
    phase: "Construction",
    budgeted_design_hours: 0,
    active: true,
    ...partial,
  };
}

describe("WIP schedule CSV export", () => {
  it("includes jobs, department totals, and grand totals", () => {
    const rows = [
      computeWipScheduleRow(
        project({
          id: "a",
          project_name: "Alpha",
          client_name: "Acme",
          department: "Construction",
          wip_contract_price: 1000,
          wip_billings_to_date: 400,
          wip_cost_to_date: 200,
          wip_estimated_cost_to_complete: 100,
        }),
      ),
      computeWipScheduleRow(
        project({
          id: "b",
          project_name: "Beta",
          client_name: "Acme",
          department: "Design",
          wip_contract_price: 500,
          wip_billings_to_date: 100,
          active: false,
        }),
      ),
    ];

    const csv = buildWipScheduleCsv(rows);
    const lines = csv.split("\n");

    expect(lines[0]).toContain("Remaining Revenue");
    expect(csv).toContain("Alpha");
    expect(csv).toContain("Beta");
    expect(csv).toContain("Construction totals");
    expect(csv).toContain("Design totals");
    expect(csv).toContain("Grand totals");
    expect(csv).toContain("600");
    expect(csv).toContain("400");
    expect(csv).toContain("1000");
  });
});
