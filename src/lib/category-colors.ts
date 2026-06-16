/** Preset swatches for new allocation / time-entry categories */
export const CATEGORY_COLOR_OPTIONS = [
  "#dbeafe",
  "#dcfce7",
  "#fef3c7",
  "#e0e7ff",
  "#fce7f3",
  "#f3e8ff",
  "#f1f5f9",
  "#ecfdf5",
  "#fee2e2",
  "#ffedd5",
] as const;

export const DEFAULT_CATEGORY_COLOR = CATEGORY_COLOR_OPTIONS[0];

/** Matches allocation cards on Team Scheduling (`border-slate-200/90`). */
export const CATEGORY_BAR_BORDER = "rgba(226, 232, 240, 0.9)";

/** Matches allocation card title text (`text-slate-900`). */
export const CATEGORY_BAR_TEXT = "#0f172a";

export function categoryBarColors(backgroundColor: string) {
  return {
    bg: backgroundColor,
    border: CATEGORY_BAR_BORDER,
    text: CATEGORY_BAR_TEXT,
  };
}
