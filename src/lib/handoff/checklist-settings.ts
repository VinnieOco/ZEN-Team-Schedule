export type HandoffChecklistKind = "project" | "change_order";

export interface HandoffChecklistItemSetting {
  key: string;
  label: string;
  required: boolean;
}

export interface HandoffChecklistStageDefault {
  key: string;
  items: HandoffChecklistItemSetting[];
}

export interface HandoffChecklistSettings {
  project: Record<string, HandoffChecklistItemSetting[]>;
  change_order: Record<string, HandoffChecklistItemSetting[]>;
}

export interface HandoffChecklistDefaults {
  project: HandoffChecklistStageDefault[];
  change_order: HandoffChecklistStageDefault[];
}

let activeChecklists: HandoffChecklistSettings | null = null;

export function setActiveHandoffChecklists(value: HandoffChecklistSettings | null) {
  activeChecklists = value;
}

export function activeHandoffChecklists(): HandoffChecklistSettings | null {
  return activeChecklists;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function copyItem(item: HandoffChecklistItemSetting): HandoffChecklistItemSetting {
  return { key: item.key, label: item.label, required: item.required };
}

function sanitizeItems(
  value: unknown,
  fallback: HandoffChecklistItemSetting[],
): HandoffChecklistItemSetting[] {
  if (!Array.isArray(value)) return fallback.map(copyItem);
  const items: HandoffChecklistItemSetting[] = [];
  const keys = new Set<string>();
  for (const entry of value) {
    if (!isRecord(entry)) continue;
    const key = typeof entry.key === "string" ? entry.key.trim() : "";
    const label = typeof entry.label === "string" ? entry.label.trim() : "";
    if (!key || !label || keys.has(key)) continue;
    keys.add(key);
    items.push({ key, label, required: entry.required === true });
  }
  return items;
}

function resolveKind(
  value: unknown,
  stages: HandoffChecklistStageDefault[],
): Record<string, HandoffChecklistItemSetting[]> {
  const record = isRecord(value) ? value : {};
  const result: Record<string, HandoffChecklistItemSetting[]> = {};
  for (const stage of stages) {
    if (Object.prototype.hasOwnProperty.call(record, stage.key)) {
      result[stage.key] = sanitizeItems(record[stage.key], stage.items);
    } else {
      result[stage.key] = stage.items.map(copyItem);
    }
  }
  return result;
}

export function resolveHandoffChecklists(
  value: unknown,
  defaults: HandoffChecklistDefaults,
): HandoffChecklistSettings {
  const stored = isRecord(value) ? value : {};
  return {
    project: resolveKind(stored.project, defaults.project),
    change_order: resolveKind(stored.change_order, defaults.change_order),
  };
}

function withStageItems(
  current: HandoffChecklistSettings,
  kind: HandoffChecklistKind,
  stageKey: string,
  items: HandoffChecklistItemSetting[],
): HandoffChecklistSettings {
  return {
    ...current,
    [kind]: {
      ...current[kind],
      [stageKey]: items,
    },
  };
}

export function appendHandoffChecklistItem(
  current: HandoffChecklistSettings,
  kind: HandoffChecklistKind,
  stageKey: string,
  label: string,
  required: boolean,
): HandoffChecklistSettings | null {
  const trimmed = label.trim();
  if (!trimmed) return null;
  const items = current[kind][stageKey] ?? [];
  if (items.some((item) => item.label.toLowerCase() === trimmed.toLowerCase())) return null;
  return withStageItems(current, kind, stageKey, [
    ...items,
    { key: crypto.randomUUID(), label: trimmed, required },
  ]);
}

export function removeHandoffChecklistItem(
  current: HandoffChecklistSettings,
  kind: HandoffChecklistKind,
  stageKey: string,
  key: string,
): HandoffChecklistSettings | null {
  const items = current[kind][stageKey] ?? [];
  if (!items.some((item) => item.key === key)) return null;
  return withStageItems(
    current,
    kind,
    stageKey,
    items.filter((item) => item.key !== key),
  );
}

export function renameHandoffChecklistItem(
  current: HandoffChecklistSettings,
  kind: HandoffChecklistKind,
  stageKey: string,
  key: string,
  label: string,
): HandoffChecklistSettings | null {
  const trimmed = label.trim();
  if (!trimmed) return null;
  const items = current[kind][stageKey] ?? [];
  const currentItem = items.find((item) => item.key === key);
  if (!currentItem || currentItem.label === trimmed) return null;
  if (items.some((item) => item.key !== key && item.label.toLowerCase() === trimmed.toLowerCase())) {
    return null;
  }
  return withStageItems(
    current,
    kind,
    stageKey,
    items.map((item) => (item.key === key ? { ...item, label: trimmed } : item)),
  );
}

export function setHandoffChecklistItemRequired(
  current: HandoffChecklistSettings,
  kind: HandoffChecklistKind,
  stageKey: string,
  key: string,
  required: boolean,
): HandoffChecklistSettings | null {
  const items = current[kind][stageKey] ?? [];
  const currentItem = items.find((item) => item.key === key);
  if (!currentItem || currentItem.required === required) return null;
  return withStageItems(
    current,
    kind,
    stageKey,
    items.map((item) => (item.key === key ? { ...item, required } : item)),
  );
}

export function moveHandoffChecklistItem(
  current: HandoffChecklistSettings,
  kind: HandoffChecklistKind,
  stageKey: string,
  key: string,
  direction: -1 | 1,
): HandoffChecklistSettings | null {
  const items = current[kind][stageKey] ?? [];
  const index = items.findIndex((item) => item.key === key);
  const target = index + direction;
  if (index < 0 || target < 0 || target >= items.length) return null;
  const next = items.slice();
  const [item] = next.splice(index, 1);
  next.splice(target, 0, item);
  return withStageItems(current, kind, stageKey, next);
}
