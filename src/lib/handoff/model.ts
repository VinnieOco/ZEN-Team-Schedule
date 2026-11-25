import { activeHandoffChecklists } from "@/lib/handoff/checklist-settings";

export type HandoffSubjectKind = "project" | "change_order";
export type StageKind = "handoff" | "closeout" | "approval" | "release";
export type StageStatus =
  | "not_started"
  | "open"
  | "in_review"
  | "accepted"
  | "returned"
  | "closed"
  | "approved"
  | "released";
export type ItemState = "open" | "done" | "na";

export interface StageTemplateItem {
  key: string;
  label: string;
  required: boolean;
}

export interface StageTemplate {
  key: string;
  phase: string;
  title: string;
  kind: StageKind;
  owner: string;
  nextOwner?: string;
  scope: string;
  /** Extra fields shown with the checklist. */
  extras?: "budget_schedule" | "impact";
  items: StageTemplateItem[];
}

export interface HandoffItem {
  id: string;
  stageId: string;
  templateKey: string | null;
  label: string;
  required: boolean;
  state: ItemState;
  naReason: string;
  hidden: boolean;
  sortOrder: number;
}

export interface HandoffActivityEntry {
  id: string;
  stageId: string;
  projectId: string;
  actorInitials: string;
  summary: string;
  createdAt: string;
}

export interface HandoffStage {
  id: string;
  workflowId: string;
  stageKey: string;
  status: StageStatus;
  sortOrder: number;
  notes: string;
  budgetAmount: number | null;
  scheduleText: string;
  approvalUrl: string;
  returnReason: string;
  items: HandoffItem[];
  activity: HandoffActivityEntry[];
}

export interface HandoffWorkflow {
  id: string;
  projectId: string;
  subjectKind: HandoffSubjectKind;
  subjectId: string;
  stages: HandoffStage[];
}

export interface HandoffBundle {
  workflows: HandoffWorkflow[];
}

export interface SubjectRef {
  kind: HandoffSubjectKind;
  id: string;
}

export type HandoffMutation =
  | { ok: true; bundle: HandoffBundle; activity: HandoffActivityEntry[] }
  | { ok: false; message: string };

const PROJECT_STAGES: StageTemplate[] = [
  {
    key: "schematic_design",
    phase: "Phase I",
    title: "Schematic Design",
    kind: "handoff",
    owner: "Design",
    nextOwner: "Estimating",
    scope:
      "Design program, existing conditions and base plan, schematic landscape plan, character and materials storyboard, and sections or elevations as needed.",
    items: [
      { key: "program", label: "Design program", required: true },
      { key: "base_plan", label: "Existing conditions / base plan", required: true },
      { key: "schematic_plan", label: "Schematic landscape plan", required: true },
      { key: "storyboard", label: "Character and materials storyboard", required: true },
      { key: "sections", label: "Sections or elevations as needed", required: false },
    ],
  },
  {
    key: "preliminary_estimating",
    phase: "Phase I",
    title: "Preliminary Estimating",
    kind: "handoff",
    owner: "Estimating",
    nextOwner: "Design",
    scope:
      "Preliminary construction budget and preliminary construction schedule, together, at the end of Phase I. This budget is not the final estimate or the signed contract price.",
    extras: "budget_schedule",
    items: [
      { key: "budget", label: "Preliminary Construction Budget", required: true },
      { key: "schedule", label: "Preliminary Construction Schedule", required: true },
    ],
  },
  {
    key: "phase_i_closeout",
    phase: "Phase I",
    title: "Phase I Closeout",
    kind: "closeout",
    owner: "Design",
    scope:
      "Close Phase I only after the final schematic package, preliminary budget, and preliminary schedule are recorded as delivered.",
    items: [
      { key: "schematic_delivered", label: "Final schematic package delivered", required: true },
      { key: "budget_delivered", label: "Preliminary budget recorded as delivered", required: true },
      { key: "schedule_delivered", label: "Preliminary schedule recorded as delivered", required: true },
    ],
  },
  {
    key: "phase_ii_approval",
    phase: "Gate",
    title: "Approval to Start Phase II",
    kind: "approval",
    owner: "Project lead",
    scope:
      "A separate approval. Records the decision and links the signed Phase II scope and fee. Closing Phase I does not approve this.",
    items: [
      { key: "signed_scope", label: "Signed Phase II scope and fee linked", required: true },
    ],
  },
  {
    key: "design_development",
    phase: "Phase II",
    title: "Design Development",
    kind: "handoff",
    owner: "Design",
    nextOwner: "Design",
    scope: "Develop the approved Phase II scope. Stays closed until Phase II approval is recorded.",
    items: [
      { key: "dd_plans", label: "Design development plans", required: true },
      { key: "materials", label: "Materials and details advanced", required: true },
    ],
  },
  {
    key: "construction_drawings",
    phase: "Phase II",
    title: "Construction Drawings",
    kind: "handoff",
    owner: "Design",
    nextOwner: "Estimating",
    scope: "Construction drawing set ready for final pricing.",
    items: [
      { key: "cd_set", label: "Construction drawing set", required: true },
      { key: "specs", label: "Specifications and sheet notes", required: false },
    ],
  },
  {
    key: "final_estimating",
    phase: "Phase II",
    title: "Final Estimating",
    kind: "handoff",
    owner: "Estimating",
    nextOwner: "Construction",
    scope:
      "Final estimate and signed contract price. Kept separate from the Phase I preliminary budget.",
    items: [
      { key: "final_estimate", label: "Final estimate", required: true },
      { key: "contract_price", label: "Signed contract price recorded", required: true },
    ],
  },
  {
    key: "construction",
    phase: "Phase II",
    title: "Construction",
    kind: "release",
    owner: "Construction",
    scope:
      "Release field work only after the required drawings and contract are in place. Acceptance of an earlier handoff is not this release.",
    items: [
      { key: "drawings", label: "Required drawings in place", required: true },
      { key: "contract", label: "Contract in place", required: true },
    ],
  },
];

const CHANGE_STAGES: StageTemplate[] = [
  {
    key: "change_design",
    phase: "Change",
    title: "Change Design",
    kind: "handoff",
    owner: "Design",
    nextOwner: "Estimating",
    scope: "Scope of this change and the updated drawings. The original scope stays as it was.",
    items: [
      { key: "scope", label: "Change scope described", required: true },
      { key: "drawings", label: "Updated drawings", required: true },
    ],
  },
  {
    key: "change_estimating",
    phase: "Change",
    title: "Change Estimating",
    kind: "handoff",
    owner: "Estimating",
    nextOwner: "Project lead",
    scope: "Cost and schedule impact for this change only.",
    extras: "impact",
    items: [
      { key: "cost", label: "Cost impact recorded", required: true },
      { key: "schedule", label: "Schedule impact recorded", required: true },
    ],
  },
  {
    key: "client_approval",
    phase: "Change",
    title: "Client Approval",
    kind: "approval",
    owner: "Project lead",
    scope: "Record client approval before this change can go to the field.",
    items: [{ key: "approval", label: "Client approval recorded", required: true }],
  },
  {
    key: "change_construction",
    phase: "Change",
    title: "Change Construction",
    kind: "release",
    owner: "Construction",
    scope:
      "Release this change to the field after approval and updated drawings are in place. Work already released is not reopened.",
    items: [
      { key: "drawings", label: "Updated drawings in place", required: true },
      { key: "approval", label: "Client approval in place", required: true },
    ],
  },
];

export function builtinTemplates(kind: HandoffSubjectKind): StageTemplate[] {
  return kind === "project" ? PROJECT_STAGES : CHANGE_STAGES;
}

export function templatesFor(kind: HandoffSubjectKind): StageTemplate[] {
  const base = builtinTemplates(kind);
  const custom = activeHandoffChecklists()?.[kind];
  if (!custom) return base;
  return base.map((stage) => {
    const items = custom[stage.key];
    return items ? { ...stage, items } : stage;
  });
}

export function templateFor(kind: HandoffSubjectKind, stageKey: string): StageTemplate | undefined {
  return templatesFor(kind).find((stage) => stage.key === stageKey);
}

export function emptyBundle(): HandoffBundle {
  return { workflows: [] };
}

function newId(): string {
  return crypto.randomUUID();
}

function createItem(stageId: string, item: StageTemplateItem, sortOrder: number): HandoffItem {
  return {
    id: newId(),
    stageId,
    templateKey: item.key,
    label: item.label,
    required: item.required,
    state: "open",
    naReason: "",
    hidden: false,
    sortOrder,
  };
}

function createStage(workflowId: string, template: StageTemplate, index: number, status: StageStatus): HandoffStage {
  const id = newId();
  return {
    id,
    workflowId,
    stageKey: template.key,
    status,
    sortOrder: index,
    notes: "",
    budgetAmount: null,
    scheduleText: "",
    approvalUrl: "",
    returnReason: "",
    items: template.items.map((item, itemIndex) => createItem(id, item, itemIndex)),
    activity: [],
  };
}

function createWorkflow(projectId: string, subject: SubjectRef): HandoffWorkflow {
  const id = newId();
  const templates = templatesFor(subject.kind);
  return {
    id,
    projectId,
    subjectKind: subject.kind,
    subjectId: subject.id,
    stages: templates.map((template, index) =>
      createStage(id, template, index, index === 0 ? "open" : "not_started"),
    ),
  };
}

function withTemplateItems(stage: HandoffStage, template: StageTemplate): HandoffStage {
  const byKey = new Map(template.items.map((item) => [item.key, item]));
  let changed = false;
  const synced = stage.items.map((item) => {
    if (!item.templateKey) return item;
    const source = byKey.get(item.templateKey);
    if (!source) return item;
    if (item.label === source.label && item.required === source.required) return item;
    changed = true;
    return { ...item, label: source.label, required: source.required };
  });
  const missing = template.items.filter(
    (item) => !synced.some((existing) => existing.templateKey === item.key),
  );
  if (!changed && missing.length === 0) return stage;
  const start = synced.length;
  return {
    ...stage,
    items: [
      ...synced,
      ...missing.map((item, index) => createItem(stage.id, item, start + index)),
    ],
  };
}

export function visibleChecklistItems(stage: HandoffStage, template: StageTemplate): HandoffItem[] {
  const order = new Map(template.items.map((item, index) => [item.key, index]));
  return stage.items
    .filter((item) => {
      if (item.hidden) return false;
      if (item.templateKey && !order.has(item.templateKey)) return false;
      return true;
    })
    .sort((a, b) => {
      const aOrder = a.templateKey ? (order.get(a.templateKey) ?? 10000) : 10000 + a.sortOrder;
      const bOrder = b.templateKey ? (order.get(b.templateKey) ?? 10000) : 10000 + b.sortOrder;
      return aOrder - bOrder;
    });
}

export function ensureBundle(
  bundle: HandoffBundle,
  projectId: string,
  subjects: SubjectRef[],
): HandoffBundle {
  let workflows = bundle.workflows.filter((workflow) => workflow.projectId === projectId);
  for (const subject of subjects) {
    const existing = workflows.find(
      (workflow) => workflow.subjectKind === subject.kind && workflow.subjectId === subject.id,
    );
    if (!existing) {
      workflows = [...workflows, createWorkflow(projectId, subject)];
      continue;
    }
    const templates = templatesFor(subject.kind);
    const stages = templates.map((template, index) => {
      const stage = existing.stages.find((candidate) => candidate.stageKey === template.key);
      if (!stage) return createStage(existing.id, template, index, index === 0 ? "open" : "not_started");
      return { ...withTemplateItems(stage, template), sortOrder: index };
    });
    workflows = workflows.map((workflow) =>
      workflow.id === existing.id ? { ...existing, stages } : workflow,
    );
  }
  return { workflows };
}

export function isStageLocked(workflow: HandoffWorkflow, stageKey: string): boolean {
  if (workflow.subjectKind === "project") {
    const templates = templatesFor("project");
    const gate = templates.findIndex((stage) => stage.key === "phase_ii_approval");
    const index = templates.findIndex((stage) => stage.key === stageKey);
    if (gate >= 0 && index > gate) {
      const approval = workflow.stages.find((stage) => stage.stageKey === "phase_ii_approval");
      return approval?.status !== "approved";
    }
    return false;
  }
  if (stageKey === "change_construction") {
    const approval = workflow.stages.find((stage) => stage.stageKey === "client_approval");
    return approval?.status !== "approved";
  }
  return false;
}

export function statusLabel(status: StageStatus, locked: boolean): string {
  if (locked && status === "not_started") return "Locked";
  switch (status) {
    case "not_started":
      return "Not started";
    case "open":
      return "Open";
    case "in_review":
      return "In review";
    case "accepted":
      return "Accepted";
    case "returned":
      return "Returned";
    case "closed":
      return "Closed";
    case "approved":
      return "Approved";
    case "released":
      return "Released";
    default:
      return status;
  }
}

export function nextStepCopy(
  workflow: HandoffWorkflow,
  stage: HandoffStage,
  template: StageTemplate,
): string {
  if (isStageLocked(workflow, stage.stageKey)) {
    return workflow.subjectKind === "project"
      ? "Waiting on approval to start Phase II."
      : "Waiting on recorded client approval.";
  }
  switch (stage.status) {
    case "open":
    case "returned":
      return `${template.owner} owns this step.`;
    case "in_review":
      return `${template.nextOwner ?? "The next team"} is reviewing.`;
    case "accepted":
      return template.nextOwner
        ? `Accepted. ${template.nextOwner} has the next step.`
        : "Accepted.";
    case "closed":
      return "Phase I is closed. Phase II is still a separate approval.";
    case "approved":
      return "Approval is recorded.";
    case "released":
      return "Released. Earlier work stays as it was.";
    default:
      return "Not started yet.";
  }
}

function stageEditable(status: StageStatus): boolean {
  return status === "open" || status === "returned";
}

function checklistReady(stage: HandoffStage): boolean {
  const template =
    templatesFor("project").find((candidate) => candidate.key === stage.stageKey) ??
    templatesFor("change_order").find((candidate) => candidate.key === stage.stageKey);
  const keys = template ? new Set(template.items.map((item) => item.key)) : null;
  return stage.items.every((item) => {
    if (item.hidden) return true;
    if (item.templateKey && keys && !keys.has(item.templateKey)) return true;
    return !item.required || item.state === "done";
  });
}

function locate(bundle: HandoffBundle, stageId: string) {
  for (const workflow of bundle.workflows) {
    const stage = workflow.stages.find((candidate) => candidate.id === stageId);
    if (stage) return { workflow, stage };
  }
  return null;
}

function replaceStage(bundle: HandoffBundle, workflowId: string, stage: HandoffStage): HandoffBundle {
  return {
    workflows: bundle.workflows.map((workflow) =>
      workflow.id === workflowId
        ? {
            ...workflow,
            stages: workflow.stages.map((candidate) => (candidate.id === stage.id ? stage : candidate)),
          }
        : workflow,
    ),
  };
}

function replaceWorkflow(bundle: HandoffBundle, workflow: HandoffWorkflow): HandoffBundle {
  return {
    workflows: bundle.workflows.map((candidate) => (candidate.id === workflow.id ? workflow : candidate)),
  };
}

function activityEntry(
  stage: HandoffStage,
  projectId: string,
  initials: string,
  summary: string,
): HandoffActivityEntry {
  return {
    id: newId(),
    stageId: stage.id,
    projectId,
    actorInitials: initials.trim() || "—",
    summary,
    createdAt: new Date().toISOString(),
  };
}

function withActivity(stage: HandoffStage, entry: HandoffActivityEntry): HandoffStage {
  return { ...stage, activity: [entry, ...stage.activity] };
}

function openStage(workflow: HandoffWorkflow, stageKey: string): HandoffWorkflow {
  return {
    ...workflow,
    stages: workflow.stages.map((stage) => {
      if (stage.stageKey !== stageKey || stage.status !== "not_started") return stage;
      if (isStageLocked({ ...workflow, stages: workflow.stages }, stageKey)) return stage;
      return { ...stage, status: "open" };
    }),
  };
}

function preliminaryReady(workflow: HandoffWorkflow): boolean {
  const stage = workflow.stages.find((candidate) => candidate.stageKey === "preliminary_estimating");
  if (!stage) return false;
  return (
    stage.budgetAmount != null &&
    stage.budgetAmount > 0 &&
    stage.scheduleText.trim().length > 0 &&
    checklistReady(stage)
  );
}

export function saveStageDetails(
  bundle: HandoffBundle,
  stageId: string,
  patch: {
    notes?: string;
    budgetAmount?: number | null;
    scheduleText?: string;
    approvalUrl?: string;
  },
  initials: string,
): HandoffMutation {
  const found = locate(bundle, stageId);
  if (!found) return { ok: false, message: "That stage is no longer on this project." };
  if (!stageEditable(found.stage.status)) {
    return { ok: false, message: "This stage is not open for edits." };
  }
  const changes: string[] = [];
  let stage = found.stage;
  if (patch.notes != null && patch.notes !== stage.notes) {
    changes.push(`Edited notes from “${stage.notes || "blank"}” to “${patch.notes || "blank"}”`);
    stage = { ...stage, notes: patch.notes };
  }
  if (patch.budgetAmount !== undefined && patch.budgetAmount !== stage.budgetAmount) {
    changes.push(
      `Updated amount from ${formatAmount(stage.budgetAmount)} to ${formatAmount(patch.budgetAmount)}`,
    );
    stage = { ...stage, budgetAmount: patch.budgetAmount };
  }
  if (patch.scheduleText != null && patch.scheduleText !== stage.scheduleText) {
    changes.push(
      `Updated schedule from “${stage.scheduleText || "blank"}” to “${patch.scheduleText || "blank"}”`,
    );
    stage = { ...stage, scheduleText: patch.scheduleText };
  }
  if (patch.approvalUrl != null && patch.approvalUrl !== stage.approvalUrl) {
    changes.push(
      `Updated link from “${stage.approvalUrl || "blank"}” to “${patch.approvalUrl || "blank"}”`,
    );
    stage = { ...stage, approvalUrl: patch.approvalUrl };
  }
  if (changes.length === 0) return { ok: true, bundle, activity: [] };
  const entries = changes.map((summary) =>
    activityEntry(stage, found.workflow.projectId, initials, summary),
  );
  let nextStage = stage;
  for (const entry of entries) nextStage = withActivity(nextStage, entry);
  return {
    ok: true,
    bundle: replaceStage(bundle, found.workflow.id, nextStage),
    activity: entries,
  };
}

function formatAmount(value: number | null): string {
  if (value == null) return "blank";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export function setItemState(
  bundle: HandoffBundle,
  itemId: string,
  state: ItemState,
  naReason: string,
  initials: string,
): HandoffMutation {
  const owner = findItem(bundle, itemId);
  if (!owner) return { ok: false, message: "That checklist item is no longer on this project." };
  if (!stageEditable(owner.stage.status)) {
    return { ok: false, message: "The checklist is read-only while this stage is in review or finished." };
  }
  if (state === "na" && owner.item.required) {
    return { ok: false, message: "Required items cannot be skipped." };
  }
  if (state === "na" && !naReason.trim()) {
    return { ok: false, message: "Add a reason to mark this N/A." };
  }
  const previous = owner.item.state;
  if (previous === state && owner.item.naReason === naReason.trim()) {
    return { ok: true, bundle, activity: [] };
  }
  const summary =
    state === "done"
      ? `Checked off ${owner.item.label}`
      : state === "na"
        ? `Marked ${owner.item.label} N/A (${naReason.trim()})`
        : `Unchecked ${owner.item.label}`;
  const entry = activityEntry(owner.stage, owner.workflow.projectId, initials, summary);
  const item: HandoffItem = {
    ...owner.item,
    state,
    naReason: state === "na" ? naReason.trim() : "",
  };
  const stage = withActivity(replaceItem(owner.stage, item), entry);
  return {
    ok: true,
    bundle: replaceStage(bundle, owner.workflow.id, stage),
    activity: [entry],
  };
}

export function addChecklistItem(
  bundle: HandoffBundle,
  stageId: string,
  label: string,
  initials: string,
): HandoffMutation {
  const found = locate(bundle, stageId);
  if (!found) return { ok: false, message: "That stage is no longer on this project." };
  if (!stageEditable(found.stage.status)) {
    return { ok: false, message: "The checklist is read-only while this stage is in review or finished." };
  }
  const trimmed = label.trim();
  if (!trimmed) return { ok: false, message: "Enter a checklist item." };
  const item: HandoffItem = {
    id: newId(),
    stageId,
    templateKey: null,
    label: trimmed,
    required: false,
    state: "open",
    naReason: "",
    hidden: false,
    sortOrder: found.stage.items.length,
  };
  const entry = activityEntry(
    found.stage,
    found.workflow.projectId,
    initials,
    `Added checklist item “${trimmed}”`,
  );
  const stage = withActivity({ ...found.stage, items: [...found.stage.items, item] }, entry);
  return {
    ok: true,
    bundle: replaceStage(bundle, found.workflow.id, stage),
    activity: [entry],
  };
}

export function renameChecklistItem(
  bundle: HandoffBundle,
  itemId: string,
  label: string,
  initials: string,
): HandoffMutation {
  const owner = findItem(bundle, itemId);
  if (!owner) return { ok: false, message: "That checklist item is no longer on this project." };
  if (!stageEditable(owner.stage.status)) {
    return { ok: false, message: "The checklist is read-only while this stage is in review or finished." };
  }
  const trimmed = label.trim();
  if (!trimmed) return { ok: false, message: "Checklist items need a name." };
  if (trimmed === owner.item.label) return { ok: true, bundle, activity: [] };
  const entry = activityEntry(
    owner.stage,
    owner.workflow.projectId,
    initials,
    `Edited “${owner.item.label}” to “${trimmed}”`,
  );
  const stage = withActivity(replaceItem(owner.stage, { ...owner.item, label: trimmed }), entry);
  return {
    ok: true,
    bundle: replaceStage(bundle, owner.workflow.id, stage),
    activity: [entry],
  };
}

export function removeChecklistItem(
  bundle: HandoffBundle,
  itemId: string,
  initials: string,
): HandoffMutation {
  const owner = findItem(bundle, itemId);
  if (!owner) return { ok: false, message: "That checklist item is no longer on this project." };
  if (!stageEditable(owner.stage.status)) {
    return { ok: false, message: "The checklist is read-only while this stage is in review or finished." };
  }
  if (owner.item.required) {
    return { ok: false, message: "Required items cannot be removed." };
  }
  const entry = activityEntry(
    owner.stage,
    owner.workflow.projectId,
    initials,
    `Removed “${owner.item.label}”`,
  );
  const items = owner.item.templateKey
    ? owner.stage.items.map((item) => (item.id === itemId ? { ...item, hidden: true } : item))
    : owner.stage.items.filter((item) => item.id !== itemId);
  const stage = withActivity({ ...owner.stage, items }, entry);
  return {
    ok: true,
    bundle: replaceStage(bundle, owner.workflow.id, stage),
    activity: [entry],
  };
}

export function sendForReview(bundle: HandoffBundle, stageId: string, initials: string): HandoffMutation {
  const found = locate(bundle, stageId);
  if (!found) return { ok: false, message: "That stage is no longer on this project." };
  const template = templateFor(found.workflow.subjectKind, found.stage.stageKey);
  if (!template || template.kind !== "handoff") {
    return { ok: false, message: "This stage is not sent for review." };
  }
  if (isStageLocked(found.workflow, found.stage.stageKey)) {
    return { ok: false, message: "This stage is still locked." };
  }
  if (!stageEditable(found.stage.status)) {
    return { ok: false, message: "Send for review when the stage is open." };
  }
  if (!checklistReady(found.stage)) {
    return { ok: false, message: "Finish the required items first. Optional items can be checked or marked N/A." };
  }
  if (template.extras && !detailsReady(found.stage)) {
    return {
      ok: false,
      message: "Save the budget and schedule before sending this stage.",
    };
  }
  const entry = activityEntry(
    found.stage,
    found.workflow.projectId,
    initials,
    `Sent ${template.title} for review`,
  );
  const stage = withActivity(
    { ...found.stage, status: "in_review", returnReason: "" },
    entry,
  );
  return {
    ok: true,
    bundle: replaceStage(bundle, found.workflow.id, stage),
    activity: [entry],
  };
}

export function acceptHandoff(bundle: HandoffBundle, stageId: string, initials: string): HandoffMutation {
  const found = locate(bundle, stageId);
  if (!found) return { ok: false, message: "That stage is no longer on this project." };
  const template = templateFor(found.workflow.subjectKind, found.stage.stageKey);
  if (!template || template.kind !== "handoff") {
    return { ok: false, message: "This stage is accepted from review." };
  }
  if (found.stage.status !== "in_review") {
    return { ok: false, message: "Accept after the stage has been sent for review." };
  }
  const entry = activityEntry(
    found.stage,
    found.workflow.projectId,
    initials,
    `Accepted ${template.title}`,
  );
  let workflow = replaceWorkflow(
    bundle,
    {
      ...found.workflow,
      stages: found.workflow.stages.map((stage) =>
        stage.id === found.stage.id
          ? withActivity({ ...stage, status: "accepted" }, entry)
          : stage,
      ),
    },
  ).workflows.find((workflow) => workflow.id === found.workflow.id)!;
  const nextKey = nextStageKey(found.workflow.subjectKind, found.stage.stageKey);
  if (nextKey) workflow = openStage(workflow, nextKey);
  return {
    ok: true,
    bundle: replaceWorkflow(bundle, workflow),
    activity: [entry],
  };
}

export function returnHandoff(
  bundle: HandoffBundle,
  stageId: string,
  reason: string,
  initials: string,
): HandoffMutation {
  const found = locate(bundle, stageId);
  if (!found) return { ok: false, message: "That stage is no longer on this project." };
  if (found.stage.status !== "in_review") {
    return { ok: false, message: "Return a stage that is in review." };
  }
  const trimmed = reason.trim();
  if (!trimmed) return { ok: false, message: "Add a reason for the return." };
  const template = templateFor(found.workflow.subjectKind, found.stage.stageKey);
  const entry = activityEntry(
    found.stage,
    found.workflow.projectId,
    initials,
    `Returned ${template?.title ?? "stage"} for revisions (${trimmed})`,
  );
  const stage = withActivity(
    { ...found.stage, status: "returned", returnReason: trimmed },
    entry,
  );
  return {
    ok: true,
    bundle: replaceStage(bundle, found.workflow.id, stage),
    activity: [entry],
  };
}

export function closePhaseI(bundle: HandoffBundle, stageId: string, initials: string): HandoffMutation {
  const found = locate(bundle, stageId);
  if (!found) return { ok: false, message: "That stage is no longer on this project." };
  if (found.stage.stageKey !== "phase_i_closeout") {
    return { ok: false, message: "Phase I is closed from Phase I Closeout." };
  }
  if (!stageEditable(found.stage.status) && found.stage.status !== "open") {
    return { ok: false, message: "Phase I closeout is not open." };
  }
  if (!checklistReady(found.stage)) {
    return { ok: false, message: "Record the schematic package, budget, and schedule as delivered first." };
  }
  if (!preliminaryReady(found.workflow)) {
    return {
      ok: false,
      message: "Preliminary Estimating still needs a saved budget and schedule.",
    };
  }
  const entry = activityEntry(found.stage, found.workflow.projectId, initials, "Closed Phase I");
  let workflow: HandoffWorkflow = {
    ...found.workflow,
    stages: found.workflow.stages.map((stage) =>
      stage.id === found.stage.id ? withActivity({ ...stage, status: "closed" }, entry) : stage,
    ),
  };
  workflow = openStage(workflow, "phase_ii_approval");
  return { ok: true, bundle: replaceWorkflow(bundle, workflow), activity: [entry] };
}

export function approveStage(
  bundle: HandoffBundle,
  stageId: string,
  approvalUrl: string,
  initials: string,
): HandoffMutation {
  const found = locate(bundle, stageId);
  if (!found) return { ok: false, message: "That stage is no longer on this project." };
  const template = templateFor(found.workflow.subjectKind, found.stage.stageKey);
  if (!template || template.kind !== "approval") {
    return { ok: false, message: "This stage is not an approval." };
  }
  if (found.stage.status === "approved") return { ok: false, message: "This approval is already recorded." };
  if (!stageEditable(found.stage.status) && found.stage.status !== "open") {
    return { ok: false, message: "This approval is not open yet." };
  }
  if (!checklistReady(found.stage)) {
    return { ok: false, message: "Finish the required approval items first." };
  }
  const link = approvalUrl.trim();
  if (found.stage.stageKey === "phase_ii_approval" && !link) {
    return { ok: false, message: "Link the signed Phase II scope and fee." };
  }
  const summary =
    found.stage.stageKey === "phase_ii_approval"
      ? "Approved start of Phase II"
      : "Recorded client approval";
  const entry = activityEntry(found.stage, found.workflow.projectId, initials, summary);
  let workflow: HandoffWorkflow = {
    ...found.workflow,
    stages: found.workflow.stages.map((stage) =>
      stage.id === found.stage.id
        ? withActivity({ ...stage, status: "approved", approvalUrl: link || stage.approvalUrl }, entry)
        : stage,
    ),
  };
  const unlock =
    found.stage.stageKey === "phase_ii_approval" ? "design_development" : "change_construction";
  workflow = openStage(workflow, unlock);
  return { ok: true, bundle: replaceWorkflow(bundle, workflow), activity: [entry] };
}

export function releaseStage(bundle: HandoffBundle, stageId: string, initials: string): HandoffMutation {
  const found = locate(bundle, stageId);
  if (!found) return { ok: false, message: "That stage is no longer on this project." };
  const template = templateFor(found.workflow.subjectKind, found.stage.stageKey);
  if (!template || template.kind !== "release") {
    return { ok: false, message: "This stage is not a release." };
  }
  if (isStageLocked(found.workflow, found.stage.stageKey)) {
    return { ok: false, message: "Record approval before releasing this work." };
  }
  if (found.stage.status === "released") return { ok: false, message: "This work is already released." };
  if (!stageEditable(found.stage.status) && found.stage.status !== "open") {
    return { ok: false, message: "This release is not open yet." };
  }
  if (!checklistReady(found.stage)) {
    return { ok: false, message: "The required drawings and approval need to be checked first." };
  }
  const entry = activityEntry(
    found.stage,
    found.workflow.projectId,
    initials,
    found.workflow.subjectKind === "project" ? "Released construction" : "Released change to the field",
  );
  const stage = withActivity({ ...found.stage, status: "released" }, entry);
  return {
    ok: true,
    bundle: replaceStage(bundle, found.workflow.id, stage),
    activity: [entry],
  };
}

function detailsReady(stage: HandoffStage): boolean {
  return stage.budgetAmount != null && stage.budgetAmount > 0 && stage.scheduleText.trim().length > 0;
}

function nextStageKey(kind: HandoffSubjectKind, stageKey: string): string | null {
  const templates = templatesFor(kind);
  const index = templates.findIndex((stage) => stage.key === stageKey);
  if (index < 0 || index >= templates.length - 1) return null;
  return templates[index + 1]?.key ?? null;
}

function findItem(bundle: HandoffBundle, itemId: string) {
  for (const workflow of bundle.workflows) {
    for (const stage of workflow.stages) {
      const item = stage.items.find((candidate) => candidate.id === itemId);
      if (item) return { workflow, stage, item };
    }
  }
  return null;
}

function replaceItem(stage: HandoffStage, item: HandoffItem): HandoffStage {
  return {
    ...stage,
    items: stage.items.map((candidate) => (candidate.id === item.id ? item : candidate)),
  };
}

export function phaseBanner(workflow: HandoffWorkflow): string | null {
  if (workflow.subjectKind !== "project") return null;
  const closeout = workflow.stages.find((stage) => stage.stageKey === "phase_i_closeout");
  const approval = workflow.stages.find((stage) => stage.stageKey === "phase_ii_approval");
  if (closeout?.status === "closed" && approval?.status !== "approved") {
    return "Phase I closed · Phase II not approved";
  }
  return null;
}
