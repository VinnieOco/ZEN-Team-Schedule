import type { SupabaseClient } from "@supabase/supabase-js";

import {
  mapScheduledProjectPhase,
  scheduledProjectPhaseToRow,
} from "@/lib/data/mappers";
import type { ScheduledProjectPhase } from "@/types";

export async function listProjectPhases(
  supabase: SupabaseClient,
): Promise<ScheduledProjectPhase[]> {
  const { data, error } = await supabase
    .from("project_phases")
    .select("*")
    .order("project_id")
    .order("sort_order");
  if (error) throw error;
  return (data ?? []).map(mapScheduledProjectPhase);
}

export async function upsertProjectPhases(
  supabase: SupabaseClient,
  phases: ScheduledProjectPhase[],
): Promise<void> {
  if (phases.length === 0) return;
  const { error } = await supabase
    .from("project_phases")
    .upsert(phases.map(scheduledProjectPhaseToRow), { onConflict: "id" });
  if (error) throw error;
}

export async function insertProjectPhases(
  supabase: SupabaseClient,
  phases: ScheduledProjectPhase[],
): Promise<void> {
  if (phases.length === 0) return;
  const { error } = await supabase.from("project_phases").insert(phases.map(scheduledProjectPhaseToRow));
  if (error) throw error;
}
