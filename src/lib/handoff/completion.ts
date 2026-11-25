const COMPLETION_PATTERNS = [
  /^Sent .+ for review$/,
  /^Accepted .+$/,
  /^Closed Phase I$/,
  /^Approved start of Phase II$/,
  /^Recorded client approval$/,
  /^Released construction$/,
  /^Released change to the field$/,
];

export function isHandoffCompletion(summary: string): boolean {
  return COMPLETION_PATTERNS.some((pattern) => pattern.test(summary.trim()));
}

export function completionSentence(projectName: string, summary: string): string {
  const text = summary.trim();
  if (text.startsWith("Sent ") && text.endsWith(" for review")) {
    const stage = text.slice("Sent ".length, -" for review".length);
    return `${stage} was sent for review on ${projectName}.`;
  }
  if (text.startsWith("Accepted ")) {
    return `${text.slice("Accepted ".length)} was accepted on ${projectName}.`;
  }
  if (text === "Closed Phase I") return `Phase I was closed on ${projectName}.`;
  if (text === "Approved start of Phase II") {
    return `Phase II was approved to start on ${projectName}.`;
  }
  if (text === "Recorded client approval") {
    return `Client approval was recorded on ${projectName}.`;
  }
  if (text === "Released construction" || text === "Released change to the field") {
    return `Work was released to the field on ${projectName}.`;
  }
  return `${text} on ${projectName}.`;
}

export function completionSubject(projectName: string, summary: string): string {
  const text = summary.trim();
  if (text.startsWith("Sent ") && text.endsWith(" for review")) {
    const stage = text.slice("Sent ".length, -" for review".length);
    return `${projectName} — ${stage} sent for review`;
  }
  if (text.startsWith("Accepted ")) {
    return `${projectName} — ${text.slice("Accepted ".length)} accepted`;
  }
  if (text === "Closed Phase I") return `${projectName} — Phase I closed`;
  if (text === "Approved start of Phase II") return `${projectName} — Phase II approved`;
  if (text === "Recorded client approval") return `${projectName} — client approval recorded`;
  if (text.startsWith("Released ")) return `${projectName} — released to the field`;
  return `${projectName} — handoff update`;
}
