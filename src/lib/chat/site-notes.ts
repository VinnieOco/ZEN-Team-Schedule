import { addDays, format, startOfWeek, type Day } from "date-fns";

import type { AppPermissions } from "@/lib/auth/permissions";
import type { createClient } from "@/lib/supabase/server";

type Supabase = Awaited<ReturnType<typeof createClient>>;

const HOW_TO =
  /\b(how do|how can|how to|where do|where is|where can|what does|what is this page|explain this page)\b/i;

const SCHEDULE =
  /\b(schedul|who|allocation|this week|next week|on the board|assigned|capacity|working on)\b/i;
const PROJECT =
  /\b(project|client|status|phase|budget|deadline|due|handoff|change order)\b/i;
const TIME = /\b(time ?track|timesheet|hours logged|logged hours|actual hours)\b/i;

const STOP = new Set([
  "what",
  "when",
  "where",
  "which",
  "who",
  "how",
  "this",
  "that",
  "with",
  "from",
  "about",
  "week",
  "next",
  "project",
  "client",
  "status",
  "schedule",
  "scheduled",
  "please",
  "would",
  "could",
  "there",
]);

function searchTerm(question: string): string | null {
  const words = question
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length >= 4 && !STOP.has(word));
  return words[0] ?? null;
}

function personName(row: { first_name?: string | null; last_name?: string | null } | null): string {
  if (!row) return "Unassigned";
  return `${row.first_name ?? ""} ${row.last_name ?? ""}`.trim() || "Unassigned";
}

export async function liveSiteNotes(options: {
  supabase: Supabase;
  permissions: AppPermissions;
  question: string;
  pathname: string;
  userId: string;
}): Promise<string> {
  const { supabase, permissions, question, pathname, userId } = options;
  if (HOW_TO.test(question) && !SCHEDULE.test(question) && !PROJECT.test(question) && !TIME.test(question)) {
    return "";
  }

  const notes: string[] = [];
  const onSchedule = pathname.startsWith("/scheduling");
  const onProjects = pathname.startsWith("/projects") || pathname.startsWith("/gantt");
  const onTime = pathname.startsWith("/time-tracking");

  if (permissions.viewScheduling && (SCHEDULE.test(question) || (onSchedule && !HOW_TO.test(question)))) {
    notes.push(await scheduleNote(supabase));
  }
  if (permissions.viewProjects && (PROJECT.test(question) || (onProjects && !HOW_TO.test(question)))) {
    notes.push(await projectNote(supabase, searchTerm(question)));
  }
  if (permissions.viewTimeTracking && (TIME.test(question) || (onTime && !HOW_TO.test(question)))) {
    notes.push(await timeNote(supabase, permissions, userId));
  }

  return notes.filter(Boolean).join("\n\n");
}

async function scheduleNote(supabase: Supabase): Promise<string> {
  const { data: settings } = await supabase
    .from("company_settings")
    .select("workweek_start_day, include_weekends")
    .limit(1)
    .maybeSingle();

  const weekStartsOn = weekDay(settings?.workweek_start_day);
  const start = startOfWeek(new Date(), { weekStartsOn });
  const end = addDays(start, settings?.include_weekends ? 6 : 4);
  const startKey = format(start, "yyyy-MM-dd");
  const endKey = format(end, "yyyy-MM-dd");

  const { data, error } = await supabase
    .from("allocations")
    .select(
      "allocation_date, hours, task_name, employees(first_name, last_name), projects(project_name, client_name)",
    )
    .gte("allocation_date", startKey)
    .lte("allocation_date", endKey)
    .order("allocation_date")
    .limit(120);

  if (error) return `This week's schedule could not be read (${error.message}).`;
  if (!data?.length) {
    return `This week's schedule (${format(start, "MMM d")}–${format(end, "MMM d")}) has no assignments yet.`;
  }

  const lines = data.map((row) => {
    const employee = personName(firstOf(row.employees));
    const project = firstOf(row.projects);
    const job = project?.project_name
      ? `${project.project_name}${project.client_name ? ` (${project.client_name})` : ""}`
      : "No project";
    const task = row.task_name ? ` — ${row.task_name}` : "";
    return `${format(new Date(`${row.allocation_date}T12:00:00`), "EEE MMM d")}: ${employee}, ${row.hours}h, ${job}${task}`;
  });

  return `This week's schedule (${format(start, "MMM d")}–${format(end, "MMM d")}):\n${lines.join("\n")}`;
}

async function projectNote(supabase: Supabase, term: string | null): Promise<string> {
  let query = supabase
    .from("projects")
    .select("project_name, client_name, status, phase, start_date, target_completion_date, active")
    .eq("active", true)
    .order("project_name")
    .limit(term ? 15 : 20);

  if (term) {
    query = query.or(`project_name.ilike.%${term}%,client_name.ilike.%${term}%`);
  }

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
): Promise<string> {
  const start = format(addDays(new Date(), -7), "yyyy-MM-dd");
  let employeeId: string | null = null;
  if (!permissions.logTimeForAnyone) {
    const { data: employee } = await supabase
      .from("employees")
      .select("id")
      .eq("profile_id", userId)
      .maybeSingle();
    employeeId = employee?.id ?? null;
    if (!employeeId) {
      return "Time entries are limited to this person's own hours, and their login is not linked to a schedule row yet.";
    }
  }

  let query = supabase
    .from("time_entries")
    .select("entry_date, hours, task_name, employees(first_name, last_name), projects(project_name)")
    .gte("entry_date", start)
    .order("entry_date", { ascending: false })
    .limit(40);
  if (employeeId) query = query.eq("employee_id", employeeId);

  const { data, error } = await query;
  if (error) return `Time entries could not be read (${error.message}).`;
  if (!data?.length) return "No time has been logged in the last seven days.";

  const lines = data.map((row) => {
    const employee = personName(firstOf(row.employees));
    const project = firstOf(row.projects)?.project_name ?? "No project";
    const task = row.task_name ? ` — ${row.task_name}` : "";
    return `${row.entry_date}: ${employee}, ${row.hours}h, ${project}${task}`;
  });
  return `Time logged since ${start}:\n${lines.join("\n")}`;
}

function weekDay(value: string | null | undefined): Day {
  const days: Record<string, Day> = {
    Sunday: 0,
    Monday: 1,
    Tuesday: 2,
    Wednesday: 3,
    Thursday: 4,
    Friday: 5,
    Saturday: 6,
  };
  return days[value ?? "Monday"] ?? 1;
}

function firstOf<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}
