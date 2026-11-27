const PDF = new Set(["application/pdf"]);
const DOCX = new Set([
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);
const TEXT = new Set(["text/plain", "text/markdown"]);

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
  return new TextDecoder("utf-8", { fatal: false }).decode(file.bytes);
}
