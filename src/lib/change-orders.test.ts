import { describe, expect, it } from "vitest";

import {
  buildWonEstimateFromLegacyChangeOrder,
  changeOrderCountsTowardEstimate,
  findEstimateConvertedFromLegacyCo,
  findHoursProjectForEstimate,
  getChangeOrderEstimatesForProject,
  getPendingChangeOrderEstimatesForProject,
  HOURS_PROJECT_NOTE_PREFIX,
  LEGACY_CO_PROJECT_NOTE_PREFIX,
  legacyChangeOrdersNeedingConversion,
  summarizeChangeOrderEstimates,
  withHoursProjectNote,
  wonChangeOrdersNeedingHoursProject,
} from "@/lib/change-orders";
import type { Estimate, Project } from "@/types";

function estimate(partial: Partial<Estimate> & Pick<Estimate, "id">): Estimate {
  return {
    client_name: "Client",
    estimate_type: "change_order",
    revision_number: 0,
    stage: "submitted",
    result: "pending",
    checklist: [],
    sort_order: 0,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    ...partial,
  };
}

function project(partial: Partial<Project> & Pick<Project, "id" | "project_name">): Project {
  return {
    client_name: "Client",
    department: "Construction",
    phase: "Construction",
    budgeted_design_hours: 0,
    active: true,
    ...partial,
  };
}

describe("change order project packages", () => {
  it("only counts won packages toward rollup and won list", () => {
    const estimates = [
      estimate({
        id: "1",
        project_id: "p1",
        stage: "submitted",
        result: "pending",
        amount: 10_000,
      }),
      estimate({
        id: "2",
        project_id: "p1",
        stage: "won",
        result: "won",
        amount: 25_000,
        won_date: "2026-08-01",
      }),
      estimate({
        id: "3",
        project_id: "p1",
        stage: "pricing",
        result: "pending",
        amount: 5_000,
      }),
      estimate({
        id: "4",
        project_id: "p1",
        stage: "lost",
        result: "lost",
        amount: 8_000,
      }),
    ];

    expect(changeOrderCountsTowardEstimate(estimates[0]!)).toBe(false);
    expect(changeOrderCountsTowardEstimate(estimates[1]!)).toBe(true);

    const listed = getChangeOrderEstimatesForProject(estimates, "p1");
    expect(listed.map((e) => e.id)).toEqual(["2"]);

    const summary = summarizeChangeOrderEstimates(estimates, "p1");
    expect(summary.count).toBe(1);
    expect(summary.totalAmount).toBe(25_000);
  });

  it("lists open packages as pending and excludes lost", () => {
    const estimates = [
      estimate({
        id: "1",
        project_id: "p1",
        stage: "submitted",
        result: "pending",
        amount: 10_000,
      }),
      estimate({
        id: "2",
        project_id: "p1",
        stage: "won",
        result: "won",
        amount: 25_000,
      }),
      estimate({
        id: "3",
        project_id: "p1",
        stage: "lost",
        result: "lost",
        amount: 8_000,
      }),
      estimate({
        id: "4",
        project_id: "p1",
        stage: "pricing",
        result: "pending",
        amount: 5_000,
      }),
    ];

    const pending = getPendingChangeOrderEstimatesForProject(estimates, "p1");
    expect(pending.map((e) => e.id).sort()).toEqual(["1", "4"]);
  });
});

describe("legacy change order conversion", () => {
  it("builds a won package marked with legacy + hours project ids", () => {
    const parent = project({ id: "parent", project_name: "Main Job" });
    const co = project({
      id: "co-1",
      project_name: "Main Job — CO-01",
      parent_project_id: "parent",
      is_change_order: true,
      estimate_value: 12_500,
      contract_date: "2026-07-01",
      lead_estimator_id: "est-1",
    });

    const converted = buildWonEstimateFromLegacyChangeOrder(co, parent, "pkg-1");
    expect(converted.project_id).toBe("parent");
    expect(converted.estimate_type).toBe("change_order");
    expect(converted.stage).toBe("won");
    expect(converted.result).toBe("won");
    expect(converted.amount).toBe(12_500);
    expect(converted.title).toBe("Main Job — CO-01");
    expect(converted.notes).toContain(`${LEGACY_CO_PROJECT_NOTE_PREFIX}co-1`);
    expect(converted.notes).toContain(`${HOURS_PROJECT_NOTE_PREFIX}co-1`);
    expect(findEstimateConvertedFromLegacyCo([converted], "co-1")?.id).toBe("pkg-1");
    expect(findHoursProjectForEstimate([co], converted)?.id).toBe("co-1");
  });

  it("only lists legacy COs that still need conversion", () => {
    const projects = [
      project({ id: "parent", project_name: "Main" }),
      project({
        id: "co-a",
        project_name: "CO A",
        parent_project_id: "parent",
        is_change_order: true,
        estimate_value: 1_000,
      }),
      project({
        id: "co-b",
        project_name: "CO B",
        parent_project_id: "parent",
        is_change_order: true,
        estimate_value: 2_000,
      }),
    ];
    const estimates = [
      estimate({
        id: "pkg-a",
        project_id: "parent",
        stage: "won",
        result: "won",
        notes: `${LEGACY_CO_PROJECT_NOTE_PREFIX}co-a ${HOURS_PROJECT_NOTE_PREFIX}co-a`,
      }),
    ];

    const needing = legacyChangeOrdersNeedingConversion(projects, estimates, "parent");
    expect(needing.map((p) => p.id)).toEqual(["co-b"]);
  });

  it("flags won packages that lost their hours project", () => {
    const projects = [project({ id: "parent", project_name: "Main" })];
    const estimates = [
      estimate({
        id: "pkg-a",
        project_id: "parent",
        stage: "won",
        result: "won",
        amount: 5_000,
        notes: `${HOURS_PROJECT_NOTE_PREFIX}missing-co`,
      }),
      estimate({
        id: "pkg-b",
        project_id: "parent",
        stage: "won",
        result: "won",
        amount: 2_000,
        notes: withHoursProjectNote(undefined, "still-here"),
      }),
    ];
    const withHours = [
      ...projects,
      project({
        id: "still-here",
        project_name: "CO B",
        parent_project_id: "parent",
        is_change_order: true,
      }),
    ];

    expect(
      wonChangeOrdersNeedingHoursProject(projects, estimates, "parent").map((e) => e.id),
    ).toEqual(["pkg-a", "pkg-b"]);
    expect(
      wonChangeOrdersNeedingHoursProject(withHours, estimates, "parent").map((e) => e.id),
    ).toEqual(["pkg-a"]);
  });
});
