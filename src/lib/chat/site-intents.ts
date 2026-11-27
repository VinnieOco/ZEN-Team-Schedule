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
}

export function timeWindow(question: string, today: Date): TimeWindow {
  const lower = question.toLowerCase();
  const days = lower.match(/\blast\s+(\d{1,3})\s+days?\b/);
  if (days) {
    const count = Math.min(366, Math.max(1, Number(days[1])));
    return { start: addDays(today, -count), end: today, label: `the last ${count} days` };
  }
  if (/\bthis month\b/.test(lower)) {
    return { start: startOfMonth(today), end: endOfMonth(today), label: format(today, "MMMM yyyy") };
  }
  if (/\blast month\b/.test(lower)) {
    const previous = subMonths(today, 1);
    return {
      start: startOfMonth(previous),
      end: endOfMonth(previous),
      label: format(previous, "MMMM yyyy"),
    };
  }
  if (/\bthis year\b/.test(lower)) {
    return { start: startOfYear(today), end: today, label: String(today.getFullYear()) };
  }
  const month = MONTHS.findIndex((name) => new RegExp(`\\b${name}\\b`).test(lower));
  if (month >= 0) {
    const yearMatch = lower.match(/\b(20\d{2})\b/);
    const year = yearMatch ? Number(yearMatch[1]) : today.getFullYear();
    const start = new Date(year, month, 1);
    return { start, end: endOfMonth(start), label: format(start, "MMMM yyyy") };
  }
  if (/\b(older|history|historical|previous timesheets?|past timesheets?)\b/.test(lower)) {
    return { start: addDays(today, -90), end: today, label: "the last 90 days" };
  }
  return { start: addDays(today, -7), end: today, label: "the last 7 days" };
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
