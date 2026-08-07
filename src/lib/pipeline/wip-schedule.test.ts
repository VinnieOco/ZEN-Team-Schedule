import { describe, expect, it } from "vitest";

import {
  computeWipScheduleRow,
  formatWipMoney,
  formatWipPercent,
  groupWipRowsByDepartment,
} from "@/lib/pipeline/wip-schedule";
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

describe("wip schedule formulas", () => {
  it("computes spreadsheet-style WIP totals from entered fields", () => {
    const row = computeWipScheduleRow(
      project({
        id: "p1",
        project_name: "97 Brierbrook",
        estimate_value: 2_165_812,
        wip_estimated_cost_to_complete: 20_407,
        wip_cost_to_date: 1_279_080,
        wip_billings_to_date: 2_084_987,
        wip_prior_fy_revenue: 850_116,
        wip_prior_fy_cost: 521_437,
      }),
      [],
      [],
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

  it("groups rows by department with preferred Construction/Landscape/Interior order", () => {
    const rows = [
      computeWipScheduleRow(project({ id: "a", project_name: "A", department: "Interior" }), [], []),
      computeWipScheduleRow(project({ id: "b", project_name: "B", department: "Landscape" }), [], []),
      computeWipScheduleRow(
        project({ id: "c", project_name: "C", department: "Construction" }),
        [],
        [],
      ),
      computeWipScheduleRow(project({ id: "d", project_name: "D", department: "Other" }), [], []),
    ];

    const sections = groupWipRowsByDepartment(rows);
    expect(sections.map((s) => s.department)).toEqual([
      "Construction",
      "Landscape",
      "Interior",
      "Other",
    ]);
    expect(sections[0].rows).toHaveLength(1);
    expect(sections[0].totals.contractPrice).toBe(0);
  });
});