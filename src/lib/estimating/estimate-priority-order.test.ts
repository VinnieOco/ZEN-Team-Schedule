import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";

import {
  getEstimatePriorityMutationEpoch,
  getEstimatePriorityOrder,
  getEstimatePriorityRevision,
  hydrateEstimatePriorityOrders,
  initEstimatePriorityPersistence,
  ordersFromPositionRows,
  positionRowsFromOrders,
  setEstimatePriorityOrder,
  subscribeEstimatePriorityOrders,
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
    initEstimatePriorityPersistence(null, { useRemote: false });
    hydrateEstimatePriorityOrders({});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("persists and restores estimator order", () => {
    setEstimatePriorityOrder("est-1", ["b", "a", "c"]);
    expect(getEstimatePriorityOrder("est-1")).toEqual(["b", "a", "c"]);
  });

  it("round-trips position rows", () => {
    const map = ordersFromPositionRows([
      { estimator_id: "est-1", estimate_id: "b", position: 0 },
      { estimator_id: "est-1", estimate_id: "a", position: 1 },
    ]);
    expect(map["priority:est-1"]).toEqual(["b", "a"]);
    expect(positionRowsFromOrders(map)).toEqual([
      { estimator_id: "est-1", estimate_id: "b", position: 0 },
      { estimator_id: "est-1", estimate_id: "a", position: 1 },
    ]);
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

  it("ignores a stale snapshot after a newer drag", () => {
    const epoch = getEstimatePriorityMutationEpoch();
    setEstimatePriorityOrder("est-1", ["a", "b"]);
    expect(
      hydrateEstimatePriorityOrders({ "priority:est-1": ["b", "a"] }, epoch),
    ).toBe(false);
    expect(getEstimatePriorityOrder("est-1")).toEqual(["a", "b"]);
  });

  it("notifies subscribers when the saved order changes", () => {
    const seen: number[] = [];
    const unsubscribe = subscribeEstimatePriorityOrders(() => {
      seen.push(getEstimatePriorityRevision());
    });
    setEstimatePriorityOrder("est-1", ["c", "b", "a"]);
    unsubscribe();
    expect(seen.length).toBe(1);
    expect(getEstimatePriorityOrder("est-1")).toEqual(["c", "b", "a"]);
  });

  it("breaks position ties by estimate id", () => {
    const map = ordersFromPositionRows([
      { estimator_id: "est-1", estimate_id: "b", position: 0 },
      { estimator_id: "est-1", estimate_id: "a", position: 0 },
    ]);
    expect(map["priority:est-1"]).toEqual(["a", "b"]);
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
