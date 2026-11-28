const PDF = new Set(["application/pdf"]);
const DOCX = new Set([
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);
const DOC = new Set(["application/msword"]);
const TEXT = new Set(["text/plain", "text/markdown"]);

function isLegacyWordName(name: string): boolean {
  const lower = name.toLowerCase();
  return lower.endsWith(".doc") && !lower.endsWith(".docx");
}

/** Title stored for a file, keeping folder names when a directory was uploaded. */
export function knowledgeDocumentTitle(name: string, relativePath?: string): string {
  const source = (relativePath || name).replace(/\\/g, "/");
  const withoutExtension = source.replace(/\.[^.\/]+$/, "");
  const parts = withoutExtension
    .split("/")
    .map((part) => part.trim())
    .filter((part) => part && part !== "." && part !== "..");
  return parts.join(" / ").slice(0, 180) || "Untitled";
}

/** PDF and Word files (.doc and .docx) stored as a project's client meeting notes. */
export function isMeetingNotesFile(file: { name: string; type: string }): boolean {
  const name = file.name.toLowerCase();
  if (name.endsWith(".pdf") || PDF.has(file.type)) return true;
  if (name.endsWith(".docx") || DOCX.has(file.type)) return true;
  if (isLegacyWordName(name) || DOC.has(file.type)) return true;
  return false;
}

export function isSupportedKnowledgeFile(file: { name: string; type: string }): boolean {
  const name = file.name.toLowerCase();
  if (name.endsWith(".pdf") || PDF.has(file.type)) return true;
  if (name.endsWith(".docx") || DOCX.has(file.type)) return true;
  if (name.endsWith(".txt") || name.endsWith(".md") || TEXT.has(file.type)) return true;
  return false;
}

export async function extractKnowledgeText(file: {
  name: string;
  type: string;
  bytes: Uint8Array;
}): Promise<string> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".pdf") || PDF.has(file.type)) {
    const { extractText, getDocumentProxy } = await import("unpdf");
    const pdf = await getDocumentProxy(file.bytes);
    const { text } = await extractText(pdf, { mergePages: true });
    return Array.isArray(text) ? text.join("\n\n") : text;
  }
  if (name.endsWith(".docx") || DOCX.has(file.type)) {
    const mammoth = await import("mammoth");
    const result = await mammoth.extractRawText({ buffer: Buffer.from(file.bytes) });
    return result.value;
  }
  if (isLegacyWordName(name) || DOC.has(file.type)) {
    const imported = (await import("word-extractor")) as {
      default?: new () => { extract: (source: Buffer) => Promise<{ getBody: () => string }> };
    };
    const WordExtractor = imported.default;
    if (!WordExtractor) throw new Error("Could not read this Word file.");
    const document = await new WordExtractor().extract(Buffer.from(file.bytes));
    return document.getBody();
  }
  return new TextDecoder("utf-8", { fatal: false }).decode(file.bytes);
}
