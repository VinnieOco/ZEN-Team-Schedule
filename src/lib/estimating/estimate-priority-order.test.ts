import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";

import {
  getEstimatePriorityOrder,
  setEstimatePriorityOrder,
} from "@/lib/estimating/estimate-priority-order";
import { sortEstimatePriorityItems } from "@/lib/estimating/metrics";
import type { Estimate } from "@/types";

function estimate(
  partial: Partial<Estimate> & Pick<Estimate, "id" | "due_date">,
): Estimate {
  return {
    client_name: "Acme",
    title: "Job",
    estimate_type: "budget",
    stage: "pricing",
    result: "pending",
    amount: 0,
    revision_number: 1,
    checklist: [],
    sort_order: 0,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    estimator_id: "est-1",
    ...partial,
  } as Estimate;
}

describe("estimate priority order", () => {
  const store = new Map<string, string>();

  beforeEach(() => {
    store.clear();
    const localStorage = {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
      removeItem: (key: string) => {
        store.delete(key);
      },
    };
    vi.stubGlobal("window", { localStorage });
    vi.stubGlobal("localStorage", localStorage);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("persists and restores estimator order", () => {
    setEstimatePriorityOrder("est-1", ["b", "a", "c"]);
    expect(getEstimatePriorityOrder("est-1")).toEqual(["b", "a", "c"]);
  });

  it("sortEstimatePriorityItems uses saved order instead of due date", () => {
    const items = [
      estimate({ id: "a", due_date: "2026-01-01" }),
      estimate({ id: "b", due_date: "2026-01-10" }),
      estimate({ id: "c", due_date: "2026-01-05" }),
    ];

    setEstimatePriorityOrder("est-1", ["c", "a", "b"]);
    expect(sortEstimatePriorityItems(items, "est-1").map((e) => e.id)).toEqual([
      "c",
      "a",
      "b",
    ]);
  });

  it("falls back to due date when no saved order exists", () => {
    const items = [
      estimate({ id: "a", due_date: "2026-01-10" }),
      estimate({ id: "b", due_date: "2026-01-01" }),
    ];
    expect(sortEstimatePriorityItems(items, "est-1").map((e) => e.id)).toEqual([
      "b",
      "a",
    ]);
  });
});
