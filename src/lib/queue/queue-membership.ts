import { isEstimatingProject } from "@/lib/queue/stages";
import type { QueueKind } from "@/lib/queue/types";
import type { Project } from "@/types";

const MEMBER_KEYS: Record<QueueKind, string> = {
  design: "zen-queue-design-members",
  estimating: "zen-queue-estimating-members",
};

const EXCLUDED_KEYS: Record<QueueKind, string> = {
  design: "zen-queue-design-excluded",
  estimating: "zen-queue-estimating-excluded",
};

function loadSet(key: string): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as string[]);
  } catch {
    return new Set();
  }
}

function saveSet(key: string, ids: Set<string>): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify([...ids]));
}

function isMember(kind: QueueKind, projectId: string): boolean {
  return loadSet(MEMBER_KEYS[kind]).has(projectId);
}

function isExcluded(kind: QueueKind, projectId: string): boolean {
  return loadSet(EXCLUDED_KEYS[kind]).has(projectId);
}

function addMember(kind: QueueKind, projectId: string): void {
  const members = loadSet(MEMBER_KEYS[kind]);
  members.add(projectId);
  saveSet(MEMBER_KEYS[kind], members);
}

function removeMember(kind: QueueKind, projectId: string): void {
  const members = loadSet(MEMBER_KEYS[kind]);
  members.delete(projectId);
  saveSet(MEMBER_KEYS[kind], members);
}

function addExcluded(kind: QueueKind, projectId: string): void {
  const excluded = loadSet(EXCLUDED_KEYS[kind]);
  excluded.add(projectId);
  saveSet(EXCLUDED_KEYS[kind], excluded);
}

function removeExcluded(kind: QueueKind, projectId: string): void {
  const excluded = loadSet(EXCLUDED_KEYS[kind]);
  excluded.delete(projectId);
  saveSet(EXCLUDED_KEYS[kind], excluded);
}

/** Design queue: non-Estimating projects by default, plus explicit adds, minus removals. */
export function isInDesignQueue(project: Project): boolean {
  if (isExcluded("design", project.id)) return false;
  if (isMember("design", project.id)) return true;
  return !isEstimatingProject(project.department, project.phase);
}

/** Estimating queue: Estimating dept/phase by default, plus explicit adds, minus removals. */
export function isInEstimatingQueue(project: Project): boolean {
  if (isExcluded("estimating", project.id)) return false;
  if (isMember("estimating", project.id)) return true;
  return isEstimatingProject(project.department, project.phase);
}

export function isInQueue(kind: QueueKind, project: Project): boolean {
  return kind === "design" ? isInDesignQueue(project) : isInEstimatingQueue(project);
}

export function addProjectToQueue(kind: QueueKind, projectId: string): void {
  removeExcluded(kind, projectId);
  addMember(kind, projectId);
}

export function removeProjectFromQueue(kind: QueueKind, projectId: string): void {
  addExcluded(kind, projectId);
  removeMember(kind, projectId);
}
