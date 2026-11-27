import { addDays, addWeeks, format } from "date-fns";

import type { AppPermissions } from "@/lib/auth/permissions";
import {
  clipText,
  money,
  reportUsesMonth,
  scheduleWeekOffsets,
  searchTerm,
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

  const term = searchTerm(question);
  const notes = await Promise.all([
    intents.includes("schedule") && permissions.viewScheduling
      ? scheduleNotes(supabase, question)
      : "",
    intents.includes("projects") && permissions.viewProjects ? projectNote(supabase, term) : "",
    intents.includes("time") && permissions.viewTimeTracking
      ? timeNote(supabase, permissions, userId, question)
      : "",
    intents.includes("pipeline") && permissions.viewQueue ? pipelineNote(supabase, term) : "",
    intents.includes("crm") && permissions.viewCrm ? crmNote(supabase, term) : "",
    intents.includes("todos") && permissions.viewTodos ? todoNote(supabase, permissions, userId) : "",
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

async function projectNote(supabase: Supabase, term: string | null): Promise<string> {
  let query = supabase
    .from("projects")
    .select("project_name, client_name, status, phase, start_date, target_completion_date, active")
    .eq("active", true)
    .order("project_name")
    .limit(term ? 15 : 20);

  if (term) query = query.or(orIlike(["project_name", "client_name"], term));

  const { data, error } = await query;
  if (error) return `Projects could not be read (${error.message}).`;
  if (!data?.length) {
    return term ? `No active project matched “${term}”.` : "There are no active projects.";
  }

  const lines = data.map((project) => {
    const dates = [project.start_date, project.target_completion_date].filter(Boolean).join(" → ");
    return `${project.project_name} — ${project.client_name} — ${project.status} — ${project.phase}${dates ? ` — ${dates}` : ""}`;
  });
  return `${term ? `Projects matching “${term}”` : "Active projects"}:\n${lines.join("\n")}`;
}

async function timeNote(
  supabase: Supabase,
  permissions: AppPermissions,
  userId: string,
  question: string,
): Promise<string> {
  const window = timeWindow(question, new Date());
  const startKey = format(window.start, "yyyy-MM-dd");
  const endKey = format(window.end, "yyyy-MM-dd");
  const spanDays = Math.round((window.end.getTime() - window.start.getTime()) / 86_400_000);

  let employeeId: string | null = null;
  if (!permissions.logTimeForAnyone) {
    employeeId = await linkedEmployeeId(supabase, userId);
    if (!employeeId) {
      return "Time entries are limited to this person's own hours, and their login is not linked to a schedule row yet.";
    }
  }

  let query = supabase
    .from("time_entries")
    .select("entry_date, hours, task_name, employees(first_name, last_name), projects(project_name)")
    .gte("entry_date", startKey)
    .lte("entry_date", endKey)
    .order("entry_date", { ascending: false })
    .limit(spanDays > 14 ? 1000 : 40);
  if (employeeId) query = query.eq("employee_id", employeeId);

  const { data, error } = await query;
  if (error) return `Time entries could not be read (${error.message}).`;
  if (!data?.length) return `No time has been logged for ${window.label}.`;

  if (spanDays > 14) {
    const totals = new Map<string, number>();
    let hours = 0;
    for (const row of data) {
      const amount = Number(row.hours) || 0;
      hours += amount;
      const employee = personName(firstOf(row.employees));
      const project = firstOf(row.projects)?.project_name ?? "No project";
      const key = `${employee} — ${project}`;
      totals.set(key, (totals.get(key) ?? 0) + amount);
    }
    const lines = [...totals.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([key, amount]) => `${key}: ${formatHours(amount)}h`);
    const partial = data.length === 1000 ? " Totals may be incomplete past 1,000 entries." : "";
    return `Time logged for ${window.label}: ${formatHours(hours)}h across ${data.length} entries.${partial}\n${lines.join("\n")}`;
  }

  const lines = data.map((row) => {
    const employee = personName(firstOf(row.employees));
    const project = firstOf(row.projects)?.project_name ?? "No project";
    const task = row.task_name ? ` — ${row.task_name}` : "";
    return `${row.entry_date}: ${employee}, ${row.hours}h, ${project}${task}`;
  });
  return `Time logged for ${window.label}:\n${lines.join("\n")}`;
}

async function pipelineNote(supabase: Supabase, term: string | null): Promise<string> {
  const today = format(new Date(), "yyyy-MM-dd");
  const soon = format(addDays(new Date(), 21), "yyyy-MM-dd");
  const recent = format(addDays(new Date(), -7), "yyyy-MM-dd");

  let leads = supabase
    .from("leads")
    .select(
      "title, client_name, contact_name, contact_phone, contact_email, status, expected_value, next_follow_up_date, notes, employees(first_name, last_name)",
    )
    .order("updated_at", { ascending: false })
    .limit(term ? 12 : 15);
  if (term) leads = leads.or(orIlike(["client_name", "title", "contact_name"], term));

  let estimates = supabase
    .from("estimates")
    .select("title, client_name, estimate_type, stage, result, amount, due_date, projects(project_name)")
    .order("updated_at", { ascending: false })
    .limit(20);
  if (term) estimates = estimates.or(orIlike(["client_name", "title"], term));

  const followUps = supabase
    .from("lead_follow_ups")
    .select("due_date, due_time, leads(title, client_name)")
    .eq("completed", false)
    .gte("due_date", recent)
    .lte("due_date", soon)
    .order("due_date")
    .limit(15);

  const leadNotes = supabase
    .from("lead_notes")
    .select("body, created_at, leads(title, client_name)")
    .order("created_at", { ascending: false })
    .limit(8);

  const [leadResult, estimateResult, followResult, noteResult] = await Promise.all([
    leads,
    estimates,
    followUps,
    leadNotes,
  ]);
  const blocks: string[] = [];

  if (leadResult.error) blocks.push(`Leads could not be read (${leadResult.error.message}).`);
  else if (!leadResult.data?.length) {
    blocks.push(term ? `No lead matched “${term}”.` : "There are no leads.");
  } else {
    const lines = leadResult.data.map((lead) => {
      const name = lead.title?.trim() || lead.client_name;
      const contact = [lead.contact_name, lead.contact_phone, lead.contact_email].filter(Boolean).join(", ");
      const owner = personName(firstOf(lead.employees));
      const value = money(lead.expected_value);
      const follow = lead.next_follow_up_date ? ` — follow-up ${lead.next_follow_up_date}` : "";
      const note = lead.notes ? ` — ${clipText(lead.notes, 160)}` : "";
      return `${name} — ${lead.client_name} — ${lead.status}${value ? ` — ${value}` : ""}${owner !== "Unassigned" ? ` — ${owner}` : ""}${contact ? ` — ${contact}` : ""}${follow}${note}`;
    });
    blocks.push(`Pipeline leads:\n${lines.join("\n")}`);
  }

  if (!estimateResult.error && estimateResult.data?.length) {
    const open = estimateResult.data.filter((estimate) => {
      if (term) return true;
      return estimate.result !== "won" && estimate.result !== "lost" && estimate.stage !== "won" && estimate.stage !== "lost";
    });
    if (open.length) {
      const lines = open.slice(0, 15).map((estimate) => {
        const project = firstOf(estimate.projects)?.project_name;
        const amount = money(estimate.amount);
        return `${estimate.title?.trim() || estimate.client_name} — ${labelize(estimate.estimate_type)} — ${labelize(estimate.stage)} — ${estimate.client_name}${project ? ` — ${project}` : ""}${amount ? ` — ${amount}` : ""}${estimate.due_date ? ` — due ${estimate.due_date}` : ""}`;
      });
      blocks.push(`Estimates:\n${lines.join("\n")}`);
    }
  }

  if (!followResult.error && followResult.data?.length) {
    const lines = followResult.data.map((follow) => {
      const lead = firstOf(follow.leads);
      const name = lead?.title?.trim() || lead?.client_name || "Lead";
      return `${follow.due_date}${follow.due_time ? ` ${String(follow.due_time).slice(0, 5)}` : ""}: ${name}`;
    });
    blocks.push(`Open follow-ups:\n${lines.join("\n")}`);
  }

  if (!noteResult.error && noteResult.data?.length) {
    const lines = noteResult.data.flatMap((note) => {
      const lead = firstOf(note.leads);
      const name = lead?.title?.trim() || lead?.client_name || "Lead";
      if (term && !`${name} ${lead?.client_name ?? ""}`.toLowerCase().includes(term)) return [];
      return [`${name}: ${clipText(note.body, 180)}`];
    });
    if (lines.length) blocks.push(`Lead notes:\n${lines.join("\n")}`);
  }

  return blocks.join("\n\n");
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
): Promise<string> {
  let employeeId: string | null = null;
  if (!permissions.viewAllTodos) {
    employeeId = await linkedEmployeeId(supabase, userId);
    if (!employeeId) {
      return "To-dos are limited to this person's own list, and their login is not linked to a schedule row yet.";
    }
  }

  let query = supabase
    .from("todos")
    .select("body, employees(first_name, last_name)")
    .eq("status", "open")
    .order("created_at", { ascending: false })
    .limit(25);
  if (employeeId) query = query.eq("employee_id", employeeId);

  const { data, error } = await query;
  if (error) return `To-dos could not be read (${error.message}).`;
  if (!data?.length) return "There are no open to-dos.";
  const lines = data.map((todo) => {
    const owner = personName(firstOf(todo.employees));
    return `${owner}: ${clipText(todo.body, 180)}`;
  });
  return `Open to-dos:\n${lines.join("\n")}`;
}

async function reportNote(supabase: Supabase, question: string): Promise<string> {
  const settings = await loadSettings(supabase);
  const today = new Date();
  const monthly = reportUsesMonth(question);
  const window = timeWindow(question, today);
  const periodStart = monthly ? startOfDay(window.start) : getWeekStart(today, settings);
  const periodEnd = addDays(periodStart, settings.include_weekends ? 6 : 4);
  const startKey = format(periodStart, "yyyy-MM-dd");
  const endKey = format(monthly ? window.end : periodEnd, "yyyy-MM-dd");
  const label = monthly ? window.label : `the week of ${format(periodStart, "MMM d")}`;

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
      .select("project_name, client_name, budgeted_design_hours")
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

  const budgetLines = (budgetResult.data ?? []).map(
    (project) =>
      `${project.project_name} — ${project.client_name}: ${formatHours(Number(project.budgeted_design_hours))}h budgeted`,
  );

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

  const ids = data.map((project) => project.id);
  const [logged, scheduled] = term
    ? await Promise.all([sumHours(supabase, "time_entries", ids), sumHours(supabase, "allocations", ids)])
    : [new Map<string, number>(), new Map<string, number>()];

  const lines = data.map((project) => {
    const fee = money(project.estimated_construction_value);
    const estimate = money(project.estimate_value);
    const loggedHours = logged.get(project.id);
    const scheduledHours = scheduled.get(project.id);
    const extras = [
      `${formatHours(Number(project.budgeted_design_hours))}h budgeted`,
      fee ? `${fee} design fee` : "",
      estimate ? `${estimate} estimate` : "",
      term && scheduledHours != null ? `${formatHours(scheduledHours)}h scheduled` : "",
      term && loggedHours != null ? `${formatHours(loggedHours)}h logged` : "",
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
  const { data, error } = await supabase
    .from("queue_project_stages")
    .select("queue_kind, stage, projects(project_name, client_name)")
    .limit(40);
  if (error) return `Pipeline boards could not be read (${error.message}).`;
  const rows = (data ?? []).filter((row) => {
    if (!term) return true;
    const project = firstOf(row.projects);
    return `${project?.project_name ?? ""} ${project?.client_name ?? ""}`.toLowerCase().includes(term);
  });
  if (!rows.length) return term ? `No pipeline board matched “${term}”.` : "The pipeline boards have no placed projects.";
  const lines = rows.map((row) => {
    const project = firstOf(row.projects);
    const name = project?.project_name ?? "Project";
    return `${labelize(row.queue_kind)} — ${labelize(row.stage)} — ${name}${project?.client_name ? ` (${project.client_name})` : ""}`;
  });
  return `Pipeline board:\n${lines.join("\n")}`;
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

async function sumHours(
  supabase: Supabase,
  table: "time_entries" | "allocations",
  projectIds: string[],
): Promise<Map<string, number>> {
  const totals = new Map<string, number>();
  if (!projectIds.length) return totals;
  const { data } = await supabase.from(table).select("project_id, hours").in("project_id", projectIds).limit(3000);
  for (const row of data ?? []) {
    if (!row.project_id) continue;
    totals.set(row.project_id, (totals.get(row.project_id) ?? 0) + Number(row.hours || 0));
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
