import { addDays, endOfMonth, format, startOfMonth, startOfYear, subMonths } from "date-fns";

export type SiteIntent =
  | "schedule"
  | "projects"
  | "time"
  | "pipeline"
  | "crm"
  | "todos"
  | "reports"
  | "budgets"
  | "contracts"
  | "changeOrders"
  | "handoffs"
  | "wip"
  | "gantt"
  | "projectNotes"
  | "queue"
  | "team";

/** Every live area of the signed-in app. How-to questions stay on the guide. */
export const ALL_SITE_INTENTS: SiteIntent[] = [
  "schedule",
  "projects",
  "time",
  "pipeline",
  "crm",
  "todos",
  "reports",
  "budgets",
  "contracts",
  "changeOrders",
  "handoffs",
  "wip",
  "gantt",
  "projectNotes",
  "queue",
  "team",
];

const HOW_TO =
  /\b(how do|how can|how to|where do|where is|where can|what does|what is this page|explain this page)\b/i;

const RULES: { intent: SiteIntent; pattern: RegExp; paths?: string[] }[] = [
  {
    intent: "schedule",
    pattern: /\b(schedul|who|allocation|this week|next week|on the board|assigned|capacity|working on)\b/i,
    paths: ["/scheduling"],
  },
  {
    intent: "projects",
    pattern: /\b(projects?|clients?|status|phase|deadline|due)\b/i,
    paths: ["/projects", "/gantt"],
  },
  {
    intent: "time",
    pattern: /\b(time ?track|timesheets?|hours logged|logged hours|actual hours|older time)\b/i,
    paths: ["/time-tracking"],
  },
  {
    intent: "pipeline",
    pattern: /\b(pipeline|leads?|estimates?|follow-?ups?|proposals?)\b/i,
    paths: ["/pipeline"],
  },
  {
    intent: "crm",
    pattern: /\b(crm|contacts?|clients?|phone|email|address|notes?)\b/i,
    paths: ["/crm"],
  },
  {
    intent: "todos",
    pattern: /\b(to-?dos?)\b/i,
    paths: ["/todos"],
  },
  {
    intent: "reports",
    pattern: /\b(reports?|utilization|scheduled vs|actual vs)\b/i,
    paths: ["/reports"],
  },
  { intent: "budgets", pattern: /\b(budgets?|fees?|design hours)\b/i },
  { intent: "contracts", pattern: /\b(contracts?)\b/i },
  { intent: "changeOrders", pattern: /\b(change[\s-]?orders?)\b/i },
  { intent: "handoffs", pattern: /\b(handoffs?|checklists?)\b/i },
  { intent: "wip", pattern: /\b(wip|billings|cost to date|contract price)\b/i },
];

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
  "last",
  "older",
  "past",
  "project",
  "projects",
  "client",
  "clients",
  "status",
  "schedule",
  "scheduled",
  "please",
  "would",
  "could",
  "there",
  "budget",
  "budgets",
  "hours",
  "logged",
  "timesheet",
  "timesheets",
  "report",
  "reports",
  "pipeline",
  "contact",
  "contacts",
  "address",
  "phone",
  "email",
  "number",
  "numbers",
  "details",
  "detail",
  "information",
  "street",
  "scope",
  "location",
  "notes",
  "note",
  "handoff",
  "handoffs",
  "checklist",
  "checklists",
  "contract",
  "contracts",
  "change",
  "order",
  "orders",
  "todos",
  "todo",
  "month",
  "actual",
  "design",
  "show",
  "list",
  "tell",
]);

const MONTHS = [
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december",
];

export function siteIntents(question: string, _pathname: string): SiteIntent[] {
  if (!HOW_TO.test(question)) return [...ALL_SITE_INTENTS];

  const found: SiteIntent[] = [];
  for (const rule of RULES) {
    if (rule.pattern.test(question) && !found.includes(rule.intent)) found.push(rule.intent);
  }
  return found;
}

export function searchTerm(question: string): string | null {
  const words = question
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length >= 4 && !STOP.has(word) && !MONTHS.includes(word));
  return words[0] ?? null;
}

export interface ProjectChoiceRow {
  project_name: string;
  client_name: string;
}

/** The person asked for every project, so a client with several jobs should be listed. */
export function asksForEveryProject(question: string): boolean {
  return /\b(all|every|each|both|list|how many|which projects|projects)\b/i.test(question);
}

/**
 * When a client name matches several projects and the question does not name one,
 * ask which project. When the question already names one, search that project.
 */
export function projectChoice(
  question: string,
  term: string | null,
  projects: ProjectChoiceRow[],
): { action: "ask"; client: string; names: string[] } | { action: "focus"; term: string } | null {
  if (!term || asksForEveryProject(question)) return null;
  const needle = term.toLowerCase();
  const byClient = projects.filter((project) => project.client_name.toLowerCase().includes(needle));
  if (byClient.length < 2) return null;

  const questionText = question.toLowerCase();
  const named = byClient.filter((project) => {
    const name = project.project_name.toLowerCase().trim();
    return name.length >= 4 && questionText.includes(name);
  });
  if (named.length === 1) {
    return { action: "focus", term: focusSearchTerm(named[0].project_name, needle) };
  }
  if (named.length > 1) return null;

  const names = [...new Set(byClient.map((project) => project.project_name.trim()).filter(Boolean))];
  if (names.length < 2) return null;
  const clients = [...new Set(byClient.map((project) => project.client_name.trim()))];
  return {
    action: "ask",
    client: clients.length === 1 ? clients[0] : clients.join(", "),
    names: clients.length === 1 ? names : byClient.map((project) => `${project.project_name} (${project.client_name})`),
  };
}

function focusSearchTerm(projectName: string, clientTerm: string): string {
  const words = projectName
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length >= 4 && word !== clientTerm);
  words.sort((a, b) => b.length - a.length);
  return words[0] ?? clientTerm;
}

/** 0 is the current work week. 1 is next week. */
export function scheduleWeekOffsets(question: string): number[] {
  const next = /\bnext week\b/i.test(question);
  const current = /\bthis week\b/i.test(question);
  if (next && current) return [0, 1];
  if (next) return [1];
  return [0];
}

export interface TimeWindow {
  start: Date;
  end: Date;
  label: string;
  /** False means every logged entry, with no date cutoff. */
  bounded: boolean;
}

function allTime(today: Date): TimeWindow {
  return { start: new Date(2000, 0, 1), end: today, label: "all time", bounded: false };
}

export function timeWindow(question: string, today: Date): TimeWindow {
  const lower = question.toLowerCase();
  const days = lower.match(/\blast\s+(\d{1,3})\s+days?\b/);
  if (days) {
    const count = Math.min(366, Math.max(1, Number(days[1])));
    return { start: addDays(today, -count), end: today, label: `the last ${count} days`, bounded: true };
  }
  if (/\bthis month\b/.test(lower)) {
    return { start: startOfMonth(today), end: endOfMonth(today), label: format(today, "MMMM yyyy"), bounded: true };
  }
  if (/\blast month\b/.test(lower)) {
    const previous = subMonths(today, 1);
    return {
      start: startOfMonth(previous),
      end: endOfMonth(previous),
      label: format(previous, "MMMM yyyy"),
      bounded: true,
    };
  }
  if (/\bthis year\b/.test(lower)) {
    return { start: startOfYear(today), end: today, label: String(today.getFullYear()), bounded: true };
  }
  const month = MONTHS.findIndex((name) => new RegExp(`\\b${name}\\b`).test(lower));
  if (month >= 0) {
    const yearMatch = lower.match(/\b(20\d{2})\b/);
    const year = yearMatch ? Number(yearMatch[1]) : today.getFullYear();
    const start = new Date(year, month, 1);
    return { start, end: endOfMonth(start), label: format(start, "MMMM yyyy"), bounded: true };
  }
  return allTime(today);
}

export function reportUsesMonth(question: string): boolean {
  return /\b(this month|last month|monthly|month|january|february|march|april|may|june|july|august|september|october|november|december)\b/i.test(
    question,
  );
}

export function clipText(value: string, max = 240): string {
  const clean = value.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max - 1)}…`;
}

export function money(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(Number(value))) return "";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(Number(value));
}

function roundHours(value: number): number {
  return Math.round(value * 10) / 10;
}

function hourText(value: number): string {
  const rounded = roundHours(value);
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

/** Budgeted design hours against hours logged on timesheets. */
export function describeHoursBudget(budgeted: number, actual: number): string {
  const budget = roundHours(budgeted);
  const used = roundHours(actual);
  if (budget <= 0) {
    return used > 0 ? `no hour budget, ${hourText(used)}h logged` : "no hour budget, 0h logged";
  }
  const remaining = roundHours(budget - used);
  if (remaining < 0) {
    return `${hourText(budget)}h budget, ${hourText(used)}h logged, ${hourText(Math.abs(remaining))}h over budget`;
  }
  if (remaining === 0) {
    return `${hourText(budget)}h budget, ${hourText(used)}h logged, on budget`;
  }
  return `${hourText(budget)}h budget, ${hourText(used)}h logged, ${hourText(remaining)}h remaining, under budget`;
}
