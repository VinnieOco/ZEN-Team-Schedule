import { describe, expect, it } from "vitest";

import { knowledgeDocumentTitle } from "@/lib/chat/extract";

describe("knowledgeDocumentTitle", () => {
  it("uses the file name when there is no folder", () => {
    expect(knowledgeDocumentTitle("Irrigation SOP.pdf")).toBe("Irrigation SOP");
  });

  it("keeps folder names from a directory upload", () => {
    expect(knowledgeDocumentTitle("SOP.pdf", "Safety/Field/SOP.pdf")).toBe("Safety / Field / SOP");
  });

  it("drops empty and parent path parts", () => {
    expect(knowledgeDocumentTitle("notes.md", "../Crew/../notes.md")).toBe("Crew / notes");
  });
});
