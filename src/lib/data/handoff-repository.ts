import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import {
  emptyBundle,
  ensureBundle,
  type HandoffActivityEntry,
  type HandoffBundle,
  type HandoffItem,
  type HandoffStage,
  type HandoffSubjectKind,
  type HandoffWorkflow,
  type StageStatus,
  type SubjectRef,
} from "@/lib/handoff/model";

const LOCAL_PREFIX = "zen-handoff:";

interface WorkflowRow {
  id: string;
  project_id: string;
  subject_kind: HandoffSubjectKind;
  subject_id: string;
}

interface StageRow {
  id: string;
  workflow_id: string;
  stage_key: string;
  status: StageStatus;
  sort_order: number;
  notes: string;
  budget_amount: number | null;
  schedule_text: string;
  approval_url: string;
  return_reason: string;
}

interface ItemRow {
  id: string;
  stage_id: string;
  template_key: string | null;
  label: string;
  required: boolean;
  state: HandoffItem["state"];
  na_reason: string;
  hidden: boolean;
  sort_order: number;
}

interface ActivityRow {
  id: string;
  stage_id: string;
  project_id: string;
  actor_initials: string;
  summary: string;
  created_at: string;
}

function localKey(projectId: string): string {
  return `${LOCAL_PREFIX}${projectId}`;
}

function readLocal(projectId: string): HandoffBundle {
  if (typeof window === "undefined") return emptyBundle();
  const raw = window.localStorage.getItem(localKey(projectId));
  if (!raw) return emptyBundle();
  try {
    return JSON.parse(raw) as HandoffBundle;
  } catch {
    return emptyBundle();
  }
}

function writeLocal(projectId: string, bundle: HandoffBundle) {
  window.localStorage.setItem(localKey(projectId), JSON.stringify(bundle));
}

function missingTable(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  return error.code === "42P01" || error.code === "PGRST205" || /handoff_/i.test(error.message ?? "");
}

function assemble(
  workflows: WorkflowRow[],
  stages: StageRow[],
  items: ItemRow[],
  activity: ActivityRow[],
): HandoffBundle {
  return {
    workflows: workflows.map((workflow) => ({
      id: workflow.id,
      projectId: workflow.project_id,
      subjectKind: workflow.subject_kind,
      subjectId: workflow.subject_id,
      stages: stages
        .filter((stage) => stage.workflow_id === workflow.id)
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((stage) => ({
          id: stage.id,
          workflowId: stage.workflow_id,
          stageKey: stage.stage_key,
          status: stage.status,
          sortOrder: stage.sort_order,
          notes: stage.notes ?? "",
          budgetAmount: stage.budget_amount == null ? null : Number(stage.budget_amount),
          scheduleText: stage.schedule_text ?? "",
          approvalUrl: stage.approval_url ?? "",
          returnReason: stage.return_reason ?? "",
          items: items
            .filter((item) => item.stage_id === stage.id)
            .sort((a, b) => a.sort_order - b.sort_order)
            .map(mapItem),
          activity: activity
            .filter((entry) => entry.stage_id === stage.id)
            .sort((a, b) => b.created_at.localeCompare(a.created_at))
            .map(mapActivity),
        })),
    })),
  };
}

function mapItem(row: ItemRow): HandoffItem {
  return {
    id: row.id,
    stageId: row.stage_id,
    templateKey: row.template_key,
    label: row.label,
    required: row.required,
    state: row.state,
    naReason: row.na_reason ?? "",
    hidden: row.hidden ?? false,
    sortOrder: row.sort_order,
  };
}

function mapActivity(row: ActivityRow): HandoffActivityEntry {
  return {
    id: row.id,
    stageId: row.stage_id,
    projectId: row.project_id,
    actorInitials: row.actor_initials,
    summary: row.summary,
    createdAt: row.created_at,
  };
}

async function loadSupabase(projectId: string): Promise<HandoffBundle | "local"> {
  const supabase = createClient();
  const { data: workflows, error } = await supabase
    .from("handoff_workflows")
    .select("id, project_id, subject_kind, subject_id")
    .eq("project_id", projectId);
  if (error) {
    if (missingTable(error)) return "local";
    throw error;
  }
  const workflowIds = (workflows ?? []).map((row) => row.id);
  if (workflowIds.length === 0) return { workflows: [] };

  const stages = await supabase
    .from("handoff_stages")
    .select(
      "id, workflow_id, stage_key, status, sort_order, notes, budget_amount, schedule_text, approval_url, return_reason",
    )
    .in("workflow_id", workflowIds);
  if (stages.error) throw stages.error;
  const stageIds = (stages.data ?? []).map((row) => row.id);
  const [itemResult, activityResult] = await Promise.all([
    stageIds.length
      ? supabase
          .from("handoff_checklist_items")
          .select("id, stage_id, template_key, label, required, state, na_reason, hidden, sort_order")
          .in("stage_id", stageIds)
      : Promise.resolve({ data: [], error: null }),
    stageIds.length
      ? supabase
          .from("handoff_activity")
          .select("id, stage_id, project_id, actor_initials, summary, created_at")
          .in("stage_id", stageIds)
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (itemResult.error) throw itemResult.error;
  if (activityResult.error) throw activityResult.error;
  return assemble(
    (workflows ?? []) as WorkflowRow[],
    (stages.data ?? []) as StageRow[],
    (itemResult.data ?? []) as ItemRow[],
    (activityResult.data ?? []) as ActivityRow[],
  );
}

function stageRow(stage: HandoffStage) {
  return {
    id: stage.id,
    workflow_id: stage.workflowId,
    stage_key: stage.stageKey,
    status: stage.status,
    sort_order: stage.sortOrder,
    notes: stage.notes,
    budget_amount: stage.budgetAmount,
    schedule_text: stage.scheduleText,
    approval_url: stage.approvalUrl,
    return_reason: stage.returnReason,
  };
}

function itemRow(item: HandoffItem) {
  return {
    id: item.id,
    stage_id: item.stageId,
    template_key: item.templateKey,
    label: item.label,
    required: item.required,
    state: item.state,
    na_reason: item.naReason,
    hidden: item.hidden,
    sort_order: item.sortOrder,
  };
}

async function saveSupabase(
  previous: HandoffBundle,
  next: HandoffBundle,
  activity: HandoffActivityEntry[],
  userId: string | null,
) {
  const supabase = createClient();
  if (next.workflows.length > 0) {
    const { error } = await supabase.from("handoff_workflows").upsert(
      next.workflows.map((workflow) => ({
        id: workflow.id,
        project_id: workflow.projectId,
        subject_kind: workflow.subjectKind,
        subject_id: workflow.subjectId,
      })),
      { onConflict: "id" },
    );
    if (error) throw error;
  }

  const stages = next.workflows.flatMap((workflow) => workflow.stages);
  if (stages.length > 0) {
    const { error } = await supabase.from("handoff_stages").upsert(stages.map(stageRow), {
      onConflict: "id",
    });
    if (error) throw error;
  }

  const items = stages.flatMap((stage) => stage.items);
  const previousItems = new Set(
    previous.workflows.flatMap((workflow) => workflow.stages.flatMap((stage) => stage.items.map((item) => item.id))),
  );
  const nextItems = new Set(items.map((item) => item.id));
  const removed = [...previousItems].filter((id) => !nextItems.has(id));
  if (removed.length > 0) {
    const { error } = await supabase.from("handoff_checklist_items").delete().in("id", removed);
    if (error) throw error;
  }
  if (items.length > 0) {
    const { error } = await supabase.from("handoff_checklist_items").upsert(items.map(itemRow), {
      onConflict: "id",
    });
    if (error) throw error;
  }

  if (activity.length > 0) {
    const { error } = await supabase.from("handoff_activity").insert(
      activity.map((entry) => ({
        id: entry.id,
        stage_id: entry.stageId,
        project_id: entry.projectId,
        actor_user_id: userId,
        actor_initials: entry.actorInitials,
        summary: entry.summary,
      })),
    );
    if (error) throw error;
  }
}

function needsSeed(before: HandoffBundle, after: HandoffBundle): boolean {
  if (before.workflows.length !== after.workflows.length) return true;
  for (const workflow of after.workflows) {
    const previous = before.workflows.find((candidate) => candidate.id === workflow.id);
    if (!previous || previous.stages.length !== workflow.stages.length) return true;
    for (const stage of workflow.stages) {
      const old = previous.stages.find((candidate) => candidate.id === stage.id);
      if (!old || old.items.length !== stage.items.length) return true;
    }
  }
  return false;
}

export async function loadHandoff(
  projectId: string,
  subjects: SubjectRef[],
): Promise<{ bundle: HandoffBundle; stored: HandoffBundle; source: "supabase" | "local"; seeded: boolean }> {
  let stored = emptyBundle();
  let source: "supabase" | "local" = "local";
  if (isSupabaseConfigured()) {
    const loaded = await loadSupabase(projectId);
    if (loaded !== "local") {
      stored = loaded;
      source = "supabase";
    } else {
      stored = readLocal(projectId);
    }
  } else {
    stored = readLocal(projectId);
  }
  const bundle = ensureBundle(stored, projectId, subjects);
  return { bundle, stored, source, seeded: needsSeed(stored, bundle) };
}

export async function persistHandoff(
  projectId: string,
  previous: HandoffBundle,
  next: HandoffBundle,
  activity: HandoffActivityEntry[],
  userId: string | null,
  source: "supabase" | "local",
): Promise<HandoffBundle> {
  if (source === "local" || !isSupabaseConfigured()) {
    writeLocal(projectId, next);
    return next;
  }
  try {
    await saveSupabase(previous, next, activity, userId);
    const reloaded = await loadSupabase(projectId);
    return reloaded === "local" ? next : reloaded;
  } catch (error) {
    if (missingTable(error as { code?: string; message?: string })) {
      writeLocal(projectId, next);
      return next;
    }
    throw error;
  }
}

export function listWorkflows(bundle: HandoffBundle): HandoffWorkflow[] {
  return bundle.workflows;
}
