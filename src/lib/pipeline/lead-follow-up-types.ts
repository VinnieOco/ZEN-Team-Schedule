import { format, isBefore, parseISO, startOfDay } from "date-fns";

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

/** Compare follow-ups by due date then time (ascending). */
export function compareLeadFollowUpsByDue(
  a: Pick<LeadFollowUp, "due_date" | "due_time">,
  b: Pick<LeadFollowUp, "due_date" | "due_time">,
): number {
  const byDate = a.due_date.localeCompare(b.due_date);
  if (byDate !== 0) return byDate;
  return (a.due_time ?? "").localeCompare(b.due_time ?? "");
}

/** Latest (furthest-out) open follow-up for a lead, if any. */
export function latestOpenLeadFollowUp(
  followUps: LeadFollowUp[],
  leadId: string,
): LeadFollowUp | undefined {
  let latest: LeadFollowUp | undefined;
  for (const followUp of followUps) {
    if (followUp.lead_id !== leadId || followUp.completed || !followUp.due_date) continue;
    if (!latest || compareLeadFollowUpsByDue(followUp, latest) > 0) latest = followUp;
  }
  return latest;
}

/** Format due date + optional time for display. */
export function formatLeadFollowUpSchedule(
  dueDate: string,
  dueTime?: string | null,
  options?: { includeWeekday?: boolean },
): string {
  const includeWeekday = options?.includeWeekday ?? true;
  let dateLabel = dueDate;
  try {
    dateLabel = format(parseISO(dueDate), includeWeekday ? "EEE, MMM d, yyyy" : "MMM d");
  } catch {
    // keep raw date
  }

  const time = dueTime?.trim();
  if (!time) return dateLabel;
  const match = time.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return `${dateLabel} · ${time}`;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return `${dateLabel} · ${time}`;
  const period = hours >= 12 ? "PM" : "AM";
  const hour12 = hours % 12 === 0 ? 12 : hours % 12;
  return `${dateLabel} · ${hour12}:${String(minutes).padStart(2, "0")} ${period}`;
}

/** Whether a follow-up is overdue relative to now (date-only when no time). */
export function isLeadFollowUpScheduleOverdue(
  dueDate: string,
  dueTime?: string | null,
  now = new Date(),
): boolean {
  try {
    const time = dueTime?.trim();
    if (time) {
      const match = time.match(/^(\d{1,2}):(\d{2})/);
      if (match) {
        const [year, month, day] = dueDate.split("-").map(Number);
        const hours = Number(match[1]);
        const minutes = Number(match[2]);
        const due = new Date(year, month - 1, day, hours, minutes, 0, 0);
        return due.getTime() < now.getTime();
      }
    }
    return isBefore(parseISO(dueDate), startOfDay(now));
  } catch {
    return false;
  }
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
