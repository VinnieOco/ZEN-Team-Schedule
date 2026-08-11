import { describe, expect, it } from "vitest";

import {
  createDefaultPipelinePeriod,
  formatPipelinePeriodLabel,
  resolvePipelinePeriodRange,
  shiftPipelinePeriod,
} from "@/lib/pipeline/period";

describe("pipeline period", () => {
  it("resolves year ranges and labels", () => {
    const period = {
      ...createDefaultPipelinePeriod(new Date("2026-08-11T12:00:00")),
      mode: "year" as const,
    };
    const range = resolvePipelinePeriodRange(period);
    expect(range.start.getFullYear()).toBe(2026);
    expect(range.start.getMonth()).toBe(0);
    expect(range.end.getMonth()).toBe(11);
    expect(formatPipelinePeriodLabel(period)).toBe("2026");
  });

  it("shifts year by one", () => {
    const period = {
      mode: "year" as const,
      anchor: new Date("2026-08-11T12:00:00"),
    };
    const next = shiftPipelinePeriod(period, 1);
    expect(next.anchor.getFullYear()).toBe(2027);
  });
});
