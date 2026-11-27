import { describe, expect, it } from "vitest";

import {
  ALL_SITE_INTENTS,
  reportUsesMonth,
  scheduleWeekOffsets,
  searchTerm,
  siteIntents,
  timeWindow,
} from "@/lib/chat/site-intents";

const today = new Date(2026, 10, 27);

describe("siteIntents", () => {
  it("reads every page unless the question is a how-to", () => {
    expect(siteIntents("anything new?", "/dashboard")).toEqual(ALL_SITE_INTENTS);
    expect(siteIntents("who is on the schedule next week?", "/dashboard")).toEqual(ALL_SITE_INTENTS);
  });

  it("keeps a how-to on the guide unless it also asks for records", () => {
    expect(siteIntents("explain this page", "/reports")).toEqual([]);
    expect(siteIntents("how do I add an allocation?", "/dashboard")).toEqual(["schedule"]);
  });
});

describe("schedule and time windows", () => {
  it("uses next week only when asked", () => {
    expect(scheduleWeekOffsets("who is scheduled?")).toEqual([0]);
    expect(scheduleWeekOffsets("what about next week?")).toEqual([1]);
    expect(scheduleWeekOffsets("this week and next week")).toEqual([0, 1]);
  });

  it("widens timesheets when a period is named", () => {
    expect(timeWindow("hours logged", today).label).toBe("the last 7 days");
    expect(timeWindow("older timesheets", today).label).toBe("the last 90 days");
    expect(timeWindow("timesheet for last month", today).label).toBe("October 2026");
    expect(timeWindow("hours in March 2025", today).label).toBe("March 2025");
    expect(timeWindow("last 30 days of time", today).label).toBe("the last 30 days");
    expect(reportUsesMonth("utilization this month")).toBe(true);
  });

  it("uses a project or client name as the search term", () => {
    expect(searchTerm("what's the budget for Harbor Point?")).toBe("harbor");
    expect(searchTerm("show next week's schedule")).toBeNull();
  });
});
