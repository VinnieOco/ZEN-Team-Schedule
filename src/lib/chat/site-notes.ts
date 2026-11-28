import { addDays, addWeeks, format, startOfWeek } from "date-fns";

import type { AppPermissions } from "@/lib/auth/permissions";
import {
  clipText,
  describeHoursBudget,
  money,
  reportUsesMonth,
  scheduleWeekOffsets,
  searchTerm,
  projectChoice,
  siteIntents,
  timeWindow,
} from "@/lib/chat/site-intents";
import type { createClient } from "@/lib/supabase/server";
import { getTeamMonthTimeSummary, getTeamTimeSummary } from "@/lib/time-tracking";
import { getTeamMonthSummary, getTeamSummary } from "@/lib/utilization";
import { getWeekStart } from "@/lib/week";
import type { Allocation, CompanySettings, Employee, TimeEntry } from "@/types";

type Supabase = Awaited<ReturnType<typeof createClient>>;

const NOTE_LIMIT = 36000;

export async function liveSiteNotes(options: {
  supabase: Supabase;
  permissions: AppPermissions;
  question: string;
  pathname: string;
  userId: string;
}): Promise<string> {
  const { supabase, permissions, question, pathname, userId } = options;
  const intents = siteIntents(question, pathname);
  if (intents.length === 0) return "";

  let term = searchTerm(question);
  if (intents.includes("projects") && permissions.viewProjects && term) {
    const choice = await clientProjectChoice(supabase, question, term);
    if (choice?.action === "ask") {
      return `Several projects match the client “${choice.client}”. Ask which project they mean, and include these project names in the question: ${choice.names.join(", ")}. Do not choose a project or give its address, hours, budget, or other details until they answer.`;
    }
    if (choice?.action === "focus") term = choice.term;
  }
  const notes = await Promise.all([
    intents.includes("schedule") && permissions.viewScheduling
      ? scheduleNotes(supabase, question)
      : "",
    intents.includes("projects") && permissions.viewProjects ? projectNote(supabase, term) : "",
    intents.includes("time") && permissions.viewTimeTracking
      ? timeNote(supabase, permissions, userId, question, term)
      : "",
    intents.includes("pipeline") && permissions.viewQueue ? pipelineNote(supabase, term) : "",
    intents.includes("crm") && permissions.viewCrm ? crmNote(supabase, term) : "",
    intents.includes("todos") && permissions.viewTodos
      ? todoNote(supabase, permissions, userId, term)
      : "",
    intents.includes("reports") && permissions.viewReports
      ? reportNote(supabase, question)
      : "",
    intents.includes("budgets") && permissions.viewProjects ? budgetNote(supabase, term) : "",
    intents.includes("contracts") && permissions.viewProjects ? contractNote(supabase, term) : "",
    intents.includes("changeOrders") && permissions.viewProjects
      ? changeOrderNote(supabase, term)
      : "",
    intents.includes("handoffs") && permissions.viewProjects ? handoffNote(supabase, term) : "",
    intents.includes("gantt") && permissions.viewProjects ? ganttNote(supabase, term) : "",
    intents.includes("projectNotes") && permissions.viewProjects
      ? projectNotesNote(supabase, term)
      : "",
    intents.includes("queue") && permissions.viewQueue ? queueNote(supabase, term) : "",
    intents.includes("team") && (permissions.viewScheduling || permissions.viewSettings)
      ? teamNote(supabase, permissions, question)
      : "",
    permissions.viewWipSchedule
      ? wipNote(supabase, permissions, term)
      : /\b(wip|billings|cost to date|contract price)\b/i.test(question)
        ? "Construction cost and billing figures are limited to admins."
        : "",
  ]);

  const joined = notes.filter(Boolean).join("\n\n");
  if (joined.length <= NOTE_LIMIT) return joined;
  return `${joined.slice(0, NOTE_LIMIT)}\n\nSome matching records were left out so this stays readable.`;
}

async function clientProjectChoice(supabase: Supabase, question: string, term: string) {
  const { data, error } = await supabase
    .from("projects")
    .select("project_name, client_name")
    .ilike("client_name", `%${term}%`)
    .order("project_name")
    .limit(20);
  if (error || !data?.length) return null;
  return projectChoice(question, term, data);
}

async function scheduleNotes(supabase: Supabase, question: string): Promise<string> {
  const settings = await loadSettings(supabase);
  const blocks = await Promise.all(
    scheduleWeekOffsets(question).map((offset) => scheduleNote(supabase, settings, offset)),
  );
  return blocks.filter(Boolean).join("\n\n");
}

async function scheduleNote(
  supabase: Supabase,
  settings: CompanySettings,
  weekOffset: number,
): Promise<string> {
  const start = addWeeks(getWeekStart(new Date(), settings), weekOffset);
  const end = addDays(start, settings.include_weekends ? 6 : 4);
  const startKey = format(start, "yyyy-MM-dd");
  const endKey = format(end, "yyyy-MM-dd");
  const label = weekOffset === 1 ? "Next week's schedule" : "This week's schedule";

  const { data, error } = await supabase
    .from("allocations")
    .select(
      "allocation_date, hours, task_name, employees(first_name, last_name), projects(project_name, client_name)",
    )
    .gte("allocation_date", startKey)
    .lte("allocation_date", endKey)
    .order("allocation_date")
    .limit(120);

  const range = `${format(start, "MMM d")}–${format(end, "MMM d")}`;
  if (error) return `${label} could not be read (${error.message}).`;
  if (!data?.length) return `${label} (${range}) has no assignments yet.`;

  const lines = data.map((row) => {
    const employee = personName(firstOf(row.employees));
    const project = firstOf(row.projects);
    const job = project?.project_name
      ? `${project.project_name}${project.client_name ? ` (${project.client_name})` : ""}`
      : "No project";
    const task = row.task_name ? ` — ${row.task_name}` : "";
    return `${format(new Date(`${row.allocation_date}T12:00:00`), "EEE MMM d")}: ${employee}, ${row.hours}h, ${job}${task}`;
  });

  return `${label} (${range}):\n${lines.join("\n")}`;
}

const PROJECT_COLUMNS =
  "id, project_name, client_name, project_number, status, phase, department, address, phone, email, scope_of_work, notes, client_meeting_notes_url, start_date, contract_date, target_completion_date, estimating_completion_date, budgeted_design_hours, estimated_construction_value, estimate_value, lead_employee_id, lead_estimator_id, active, is_change_order" as const;

async function projectNote(supabase: Supabase, term: string | null): Promise<string> {
  let query = supabase.from("projects").select(PROJECT_COLUMNS).order("project_name").limit(term ? 8 : 20);
  if (term) {
    query = query.or(orIlike(["project_name", "client_name", "address", "project_number", "email"], term));
  } else {
    query = query.eq("active", true);
  }

  const { data, error } = await query;
  if (error) return `Projects could not be read (${error.message}).`;
  if (!data?.length) {
    return term ? `No project matched “${term}”.` : "There are no active projects.";
  }

  const peopleIds = [
    ...new Set(
      data.flatMap((project) => [project.lead_employee_id, project.lead_estimator_id].filter(Boolean)),
    ),
  ];
  const names = new Map<string, string>();
  if (peopleIds.length) {
    const { data: people } = await supabase
      .from("employees")
      .select("id, first_name, last_name")
      .in("id", peopleIds);
    for (const person of people ?? []) names.set(person.id, personName(person));
  }

  const hourLines = await hourBudgetLines(supabase, data);
  const meeting = await meetingNotesForProjects(supabase, data, Boolean(term));
  const blocks = data.map((project) =>
    formatProjectRecord(project, names, Boolean(term), hourLines.get(project.id), meeting.lines.get(project.id)),
  );
  const warning = meeting.warning ? `${meeting.warning}\n\n` : "";
  return `${warning}${term ? `Projects matching “${term}”` : "Active projects"}:\n${blocks.join("\n\n")}`;
}

function formatProjectRecord(
  project: {
    project_name: string;
    client_name: string;
    project_number?: string | null;
    status?: string | null;
    phase?: string | null;
    department?: string | null;
    address?: string | null;
    phone?: string | null;
    email?: string | null;
    scope_of_work?: string | null;
    notes?: string | null;
    client_meeting_notes_url?: string | null;
    start_date?: string | null;
    contract_date?: string | null;
    target_completion_date?: string | null;
    estimating_completion_date?: string | null;
    budgeted_design_hours?: number | null;
    estimated_construction_value?: number | null;
    estimate_value?: number | null;
    lead_employee_id?: string | null;
    lead_estimator_id?: string | null;
    active?: boolean | null;
    is_change_order?: boolean | null;
  },
  names: Map<string, string>,
  detailed: boolean,
  hoursBudget?: string,
  meetingNotes?: string,
): string {
  const header = [
    project.project_name,
    project.client_name,
    project.project_number?.trim() ? `#${project.project_number.trim()}` : "",
    project.status,
    project.phase,
    project.department?.trim(),
    project.active === false ? "inactive" : "",
    project.is_change_order ? "change order" : "",
  ]
    .filter(Boolean)
    .join(" — ");
  const dates = [
    project.start_date ? `start ${project.start_date}` : "",
    project.target_completion_date ? `design completion ${project.target_completion_date}` : "",
    project.estimating_completion_date ? `estimating completion ${project.estimating_completion_date}` : "",
    project.contract_date ? `contract ${project.contract_date}` : "",
  ].filter(Boolean);
  const fee = money(project.estimated_construction_value);
  const estimate = money(project.estimate_value);
  const lines = [
    header,
    `Address: ${project.address?.trim() || "none on file"}`,
    `Phone: ${project.phone?.trim() || "none on file"}`,
    `Email: ${project.email?.trim() || "none on file"}`,
    `Lead designer: ${names.get(project.lead_employee_id ?? "") || "none"}`,
    `Lead estimator: ${names.get(project.lead_estimator_id ?? "") || "none"}`,
    dates.length ? `Dates: ${dates.join("; ")}` : "",
    hoursBudget ||
      `${formatHours(Number(project.budgeted_design_hours) || 0)}h budget, logged hours unavailable`,
    [fee ? `${fee} design amount` : "", estimate ? `${estimate} estimate` : ""].filter(Boolean).join(", "),
    project.scope_of_work?.trim()
      ? `Scope: ${clipText(project.scope_of_work, detailed ? 700 : 220)}`
      : "",
    project.notes?.trim() ? `Notes: ${clipText(project.notes, detailed ? 700 : 220)}` : "",
    meetingNotes ||
      (project.client_meeting_notes_url?.trim()
        ? `Client meeting notes link: ${project.client_meeting_notes_url.trim()}`
        : "Client meeting notes: none on file"),
  ];
  return lines.filter(Boolean).join("\n");
}

async function meetingNotesForProjects(
  supabase: Supabase,
  projects: { id: string; client_meeting_notes_url?: string | null }[],
  detailed: boolean,
): Promise<{ lines: Map<string, string>; warning: string }> {
  const ids = projects.map((project) => project.id);
  if (!ids.length) return { lines: new Map(), warning: "" };

  const { data, error } = await supabase
    .from("project_meeting_documents")
    .select("id, project_id, title, status")
    .in("project_id", ids);
  if (error) {
    return { lines: new Map(), warning: `Client meeting notes could not be read (${error.message}).` };
  }

  const ready = (data ?? []).filter((document) => document.status === "ready");
  const excerpts = new Map<string, string>();
  if (detailed && ready.length) {
    const { data: chunks } = await supabase
      .from("project_meeting_chunks")
      .select("document_id, content, ordinal")
      .in(
        "document_id",
        ready.map((document) => document.id),
      )
      .order("ordinal")
      .limit(80);
    const byDocument = groupBy(chunks ?? [], (chunk) => chunk.document_id);
    for (const document of ready) {
      const text = (byDocument.get(document.id) ?? [])
        .slice()
        .sort((left, right) => left.ordinal - right.ordinal)
        .map((chunk) => chunk.content)
        .join("\n\n");
      if (!text.trim()) continue;
      const piece = `${document.title}:\n${clipText(text, 1600)}`;
      const current = excerpts.get(document.project_id);
      excerpts.set(document.project_id, current ? `${current}\n\n${piece}` : piece);
    }
  }

  const lines = new Map<string, string>();
  for (const project of projects) {
    const titles = (data ?? [])
      .filter((document) => document.project_id === project.id && document.status === "ready")
      .map((document) => document.title);
    const failed = (data ?? []).some(
      (document) => document.project_id === project.id && document.status === "failed",
    );
    const excerpt = excerpts.get(project.id);
    if (excerpt) lines.set(project.id, `Client meeting notes:\n${excerpt}`);
    else if (titles.length) lines.set(project.id, `Client meeting notes: ${titles.join(", ")}`);
    else if (failed) lines.set(project.id, "Client meeting notes: a file was uploaded but could not be read.");
  }
  return { lines, warning: "" };
}

async function timeNote(
  supabase: Supabase,
  permissions: AppPermissions,
  userId: string,
  question: string,
  term: string | null,
): Promise<string> {
  const window = timeWindow(question, new Date());
  let employeeId: string | null = null;
  if (!permissions.logTimeForAnyone) {
    employeeId = await linkedEmployeeId(supabase, userId);
    if (!employeeId) {
      return "Time entries are limited to this person's own hours, and their login is not linked to a schedule row yet.";
    }
  }

  const rows: {
    entry_date: string;
    hours: number;
    task_name: string | null;
    employees: { first_name?: string | null; last_name?: string | null } | { first_name?: string | null; last_name?: string | null }[] | null;
    projects: { project_name?: string | null } | { project_name?: string | null }[] | null;
  }[] = [];
  const pageSize = 1000;
  for (let from = 0; from < 20000; from += pageSize) {
    let query = supabase
      .from("time_entries")
      .select("entry_date, hours, task_name, employees(first_name, last_name), projects(project_name)")
      .order("entry_date", { ascending: false })
      .range(from, from + pageSize - 1);
    if (window.bounded) {
      query = query
        .gte("entry_date", format(window.start, "yyyy-MM-dd"))
        .lte("entry_date", format(window.end, "yyyy-MM-dd"));
    }
    if (employeeId) query = query.eq("employee_id", employeeId);
    const { data, error } = await query;
    if (error) return `Time entries could not be read (${error.message}).`;
    if (!data?.length) break;
    rows.push(...data);
    if (data.length < pageSize) break;
  }
  if (!rows.length) return `No time has been logged for ${window.label}.`;

  const byPerson = new Map<string, number>();
  const byPersonProject = new Map<string, { person: string; project: string; hours: number }>();
  for (const row of rows) {
    const person = personName(firstOf(row.employees));
    const project = firstOf(row.projects)?.project_name ?? "No project";
    const hours = Number(row.hours) || 0;
    byPerson.set(person, (byPerson.get(person) ?? 0) + hours);
    const key = `${person}\u0000${project}`;
    const current = byPersonProject.get(key) ?? { person, project, hours: 0 };
    current.hours += hours;
    byPersonProject.set(key, current);
  }

  const needle = term?.toLowerCase() ?? "";
  const people = [...byPerson.entries()].sort((a, b) => b[1] - a[1]);
  const matchedPeople = needle ? people.filter(([name]) => name.toLowerCase().includes(needle)) : [];
  const matchedProjects = needle
    ? [...byPersonProject.values()].filter((row) => row.project.toLowerCase().includes(needle))
    : [];

  const linesFor = (person: string) =>
    [...byPersonProject.values()]
      .filter((row) => row.person === person)
      .sort((a, b) => b.hours - a.hours)
      .map((row) => `${row.project} ${formatHours(row.hours)}h`)
      .join("; ");

  if (matchedPeople.length) {
    const blocks = matchedPeople.map(([person, hours]) => `${person}: ${formatHours(hours)}h — ${linesFor(person)}`);
    const recent = rows
      .filter((row) => personName(firstOf(row.employees)).toLowerCase().includes(needle))
      .slice(0, 15)
      .map((row) => {
        const project = firstOf(row.projects)?.project_name ?? "No project";
        const task = row.task_name ? ` — ${row.task_name}` : "";
        return `${row.entry_date}: ${formatHours(Number(row.hours) || 0)}h, ${project}${task}`;
      });
    return `Time logged for ${window.label}:\n${blocks.join("\n")}${recent.length ? `\n\nRecent entries:\n${recent.join("\n")}` : ""}`;
  }

  if (matchedProjects.length) {
    const byWorker = new Map<string, { hours: number; projects: Map<string, number> }>();
    for (const row of matchedProjects) {
      const worker = byWorker.get(row.person) ?? { hours: 0, projects: new Map<string, number>() };
      worker.hours += row.hours;
      worker.projects.set(row.project, (worker.projects.get(row.project) ?? 0) + row.hours);
      byWorker.set(row.person, worker);
    }
    const lines = [...byWorker.entries()]
      .sort((a, b) => b[1].hours - a[1].hours)
      .map(([person, info]) => {
        const projects = [...info.projects.entries()]
          .sort((a, b) => b[1] - a[1])
          .map(([project, hours]) => `${project} ${formatHours(hours)}h`)
          .join("; ");
        return `${person}: ${formatHours(info.hours)}h — ${projects}`;
      });
    return `Time logged for ${window.label} on projects matching “${term}”:\n${lines.join("\n")}`;
  }

  const lines = people.map(([person, hours]) => {
    const projects = [...byPersonProject.values()]
      .filter((row) => row.person === person)
      .sort((a, b) => b.hours - a.hours);
    const shown = projects.slice(0, 12).map((row) => `${row.project} ${formatHours(row.hours)}h`);
    const extra = projects.length > 12 ? `; ${projects.length - 12} more projects` : "";
    return `${person}: ${formatHours(hours)}h — ${shown.join("; ")}${extra}`;
  });
  const partial = rows.length >= 20000 ? " Totals may be incomplete past 20,000 entries." : "";
  return `Time logged for ${window.label}, by person:${partial}\n${lines.join("\n")}`;
}

async function pipelineNote(supabase: Supabase, term: string | null): Promise<string> {
  const [leadPage, followPage, notePage, estimatePage, constructionResult] = await Promise.all([
    readPages(
      (from, to) =>
        supabase
          .from("leads")
          .select(
            "id, title, client_name, contact_name, contact_phone, contact_email, address, source, status, expected_value, probability, next_follow_up_date, notes, created_at, updated_at, employees(first_name, last_name), projects(project_name)",
          )
          .order("updated_at", { ascending: false })
          .range(from, to),
      400,
    ),
    readPages(
      (from, to) =>
        supabase
          .from("lead_follow_ups")
          .select("lead_id, due_date, due_time, follow_up_type_id, completed, completed_at")
          .order("due_date", { ascending: false })
          .range(from, to),
      600,
    ),
    readPages(
      (from, to) =>
        supabase
          .from("lead_notes")
          .select("lead_id, body, created_at")
          .order("created_at", { ascending: false })
          .range(from, to),
      400,
    ),
    readPages(
      (from, to) =>
        supabase
          .from("estimates")
          .select(
            "title, client_name, estimate_type, revision_number, stage, result, amount, received_date, due_date, submitted_date, won_date, notes, checklist, projects(project_name), employees(first_name, last_name)",
          )
          .order("updated_at", { ascending: false })
          .range(from, to),
      300,
    ),
    supabase
      .from("projects")
      .select("project_name, client_name, phase, status, target_completion_date")
      .eq("active", true)
      .or("phase.ilike.%construction%,phase.ilike.%closeout%")
      .order("project_name")
      .limit(80),
  ]);

  if (leadPage.error) return `Pipeline leads could not be read (${leadPage.error}).`;

  const needle = term?.toLowerCase() ?? "";
  const leads = needle
    ? leadPage.rows.filter((lead) =>
        `${lead.title ?? ""} ${lead.client_name ?? ""} ${lead.contact_name ?? ""} ${lead.address ?? ""}`
          .toLowerCase()
          .includes(needle),
      )
    : leadPage.rows;
  const leadIds = new Set(leads.map((lead) => lead.id));
  const followUps = followPage.rows.filter((follow) => !needle || leadIds.has(follow.lead_id));
  const notes = notePage.rows.filter((note) => !needle || leadIds.has(note.lead_id));
  const followByLead = groupBy(followUps, (follow) => follow.lead_id);
  const notesByLead = groupBy(notes, (note) => note.lead_id);

  const blocks: string[] = [];
  if (followPage.error) blocks.push(`Lead follow-ups could not be read (${followPage.error}).`);
  if (notePage.error) blocks.push(`Lead activity notes could not be read (${notePage.error}).`);

  if (!leads.length) {
    blocks.push(term ? `No lead matched “${term}”.` : "There are no leads.");
  } else {
    const lines = leads.map((lead) => formatLeadRecord(lead, followByLead.get(lead.id) ?? [], notesByLead.get(lead.id) ?? [], Boolean(term)));
    const partial = !term && leadPage.truncated ? "\n\nSome older leads were left out past 400." : "";
    blocks.push(`Pipeline leads:\n${lines.join("\n\n")}${partial}`);
  }

  if (!term) {
    const activity = weeklyPipelineActivity(leadPage.rows, estimatePage.rows);
    if (activity.length) blocks.push(`Pipeline activity, last 8 weeks:\n${activity.join("\n")}`);
  }

  if (estimatePage.error) blocks.push(`Estimates could not be read (${estimatePage.error}).`);
  else {
    const estimates = needle
      ? estimatePage.rows.filter((estimate) =>
          `${estimate.title ?? ""} ${estimate.client_name ?? ""} ${firstOf(estimate.projects)?.project_name ?? ""}`
            .toLowerCase()
            .includes(needle),
        )
      : estimatePage.rows;
    if (estimates.length) {
      const lines = estimates.map((estimate) => formatEstimateRecord(estimate, Boolean(term)));
      const partial = !term && estimatePage.truncated ? "\n\nSome older estimates were left out past 300." : "";
      blocks.push(`Estimates:\n${lines.join("\n")}${partial}`);
    }
  }

  if (!constructionResult.error && constructionResult.data?.length) {
    const jobs = needle
      ? constructionResult.data.filter((project) =>
          `${project.project_name} ${project.client_name}`.toLowerCase().includes(needle),
        )
      : constructionResult.data;
    if (jobs.length) {
      const lines = jobs.map(
        (project) =>
          `${project.project_name} — ${project.client_name} — ${project.phase}${project.status ? ` — ${project.status}` : ""}${project.target_completion_date ? ` — due ${project.target_completion_date}` : ""}`,
      );
      blocks.push(`Construction pipeline:\n${lines.join("\n")}`);
    }
  }

  return blocks.join("\n\n");
}

function formatLeadRecord(
  lead: {
    id: string;
    title?: string | null;
    client_name: string;
    contact_name?: string | null;
    contact_phone?: string | null;
    contact_email?: string | null;
    address?: string | null;
    source?: string | null;
    status?: string | null;
    expected_value?: number | null;
    probability?: number | null;
    next_follow_up_date?: string | null;
    notes?: string | null;
    created_at?: string | null;
    updated_at?: string | null;
    employees?: { first_name?: string | null; last_name?: string | null } | { first_name?: string | null; last_name?: string | null }[] | null;
    projects?: { project_name?: string | null } | { project_name?: string | null }[] | null;
  },
  followUps: {
    due_date: string;
    due_time?: string | null;
    follow_up_type_id?: string | null;
    completed?: boolean | null;
    completed_at?: string | null;
  }[],
  notes: { body: string; created_at: string }[],
  detailed: boolean,
): string {
  const name = lead.title?.trim() || lead.client_name;
  const owner = personName(firstOf(lead.employees));
  const value = money(lead.expected_value);
  const project = firstOf(lead.projects)?.project_name;
  const contact = [lead.contact_name, lead.contact_phone, lead.contact_email, lead.address].filter(Boolean).join(" · ");
  const header = [
    name,
    lead.client_name,
    lead.status,
    lead.source ? labelize(lead.source) : "",
    owner === "Unassigned" ? "" : owner,
    value,
    lead.probability != null ? `${lead.probability}%` : "",
    project ? `project ${project}` : "",
  ]
    .filter(Boolean)
    .join(" — ");
  const followLines = followUps.slice(0, detailed ? 20 : 8).map((follow) => {
    const when = `${follow.due_date}${follow.due_time ? ` ${String(follow.due_time).slice(0, 5)}` : ""}`;
    const kind = follow.follow_up_type_id ? labelize(follow.follow_up_type_id) : "Follow-up";
    const state = follow.completed ? `done ${String(follow.completed_at ?? "").slice(0, 10)}` : "open";
    return `${when}: ${kind} — ${state}`;
  });
  const noteLines = notes.slice(0, detailed ? 12 : 4).map((note) => `${String(note.created_at).slice(0, 10)}: ${clipText(note.body, detailed ? 400 : 180)}`);
  return [
    header,
    contact ? `Contact: ${contact}` : "",
    lead.created_at ? `Opened ${String(lead.created_at).slice(0, 10)}` : "",
    lead.updated_at ? `Updated ${String(lead.updated_at).slice(0, 10)}` : "",
    lead.next_follow_up_date ? `Next follow-up ${lead.next_follow_up_date}` : "",
    lead.notes?.trim() ? `Notes: ${clipText(lead.notes, detailed ? 700 : 220)}` : "",
    followLines.length ? `Follow-ups:\n${followLines.join("\n")}` : "",
    noteLines.length ? `Activity:\n${noteLines.join("\n")}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

function formatEstimateRecord(
  estimate: {
    title?: string | null;
    client_name: string;
    estimate_type?: string | null;
    revision_number?: number | null;
    stage?: string | null;
    result?: string | null;
    amount?: number | null;
    received_date?: string | null;
    due_date?: string | null;
    submitted_date?: string | null;
    won_date?: string | null;
    notes?: string | null;
    checklist?: unknown;
    projects?: { project_name?: string | null } | { project_name?: string | null }[] | null;
    employees?: { first_name?: string | null; last_name?: string | null } | { first_name?: string | null; last_name?: string | null }[] | null;
  },
  detailed: boolean,
): string {
  const project = firstOf(estimate.projects)?.project_name;
  const estimator = personName(firstOf(estimate.employees));
  const amount = money(estimate.amount);
  const revision = estimate.revision_number ? ` rev ${estimate.revision_number}` : "";
  const dates = [
    estimate.received_date ? `received ${estimate.received_date}` : "",
    estimate.due_date ? `due ${estimate.due_date}` : "",
    estimate.submitted_date ? `submitted ${estimate.submitted_date}` : "",
    estimate.won_date ? `won ${estimate.won_date}` : "",
  ].filter(Boolean);
  const checklist = checklistSummary(estimate.checklist);
  return [
    `${estimate.title?.trim() || estimate.client_name}${revision} — ${labelize(estimate.estimate_type ?? "estimate")} — ${labelize(estimate.stage ?? "")} — ${estimate.result ?? "pending"} — ${estimate.client_name}${project ? ` — ${project}` : ""}${amount ? ` — ${amount}` : ""}${estimator === "Unassigned" ? "" : ` — ${estimator}`}`,
    dates.length ? dates.join("; ") : "",
    checklist,
    estimate.notes?.trim() ? `Notes: ${clipText(estimate.notes, detailed ? 400 : 160)}` : "",
  ]
    .filter(Boolean)
    .join(" — ");
}

function checklistSummary(value: unknown): string {
  if (!Array.isArray(value) || value.length === 0) return "";
  const items = value.flatMap((entry) => {
    if (!entry || typeof entry !== "object") return [];
    const item = entry as { label?: unknown; done?: unknown };
    if (typeof item.label !== "string") return [];
    return [{ label: item.label, done: item.done === true }];
  });
  if (!items.length) return "";
  const done = items.filter((item) => item.done).length;
  const open = items.filter((item) => !item.done).slice(0, 6).map((item) => item.label);
  return `${done}/${items.length} checklist done${open.length ? `; still open: ${open.join(", ")}` : ""}`;
}

function weeklyPipelineActivity(
  leads: { created_at?: string | null }[],
  estimates: { submitted_date?: string | null; amount?: number | null }[],
): string[] {
  const now = new Date();
  const current = startOfWeek(now, { weekStartsOn: 1 });
  const lines: string[] = [];
  for (let index = 7; index >= 0; index -= 1) {
    const weekStart = addWeeks(current, -index);
    const weekEnd = addWeeks(weekStart, 1);
    const created = leads.filter((lead) => {
      const date = lead.created_at ? new Date(lead.created_at) : null;
      return date ? date >= weekStart && date < weekEnd : false;
    }).length;
    const submitted = estimates.filter((estimate) => {
      const date = estimate.submitted_date ? new Date(`${estimate.submitted_date}T12:00:00`) : null;
      return date ? date >= weekStart && date < weekEnd : false;
    });
    if (!created && !submitted.length) continue;
    const amount = submitted.reduce((sum, estimate) => sum + (Number(estimate.amount) || 0), 0);
    lines.push(
      `${format(weekStart, "MMM d")}: ${created} new lead${created === 1 ? "" : "s"}, ${submitted.length} estimate${submitted.length === 1 ? "" : "s"} submitted${amount ? ` (${money(amount)})` : ""}`,
    );
  }
  return lines;
}

function groupBy<T>(rows: T[], key: (row: T) => string): Map<string, T[]> {
  const grouped = new Map<string, T[]>();
  for (const row of rows) {
    const id = key(row);
    const list = grouped.get(id) ?? [];
    list.push(row);
    grouped.set(id, list);
  }
  return grouped;
}

async function readPages<T>(
  fetchPage: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
  cap: number,
): Promise<{ rows: T[]; error: string | null; truncated: boolean }> {
  const rows: T[] = [];
  const pageSize = 200;
  for (let from = 0; from < cap; from += pageSize) {
    const to = Math.min(cap, from + pageSize) - 1;
    const { data, error } = await fetchPage(from, to);
    if (error) return { rows, error: error.message, truncated: false };
    if (!data?.length) return { rows, error: null, truncated: false };
    rows.push(...data);
    if (data.length < to - from + 1) return { rows, error: null, truncated: false };
  }
  return { rows, error: null, truncated: true };
}

async function crmNote(supabase: Supabase, term: string | null): Promise<string> {
  if (!term) {
    const { data: notes, error: noteError } = await supabase
      .from("client_notes")
      .select("client_key, body, created_at")
      .order("created_at", { ascending: false })
      .limit(10);
    if (noteError) return `CRM notes could not be read (${noteError.message}).`;
    const keys = [...new Set((notes ?? []).map((note) => note.client_key).filter(Boolean))];
    const { data: clients, error } = keys.length
      ? await supabase.from("clients").select("name, normalized_key, phone, email, address").in("normalized_key", keys)
      : await supabase.from("clients").select("name, normalized_key, phone, email, address").order("name").limit(12);
    if (error) return `CRM contacts could not be read (${error.message}).`;
    if (!clients?.length && !notes?.length) return "There are no CRM contacts.";
    return formatCrm(clients ?? [], notes ?? []);
  }

  const { data, error } = await supabase
    .from("clients")
    .select("name, normalized_key, phone, email, address")
    .ilike("name", `%${term}%`)
    .order("name")
    .limit(8);
  if (error) return `CRM contacts could not be read (${error.message}).`;
  if (!data?.length) return `No CRM contact matched “${term}”.`;
  const keys = data.map((client) => client.normalized_key).filter(Boolean);
  const { data: notes } = keys.length
    ? await supabase
        .from("client_notes")
        .select("client_key, body, created_at")
        .in("client_key", keys)
        .order("created_at", { ascending: false })
        .limit(12)
    : { data: [] };
  return formatCrm(data, notes ?? [], term);
}

function formatCrm(
  clients: { name: string; normalized_key: string; phone: string | null; email: string | null; address: string | null }[],
  notes: { client_key: string; body: string }[],
  term?: string,
): string {
  const byKey = new Map<string, string[]>();
  for (const note of notes) {
    const list = byKey.get(note.client_key) ?? [];
    if (list.length < 3) list.push(clipText(note.body, 180));
    byKey.set(note.client_key, list);
  }
  const known = new Set(clients.map((client) => client.normalized_key));
  const lines = clients.map((client) => {
    const contact = [client.phone, client.email, client.address].filter(Boolean).join(" · ");
    const noteLines = byKey.get(client.normalized_key) ?? [];
    const note = noteLines.length ? ` — notes: ${noteLines.join(" | ")}` : "";
    return `${client.name}${contact ? ` — ${contact}` : ""}${note}`;
  });
  for (const [key, noteLines] of byKey) {
    if (known.has(key) || !noteLines.length) continue;
    lines.push(`${key} — notes: ${noteLines.join(" | ")}`);
  }
  return `${term ? `CRM contacts matching “${term}”` : "CRM contacts and notes"}:\n${lines.join("\n")}`;
}

async function todoNote(
  supabase: Supabase,
  permissions: AppPermissions,
  userId: string,
  term: string | null,
): Promise<string> {
  let employeeId: string | null = null;
  if (!permissions.viewAllTodos) {
    employeeId = await linkedEmployeeId(supabase, userId);
    if (!employeeId) {
      return "To-dos are limited to this person's own list, and their login is not linked to a schedule row yet.";
    }
  }

  const rows: {
    body: string;
    status: string;
    employees: { first_name?: string | null; last_name?: string | null } | { first_name?: string | null; last_name?: string | null }[] | null;
    projects: { project_name?: string | null } | { project_name?: string | null }[] | null;
  }[] = [];
  const pageSize = 200;
  for (let from = 0; from < 400; from += pageSize) {
    let query = supabase
      .from("todos")
      .select("body, status, employees(first_name, last_name), projects(project_name)")
      .order("created_at", { ascending: false })
      .range(from, from + pageSize - 1);
    if (employeeId) query = query.eq("employee_id", employeeId);
    const { data, error } = await query;
    if (error) return `To-dos could not be read (${error.message}).`;
    if (!data?.length) break;
    rows.push(...data);
    if (data.length < pageSize) break;
  }
  if (!rows.length) return "There are no to-dos.";

  const needle = term?.toLowerCase() ?? "";
  const matched = needle
    ? rows.filter((todo) => {
        const owner = personName(firstOf(todo.employees)).toLowerCase();
        const project = (firstOf(todo.projects)?.project_name ?? "").toLowerCase();
        return owner.includes(needle) || project.includes(needle) || todo.body.toLowerCase().includes(needle);
      })
    : [];
  const chosen = matched.length ? matched : rows;
  const heading = matched.length ? `To-dos matching “${term}”` : "To-dos by person";

  const byPerson = new Map<string, string[]>();
  for (const todo of chosen) {
    const owner = personName(firstOf(todo.employees));
    const project = firstOf(todo.projects)?.project_name?.trim();
    const line = `${todo.status} — ${project ? project : "no project"} — ${clipText(todo.body, 180)}`;
    const list = byPerson.get(owner) ?? [];
    list.push(line);
    byPerson.set(owner, list);
  }
  const lines = [...byPerson.entries()].map(([person, items]) => `${person}:\n${items.map((item) => `- ${item}`).join("\n")}`);
  const partial = !matched.length && rows.length >= 400 ? "\n\nSome older to-dos were left out past 400." : "";
  return `${heading}:\n${lines.join("\n")}${partial}`;
}

async function reportNote(supabase: Supabase, question: string): Promise<string> {
  const settings = await loadSettings(supabase);
  const today = new Date();
  const monthly = reportUsesMonth(question);
  const window = timeWindow(question, today);
  const periodStart =
    monthly && window.bounded ? startOfDay(window.start) : getWeekStart(today, settings);
  const periodEnd = addDays(periodStart, settings.include_weekends ? 6 : 4);
  const startKey = format(periodStart, "yyyy-MM-dd");
  const endKey = format(monthly && window.bounded ? window.end : periodEnd, "yyyy-MM-dd");
  const label = monthly && window.bounded ? window.label : `the week of ${format(periodStart, "MMM d")}`;

  const [employeeResult, allocationResult, timeResult, budgetResult] = await Promise.all([
    supabase
      .from("employees")
      .select("id, first_name, last_name, role, weekly_capacity_hours, daily_capacity_hours, active")
      .eq("active", true),
    supabase
      .from("allocations")
      .select("id, employee_id, project_id, allocation_category_id, allocation_date, hours, is_billable, projects(project_name)")
      .gte("allocation_date", startKey)
      .lte("allocation_date", endKey)
      .limit(2000),
    supabase
      .from("time_entries")
      .select("id, employee_id, project_id, allocation_category_id, entry_date, hours, is_billable")
      .gte("entry_date", startKey)
      .lte("entry_date", endKey)
      .limit(2000),
    supabase
      .from("projects")
      .select("id, project_name, client_name, budgeted_design_hours")
      .eq("active", true)
      .gt("budgeted_design_hours", 0)
      .order("project_name")
      .limit(12),
  ]);

  if (employeeResult.error || allocationResult.error || timeResult.error) {
    const message = employeeResult.error?.message ?? allocationResult.error?.message ?? timeResult.error?.message;
    return `Reports could not be read (${message}).`;
  }

  const employees = (employeeResult.data ?? []).map(asEmployee);
  const allocations = (allocationResult.data ?? []).map(asAllocation);
  const entries = (timeResult.data ?? []).map(asTimeEntry);
  const summary = monthly
    ? getTeamMonthSummary(allocations, employees, periodStart, settings)
    : getTeamSummary(allocations, employees, periodStart, settings);
  const timeSummary = monthly
    ? getTeamMonthTimeSummary(allocations, entries, periodStart, settings)
    : getTeamTimeSummary(allocations, entries, employees, periodStart, settings);

  const byProject = new Map<string, number>();
  for (const row of allocationResult.data ?? []) {
    const name = firstOf(row.projects)?.project_name ?? "No project";
    byProject.set(name, (byProject.get(name) ?? 0) + Number(row.hours || 0));
  }
  const projectLines = [...byProject.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([name, amount]) => `${name}: ${formatHours(amount)}h scheduled`);

  const budgetProjects = budgetResult.data ?? [];
  const hourLines = await hourBudgetLines(supabase, budgetProjects);
  const budgetLines = budgetProjects.map((project) => {
    const comparison = hourLines.get(project.id) ?? describeHoursBudget(Number(project.budgeted_design_hours) || 0, 0);
    return `${project.project_name} — ${project.client_name}: ${comparison}`;
  });

  const blocks = [
    `Reports for ${label}: team utilization ${summary.totalUtilizationPercent}%, ${formatHours(timeSummary.scheduledHours)}h scheduled, ${formatHours(timeSummary.actualHours)}h logged, schedule match ${timeSummary.matchPercent}%.`,
  ];
  if (projectLines.length) blocks.push(`Scheduled hours by project:\n${projectLines.join("\n")}`);
  if (budgetLines.length) blocks.push(`Project design-hour budgets:\n${budgetLines.join("\n")}`);
  return blocks.join("\n\n");
}

async function budgetNote(supabase: Supabase, term: string | null): Promise<string> {
  let query = supabase
    .from("projects")
    .select(
      "id, project_name, client_name, budgeted_design_hours, estimated_construction_value, estimate_value, is_change_order, active",
    )
    .eq("active", true)
    .order("project_name")
    .limit(term ? 8 : 12);
  if (term) query = query.or(orIlike(["project_name", "client_name"], term));

  const { data, error } = await query;
  if (error) return `Budgets could not be read (${error.message}).`;
  if (!data?.length) return term ? `No active project budget matched “${term}”.` : "There are no active project budgets.";

  const hourLines = await hourBudgetLines(supabase, data);

  const lines = data.map((project) => {
    const fee = money(project.estimated_construction_value);
    const estimate = money(project.estimate_value);
    const extras = [
      hourLines.get(project.id),
      fee ? `${fee} design fee` : "",
      estimate ? `${estimate} estimate` : "",
      project.is_change_order ? "change order" : "",
    ].filter(Boolean);
    return `${project.project_name} — ${project.client_name}: ${extras.join(", ")}`;
  });
  return `Project budgets:\n${lines.join("\n")}`;
}

async function contractNote(supabase: Supabase, term: string | null): Promise<string> {
  let estimates = supabase
    .from("estimates")
    .select("title, client_name, stage, result, amount, due_date, projects(project_name)")
    .eq("estimate_type", "contract")
    .order("updated_at", { ascending: false })
    .limit(15);
  let projects = supabase
    .from("projects")
    .select("project_name, client_name, contract_date, estimated_construction_value")
    .not("contract_date", "is", null)
    .order("contract_date", { ascending: false })
    .limit(12);
  if (term) {
    estimates = estimates.or(orIlike(["client_name", "title"], term));
    projects = projects.or(orIlike(["project_name", "client_name"], term));
  }

  const [estimateResult, projectResult] = await Promise.all([estimates, projects]);
  const blocks: string[] = [];
  if (estimateResult.error) blocks.push(`Contracts could not be read (${estimateResult.error.message}).`);
  else if (estimateResult.data?.length) {
    const lines = estimateResult.data.map((estimate) => {
      const project = firstOf(estimate.projects)?.project_name;
      const amount = money(estimate.amount);
      return `${estimate.title?.trim() || estimate.client_name} — ${labelize(estimate.stage)} — ${estimate.result}${project ? ` — ${project}` : ""}${amount ? ` — ${amount}` : ""}${estimate.due_date ? ` — due ${estimate.due_date}` : ""}`;
    });
    blocks.push(`Contract estimates:\n${lines.join("\n")}`);
  }
  if (!projectResult.error && projectResult.data?.length) {
    const lines = projectResult.data.map((project) => {
      const fee = money(project.estimated_construction_value);
      return `${project.project_name} — ${project.client_name} — contract date ${project.contract_date}${fee ? ` — ${fee} design fee` : ""}`;
    });
    blocks.push(`Projects with a contract date:\n${lines.join("\n")}`);
  }
  if (!blocks.length) return term ? `No contract matched “${term}”.` : "There are no contracts on file.";
  return blocks.join("\n\n");
}

async function changeOrderNote(supabase: Supabase, term: string | null): Promise<string> {
  let projects = supabase
    .from("projects")
    .select("project_name, client_name, budgeted_design_hours, estimated_construction_value, parent_project_id, active")
    .eq("is_change_order", true)
    .order("project_name")
    .limit(15);
  let estimates = supabase
    .from("estimates")
    .select("title, client_name, stage, result, amount, due_date, projects(project_name)")
    .eq("estimate_type", "change_order")
    .order("updated_at", { ascending: false })
    .limit(15);
  if (term) {
    projects = projects.or(orIlike(["project_name", "client_name"], term));
    estimates = estimates.or(orIlike(["client_name", "title"], term));
  }

  const [projectResult, estimateResult] = await Promise.all([projects, estimates]);
  const blocks: string[] = [];
  if (projectResult.error) blocks.push(`Change orders could not be read (${projectResult.error.message}).`);
  else if (projectResult.data?.length) {
    const parentIds = [...new Set(projectResult.data.map((project) => project.parent_project_id).filter(Boolean))];
    const parents = new Map<string, string>();
    if (parentIds.length) {
      const { data } = await supabase.from("projects").select("id, project_name").in("id", parentIds);
      for (const parent of data ?? []) parents.set(parent.id, parent.project_name);
    }
    const lines = projectResult.data.map((project) => {
      const parent = project.parent_project_id ? parents.get(project.parent_project_id) : "";
      const fee = money(project.estimated_construction_value);
      return `${project.project_name} — ${project.client_name}${parent ? ` — parent ${parent}` : ""} — ${formatHours(Number(project.budgeted_design_hours))}h${fee ? ` — ${fee}` : ""}${project.active ? "" : " — inactive"}`;
    });
    blocks.push(`Change-order projects:\n${lines.join("\n")}`);
  }
  if (!estimateResult.error && estimateResult.data?.length) {
    const lines = estimateResult.data.map((estimate) => {
      const project = firstOf(estimate.projects)?.project_name;
      const amount = money(estimate.amount);
      return `${estimate.title?.trim() || estimate.client_name} — ${labelize(estimate.stage)} — ${estimate.result}${project ? ` — ${project}` : ""}${amount ? ` — ${amount}` : ""}${estimate.due_date ? ` — due ${estimate.due_date}` : ""}`;
    });
    blocks.push(`Change-order estimates:\n${lines.join("\n")}`);
  }
  if (!blocks.length) return term ? `No change order matched “${term}”.` : "There are no change orders.";
  return blocks.join("\n\n");
}

async function handoffNote(supabase: Supabase, term: string | null): Promise<string> {
  if (term) {
    const { data: projects, error } = await supabase
      .from("projects")
      .select("id, project_name")
      .or(orIlike(["project_name", "client_name"], term))
      .limit(4);
    if (error) return `Handoff checklists could not be read (${error.message}).`;
    if (!projects?.length) return `No project matched “${term}” for a handoff checklist.`;
    const { data: workflows, error: workflowError } = await supabase
      .from("handoff_workflows")
      .select("id, project_id, subject_kind")
      .in("project_id", projects.map((project) => project.id));
    if (workflowError) return `Handoff checklists could not be read (${workflowError.message}).`;
    if (!workflows?.length) return `No handoff checklist is started for ${projects.map((project) => project.project_name).join(", ")}.`;
    return formatHandoffs(supabase, workflows, new Map(projects.map((project) => [project.id, project.project_name])));
  }

  const { data: stages, error } = await supabase
    .from("handoff_stages")
    .select("workflow_id, stage_key, status, notes, handoff_checklist_items(label, state, required, hidden)")
    .in("status", ["open", "in_review", "returned"])
    .limit(12);
  if (error) return `Handoff checklists could not be read (${error.message}).`;
  if (!stages?.length) return "No handoff checklists are open right now.";

  const workflowIds = [...new Set(stages.map((stage) => stage.workflow_id))];
  const { data: workflows } = await supabase
    .from("handoff_workflows")
    .select("id, project_id, subject_kind, projects(project_name)")
    .in("id", workflowIds);
  const names = new Map<string, { project: string; kind: string }>();
  for (const workflow of workflows ?? []) {
    names.set(workflow.id, {
      project: firstOf(workflow.projects)?.project_name ?? "Project",
      kind: workflow.subject_kind,
    });
  }
  const lines = stages.map((stage) => handoffLine(names.get(stage.workflow_id)?.project ?? "Project", names.get(stage.workflow_id)?.kind, stage));
  return `Open handoff checklists:\n${lines.join("\n")}`;
}

async function formatHandoffs(
  supabase: Supabase,
  workflows: { id: string; project_id: string; subject_kind: string }[],
  names: Map<string, string>,
): Promise<string> {
  const { data: stages, error } = await supabase
    .from("handoff_stages")
    .select("workflow_id, stage_key, status, notes, sort_order, handoff_checklist_items(label, state, required, hidden, sort_order)")
    .in("workflow_id", workflows.map((workflow) => workflow.id))
    .order("sort_order");
  if (error) return `Handoff checklists could not be read (${error.message}).`;
  if (!stages?.length) return "That handoff has no stages yet.";
  const kindByWorkflow = new Map(workflows.map((workflow) => [workflow.id, workflow.subject_kind]));
  const lines = stages.map((stage) =>
    handoffLine(names.get(workflows.find((workflow) => workflow.id === stage.workflow_id)?.project_id ?? "") ?? "Project", kindByWorkflow.get(stage.workflow_id), stage),
  );
  return `Handoff checklists:\n${lines.join("\n")}`;
}

function handoffLine(
  project: string,
  kind: string | undefined,
  stage: {
    stage_key: string;
    status: string;
    notes?: string | null;
    handoff_checklist_items?: { label: string; state: string; required: boolean; hidden: boolean }[] | null;
  },
): string {
  const raw = stage.handoff_checklist_items;
  const items = (Array.isArray(raw) ? raw : []).filter((item) => !item.hidden);
  const open = items.filter((item) => item.state === "open").slice(0, 6);
  const done = items.filter((item) => item.state === "done").length;
  const openLabels = open.map((item) => item.label).join(", ");
  const note = stage.notes?.trim() ? ` — ${clipText(stage.notes, 120)}` : "";
  const subject = kind === "change_order" ? "change order" : "project";
  return `${project} (${subject}) — ${labelize(stage.stage_key)} — ${labelize(stage.status)} — ${done} done${openLabels ? `, still open: ${openLabels}` : ""}${note}`;
}

async function wipNote(
  supabase: Supabase,
  permissions: AppPermissions,
  term: string | null,
): Promise<string> {
  if (!permissions.viewWipSchedule) {
    return "Construction cost and billing figures are limited to admins.";
  }
  let query = supabase
    .from("projects")
    .select(
      "project_name, client_name, wip_contract_price, wip_cost_to_date, wip_estimated_cost_to_complete, wip_billings_to_date, active",
    )
    .eq("active", true)
    .order("project_name")
    .limit(40);
  if (term) query = query.or(orIlike(["project_name", "client_name"], term));
  const { data, error } = await query;
  if (error) return `WIP figures could not be read (${error.message}).`;
  const rows = (data ?? []).filter(
    (project) =>
      project.wip_contract_price != null ||
      project.wip_cost_to_date != null ||
      project.wip_billings_to_date != null ||
      project.wip_estimated_cost_to_complete != null,
  );
  if (!rows.length) return term ? `No WIP figures matched “${term}”.` : "No WIP figures are entered.";
  const lines = rows.slice(0, 12).map((project) => {
    const parts = [
      money(project.wip_contract_price) ? `contract ${money(project.wip_contract_price)}` : "",
      money(project.wip_cost_to_date) ? `cost to date ${money(project.wip_cost_to_date)}` : "",
      money(project.wip_estimated_cost_to_complete)
        ? `cost to complete ${money(project.wip_estimated_cost_to_complete)}`
        : "",
      money(project.wip_billings_to_date) ? `billed ${money(project.wip_billings_to_date)}` : "",
    ].filter(Boolean);
    return `${project.project_name} — ${project.client_name}: ${parts.join(", ")}`;
  });
  return `WIP schedule:\n${lines.join("\n")}`;
}

async function ganttNote(supabase: Supabase, term: string | null): Promise<string> {
  const ids = await matchingProjectIds(supabase, term);
  if (term && !ids?.length) return `No schedule matched “${term}”.`;
  const start = format(addDays(new Date(), -30), "yyyy-MM-dd");
  const end = format(addDays(new Date(), 120), "yyyy-MM-dd");

  let milestones = supabase
    .from("project_milestones")
    .select("title, milestone_date, kind, notes, completed_at, pipeline_tag, projects(project_name)")
    .gte("milestone_date", start)
    .lte("milestone_date", end)
    .order("milestone_date")
    .limit(30);
  let phases = supabase
    .from("project_phases")
    .select("phase_key, start_date, end_date, budget_hours, projects(project_name)")
    .order("start_date")
    .limit(30);
  if (ids) {
    milestones = milestones.in("project_id", ids);
    phases = phases.in("project_id", ids);
  }

  const [milestoneResult, phaseResult] = await Promise.all([milestones, phases]);
  const blocks: string[] = [];
  if (milestoneResult.error) blocks.push(`Milestones could not be read (${milestoneResult.error.message}).`);
  else if (milestoneResult.data?.length) {
    const lines = milestoneResult.data.map((milestone) => {
      const project = firstOf(milestone.projects)?.project_name ?? "Project";
      const done = milestone.completed_at ? "done" : "open";
      const tag = milestone.pipeline_tag ? ` — ${milestone.pipeline_tag}` : "";
      const note = milestone.notes ? ` — ${clipText(milestone.notes, 120)}` : "";
      return `${milestone.milestone_date}: ${project} — ${milestone.title} — ${labelize(milestone.kind)} — ${done}${tag}${note}`;
    });
    blocks.push(`Schedules milestones:\n${lines.join("\n")}`);
  }
  if (phaseResult.error) blocks.push(`Phase dates could not be read (${phaseResult.error.message}).`);
  else if (phaseResult.data?.length) {
    const lines = phaseResult.data.map((phase) => {
      const project = firstOf(phase.projects)?.project_name ?? "Project";
      const dates = [phase.start_date, phase.end_date].filter(Boolean).join(" → ");
      return `${project} — ${labelize(phase.phase_key)}${dates ? ` — ${dates}` : ""} — ${formatHours(Number(phase.budget_hours))}h`;
    });
    blocks.push(`Gantt phases:\n${lines.join("\n")}`);
  }
  if (!blocks.length) return "No Gantt phases or milestones are on the schedule.";
  return blocks.join("\n\n");
}

async function projectNotesNote(supabase: Supabase, term: string | null): Promise<string> {
  const ids = await matchingProjectIds(supabase, term);
  if (term && !ids?.length) return "";
  let query = supabase
    .from("project_notes")
    .select("body, created_at, projects(project_name)")
    .order("created_at", { ascending: false })
    .limit(12);
  if (ids) query = query.in("project_id", ids);
  const { data, error } = await query;
  if (error) return `Project notes could not be read (${error.message}).`;
  if (!data?.length) return "";
  const lines = data.map((note) => {
    const project = firstOf(note.projects)?.project_name ?? "Project";
    const day = String(note.created_at).slice(0, 10);
    return `${day}: ${project} — ${clipText(note.body, 180)}`;
  });
  return `Project notes:\n${lines.join("\n")}`;
}

async function queueNote(supabase: Supabase, term: string | null): Promise<string> {
  const page = await readPages(
    (from, to) =>
      supabase
        .from("queue_project_stages")
        .select("queue_kind, stage, projects(project_name, client_name, phase, status, target_completion_date)")
        .range(from, to),
    300,
  );
  if (page.error) return `Pipeline boards could not be read (${page.error}).`;
  const rows = page.rows.filter((row) => {
    if (!term) return true;
    const project = firstOf(row.projects);
    return `${project?.project_name ?? ""} ${project?.client_name ?? ""}`.toLowerCase().includes(term);
  });
  if (!rows.length) return term ? `No pipeline board matched “${term}”.` : "The pipeline boards have no placed projects.";
  const lines = rows.map((row) => {
    const project = firstOf(row.projects);
    const name = project?.project_name ?? "Project";
    const due = project?.target_completion_date ? ` — due ${project.target_completion_date}` : "";
    const phase = project?.phase ? ` — ${project.phase}` : "";
    return `${labelize(row.queue_kind)} — ${labelize(row.stage)} — ${name}${project?.client_name ? ` (${project.client_name})` : ""}${phase}${project?.status ? ` — ${project.status}` : ""}${due}`;
  });
  const partial = page.truncated ? "\n\nSome board rows were left out past 300." : "";
  return `Pipeline board:\n${lines.join("\n")}${partial}`;
}

async function teamNote(
  supabase: Supabase,
  permissions: AppPermissions,
  question: string,
): Promise<string> {
  const blocks: string[] = [];
  if (permissions.viewSettings) {
    const { data, error } = await supabase
      .from("company_settings")
      .select("default_daily_capacity, default_weekly_capacity, workweek_start_day, include_weekends")
      .limit(1)
      .maybeSingle();
    if (error) blocks.push(`Company defaults could not be read (${error.message}).`);
    else if (data) {
      blocks.push(
        `Company defaults: ${data.default_daily_capacity}h per day, ${data.default_weekly_capacity}h per week, week starts ${data.workweek_start_day}, weekends ${data.include_weekends ? "included" : "hidden"} on the schedule.`,
      );
    }
  }

  if (permissions.viewScheduling) {
    const includeInactive = /\binactive\b/i.test(question);
    let query = supabase
      .from("employees")
      .select("first_name, last_name, role, department, daily_capacity_hours, weekly_capacity_hours, active")
      .order("last_name")
      .limit(50);
    if (!includeInactive) query = query.eq("active", true);
    const { data, error } = await query;
    if (error) blocks.push(`The schedule team could not be read (${error.message}).`);
    else if (data?.length) {
      const lines = data.map((person) => {
        const name = personName(person);
        const department = person.department ? ` — ${person.department}` : "";
        const inactive = person.active ? "" : " — inactive";
        return `${name} — ${person.role ?? "Team"}${department} — ${person.daily_capacity_hours}h/day, ${person.weekly_capacity_hours}h/week${inactive}`;
      });
      blocks.push(`Schedule team:\n${lines.join("\n")}`);
    }
  }

  if (permissions.manageAppAccess) {
    const { data, error } = await supabase.from("profiles").select("email, app_role").order("email").limit(40);
    if (!error && data?.length) {
      const lines = data.map((profile) => `${profile.email ?? "No email"} — ${profile.app_role}`);
      blocks.push(`App users:\n${lines.join("\n")}`);
    }
  }

  return blocks.join("\n\n");
}

async function matchingProjectIds(supabase: Supabase, term: string | null): Promise<string[] | null> {
  if (!term) return null;
  const { data } = await supabase
    .from("projects")
    .select("id")
    .or(orIlike(["project_name", "client_name"], term))
    .limit(8);
  return (data ?? []).map((project) => project.id);
}

async function hourBudgetLines(
  supabase: Supabase,
  projects: { id: string; budgeted_design_hours?: number | null; is_change_order?: boolean | null }[],
): Promise<Map<string, string>> {
  const lines = new Map<string, string>();
  if (!projects.length) return lines;
  const ids = projects.map((project) => project.id);
  const { data: changeOrders } = await supabase
    .from("projects")
    .select("id, parent_project_id, budgeted_design_hours")
    .in("parent_project_id", ids);
  const children = changeOrders ?? [];
  const hourIds = [...ids, ...children.map((changeOrder) => changeOrder.id)];
  const actual = await sumHours(supabase, "time_entries", hourIds);

  for (const project of projects) {
    const related = project.is_change_order
      ? []
      : children.filter((changeOrder) => changeOrder.parent_project_id === project.id);
    const budget =
      (Number(project.budgeted_design_hours) || 0) +
      related.reduce((sum, changeOrder) => sum + (Number(changeOrder.budgeted_design_hours) || 0), 0);
    const used =
      (actual.get(project.id) ?? 0) +
      related.reduce((sum, changeOrder) => sum + (actual.get(changeOrder.id) ?? 0), 0);
    const comparison = describeHoursBudget(budget, used);
    lines.set(
      project.id,
      related.length
        ? `${comparison}, including ${related.length} change order${related.length === 1 ? "" : "s"}`
        : comparison,
    );
  }
  return lines;
}

async function sumHours(
  supabase: Supabase,
  table: "time_entries" | "allocations",
  projectIds: string[],
): Promise<Map<string, number>> {
  const totals = new Map<string, number>();
  if (!projectIds.length) return totals;
  const pageSize = 1000;
  for (let from = 0; from < 20000; from += pageSize) {
    const { data, error } = await supabase
      .from(table)
      .select("project_id, hours")
      .in("project_id", projectIds)
      .range(from, from + pageSize - 1);
    if (error || !data?.length) break;
    for (const row of data) {
      if (!row.project_id) continue;
      totals.set(row.project_id, (totals.get(row.project_id) ?? 0) + Number(row.hours || 0));
    }
    if (data.length < pageSize) break;
  }
  return totals;
}

async function linkedEmployeeId(supabase: Supabase, userId: string): Promise<string | null> {
  const { data } = await supabase.from("employees").select("id").eq("profile_id", userId).maybeSingle();
  return data?.id ?? null;
}

async function loadSettings(supabase: Supabase): Promise<CompanySettings> {
  const { data } = await supabase
    .from("company_settings")
    .select("workweek_start_day, include_weekends")
    .limit(1)
    .maybeSingle();
  const day = data?.workweek_start_day ?? "Monday";
  const workweek = (
    ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] as const
  ).includes(day)
    ? day
    : "Monday";
  return {
    id: "chat",
    default_daily_capacity: 8,
    default_weekly_capacity: 40,
    workweek_start_day: workweek,
    include_weekends: Boolean(data?.include_weekends),
    job_roles: [],
    departments: [],
    class_codes: [],
    lead_stages: [],
    lead_sources: [],
    lead_follow_up_types: [],
    handoff_checklists: { project: {}, change_order: {} },
  };
}

function asEmployee(row: {
  id: string;
  first_name: string;
  last_name: string;
  role: string | null;
  weekly_capacity_hours: number;
  daily_capacity_hours: number;
  active: boolean;
}): Employee {
  return {
    id: row.id,
    first_name: row.first_name,
    last_name: row.last_name,
    role: row.role ?? "",
    weekly_capacity_hours: Number(row.weekly_capacity_hours) || 0,
    daily_capacity_hours: Number(row.daily_capacity_hours) || 0,
    active: row.active,
  };
}

function asAllocation(row: {
  id: string;
  employee_id: string;
  project_id: string | null;
  allocation_category_id: string;
  allocation_date: string;
  hours: number;
  is_billable: boolean;
}): Allocation {
  return {
    id: row.id,
    employee_id: row.employee_id,
    project_id: row.project_id,
    allocation_category_id: row.allocation_category_id,
    allocation_date: row.allocation_date,
    hours: Number(row.hours) || 0,
    is_billable: Boolean(row.is_billable),
  };
}

function asTimeEntry(row: {
  id: string;
  employee_id: string;
  project_id: string | null;
  allocation_category_id: string;
  entry_date: string;
  hours: number;
  is_billable: boolean;
}): TimeEntry {
  return {
    id: row.id,
    employee_id: row.employee_id,
    project_id: row.project_id,
    allocation_category_id: row.allocation_category_id,
    entry_date: row.entry_date,
    hours: Number(row.hours) || 0,
    is_billable: Boolean(row.is_billable),
  };
}

function orIlike(columns: string[], term: string): string {
  return columns.map((column) => `${column}.ilike.%${term}%`).join(",");
}

function personName(row: { first_name?: string | null; last_name?: string | null } | null): string {
  if (!row) return "Unassigned";
  return `${row.first_name ?? ""} ${row.last_name ?? ""}`.trim() || "Unassigned";
}

function firstOf<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function labelize(value: string): string {
  return value.replace(/[_-]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatHours(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}
