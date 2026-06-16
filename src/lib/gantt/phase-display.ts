import type { ProjectPhase, Project } from "@/types";
import { PROJECT_PHASES } from "@/lib/project-options";
import { isEstimatingProject } from "@/lib/queue/stages";

/** Short labels shown on Gantt phase bars. */
export const PHASE_ABBREVIATIONS: Record<string, string> = {
  Concept: "CO",
  "Schematic Design": "SD",
  "Design Development": "DD",
  "Construction Documents": "CD",
  Estimating: "EST",
  Revisions: "REV",
  "Construction Support": "CA",
  Closeout: "CL",
  "Change order": "CO",
};

/** Distinct bar colors per phase (Monograph-style pastels). */
export const PHASE_BAR_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  Concept: { bg: "#e0e7ff", border: "#a5b4fc", text: "#3730a3" },
  "Schematic Design": { bg: "#ccfbf1", border: "#5eead4", text: "#115e59" },
  "Design Development": { bg: "#ddd6fe", border: "#a78bfa", text: "#5b21b6" },
  "Construction Documents": { bg: "#bfdbfe", border: "#60a5fa", text: "#1e40af" },
  Estimating: { bg: "#fef3c7", border: "#fcd34d", text: "#92400e" },
  Revisions: { bg: "#fce7f3", border: "#f9a8d4", text: "#9d174d" },
  "Construction Support": { bg: "#d1fae5", border: "#6ee7b7", text: "#065f46" },
  Closeout: { bg: "#f1f5f9", border: "#94a3b8", text: "#334155" },
  "Change order": { bg: "#fff7ed", border: "#fdba74", text: "#9a3412" },
  Schedule: { bg: "#f8fafc", border: "#cbd5e1", text: "#475569" },
};

export function phaseAbbreviation(phaseKey: string): string {
  return PHASE_ABBREVIATIONS[phaseKey] ?? phaseKey.slice(0, 3).toUpperCase();
}

export function phaseBarColors(phaseKey: string) {
  return (
    PHASE_BAR_COLORS[phaseKey] ?? {
      bg: "#f1f5f9",
      border: "#cbd5e1",
      text: "#475569",
    }
  );
}

export function defaultPhaseKeysForProject(project: Project): ProjectPhase[] {
  if (isEstimatingProject(project.department, project.phase)) {
    return ["Estimating", "Revisions", "Closeout"];
  }
  return PROJECT_PHASES.filter((p) => p !== "Estimating");
}
