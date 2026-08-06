import type { SupabaseClient } from "@supabase/supabase-js";

import { listAllRows } from "@/lib/data/list-all-rows";
import { mapProjectMilestone, projectMilestoneToRow } from "@/lib/data/mappers";
import type { ProjectMilestone } from "@/types";

export async function listProjectMilestones(
  supabase: SupabaseClient,
): Promise<ProjectMilestone[]> {
  const data = await listAllRows(supabase, "project_milestones", [
    { column: "project_id" },
    { column: "sort_order" },
    { column: "milestone_date" },
    { column: "id" },
  ]);
  return data.map((row) =>
    mapProjectMilestone(row as Parameters<typeof mapProjectMilestone>[0]),
  );
}

/** Upsert current milestones and delete rows removed from the project. */
export async function syncProjectMilestones(
  supabase: SupabaseClient,
  projectId: string,
  milestones: ProjectMilestone[],
): Promise<void> {
  const { data: existing, error: listError } = await supabase
    .from("project_milestones")
    .select("id")
    .eq("project_id", projectId);
  if (listError) throw listError;

  const uniqueMilestones = [
    ...new Map(milestones.map((milestone) => [milestone.id, milestone])).values(),
  ];
  const keepIds = new Set(uniqueMilestones.map((m) => m.id));
  const toDelete = (existing ?? []).map((row) => row.id).filter((id) => !keepIds.has(id));

  if (toDelete.length > 0) {
    const { error: deleteError } = await supabase
      .from("project_milestones")
      .delete()
      .in("id", toDelete);
    if (deleteError) throw deleteError;
  }

  if (uniqueMilestones.length === 0) return;
  const { error: upsertError } = await supabase
    .from("project_milestones")
    .upsert(uniqueMilestones.map(projectMilestoneToRow), { onConflict: "id" });
  if (upsertError) throw upsertError;
}
