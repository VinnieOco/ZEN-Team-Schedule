import { describe, expect, it } from "vitest";

import { isMeetingNotesFile, knowledgeDocumentTitle } from "@/lib/chat/extract";

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

describe("isMeetingNotesFile", () => {
  it("accepts pdf and word documents", () => {
    expect(isMeetingNotesFile({ name: "Kickoff.pdf", type: "" })).toBe(true);
    expect(isMeetingNotesFile({ name: "Site visit.docx", type: "" })).toBe(true);
    expect(isMeetingNotesFile({ name: "scan.doc", type: "" })).toBe(true);
    expect(isMeetingNotesFile({ name: "notes.txt", type: "text/plain" })).toBe(false);
  });
});
