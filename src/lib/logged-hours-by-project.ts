import type { Project, TimeEntry } from "@/types";

export interface LoggedHoursSlice {
  key: string;
  label: string;
  hours: number;
}

export function getLoggedHoursByProject(
  entries: TimeEntry[],
  getProjectById: (id: string) => Project | undefined,
): LoggedHoursSlice[] {
  const map = new Map<string, { label: string; hours: number }>();

  for (const entry of entries) {
    if (entry.hours <= 0) continue;

    let key: string;
    let label: string;

    if (entry.project_id) {
      const project = getProjectById(entry.project_id);
      key = entry.project_id;
      label = project
        ? `${project.client_name} · ${project.project_name}`
        : "Unknown project";
    } else {
      const task = entry.task_name?.trim() || "Non-project time";
      key = `task:${task.toLowerCase()}`;
      label = task;
    }

    const existing = map.get(key);
    if (existing) {
      existing.hours += entry.hours;
    } else {
      map.set(key, { label, hours: entry.hours });
    }
  }

  return [...map.entries()]
    .map(([key, { label, hours }]) => ({ key, label, hours }))
    .sort((a, b) => b.hours - a.hours);
}
