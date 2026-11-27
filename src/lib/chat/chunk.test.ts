import { describe, expect, it } from "vitest";

import { chunkText } from "@/lib/chat/chunk";

describe("chunkText", () => {
  it("returns nothing for blank text", () => {
    expect(chunkText("   \n")).toEqual([]);
  });

  it("keeps a short note as one passage", () => {
    expect(chunkText("Call the client before the site visit.")).toEqual([
      "Call the client before the site visit.",
    ]);
  });

  it("splits long text and overlaps the passages", () => {
    const paragraph = "Confirm the irrigation zones before crews arrive. ";
    const text = paragraph.repeat(80);
    const chunks = chunkText(text, 500, 80);
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.every((chunk) => chunk.length > 0)).toBe(true);
    const firstEnd = chunks[0].slice(-40);
    expect(chunks[1].includes(firstEnd.trim().slice(-20))).toBe(true);
  });
});
