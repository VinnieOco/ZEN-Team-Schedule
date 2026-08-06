import { describe, expect, it } from "vitest";

import {
  classifyDueBucket,
  matchesDueFocus,
  parsePipelineFocus,
  togglePipelineFocus,
} from "@/lib/pipeline/focus";

describe("pipeline list focus", () => {
  const now = new Date("2026-07-15T12:00:00"); // Wednesday

  it("parses known focus values and falls back to all", () => {
    expect(parsePipelineFocus("overdue")).toBe("overdue");
    expect(parsePipelineFocus("follow_ups")).toBe("follow_ups");
    expect(parsePipelineFocus("nope")).toBe("all");
    expect(parsePipelineFocus(null)).toBe("all");
  });

  it("toggles the same focus back to all", () => {
    expect(togglePipelineFocus("overdue", "overdue")).toBe("all");
    expect(togglePipelineFocus("all", "overdue")).toBe("overdue");
  });

  it("classifies due buckets", () => {
    expect(classifyDueBucket(new Date("2026-07-10T12:00:00"), now)).toBe("overdue");
    expect(classifyDueBucket(new Date("2026-07-15T12:00:00"), now)).toBe("today");
    expect(classifyDueBucket(new Date("2026-07-16T12:00:00"), now)).toBe("tomorrow");
    expect(classifyDueBucket(new Date("2026-07-17T12:00:00"), now)).toBe("this_week");
    expect(classifyDueBucket(new Date("2026-07-22T12:00:00"), now)).toBe("next_week");
  });

  it("matches calendar-week due_week focus", () => {
    expect(matchesDueFocus(new Date("2026-07-15T12:00:00"), "due_week", now)).toBe(true);
    expect(matchesDueFocus(new Date("2026-07-19T12:00:00"), "due_week", now)).toBe(true);
    expect(matchesDueFocus(new Date("2026-07-22T12:00:00"), "due_week", now)).toBe(false);
    expect(matchesDueFocus(null, "due_week", now)).toBe(false);
  });

  it("returns null for non-date focuses", () => {
    expect(matchesDueFocus(new Date("2026-07-15"), "unassigned", now)).toBeNull();
    expect(matchesDueFocus(new Date("2026-07-15"), "follow_ups", now)).toBeNull();
  });
});
