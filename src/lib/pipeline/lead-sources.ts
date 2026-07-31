import type { CompanySettings, LeadSourceOption } from "@/types";
import { DEFAULT_LEAD_SOURCES } from "@/types";

function slugifySourceId(label: string): string {
  const slug = label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);
  return slug || `source_${Date.now().toString(36)}`;
}

function uniqueId(base: string, existing: LeadSourceOption[]): string {
  if (!existing.some((source) => source.id === base)) return base;
  let n = 2;
  while (existing.some((source) => source.id === `${base}_${n}`)) n += 1;
  return `${base}_${n}`;
}

export function normalizeLeadSources(value: unknown): LeadSourceOption[] {
  if (!Array.isArray(value)) return [...DEFAULT_LEAD_SOURCES];

  const parsed: LeadSourceOption[] = [];
  const seen = new Set<string>();
  for (const entry of value) {
    if (!entry || typeof entry !== "object") continue;
    const row = entry as { id?: unknown; label?: unknown };
    const label = typeof row.label === "string" ? row.label.trim() : "";
    if (!label) continue;
    const id =
      typeof row.id === "string" && row.id.trim()
        ? row.id.trim()
        : uniqueId(slugifySourceId(label), parsed);
    if (seen.has(id)) continue;
    seen.add(id);
    parsed.push({ id, label });
  }

  return parsed.length > 0 ? parsed : [...DEFAULT_LEAD_SOURCES];
}

export function resolveLeadSources(settings: CompanySettings): LeadSourceOption[] {
  return normalizeLeadSources(settings.lead_sources);
}

export function leadSourceOptions(
  settings: CompanySettings,
): { value: string; label: string }[] {
  return resolveLeadSources(settings).map((source) => ({
    value: source.id,
    label: source.label,
  }));
}

export function leadSourceLabelFromSettings(
  settings: CompanySettings | undefined,
  source: string,
): string {
  if (!settings) {
    return DEFAULT_LEAD_SOURCES.find((s) => s.id === source)?.label ?? source;
  }
  return resolveLeadSources(settings).find((s) => s.id === source)?.label ?? source;
}

export function defaultLeadSourceId(settings: CompanySettings): string {
  const sources = resolveLeadSources(settings);
  return sources.find((s) => s.id === "other")?.id ?? sources[0]?.id ?? "other";
}

export function appendLeadSource(
  settings: CompanySettings,
  label: string,
): LeadSourceOption[] | null {
  const trimmed = label.trim();
  if (!trimmed) return null;
  const current = resolveLeadSources(settings);
  if (current.some((source) => source.label.toLowerCase() === trimmed.toLowerCase())) {
    return null;
  }
  const id = uniqueId(slugifySourceId(trimmed), current);
  return [...current, { id, label: trimmed }];
}

export function renameLeadSource(
  settings: CompanySettings,
  id: string,
  label: string,
): LeadSourceOption[] | null {
  const trimmed = label.trim();
  if (!trimmed) return null;
  const current = resolveLeadSources(settings);
  if (!current.some((source) => source.id === id)) return null;
  if (
    current.some(
      (source) => source.id !== id && source.label.toLowerCase() === trimmed.toLowerCase(),
    )
  ) {
    return null;
  }
  return current.map((source) => (source.id === id ? { ...source, label: trimmed } : source));
}

export function removeLeadSource(
  settings: CompanySettings,
  id: string,
): LeadSourceOption[] | null {
  const current = resolveLeadSources(settings);
  if (!current.some((source) => source.id === id)) return null;
  const next = current.filter((source) => source.id !== id);
  if (next.length === 0) return null;
  return next;
}

export function moveLeadSource(
  settings: CompanySettings,
  id: string,
  direction: -1 | 1,
): LeadSourceOption[] | null {
  const current = resolveLeadSources(settings);
  const index = current.findIndex((source) => source.id === id);
  if (index === -1) return null;
  const target = index + direction;
  if (target < 0 || target >= current.length) return null;
  const next = [...current];
  const [moved] = next.splice(index, 1);
  next.splice(target, 0, moved);
  return next;
}
