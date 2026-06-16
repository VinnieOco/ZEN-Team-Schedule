import type { SupabaseClient } from "@supabase/supabase-js";

import { mapProjectMilestone, projectMilestoneToRow } from "@/lib/data/mappers";
import type { ProjectMilestone } from "@/types";

export async function listProjectMilestones(
  supabase: SupabaseClient,
): Promise<ProjectMilestone[]> {
  const { data, error } = await supabase
    .from("project_milestones")
    .select("*")
    .order("project_id")
    .order("sort_order")
    .order("milestone_date");
  if (error) throw error;
  return (data ?? []).map(mapProjectMilestone);
}

/** Replace all milestones for a project (delete + insert). */
export async function syncProjectMilestones(
  supabase: SupabaseClient,
  projectId: string,
  milestones: ProjectMilestone[],
): Promise<void> {
  const { error: deleteError } = await supabase
    .from("project_milestones")
    .delete()
    .eq("project_id", projectId);
  if (deleteError) throw deleteError;

  if (milestones.length === 0) return;
  const { error: insertError } = await supabase
    .from("project_milestones")
    .insert(milestones.map(projectMilestoneToRow));
  if (insertError) throw insertError;
}
