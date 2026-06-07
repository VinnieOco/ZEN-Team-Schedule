import type { SupabaseClient } from "@supabase/supabase-js";

import type { QueueStatePersistence } from "@/lib/queue/queue-state";
import type { QueueStateSnapshot } from "@/lib/queue/queue-state-types";
import type { QueueKind } from "@/lib/queue/types";

export async function listQueueState(supabase: SupabaseClient): Promise<QueueStateSnapshot> {
  const [stagesRes, membershipsRes, columnsRes] = await Promise.all([
    supabase.from("queue_project_stages").select("project_id, queue_kind, stage"),
    supabase.from("queue_memberships").select("project_id, queue_kind, membership"),
    supabase
      .from("queue_column_positions")
      .select("queue_kind, stage, project_id, position")
      .order("position"),
  ]);

  if (stagesRes.error) throw stagesRes.error;
  if (membershipsRes.error) throw membershipsRes.error;
  if (columnsRes.error) throw columnsRes.error;

  return {
    stages: (stagesRes.data ?? []).map((row) => ({
      project_id: row.project_id,
      queue_kind: row.queue_kind as QueueKind,
      stage: row.stage,
    })),
    memberships: (membershipsRes.data ?? []).map((row) => ({
      project_id: row.project_id,
      queue_kind: row.queue_kind as QueueKind,
      membership: row.membership as "member" | "excluded",
    })),
    columnPositions: (columnsRes.data ?? []).map((row) => ({
      queue_kind: row.queue_kind as QueueKind,
      stage: row.stage,
      project_id: row.project_id,
      position: row.position,
    })),
  };
}

export function createQueueStatePersistence(supabase: SupabaseClient): QueueStatePersistence {
  return {
    async upsertStage(projectId, kind, stage) {
      const { error } = await supabase.from("queue_project_stages").upsert({
        project_id: projectId,
        queue_kind: kind,
        stage,
      });
      if (error) throw error;
    },

    async deleteStage(projectId, kind) {
      const { error } = await supabase
        .from("queue_project_stages")
        .delete()
        .eq("project_id", projectId)
        .eq("queue_kind", kind);
      if (error) throw error;
    },

    async upsertMembership(projectId, kind, membership) {
      const { error } = await supabase.from("queue_memberships").upsert({
        project_id: projectId,
        queue_kind: kind,
        membership,
      });
      if (error) throw error;
    },

    async deleteMembership(projectId, kind) {
      const { error } = await supabase
        .from("queue_memberships")
        .delete()
        .eq("project_id", projectId)
        .eq("queue_kind", kind);
      if (error) throw error;
    },

    async replaceColumnOrder(kind, stage, projectIds) {
      const { error: deleteError } = await supabase
        .from("queue_column_positions")
        .delete()
        .eq("queue_kind", kind)
        .eq("stage", stage);
      if (deleteError) throw deleteError;

      if (projectIds.length === 0) return;

      const { error: insertError } = await supabase.from("queue_column_positions").insert(
        projectIds.map((projectId, position) => ({
          queue_kind: kind,
          stage,
          project_id: projectId,
          position,
        })),
      );
      if (insertError) throw insertError;
    },

    async replaceAll(snapshot) {
      const { error: stageDeleteError } = await supabase
        .from("queue_project_stages")
        .delete()
        .neq("project_id", "00000000-0000-0000-0000-000000000000");
      if (stageDeleteError) throw stageDeleteError;

      const { error: membershipDeleteError } = await supabase
        .from("queue_memberships")
        .delete()
        .neq("project_id", "00000000-0000-0000-0000-000000000000");
      if (membershipDeleteError) throw membershipDeleteError;

      const { error: columnDeleteError } = await supabase
        .from("queue_column_positions")
        .delete()
        .neq("project_id", "00000000-0000-0000-0000-000000000000");
      if (columnDeleteError) throw columnDeleteError;

      if (snapshot.stages.length > 0) {
        const { error } = await supabase.from("queue_project_stages").insert(
          snapshot.stages.map((row) => ({
            project_id: row.project_id,
            queue_kind: row.queue_kind,
            stage: row.stage,
          })),
        );
        if (error) throw error;
      }

      if (snapshot.memberships.length > 0) {
        const { error } = await supabase.from("queue_memberships").insert(
          snapshot.memberships.map((row) => ({
            project_id: row.project_id,
            queue_kind: row.queue_kind,
            membership: row.membership,
          })),
        );
        if (error) throw error;
      }

      if (snapshot.columnPositions.length > 0) {
        const { error } = await supabase.from("queue_column_positions").insert(
          snapshot.columnPositions.map((row) => ({
            queue_kind: row.queue_kind,
            stage: row.stage,
            project_id: row.project_id,
            position: row.position,
          })),
        );
        if (error) throw error;
      }
    },
  };
}
