import { describe, expect, it } from "vitest";

import { guideForPath } from "@/lib/chat/guide";

describe("guideForPath", () => {
  it("matches a section and its detail pages", () => {
    expect(guideForPath("/projects")?.title).toBe("Projects");
    expect(guideForPath("/projects/abc")?.title).toBe("Projects");
  });

  it("ignores pages outside the app guide", () => {
    expect(guideForPath("/login")).toBeNull();
  });
});
