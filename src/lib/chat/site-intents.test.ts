import { describe, expect, it } from "vitest";

import {
  ALL_SITE_INTENTS,
  describeHoursBudget,
  projectChoice,
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
    expect(timeWindow("hours logged", today).label).toBe("all time");
    expect(timeWindow("older timesheets", today).label).toBe("all time");
    expect(timeWindow("hours logged", today).bounded).toBe(false);
    expect(timeWindow("timesheet for last month", today).label).toBe("October 2026");
    expect(timeWindow("hours in March 2025", today).label).toBe("March 2025");
    expect(timeWindow("last 30 days of time", today).label).toBe("the last 30 days");
    expect(reportUsesMonth("utilization this month")).toBe(true);
  });

  it("uses a project or client name as the search term", () => {
    expect(searchTerm("what's the budget for Harbor Point?")).toBe("harbor");
    expect(searchTerm("what's the address and phone for Harbor Point?")).toBe("harbor");
    expect(searchTerm("project contact email for Meadow")).toBe("meadow");
    expect(searchTerm("show next week's schedule")).toBeNull();
  });
});

describe("projectChoice", () => {
  const smith = [
    { project_name: "Harbor Point", client_name: "Smith" },
    { project_name: "Meadow Lane", client_name: "Smith" },
  ];

  it("asks which project when a client has more than one", () => {
    const choice = projectChoice("what's the address for Smith?", "smith", smith);
    expect(choice).toEqual({
      action: "ask",
      client: "Smith",
      names: ["Harbor Point", "Meadow Lane"],
    });
  });

  it("uses the named project when the question includes it", () => {
    expect(projectChoice("address for Harbor Point", "smith", smith)).toEqual({
      action: "focus",
      term: "harbor",
    });
  });

  it("lists every project when the question asks for all of them", () => {
    expect(projectChoice("list all of Smith's projects", "smith", smith)).toBeNull();
  });
});

describe("describeHoursBudget", () => {
  it("compares logged hours with the design-hour budget", () => {
    expect(describeHoursBudget(120, 80)).toBe("120h budget, 80h logged, 40h remaining, under budget");
    expect(describeHoursBudget(120, 145)).toBe("120h budget, 145h logged, 25h over budget");
    expect(describeHoursBudget(40, 40)).toBe("40h budget, 40h logged, on budget");
    expect(describeHoursBudget(0, 12)).toBe("no hour budget, 12h logged");
  });
});
