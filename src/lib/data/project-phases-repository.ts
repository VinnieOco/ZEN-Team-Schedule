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

/** Upsert current phases and delete rows removed from the project schedule. */
export async function syncProjectPhases(
  supabase: SupabaseClient,
  projectId: string,
  phases: ScheduledProjectPhase[],
): Promise<void> {
  const { data: existing, error: listError } = await supabase
    .from("project_phases")
    .select("id")
    .eq("project_id", projectId);
  if (listError) throw listError;

  const keepIds = new Set(phases.map((p) => p.id));
  const toDelete = (existing ?? []).map((row) => row.id).filter((id) => !keepIds.has(id));

  if (toDelete.length > 0) {
    const { error: deleteError } = await supabase.from("project_phases").delete().in("id", toDelete);
    if (deleteError) throw deleteError;
  }

  if (phases.length === 0) return;
  const { error: upsertError } = await supabase
    .from("project_phases")
    .upsert(phases.map(scheduledProjectPhaseToRow), { onConflict: "id" });
  if (upsertError) throw upsertError;
}
