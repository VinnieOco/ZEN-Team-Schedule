import type { CompanySettings, SchedulingFilters } from "@/types";

/** Company settings adjusted for the scheduling page weekend visibility toggle. */
export function schedulingViewSettings(
  settings: CompanySettings,
  filters: Pick<SchedulingFilters, "showWeekend">,
): CompanySettings {
  return { ...settings, include_weekends: filters.showWeekend };
}
