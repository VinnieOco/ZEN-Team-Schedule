import type { SupabaseClient } from "@supabase/supabase-js";

import { listAllRows } from "@/lib/data/list-all-rows";
import { mapProjectWipSnapshot, projectWipSnapshotToRow } from "@/lib/data/mappers";
import type { ProjectWipSnapshot } from "@/types";

export async function listProjectWipSnapshots(
  supabase: SupabaseClient,
): Promise<ProjectWipSnapshot[]> {
  const data = await listAllRows(supabase, "project_wip_snapshots", [
    { column: "project_id" },
    { column: "as_of_month" },
    { column: "id" },
  ]);
  return data.map((row) =>
    mapProjectWipSnapshot(row as Parameters<typeof mapProjectWipSnapshot>[0]),
  );
}

export async function upsertProjectWipSnapshot(
  supabase: SupabaseClient,
  snapshot: ProjectWipSnapshot,
): Promise<ProjectWipSnapshot> {
  const { data: existing, error: existingError } = await supabase
    .from("project_wip_snapshots")
    .select("id")
    .eq("project_id", snapshot.project_id)
    .eq("as_of_month", snapshot.as_of_month)
    .maybeSingle();
  if (existingError) throw existingError;

  const row = projectWipSnapshotToRow({
    ...snapshot,
    id: existing?.id ?? snapshot.id,
  });

  const { data, error } = await supabase
    .from("project_wip_snapshots")
    .upsert(row, { onConflict: "id" })
    .select("*")
    .single();
  if (error) throw error;
  return mapProjectWipSnapshot(data as Parameters<typeof mapProjectWipSnapshot>[0]);
}
