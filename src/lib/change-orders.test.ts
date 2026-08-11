import { describe, expect, it } from "vitest";

import {
  changeOrderCountsTowardEstimate,
  getChangeOrderEstimatesForProject,
  getPendingChangeOrderEstimatesForProject,
  summarizeChangeOrderEstimates,
} from "@/lib/change-orders";
import type { Estimate } from "@/types";

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
