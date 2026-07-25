import type { CompanySettings, LeadStageKind, LeadStageOption } from "@/types";
import { DEFAULT_LEAD_STAGES } from "@/types";

function slugifyStageId(label: string): string {
  const slug = label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);
  return slug || `stage_${Date.now().toString(36)}`;
}

function uniqueId(base: string, existing: LeadStageOption[]): string {
  if (!existing.some((stage) => stage.id === base)) return base;
  let n = 2;
  while (existing.some((stage) => stage.id === `${base}_${n}`)) n += 1;
  return `${base}_${n}`;
}

function isLeadStageKind(value: unknown): value is LeadStageKind {
  return value === "open" || value === "won" || value === "lost";
}

export function normalizeLeadStages(value: unknown): LeadStageOption[] {
  if (!Array.isArray(value)) return [...DEFAULT_LEAD_STAGES];

  const parsed: LeadStageOption[] = [];
  const seen = new Set<string>();
  for (const entry of value) {
    if (!entry || typeof entry !== "object") continue;
    const row = entry as { id?: unknown; label?: unknown; kind?: unknown };
    const label = typeof row.label === "string" ? row.label.trim() : "";
    if (!label) continue;
    const id =
      typeof row.id === "string" && row.id.trim()
        ? row.id.trim()
        : uniqueId(slugifyStageId(label), parsed);
    if (seen.has(id)) continue;
    seen.add(id);
    parsed.push({
      id,
      label,
      kind: isLeadStageKind(row.kind) ? row.kind : "open",
    });
  }

  if (parsed.length === 0) return [...DEFAULT_LEAD_STAGES];

  // Ensure terminal stages always exist so win-rate / convert logic stays stable.
  if (!parsed.some((stage) => stage.kind === "won")) {
    parsed.push({ id: "won", label: "Won", kind: "won" });
  }
  if (!parsed.some((stage) => stage.kind === "lost")) {
    parsed.push({ id: "lost", label: "Lost", kind: "lost" });
  }
  if (!parsed.some((stage) => stage.kind === "open")) {
    parsed.unshift({ id: "new", label: "New", kind: "open" });
  }

  return parsed;
}

export function resolveLeadStages(settings: CompanySettings): LeadStageOption[] {
  return normalizeLeadStages(settings.lead_stages);
}

export function leadStageOptions(
  settings: CompanySettings,
): { value: string; label: string; kind: LeadStageKind }[] {
  return resolveLeadStages(settings).map((stage) => ({
    value: stage.id,
    label: stage.label,
    kind: stage.kind,
  }));
}

export function openLeadStageIds(settings: CompanySettings): string[] {
  return resolveLeadStages(settings)
    .filter((stage) => stage.kind === "open")
    .map((stage) => stage.id);
}

export function leadStageLabel(settings: CompanySettings, status: string): string {
  return resolveLeadStages(settings).find((stage) => stage.id === status)?.label ?? status;
}

export function leadStageKind(
  settings: CompanySettings,
  status: string,
): LeadStageKind | null {
  return resolveLeadStages(settings).find((stage) => stage.id === status)?.kind ?? null;
}

export function appendLeadStage(
  settings: CompanySettings,
  label: string,
): LeadStageOption[] | null {
  const trimmed = label.trim();
  if (!trimmed) return null;
  const current = resolveLeadStages(settings);
  if (current.some((stage) => stage.label.toLowerCase() === trimmed.toLowerCase())) {
    return null;
  }
  const id = uniqueId(slugifyStageId(trimmed), current);
  // Insert new open stages before terminal won/lost columns.
  const terminal = current.filter((stage) => stage.kind !== "open");
  const open = current.filter((stage) => stage.kind === "open");
  return [...open, { id, label: trimmed, kind: "open" }, ...terminal];
}

export function renameLeadStage(
  settings: CompanySettings,
  id: string,
  label: string,
): LeadStageOption[] | null {
  const trimmed = label.trim();
  if (!trimmed) return null;
  const current = resolveLeadStages(settings);
  if (!current.some((stage) => stage.id === id)) return null;
  if (
    current.some(
      (stage) => stage.id !== id && stage.label.toLowerCase() === trimmed.toLowerCase(),
    )
  ) {
    return null;
  }
  return current.map((stage) => (stage.id === id ? { ...stage, label: trimmed } : stage));
}

export function removeLeadStage(
  settings: CompanySettings,
  id: string,
): LeadStageOption[] | null {
  const current = resolveLeadStages(settings);
  const target = current.find((stage) => stage.id === id);
  if (!target) return null;
  // Keep terminal stages; only open stages can be removed.
  if (target.kind !== "open") return null;
  const next = current.filter((stage) => stage.id !== id);
  if (!next.some((stage) => stage.kind === "open")) return null;
  return next;
}

export function moveLeadStage(
  settings: CompanySettings,
  id: string,
  direction: -1 | 1,
): LeadStageOption[] | null {
  const current = resolveLeadStages(settings);
  const index = current.findIndex((stage) => stage.id === id);
  if (index === -1) return null;
  const target = index + direction;
  if (target < 0 || target >= current.length) return null;
  // Don't reorder terminal kinds past each other in weird ways — allow any swap
  // within the list so admins can control kanban column order.
  const next = [...current];
  const [moved] = next.splice(index, 1);
  next.splice(target, 0, moved);
  return next;
}
