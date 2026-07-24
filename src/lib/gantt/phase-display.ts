import type { ProjectPhase, Project } from "@/types";
import { PROJECT_PHASES } from "@/lib/project-options";
import { isEstimatingProject } from "@/lib/queue/stages";
import {
  CATEGORY_COLOR_OPTIONS,
  categoryBarColors,
  DEFAULT_CATEGORY_COLOR,
} from "@/lib/category-colors";

/** Short labels shown on Gantt phase bars. */
export const PHASE_ABBREVIATIONS: Record<string, string> = {
  Concept: "CO",
  "Schematic Design": "SD",
  Budgeting: "BUD",
  "Design Development": "DD",
  "Construction Drawings": "CD",
  "Construction Documents": "CD",
  Estimating: "EST",
  Revisions: "REV",
  Construction: "CA",
  "Construction Support": "CA",
  Closeout: "CL",
  "Change order": "CO",
};

/**
 * Soft pastel backgrounds aligned with Team Scheduling category swatches.
 * Borders and text use the same slate styling as allocation cards.
 */
const PHASE_BACKGROUND_COLORS: Record<string, string> = {
  Concept: CATEGORY_COLOR_OPTIONS[3],
  "Schematic Design": CATEGORY_COLOR_OPTIONS[0],
  Budgeting: CATEGORY_COLOR_OPTIONS[7],
  "Design Development": CATEGORY_COLOR_OPTIONS[5],
  "Construction Drawings": CATEGORY_COLOR_OPTIONS[0],
  "Construction Documents": CATEGORY_COLOR_OPTIONS[0],
  Estimating: CATEGORY_COLOR_OPTIONS[5],
  Revisions: CATEGORY_COLOR_OPTIONS[4],
  Construction: CATEGORY_COLOR_OPTIONS[2],
  "Construction Support": CATEGORY_COLOR_OPTIONS[2],
  Closeout: CATEGORY_COLOR_OPTIONS[6],
  "Change order": CATEGORY_COLOR_OPTIONS[9],
  Schedule: CATEGORY_COLOR_OPTIONS[7],
};

export function phaseAbbreviation(phaseKey: string): string {
  return PHASE_ABBREVIATIONS[phaseKey] ?? phaseKey.slice(0, 3).toUpperCase();
}

export function phaseBarColors(phaseKey: string) {
  const bg = PHASE_BACKGROUND_COLORS[phaseKey] ?? DEFAULT_CATEGORY_COLOR;
  return categoryBarColors(bg);
}

export function defaultPhaseKeysForProject(project: Project): ProjectPhase[] {
  if (isEstimatingProject(project.department, project.phase)) {
    return ["Estimating", "Revisions", "Closeout"];
  }
  return PROJECT_PHASES.filter((p) => p !== "Estimating");
}
