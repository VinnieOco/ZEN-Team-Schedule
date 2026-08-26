import { describe, expect, it } from "vitest";

import {
  buildEstimateDueBuckets,
  estimateRowAccentClass,
  isEstimateAwaitingSubmission,
  isEstimateDueOverdue,
  matchesEstimateListFocus,
} from "@/lib/estimating/metrics";
import type { Estimate } from "@/types";

function estimate(partial: Partial<Estimate> & Pick<Estimate, "id">): Estimate {
  return {
    client_name: "Acme",
    estimate_type: "budget",
    revision_number: 0,
    stage: "pricing",
    result: "pending",
    checklist: [],
    sort_order: 0,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    due_date: "2026-08-01",
    ...partial,
  };
}

const now = new Date("2026-08-20T12:00:00");

describe("submitted estimates are not past due", () => {
  it("marks open past-due packages awaiting submission as overdue", () => {
    const open = estimate({ id: "e1", stage: "pricing", due_date: "2026-08-01" });
    expect(isEstimateAwaitingSubmission(open)).toBe(true);
    expect(isEstimateDueOverdue(open, now)).toBe(true);
    expect(estimateRowAccentClass(open, now)).toBe("bg-rose-500");
  });

  it("does not treat submitted stage as overdue even with a past due date", () => {
    const submitted = estimate({
      id: "e2",
      stage: "submitted",
      due_date: "2026-08-01",
      submitted_date: "2026-08-05",
    });
    expect(isEstimateAwaitingSubmission(submitted)).toBe(false);
    expect(isEstimateDueOverdue(submitted, now)).toBe(false);
    expect(estimateRowAccentClass(submitted, now)).toBe("bg-violet-500");
  });

  it("does not treat submitted_date alone as overdue", () => {
    const withDate = estimate({
      id: "e3",
      stage: "pricing",
      due_date: "2026-08-01",
      submitted_date: "2026-08-10",
    });
    expect(isEstimateAwaitingSubmission(withDate)).toBe(false);
    expect(isEstimateDueOverdue(withDate, now)).toBe(false);
  });

  it("does not treat follow_up as overdue for the submit-by due date", () => {
    const followUp = estimate({
      id: "e4",
      stage: "follow_up",
      due_date: "2026-08-01",
    });
    expect(isEstimateAwaitingSubmission(followUp)).toBe(false);
    expect(isEstimateDueOverdue(followUp, now)).toBe(false);
    expect(estimateRowAccentClass(followUp, now)).toBe("bg-orange-500");
  });

  it("excludes submitted packages from overdue due buckets and overdue focus", () => {
    const estimates = [
      estimate({ id: "open", stage: "pricing", due_date: "2026-08-01" }),
      estimate({
        id: "sub",
        stage: "submitted",
        due_date: "2026-08-01",
        submitted_date: "2026-08-05",
      }),
    ];
    const buckets = buildEstimateDueBuckets(estimates, now);
    expect(buckets.overdue).toBe(1);
    expect(matchesEstimateListFocus(estimates[0]!, "overdue", now)).toBe(true);
    expect(matchesEstimateListFocus(estimates[1]!, "overdue", now)).toBe(false);
  });
});
