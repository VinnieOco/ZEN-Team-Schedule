import type { QueueKind } from "@/lib/queue/types";

export function queueDropId(kind: QueueKind, stage: string): string {
  return `queue::${kind}::${stage}`;
}

export function parseQueueDropId(
  id: string,
): { kind: QueueKind; stage: string } | null {
  const parts = id.split("::");
  if (parts.length !== 3 || parts[0] !== "queue") return null;
  const kind = parts[1];
  if (kind !== "design" && kind !== "estimating") return null;
  return { kind, stage: parts[2] };
}
