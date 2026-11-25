"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { format, parseISO } from "date-fns";
import { ChevronDown } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useScheduling } from "@/context/scheduling-context";
import { usePermissions } from "@/hooks/use-permissions";
import {
  getChangeOrderEstimatesForProject,
  getChangeOrdersForParent,
  getPendingChangeOrderEstimatesForProject,
  isChangeOrder,
} from "@/lib/change-orders";
import { loadHandoff, persistHandoff } from "@/lib/data/handoff-repository";
import { estimateDisplayName, estimateRevisionLabel } from "@/lib/estimating/metrics";
import { setActiveHandoffChecklists } from "@/lib/handoff/checklist-settings";
import { isHandoffCompletion } from "@/lib/handoff/completion";
import {
  acceptHandoff,
  addChecklistItem,
  approveStage,
  closePhaseI,
  isStageLocked,
  nextStepCopy,
  phaseBanner,
  releaseStage,
  removeChecklistItem,
  renameChecklistItem,
  returnHandoff,
  saveStageDetails,
  sendForReview,
  setItemState,
  statusLabel,
  templateFor,
  templatesFor,
  visibleChecklistItems,
  type HandoffActivityEntry,
  type HandoffBundle,
  type HandoffItem,
  type HandoffMutation,
  type HandoffStage,
  type HandoffWorkflow,
  type StageTemplate,
} from "@/lib/handoff/model";
import { formatProjectAmount } from "@/lib/project-format";
import { getEmployeeInitials } from "@/lib/week";
import { cn } from "@/lib/utils";
import type { Estimate, Project } from "@/types";

interface ProjectHandoffTabProps {
  project: Project;
  projects: Project[];
  estimates: Estimate[];
}

interface ChangeSubject {
  id: string;
  label: string;
  detail: string;
  badge?: string;
}

const INSTRUCTIONS: Record<string, string> = {
  schematic_design: "Finish the schematic package and send it for a preliminary budget and schedule.",
  preliminary_estimating: "Record the preliminary budget and schedule, then send them back.",
  phase_i_closeout: "Close Phase I after the schematic package, budget, and schedule are recorded as delivered.",
  phase_ii_approval: "Record the approval and link the signed Phase II scope and fee.",
  design_development: "Develop the approved Phase II scope and send it on.",
  construction_drawings: "Issue the construction drawings for final pricing.",
  final_estimating: "Record the final estimate and the signed contract price.",
  construction: "Release field work after the required drawings and contract are in place.",
  change_design: "Describe this change and the updated drawings, then send it to Estimating.",
  change_estimating: "Record the cost and schedule impact for this change only.",
  client_approval: "Record client approval before this change goes to the field.",
  change_construction: "Release this change after approval and updated drawings are in place.",
};

export function ProjectHandoffTab({ project, projects, estimates }: ProjectHandoffTabProps) {
  const { employees, settings } = useScheduling();
  setActiveHandoffChecklists(settings.handoff_checklists);
  const checklistKey = JSON.stringify(settings.handoff_checklists);
  const { permissions, profile } = usePermissions();
  const canEdit = permissions.editProjects;
  const parentId = project.parent_project_id ?? project.id;
  const parent = projects.find((candidate) => candidate.id === parentId) ?? project;
  const changes = useMemo(
    () => changeSubjects(parent, projects, estimates),
    [parent, projects, estimates],
  );
  const subjectKey = useMemo(() => {
    const ids = [`project:${parent.id}`, ...changes.map((change) => `change_order:${change.id}`)];
    return ids.join("|");
  }, [parent.id, changes]);

  const [bundle, setBundle] = useState<HandoffBundle>({ workflows: [] });
  const [source, setSource] = useState<"supabase" | "local">("supabase");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mailNote, setMailNote] = useState<string | null>(null);
  const bundleRef = useRef(bundle);
  const changesRef = useRef(changes);
  bundleRef.current = bundle;
  changesRef.current = changes;

  const employee = employees.find((candidate) => candidate.profile_id === profile?.id);
  const initials = employee
    ? getEmployeeInitials(employee)
    : initialsFromEmail(profile?.email ?? "");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    const subjects = [
      { kind: "project" as const, id: parent.id },
      ...changesRef.current.map((change) => ({ kind: "change_order" as const, id: change.id })),
    ];
    loadHandoff(parent.id, subjects)
      .then(async (loaded) => {
        if (cancelled) return;
        setSource(loaded.source);
        if (loaded.seeded && canEdit) {
          const saved = await persistHandoff(
            parent.id,
            loaded.stored,
            loaded.bundle,
            [],
            profile?.id ?? null,
            loaded.source,
          );
          if (!cancelled) setBundle(saved);
        } else if (!cancelled) {
          setBundle(loaded.bundle);
        }
      })
      .catch((caught: unknown) => {
        if (!cancelled) {
          setError(caught instanceof Error ? caught.message : "Could not load this handoff.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [parent.id, subjectKey, canEdit, profile?.id, checklistKey]);

  async function commit(result: HandoffMutation) {
    if (!result.ok) {
      setError(result.message);
      return;
    }
    if (result.activity.length === 0) return;
    const previous = bundleRef.current;
    setError(null);
    setBundle(result.bundle);
    try {
      const saved = await persistHandoff(
        parent.id,
        previous,
        result.bundle,
        result.activity,
        profile?.id ?? null,
        source,
      );
      setBundle(saved);
      const completions = result.activity.filter((entry) => isHandoffCompletion(entry.summary));
      if (completions.length === 0 || source !== "supabase") {
        setMailNote(null);
      } else {
        const notes: string[] = [];
        for (const entry of completions) {
          notes.push(await notifyHandoffLeads(parent.id, entry.summary));
        }
        setMailNote(notes.join(" "));
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save this handoff.");
    }
  }

  const projectWorkflow = bundle.workflows.find(
    (workflow) => workflow.subjectKind === "project" && workflow.subjectId === parent.id,
  );
  const viewingChange = isChangeOrder(project);
  const visibleChanges = viewingChange
    ? changes.filter((change) => change.id === project.id)
    : changes;

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading handoff…</p>;
  }

  return (
    <div className="space-y-4">
      {source === "local" && (
        <p className="text-sm text-amber-800">
          Handoff tables are not on the database yet, so this copy is saved in this browser only.
        </p>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}
      {mailNote && (
        <p className={cn("text-sm", mailNote.startsWith("Emailed") ? "text-emerald-800" : "text-amber-800")}>
          {mailNote}
        </p>
      )}

      {!viewingChange && projectWorkflow && (
        <WorkflowBoard
          bundle={bundle}
          workflow={projectWorkflow}
          heading="Original scope"
          scope={parent.scope_of_work?.trim() || "No scope of work is saved on this project yet."}
          dueLabel={dueLabel(parent)}
          canEdit={canEdit}
          initials={initials}
          onCommit={commit}
        />
      )}

      {visibleChanges.map((change) => {
        const workflow = bundle.workflows.find(
          (candidate) => candidate.subjectKind === "change_order" && candidate.subjectId === change.id,
        );
        if (!workflow) return null;
        return (
          <ChangeOrderBoard
            key={change.id}
            change={change}
            workflow={workflow}
            bundle={bundle}
            canEdit={canEdit}
            initials={initials}
            onCommit={commit}
            startOpen={viewingChange}
          />
        );
      })}

      {!viewingChange && !projectWorkflow && !error && (
        <p className="text-sm text-muted-foreground">This handoff is not available yet.</p>
      )}
    </div>
  );
}

function WorkflowBoard({
  bundle,
  workflow,
  heading,
  scope,
  dueLabel: due,
  canEdit,
  initials,
  onCommit,
  embedded = false,
}: {
  bundle: HandoffBundle;
  workflow: HandoffWorkflow;
  heading: string;
  scope: string;
  dueLabel?: string;
  canEdit: boolean;
  initials: string;
  onCommit: (result: HandoffMutation) => Promise<void>;
  embedded?: boolean;
}) {
  const templates = templatesFor(workflow.subjectKind);
  const firstOpen = workflow.stages.find((stage) => stage.status === "open" || stage.status === "returned");
  const [selectedId, setSelectedId] = useState(firstOpen?.id ?? workflow.stages[0]?.id ?? "");
  const selected = workflow.stages.find((stage) => stage.id === selectedId) ?? workflow.stages[0];
  const banner = phaseBanner(workflow);

  useEffect(() => {
    if (!workflow.stages.some((stage) => stage.id === selectedId)) {
      setSelectedId(firstOpen?.id ?? workflow.stages[0]?.id ?? "");
    }
  }, [workflow, selectedId, firstOpen?.id]);

  if (!selected) return null;
  const template = templateFor(workflow.subjectKind, selected.stageKey);
  if (!template) return null;

  return (
    <div className="space-y-3">
      {!embedded && (
        <div>
          <h2 className="text-sm font-semibold text-slate-900">{heading}</h2>
          <ClampedScope text={scope} />
        </div>
      )}
      {banner && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
          {banner}
        </p>
      )}
      <div className="grid items-start gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
        <Card>
          <CardContent className="space-y-2 p-3">
            <p className="px-1 text-xs font-medium text-muted-foreground">{heading} · Handoff stages</p>
            {workflow.stages.map((stage, index) => {
              const stageTemplate = templates[index];
              if (!stageTemplate) return null;
              const locked = isStageLocked(workflow, stage.stageKey);
              const active = stage.id === selected.id;
              const visible = visibleChecklistItems(stage, stageTemplate);
              return (
                <button
                  key={stage.id}
                  type="button"
                  onClick={() => setSelectedId(stage.id)}
                  className={cn(
                    "w-full rounded-lg border px-3 py-2.5 text-left",
                    active
                      ? "border-emerald-600 bg-emerald-50"
                      : "border-slate-200 bg-white hover:bg-slate-50",
                  )}
                >
                  <span className="flex items-start gap-2">
                    <span
                      className={cn(
                        "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold",
                        active ? "bg-emerald-700 text-white" : "bg-slate-100 text-slate-600",
                      )}
                    >
                      {index + 1}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-medium text-slate-900">{stageTemplate.title}</span>
                      <span className="mt-0.5 block text-xs text-muted-foreground">
                        {listStatus(workflow, stage, stageTemplate, locked)}
                      </span>
                    </span>
                  </span>
                  {visible.length > 0 && (
                    <span className="mt-2 block space-y-0.5 pl-7">
                      {visible.map((item) => (
                        <span key={item.id} className="flex items-start gap-1.5 text-xs text-slate-600">
                          <span className="mt-1 size-1.5 shrink-0 rounded-full bg-slate-300" />
                          <span className={cn(item.state === "done" && "text-slate-400 line-through")}>
                            {item.label}
                          </span>
                        </span>
                      ))}
                    </span>
                  )}
                </button>
              );
            })}
          </CardContent>
        </Card>
        <StageDetail
          bundle={bundle}
          workflow={workflow}
          stage={selected}
          template={template}
          dueLabel={due}
          canEdit={canEdit}
          initials={initials}
          onCommit={onCommit}
        />
      </div>
    </div>
  );
}

function StageDetail({
  bundle,
  workflow,
  stage,
  template,
  dueLabel: due,
  canEdit,
  initials,
  onCommit,
}: {
  bundle: HandoffBundle;
  workflow: HandoffWorkflow;
  stage: HandoffStage;
  template: StageTemplate;
  dueLabel?: string;
  canEdit: boolean;
  initials: string;
  onCommit: (result: HandoffMutation) => Promise<void>;
}) {
  const locked = isStageLocked(workflow, stage.stageKey);
  const editable = canEdit && !locked && (stage.status === "open" || stage.status === "returned");
  const inReview = canEdit && stage.status === "in_review";
  const visible = visibleChecklistItems(stage, template);
  const complete = visible.filter((item) => item.state === "done" || item.state === "na").length;
  const [editing, setEditing] = useState(false);
  const [activityOpen, setActivityOpen] = useState(false);
  const [budget, setBudget] = useState(stage.budgetAmount == null ? "" : String(stage.budgetAmount));
  const [schedule, setSchedule] = useState(stage.scheduleText);
  const [link, setLink] = useState(stage.approvalUrl);
  const [newItem, setNewItem] = useState("");
  const [naItemId, setNaItemId] = useState<string | null>(null);
  const [naReason, setNaReason] = useState("");
  const [returning, setReturning] = useState(false);
  const [returnReason, setReturnReason] = useState("");
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    setBudget(stage.budgetAmount == null ? "" : String(stage.budgetAmount));
    setSchedule(stage.scheduleText);
    setLink(stage.approvalUrl);
    setEditing(false);
    setReturning(false);
    setNotice(null);
    setActivityOpen(false);
  }, [stage.id, stage.status]);

  const amount = parseAmount(budget);
  const extrasReady =
    !template.extras || (amount != null && amount > 0 && schedule.trim().length > 0);
  const requiredReady = visible.every((item) => !item.required || item.state === "done");
  const owner = holder(stage, template, locked);

  async function run(result: HandoffMutation) {
    if (!result.ok) {
      setNotice(result.message);
      return;
    }
    setNotice(null);
    await onCommit(result);
  }

  async function saveDetails() {
    await run(
      saveStageDetails(
        bundle,
        stage.id,
        {
          budgetAmount: template.extras ? amount : stage.budgetAmount,
          scheduleText: template.extras ? schedule : stage.scheduleText,
          approvalUrl: template.kind === "approval" ? link : stage.approvalUrl,
        },
        initials,
      ),
    );
  }

  async function send() {
    const details = saveStageDetails(
      bundle,
      stage.id,
      {
        budgetAmount: template.extras ? amount : undefined,
        scheduleText: template.extras ? schedule : undefined,
      },
      initials,
    );
    const base = details.ok ? details.bundle : bundle;
    const sent = sendForReview(base, stage.id, initials);
    if (!sent.ok) {
      setNotice(sent.message);
      return;
    }
    setNotice(null);
    await onCommit({
      ok: true,
      bundle: sent.bundle,
      activity: [...(details.ok ? details.activity : []), ...sent.activity],
    });
  }

  const sendLabel = template.nextOwner ? `Send to ${template.nextOwner}` : "Send for review";
  const canSend = editable && requiredReady && extrasReady;

  return (
    <Card className="lg:sticky lg:top-4">
      <CardContent className="space-y-4 p-4 sm:p-5">
        <div>
          <p className="text-xs text-muted-foreground">Who has it now</p>
          <p className="text-sm font-semibold text-slate-900">{owner}</p>
          <p className="mt-2 text-sm text-slate-700">{INSTRUCTIONS[template.key] ?? template.scope}</p>
          <p className="mt-1 text-sm text-muted-foreground">{nextStepCopy(workflow, stage, template)}</p>
          {due && (
            <p className="mt-3 text-sm">
              <span className="text-muted-foreground">Due </span>
              <span className="font-medium">{due}</span>
            </p>
          )}
        </div>

        {stage.status === "returned" && stage.returnReason && (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
            Returned for revisions: {stage.returnReason}
          </p>
        )}

        {template.extras && (
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1 text-sm">
              <span className="font-medium text-slate-800">
                {template.extras === "impact" ? "Cost impact" : "Preliminary construction budget"}
              </span>
              <Input
                inputMode="decimal"
                value={budget}
                disabled={!editable}
                placeholder="0"
                onChange={(event) => setBudget(event.target.value)}
                onBlur={() => void saveDetails()}
              />
              {template.extras === "budget_schedule" && (
                <span className="block text-xs text-muted-foreground">
                  Separate from the final estimate and signed contract price.
                </span>
              )}
            </label>
            <label className="space-y-1 text-sm">
              <span className="font-medium text-slate-800">
                {template.extras === "impact" ? "Schedule impact" : "Preliminary construction schedule"}
              </span>
              <Input
                value={schedule}
                disabled={!editable}
                placeholder="Timing for this stage"
                onChange={(event) => setSchedule(event.target.value)}
                onBlur={() => void saveDetails()}
              />
            </label>
          </div>
        )}

        {template.kind === "approval" && (
          <label className="block space-y-1 text-sm">
            <span className="font-medium text-slate-800">
              {template.key === "phase_ii_approval"
                ? "Signed Phase II scope and fee"
                : "Client approval"}
            </span>
            <Input
              value={link}
              disabled={!editable}
              placeholder="Link to the signed approval"
              onChange={(event) => setLink(event.target.value)}
              onBlur={() => {
                if (editable) void saveDetails();
              }}
            />
          </label>
        )}

        <div>
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium text-slate-900">{template.title} checklist</p>
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground">
                {complete} of {visible.length} complete
              </span>
              {editable && (
                <button
                  type="button"
                  className="text-xs font-medium text-emerald-700 hover:underline"
                  onClick={() => setEditing((open) => !open)}
                >
                  {editing ? "Done editing" : "Edit checklist"}
                </button>
              )}
            </div>
          </div>
          <ul className="mt-2 divide-y divide-slate-100 border-y border-slate-100">
            {visible.map((item) => (
              <ChecklistRow
                key={item.id}
                item={item}
                editable={editable}
                editing={editing}
                naOpen={naItemId === item.id}
                naReason={naItemId === item.id ? naReason : item.naReason}
                onToggle={(checked) =>
                  void run(setItemState(bundle, item.id, checked ? "done" : "open", "", initials))
                }
                onRename={(label) =>
                  void run(renameChecklistItem(bundle, item.id, label, initials))
                }
                onRemove={() => void run(removeChecklistItem(bundle, item.id, initials))}
                onStartNa={() => {
                  setNaItemId(item.id);
                  setNaReason(item.naReason);
                }}
                onNaReason={setNaReason}
                onSaveNa={() =>
                  void run(setItemState(bundle, item.id, "na", naReason, initials)).then(() =>
                    setNaItemId(null),
                  )
                }
                onClearNa={() =>
                  void run(setItemState(bundle, item.id, "open", "", initials))
                }
              />
            ))}
          </ul>
          {editing && (
            <form
              className="mt-3 flex gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                void run(addChecklistItem(bundle, stage.id, newItem, initials)).then(() =>
                  setNewItem(""),
                );
              }}
            >
              <Input
                value={newItem}
                placeholder="Project-specific item"
                onChange={(event) => setNewItem(event.target.value)}
              />
              <Button type="submit" variant="outline">
                Add
              </Button>
            </form>
          )}
        </div>

        <div className="space-y-2">
          {template.kind === "handoff" && editable && (
            <div className="flex flex-wrap items-center gap-3">
              <Button type="button" disabled={!canSend} onClick={() => void send()}>
                {sendLabel}
              </Button>
              {!canSend && (
                <span className="text-sm text-muted-foreground">
                  {requiredReady ? "Save the budget and schedule first." : "Complete the checklist first."}
                </span>
              )}
            </div>
          )}
          {template.kind === "handoff" && inReview && (
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                onClick={() => void run(acceptHandoff(bundle, stage.id, initials))}
              >
                Accept
              </Button>
              <Button type="button" variant="outline" onClick={() => setReturning((open) => !open)}>
                Return for revisions
              </Button>
            </div>
          )}
          {returning && (
            <form
              className="flex flex-col gap-2 sm:flex-row"
              onSubmit={(event) => {
                event.preventDefault();
                void run(returnHandoff(bundle, stage.id, returnReason, initials));
              }}
            >
              <Input
                value={returnReason}
                placeholder="Reason for the return"
                onChange={(event) => setReturnReason(event.target.value)}
              />
              <Button type="submit" variant="outline">
                Return
              </Button>
            </form>
          )}
          {template.kind === "closeout" && editable && (
            <div className="flex flex-wrap items-center gap-3">
              <Button
                type="button"
                disabled={!requiredReady}
                onClick={() => void run(closePhaseI(bundle, stage.id, initials))}
              >
                Close Phase I
              </Button>
              {!requiredReady && (
                <span className="text-sm text-muted-foreground">Complete the checklist first.</span>
              )}
            </div>
          )}
          {template.kind === "approval" && editable && (
            <Button
              type="button"
              disabled={!requiredReady}
              onClick={() =>
                void run(approveStage(bundle, stage.id, link, initials))
              }
            >
              {template.key === "phase_ii_approval" ? "Approve start of Phase II" : "Record client approval"}
            </Button>
          )}
          {template.kind === "release" && editable && (
            <div className="flex flex-wrap items-center gap-3">
              <Button
                type="button"
                disabled={!requiredReady}
                onClick={() => void run(releaseStage(bundle, stage.id, initials))}
              >
                Release to field
              </Button>
              {!requiredReady && (
                <span className="text-sm text-muted-foreground">Complete the checklist first.</span>
              )}
            </div>
          )}
          {locked && (
            <p className="text-sm text-muted-foreground">
              {workflow.subjectKind === "project"
                ? "Locked until approval to start Phase II."
                : "Locked until client approval is recorded."}
            </p>
          )}
          {notice && <p className="text-sm text-red-600">{notice}</p>}
          <ActivityList
            open={activityOpen}
            entries={stage.activity}
            onToggle={() => setActivityOpen((open) => !open)}
          />
        </div>
      </CardContent>
    </Card>
  );
}

function ChecklistRow({
  item,
  editable,
  editing,
  naOpen,
  naReason,
  onToggle,
  onRename,
  onRemove,
  onStartNa,
  onNaReason,
  onSaveNa,
  onClearNa,
}: {
  item: HandoffItem;
  editable: boolean;
  editing: boolean;
  naOpen: boolean;
  naReason: string;
  onToggle: (checked: boolean) => void;
  onRename: (label: string) => void;
  onRemove: () => void;
  onStartNa: () => void;
  onNaReason: (reason: string) => void;
  onSaveNa: () => void;
  onClearNa: () => void;
}) {
  return (
    <li className="py-2">
      <div className="flex items-start gap-2">
        <input
          type="checkbox"
          className="mt-0.5 size-4 accent-emerald-700"
          checked={item.state === "done"}
          disabled={!editable || item.state === "na"}
          onChange={(event) => onToggle(event.target.checked)}
        />
        {editing ? (
          <Input
            defaultValue={item.label}
            className="h-8"
            onBlur={(event) => onRename(event.target.value)}
          />
        ) : (
          <span className={cn("text-sm text-slate-800", item.state === "done" && "text-slate-500 line-through")}>
            {item.label}
            {item.required && <span className="text-slate-400"> </span>}
          </span>
        )}
        {editing && !item.required && (
          <button type="button" className="shrink-0 text-xs text-slate-500 hover:text-red-600" onClick={onRemove}>
            Remove
          </button>
        )}
        {editable && !item.required && !editing && item.state !== "na" && (
          <button type="button" className="ml-auto shrink-0 text-xs text-slate-500 hover:text-slate-800" onClick={onStartNa}>
            N/A
          </button>
        )}
        {item.state === "na" && (
          <button type="button" className="ml-auto shrink-0 text-xs text-slate-500" onClick={onClearNa} disabled={!editable}>
            N/A{item.naReason ? ` · ${item.naReason}` : ""}
          </button>
        )}
      </div>
      {naOpen && (
        <div className="mt-2 flex gap-2 pl-6">
          <Input
            value={naReason}
            placeholder="Reason"
            onChange={(event) => onNaReason(event.target.value)}
          />
          <Button type="button" variant="outline" onClick={onSaveNa}>
            Save
          </Button>
        </div>
      )}
    </li>
  );
}

function ActivityList({
  open,
  entries,
  onToggle,
}: {
  open: boolean;
  entries: HandoffActivityEntry[];
  onToggle: () => void;
}) {
  return (
    <div className="border-t border-slate-100 pt-2">
      <button type="button" className="flex items-center gap-1.5 text-sm text-slate-700" onClick={onToggle}>
        <ChevronDown className={cn("size-4 transition-transform", open && "rotate-180")} />
        Activity
      </button>
      {open && (
        <div className="mt-2 space-y-1.5">
          {entries.length === 0 && (
            <p className="text-sm text-muted-foreground">No activity for this stage yet.</p>
          )}
          {entries.map((entry) => (
            <p key={entry.id} className="text-sm text-slate-700">
              <span className="font-medium">{entry.actorInitials}</span>
              <span className="text-muted-foreground"> · {formatActivityDate(entry.createdAt)} · </span>
              {entry.summary}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

function ChangeOrderBoard({
  change,
  workflow,
  bundle,
  canEdit,
  initials,
  onCommit,
  startOpen,
}: {
  change: ChangeSubject;
  workflow: HandoffWorkflow;
  bundle: HandoffBundle;
  canEdit: boolean;
  initials: string;
  onCommit: (result: HandoffMutation) => Promise<void>;
  startOpen: boolean;
}) {
  const [open, setOpen] = useState(startOpen);
  const path = templatesFor("change_order")
    .map((stage) => stage.title)
    .join(" → ");
  const current = workflow.stages.find((stage) => stage.status === "open" || stage.status === "in_review" || stage.status === "returned");

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <button type="button" className="flex w-full items-start justify-between gap-3 text-left" onClick={() => setOpen((value) => !value)}>
          <span>
            <span className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold text-slate-900">{change.label}</span>
              {change.badge && <Badge variant="muted">{change.badge}</Badge>}
            </span>
            {change.detail && <span className="mt-1 block text-sm text-muted-foreground">{change.detail}</span>}
          </span>
          <ChevronDown className={cn("mt-0.5 size-4 shrink-0 text-slate-500 transition-transform", open && "rotate-180")} />
        </button>
        <p className="text-sm font-medium text-slate-800">{path}</p>
        <p className="text-sm text-muted-foreground">
          {current
            ? `${templateFor("change_order", current.stageKey)?.title ?? "This change"} is ${statusLabel(current.status, isStageLocked(workflow, current.stageKey)).toLowerCase()}. This change does not reopen the original scope.`
            : "This change does not reopen the original scope or stop work already released."}
        </p>
        {open && (
          <WorkflowBoard
            bundle={bundle}
            workflow={workflow}
            heading={change.label}
            scope={change.detail || "Scope for this change only."}
            canEdit={canEdit}
            initials={initials}
            onCommit={onCommit}
            embedded
          />
        )}
      </CardContent>
    </Card>
  );
}

function ClampedScope({ text }: { text: string }) {
  const ref = useRef<HTMLParagraphElement>(null);
  const [open, setOpen] = useState(false);
  const [canExpand, setCanExpand] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element || open) return;
    setCanExpand(element.scrollHeight > element.clientHeight + 1);
  }, [text, open]);

  return (
    <div className="max-w-3xl">
      <p
        ref={ref}
        className={cn("mt-1 text-sm text-muted-foreground", !open && "line-clamp-4")}
      >
        {text}
      </p>
      {canExpand && (
        <button
          type="button"
          className="mt-1 flex items-center gap-1 text-xs font-medium text-emerald-700 hover:underline"
          onClick={() => setOpen((value) => !value)}
        >
          <ChevronDown className={cn("size-3.5 transition-transform", open && "rotate-180")} />
          {open ? "Show less" : "Show more"}
        </button>
      )}
    </div>
  );
}

function changeSubjects(parent: Project, projects: Project[], estimates: Estimate[]): ChangeSubject[] {
  const legacy = getChangeOrdersForParent(projects, parent.id).map((change) => ({
    id: change.id,
    label: change.project_name,
    detail: change.scope_of_work?.trim() || "Change order on this project.",
    badge: "Change order",
  }));
  const packages = [
    ...getPendingChangeOrderEstimatesForProject(estimates, parent.id).map((estimate) =>
      packageSubject(estimate, "Pending"),
    ),
    ...getChangeOrderEstimatesForProject(estimates, parent.id).map((estimate) =>
      packageSubject(estimate, "Won"),
    ),
  ];
  const seen = new Set(legacy.map((change) => change.id));
  return [...legacy, ...packages.filter((change) => !seen.has(change.id))];
}

function packageSubject(estimate: Estimate, badge: string): ChangeSubject {
  const revision = estimateRevisionLabel(estimate);
  const amount = formatProjectAmount(estimate.amount);
  return {
    id: estimate.id,
    label: [estimateDisplayName(estimate), revision].filter(Boolean).join(" · "),
    detail: [amount !== "—" ? amount : null, estimate.notes?.trim() || null].filter(Boolean).join(" · ")
      || "Change order package on this project.",
    badge,
  };
}

function listStatus(
  workflow: HandoffWorkflow,
  stage: HandoffStage,
  template: StageTemplate,
  locked: boolean,
): string {
  if (locked && stage.status === "not_started") return `Locked until approval · ${template.owner}`;
  if (stage.status === "open") return `In progress · ${template.owner}`;
  if (stage.status === "returned") return `Returned · ${template.owner}`;
  if (stage.status === "in_review") return `In review · ${template.nextOwner ?? template.owner}`;
  if (stage.status === "not_started") return `Up next · ${template.owner}`;
  return statusLabel(stage.status, false);
}

function holder(stage: HandoffStage, template: StageTemplate, locked: boolean): string {
  if (locked && stage.status === "not_started") return "Waiting on approval";
  if (stage.status === "in_review") return template.nextOwner ?? template.owner;
  if (stage.status === "accepted") return template.nextOwner ?? template.owner;
  return template.owner;
}

function dueLabel(project: Project): string | undefined {
  const raw = project.target_completion_date || project.estimating_completion_date;
  if (!raw) return undefined;
  try {
    return format(parseISO(raw), "MMM d, yyyy");
  } catch {
    return undefined;
  }
}

function formatActivityDate(iso: string): string {
  try {
    return format(parseISO(iso), "MMM d, yyyy");
  } catch {
    return iso;
  }
}

function parseAmount(value: string): number | null {
  const cleaned = value.replace(/[$,\s]/g, "");
  if (!cleaned) return null;
  const number = Number(cleaned);
  return Number.isFinite(number) ? number : null;
}

function initialsFromEmail(email: string): string {
  const local = email.split("@")[0] ?? "";
  const parts = local.split(/[.\s_-]+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
  return (local.slice(0, 2) || "—").toUpperCase();
}

async function notifyHandoffLeads(projectId: string, summary: string): Promise<string> {
  try {
    const response = await fetch("/api/handoff/notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId, summary }),
    });
    const json = (await response.json()) as { message?: string; error?: string };
    return json.message ?? json.error ?? "The handoff was saved, but the email could not be sent.";
  } catch {
    return "The handoff was saved, but the email could not be sent.";
  }
}
