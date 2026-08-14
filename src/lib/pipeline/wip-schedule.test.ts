import { describe, expect, it } from "vitest";

import {
  computeWipScheduleRow,
  formatWipMoney,
  formatWipPercent,
  groupWipRowsByDepartment,
  resolveWipInputsForMonth,
  wipScheduleJobs,
} from "@/lib/pipeline/wip-schedule";
import type { PipelineJob } from "@/lib/pipeline/types";
import type { Project, ProjectWipSnapshot } from "@/types";

function project(partial: Partial<Project> & Pick<Project, "id" | "project_name">): Project {
  return {
    client_name: "Client",
    phase: "Construction",
    budgeted_design_hours: 0,
    active: true,
    ...partial,
  };
}

describe("wip schedule formulas", () => {
  it("computes spreadsheet-style WIP totals from entered fields", () => {
    const row = computeWipScheduleRow(
      project({
        id: "p1",
        project_name: "97 Brierbrook",
        wip_contract_price: 2_165_812,
        wip_estimated_cost_to_complete: 20_407,
        wip_cost_to_date: 1_279_080,
        wip_billings_to_date: 2_084_987,
        wip_prior_fy_revenue: 850_116,
        wip_prior_fy_cost: 521_437,
      }),
    );

    expect(row.contractPrice).toBe(2_165_812);
    expect(row.estimatedTotalCost).toBe(1_299_487);
    expect(row.percentComplete).toBeCloseTo(0.9843, 3);
    expect(row.estimatedGrossProfit).toBe(866_325);
    expect(row.revenueEarnedToDate).toBeCloseTo(2_165_812 * (1_279_080 / 1_299_487), 0);
    expect(row.costsAndEarningsOverBillings).toBeGreaterThanOrEqual(0);
    expect(row.billingsOverCostsAndEarnings).toBeGreaterThanOrEqual(0);
    expect(row.priorFyGrossEarnings).toBe(850_116 - 521_437);
    expect(row.remainingRevenue).toBeCloseTo(
      2_165_812 - 2_165_812 * (1_279_080 / 1_299_487),
      0,
    );
    expect(row.backlogCostToComplete).toBe(20_407);
  });

  it("formats negatives in parentheses", () => {
    expect(formatWipMoney(-1234)).toBe("(1,234)");
    expect(formatWipPercent(0.4)).toBe("40%");
    expect(formatWipPercent(null)).toBe("—");
  });

  it("groups rows by department with preferred Design/Construction/Landscape/Interior order", () => {
    const rows = [
      computeWipScheduleRow(project({ id: "a", project_name: "A", department: "Interior" })),
      computeWipScheduleRow(project({ id: "b", project_name: "B", department: "Landscape" })),
      computeWipScheduleRow(project({ id: "c", project_name: "C", department: "Construction" })),
      computeWipScheduleRow(project({ id: "d", project_name: "D", department: "Design" })),
      computeWipScheduleRow(project({ id: "e", project_name: "E", department: "Other" })),
    ];

    const sections = groupWipRowsByDepartment(rows);
    expect(sections.map((s) => s.department)).toEqual([
      "Design",
      "Construction",
      "Landscape",
      "Interior",
      "Other",
    ]);
    expect(sections[0].rows).toHaveLength(1);
    expect(sections[0].totals.contractPrice).toBe(0);
  });

  it("includes active design and construction jobs for the WIP schedule", () => {
    const jobs = [
      { projectId: "d1", stage: "design", active: true },
      { projectId: "c1", stage: "construction", active: true },
      { projectId: "e1", stage: "estimating", active: true },
      { projectId: "d2", stage: "design", active: false },
      { projectId: "x1", stage: "closeout", active: false },
    ] as PipelineJob[];

    expect(wipScheduleJobs(jobs).map((j) => j.projectId)).toEqual(["d1", "c1"]);
    expect(wipScheduleJobs(jobs, { includeInactive: true }).map((j) => j.projectId)).toEqual([
      "d1",
      "c1",
      "d2",
      "x1",
    ]);
  });

  it("resolves month snapshots without leaking later months into earlier ones", () => {
    const snapshots: ProjectWipSnapshot[] = [
      {
        id: "s-july",
        project_id: "p1",
        as_of_month: "2026-07",
        wip_cost_to_date: 100,
      },
      {
        id: "s-aug",
        project_id: "p1",
        as_of_month: "2026-08",
        wip_cost_to_date: 250,
      },
    ];

    expect(resolveWipInputsForMonth("p1", "2026-08", snapshots).inputs.wip_cost_to_date).toBe(250);
    expect(resolveWipInputsForMonth("p1", "2026-07", snapshots).inputs.wip_cost_to_date).toBe(100);
    expect(resolveWipInputsForMonth("p1", "2026-09", snapshots).inputs.wip_cost_to_date).toBe(250);
    expect(resolveWipInputsForMonth("p1", "2026-06", snapshots).source).toBe("empty");
  });
});
