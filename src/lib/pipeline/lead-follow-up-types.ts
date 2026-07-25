import type { CompanySettings, LeadFollowUp, LeadFollowUpTypeOption } from "@/types";
import { DEFAULT_LEAD_FOLLOW_UP_TYPES } from "@/types";

function slugifyTypeId(label: string): string {
  const slug = label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);
  return slug || `type_${Date.now().toString(36)}`;
}

function uniqueId(base: string, existing: LeadFollowUpTypeOption[]): string {
  if (!existing.some((type) => type.id === base)) return base;
  let n = 2;
  while (existing.some((type) => type.id === `${base}_${n}`)) n += 1;
  return `${base}_${n}`;
}

export function normalizeLeadFollowUpTypes(value: unknown): LeadFollowUpTypeOption[] {
  if (!Array.isArray(value)) return [...DEFAULT_LEAD_FOLLOW_UP_TYPES];

  const parsed: LeadFollowUpTypeOption[] = [];
  const seen = new Set<string>();
  for (const entry of value) {
    if (!entry || typeof entry !== "object") continue;
    const row = entry as { id?: unknown; label?: unknown };
    const label = typeof row.label === "string" ? row.label.trim() : "";
    if (!label) continue;
    const id =
      typeof row.id === "string" && row.id.trim()
        ? row.id.trim()
        : uniqueId(slugifyTypeId(label), parsed);
    if (seen.has(id)) continue;
    seen.add(id);
    parsed.push({ id, label });
  }

  return parsed.length > 0 ? parsed : [...DEFAULT_LEAD_FOLLOW_UP_TYPES];
}

export function resolveLeadFollowUpTypes(
  settings: CompanySettings,
): LeadFollowUpTypeOption[] {
  return normalizeLeadFollowUpTypes(settings.lead_follow_up_types);
}

export function leadFollowUpTypeOptions(
  settings: CompanySettings,
): { value: string; label: string }[] {
  return resolveLeadFollowUpTypes(settings).map((type) => ({
    value: type.id,
    label: type.label,
  }));
}

export function leadFollowUpTypeLabel(
  settings: CompanySettings,
  typeId?: string | null,
): string {
  if (!typeId?.trim()) return "Follow-up";
  return (
    resolveLeadFollowUpTypes(settings).find((type) => type.id === typeId)?.label ??
    typeId
  );
}

export function defaultLeadFollowUpTypeId(settings: CompanySettings): string | undefined {
  return resolveLeadFollowUpTypes(settings)[0]?.id;
}

/** Latest (furthest-out) open follow-up for a lead, if any. */
export function latestOpenLeadFollowUp(
  followUps: LeadFollowUp[],
  leadId: string,
): LeadFollowUp | undefined {
  let latest: LeadFollowUp | undefined;
  for (const followUp of followUps) {
    if (followUp.lead_id !== leadId || followUp.completed || !followUp.due_date) continue;
    if (!latest || followUp.due_date > latest.due_date) latest = followUp;
  }
  return latest;
}

export function appendLeadFollowUpType(
  settings: CompanySettings,
  label: string,
): LeadFollowUpTypeOption[] | null {
  const trimmed = label.trim();
  if (!trimmed) return null;
  const current = resolveLeadFollowUpTypes(settings);
  if (current.some((type) => type.label.toLowerCase() === trimmed.toLowerCase())) {
    return null;
  }
  const id = uniqueId(slugifyTypeId(trimmed), current);
  return [...current, { id, label: trimmed }];
}

export function renameLeadFollowUpType(
  settings: CompanySettings,
  id: string,
  label: string,
): LeadFollowUpTypeOption[] | null {
  const trimmed = label.trim();
  if (!trimmed) return null;
  const current = resolveLeadFollowUpTypes(settings);
  if (!current.some((type) => type.id === id)) return null;
  if (
    current.some(
      (type) => type.id !== id && type.label.toLowerCase() === trimmed.toLowerCase(),
    )
  ) {
    return null;
  }
  return current.map((type) => (type.id === id ? { ...type, label: trimmed } : type));
}

export function removeLeadFollowUpType(
  settings: CompanySettings,
  id: string,
): LeadFollowUpTypeOption[] | null {
  const current = resolveLeadFollowUpTypes(settings);
  if (!current.some((type) => type.id === id)) return null;
  const next = current.filter((type) => type.id !== id);
  // Keep at least one type so new follow-ups always have a default.
  if (next.length === 0) return null;
  return next;
}

export function moveLeadFollowUpType(
  settings: CompanySettings,
  id: string,
  direction: -1 | 1,
): LeadFollowUpTypeOption[] | null {
  const current = resolveLeadFollowUpTypes(settings);
  const index = current.findIndex((type) => type.id === id);
  if (index === -1) return null;
  const target = index + direction;
  if (target < 0 || target >= current.length) return null;
  const next = [...current];
  const [moved] = next.splice(index, 1);
  next.splice(target, 0, moved);
  return next;
}
