import { buildHandleMap } from "@/lib/todos/handles";
import type { Employee } from "@/types";

const MENTION_PATTERN = /@([a-zA-Z0-9][a-zA-Z0-9._-]*)/g;

export function parseMentionHandles(text: string): string[] {
  const handles = new Set<string>();
  for (const match of text.matchAll(MENTION_PATTERN)) {
    const handle = match[1]?.toLowerCase();
    if (handle) handles.add(handle);
  }
  return [...handles];
}

export function resolveMentionedEmployees(text: string, employees: Employee[]): Employee[] {
  const handleMap = buildHandleMap(employees);
  const mentioned: Employee[] = [];
  const seen = new Set<string>();

  for (const handle of parseMentionHandles(text)) {
    const employee = handleMap.get(handle);
    if (!employee || seen.has(employee.id)) continue;
    seen.add(employee.id);
    mentioned.push(employee);
  }

  return mentioned;
}

export interface MentionSegment {
  type: "text" | "mention";
  value: string;
  handle?: string;
  employee?: Employee;
}

export function splitMentionSegments(text: string, employees: Employee[]): MentionSegment[] {
  const handleMap = buildHandleMap(employees);
  const segments: MentionSegment[] = [];
  let lastIndex = 0;

  for (const match of text.matchAll(MENTION_PATTERN)) {
    const full = match[0];
    const handle = match[1]?.toLowerCase();
    const index = match.index ?? 0;

    if (index > lastIndex) {
      segments.push({ type: "text", value: text.slice(lastIndex, index) });
    }

    if (handle && handleMap.has(handle)) {
      segments.push({
        type: "mention",
        value: full,
        handle,
        employee: handleMap.get(handle),
      });
    } else {
      segments.push({ type: "text", value: full });
    }

    lastIndex = index + full.length;
  }

  if (lastIndex < text.length) {
    segments.push({ type: "text", value: text.slice(lastIndex) });
  }

  return segments.length > 0 ? segments : [{ type: "text", value: text }];
}
