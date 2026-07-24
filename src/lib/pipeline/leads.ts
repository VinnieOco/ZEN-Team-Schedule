import {
  addDays,
  differenceInCalendarDays,
  endOfWeek,
  isBefore,
  isSameDay,
  isWithinInterval,
  parseISO,
  startOfDay,
  startOfWeek,
} from "date-fns";

import { daysLeftClass } from "@/lib/estimating/metrics";
import type { Lead, LeadSource, LeadStatus } from "@/types";

export const LEAD_SOURCES: { value: LeadSource; label: string }[] = [
  { value: "architect", label: "Architect" },
  { value: "past_client", label: "Past client" },
  { value: "referral", label: "Referral" },
  { value: "web", label: "Web" },
  { value: "other", label: "Other" },
];

export const LEAD_STATUSES: { value: LeadStatus; label: string }[] = [
  { value: "new", label: "New" },
  { value: "qualifying", label: "Qualifying" },
  { value: "proposal_sent", label: "Proposal sent" },
  { value: "won", label: "Won" },
  { value: "lost", label: "Lost" },
];

export const OPEN_LEAD_STATUSES: LeadStatus[] = ["new", "qualifying", "proposal_sent"];

const SOURCE_COLORS: Record<LeadSource, string> = {
  architect: "#0284c7",
  past_client: "#059669",
  referral: "#7c3aed",
  web: "#d97706",
  other: "#64748b",
};

export function leadSourceLabel(source: LeadSource): string {
  return LEAD_SOURCES.find((s) => s.value === source)?.label ?? source;
}

export function leadStatusLabel(status: LeadStatus): string {
  return LEAD_STATUSES.find((s) => s.value === status)?.label ?? status;
}

export function leadDisplayName(lead: Lead): string {
  return lead.title?.trim() || lead.client_name;
}

export function isOpenLead(lead: Lead): boolean {
  return OPEN_LEAD_STATUSES.includes(lead.status);
}

function parseDate(value?: string): Date | null {
  if (!value?.trim()) return null;
  try {
    const parsed = startOfDay(parseISO(value));
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  } catch {
    return null;
  }
}

export interface LeadKpiSummary {
  openCount: number;
  newThisWeek: number;
  followUpsDue: number;
  expectedValue: number;
  winRatePercent: number | null;
  avgAgeDays: number | null;
}

export function buildLeadKpis(leads: Lead[], now = new Date()): LeadKpiSummary {
  const open = leads.filter(isOpenLead);
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const today = startOfDay(now);

  const newThisWeek = leads.filter((lead) => {
    const created = parseDate(lead.created_at);
    return created ? created >= weekStart : false;
  }).length;

  const followUpsDue = open.filter((lead) => {
    const followUp = parseDate(lead.next_follow_up_date);
    return followUp ? !isBefore(today, followUp) : false;
  }).length;

  const decided = leads.filter((l) => l.status === "won" || l.status === "lost");
  const won = decided.filter((l) => l.status === "won").length;

  const ages = open.flatMap((lead) => {
    const created = parseDate(lead.created_at);
    if (!created) return [];
    return [differenceInCalendarDays(today, created)];
  });

  return {
    openCount: open.length,
    newThisWeek,
    followUpsDue,
    expectedValue: open.reduce((sum, l) => sum + (l.expected_value ?? 0), 0),
    winRatePercent: decided.length > 0 ? Math.round((won / decided.length) * 100) : null,
    avgAgeDays:
      ages.length > 0
        ? Math.round((ages.reduce((sum, days) => sum + days, 0) / ages.length) * 10) / 10
        : null,
  };
}

export interface LeadOwnerWorkloadRow {
  ownerId: string | null;
  openCount: number;
  followUpsDue: number;
  expectedValue: number;
}

export function buildLeadOwnerWorkload(
  leads: Lead[],
  now = new Date(),
): LeadOwnerWorkloadRow[] {
  const today = startOfDay(now);
  const byOwner = new Map<string | null, LeadOwnerWorkloadRow>();

  for (const lead of leads.filter(isOpenLead)) {
    const key = lead.owner_employee_id ?? null;
    const row =
      byOwner.get(key) ??
      ({
        ownerId: key,
        openCount: 0,
        followUpsDue: 0,
        expectedValue: 0,
      } satisfies LeadOwnerWorkloadRow);
    row.openCount += 1;
    row.expectedValue += lead.expected_value ?? 0;
    const followUp = parseDate(lead.next_follow_up_date);
    if (followUp && !isBefore(today, followUp)) row.followUpsDue += 1;
    byOwner.set(key, row);
  }

  return [...byOwner.values()].sort((a, b) => b.openCount - a.openCount);
}

export interface LeadSourceBucket {
  source: LeadSource;
  label: string;
  count: number;
  expectedValue: number;
  color: string;
}

export function buildLeadSourceBuckets(leads: Lead[]): LeadSourceBucket[] {
  const open = leads.filter(isOpenLead);
  return LEAD_SOURCES.map(({ value, label }) => {
    const matching = open.filter((lead) => lead.source === value);
    return {
      source: value,
      label,
      count: matching.length,
      expectedValue: matching.reduce((sum, lead) => sum + (lead.expected_value ?? 0), 0),
      color: SOURCE_COLORS[value],
    };
  });
}

export function newLeadsThisWeek(leads: Lead[], now = new Date()): Lead[] {
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  return leads
    .filter((lead) => {
      const created = parseDate(lead.created_at);
      return created ? created >= weekStart : false;
    })
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export interface LeadFollowUpBuckets {
  today: number;
  tomorrow: number;
  thisWeek: number;
  nextWeek: number;
  overdue: number;
}

export function buildLeadFollowUpBuckets(
  leads: Lead[],
  now = new Date(),
): LeadFollowUpBuckets {
  const today = startOfDay(now);
  const tomorrow = addDays(today, 1);
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
  const nextWeekStart = addDays(weekEnd, 1);
  const nextWeekEnd = addDays(nextWeekStart, 6);

  const buckets: LeadFollowUpBuckets = {
    today: 0,
    tomorrow: 0,
    thisWeek: 0,
    nextWeek: 0,
    overdue: 0,
  };

  for (const lead of leads.filter(isOpenLead)) {
    const followUp = parseDate(lead.next_follow_up_date);
    if (!followUp) continue;
    if (followUp < today) {
      buckets.overdue += 1;
      continue;
    }
    if (isSameDay(followUp, today)) {
      buckets.today += 1;
      continue;
    }
    if (isSameDay(followUp, tomorrow)) {
      buckets.tomorrow += 1;
      continue;
    }
    if (isWithinInterval(followUp, { start: weekStart, end: weekEnd })) {
      buckets.thisWeek += 1;
      continue;
    }
    if (isWithinInterval(followUp, { start: nextWeekStart, end: nextWeekEnd })) {
      buckets.nextWeek += 1;
    }
  }

  return buckets;
}

export function leadFollowUpDaysLeft(lead: Lead, now = new Date()): number | null {
  const followUp = parseDate(lead.next_follow_up_date);
  if (!followUp) return null;
  return differenceInCalendarDays(followUp, startOfDay(now));
}

export function isLeadFollowUpDue(lead: Lead, now = new Date()): boolean {
  if (!isOpenLead(lead)) return false;
  const days = leadFollowUpDaysLeft(lead, now);
  return days != null && days <= 0;
}

export function leadRowAccentClass(lead: Lead, now = new Date()): string {
  const days = leadFollowUpDaysLeft(lead, now);
  if (days != null && days < 0) return "bg-rose-500";
  if (days != null && days === 0) return "bg-rose-500";
  if (days != null && days <= 2) return "bg-amber-500";
  switch (lead.status) {
    case "new":
      return "bg-sky-500";
    case "qualifying":
      return "bg-amber-400";
    case "proposal_sent":
      return "bg-violet-500";
    case "won":
      return "bg-emerald-500";
    case "lost":
      return "bg-slate-400";
    default:
      return "bg-slate-300";
  }
}

export function leadSourceBadgeClass(source: LeadSource): string {
  switch (source) {
    case "architect":
      return "bg-sky-50 text-sky-800 ring-1 ring-inset ring-sky-200";
    case "past_client":
      return "bg-emerald-50 text-emerald-800 ring-1 ring-inset ring-emerald-200";
    case "referral":
      return "bg-violet-50 text-violet-800 ring-1 ring-inset ring-violet-200";
    case "web":
      return "bg-amber-50 text-amber-900 ring-1 ring-inset ring-amber-200";
    default:
      return "bg-slate-100 text-slate-700 ring-1 ring-inset ring-slate-200";
  }
}

export function leadStatusBadgeClass(status: LeadStatus): string {
  switch (status) {
    case "new":
      return "bg-sky-100 text-sky-900";
    case "qualifying":
      return "bg-amber-100 text-amber-900";
    case "proposal_sent":
      return "bg-violet-100 text-violet-900";
    case "won":
      return "bg-emerald-100 text-emerald-800";
    case "lost":
      return "bg-slate-200 text-slate-700";
    default:
      return "bg-slate-100 text-slate-800";
  }
}

export function compareLeadsForQueue(a: Lead, b: Lead): number {
  const aDue = parseDate(a.next_follow_up_date);
  const bDue = parseDate(b.next_follow_up_date);
  if (aDue && bDue && aDue.getTime() !== bDue.getTime()) {
    return aDue.getTime() - bDue.getTime();
  }
  if (aDue && !bDue) return -1;
  if (!aDue && bDue) return 1;
  return b.created_at.localeCompare(a.created_at);
}

export function openLeadsExpectedValue(leads: Lead[]): number {
  return leads.filter(isOpenLead).reduce((sum, l) => sum + (l.expected_value ?? 0), 0);
}

export function openLeadsCount(leads: Lead[]): number {
  return leads.filter(isOpenLead).length;
}

export { daysLeftClass };
