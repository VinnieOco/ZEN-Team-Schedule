import type { CompanySettings } from "@/types";

function uniqueSorted(values: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const trimmed = value.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(trimmed);
  }
  return result.sort((a, b) => a.localeCompare(b));
}

export function resolveClassCodes(settings: CompanySettings): string[] {
  return uniqueSorted(settings.class_codes ?? []);
}

export function getClassCodeOptions(
  settings: CompanySettings,
  inUseCodes: string[] = [],
): string[] {
  return uniqueSorted([...resolveClassCodes(settings), ...inUseCodes]);
}

export function appendClassCode(
  settings: CompanySettings,
  code: string,
): string[] | null {
  const trimmed = code.trim();
  if (!trimmed) return null;
  const current = resolveClassCodes(settings);
  if (current.some((c) => c.toLowerCase() === trimmed.toLowerCase())) return null;
  return uniqueSorted([...current, trimmed]);
}

export function removeFromList(list: string[], value: string): string[] {
  const target = value.trim().toLowerCase();
  return list.filter((item) => item.trim().toLowerCase() !== target);
}
