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
import {
  leadStageKind as resolveLeadStageKind,
  leadStageLabel as resolveLeadStageLabel,
  openLeadStageIds,
} from "@/lib/pipeline/lead-stages";
import {
  leadSourceLabelFromSettings,
  resolveLeadSources,
} from "@/lib/pipeline/lead-sources";
import type { CompanySettings, Lead, LeadSource, LeadStatus } from "@/types";
import { DEFAULT_LEAD_SOURCES, DEFAULT_LEAD_STAGES } from "@/types";
import { getLeadOwnerPriorityOrder } from "@/lib/pipeline/lead-priority-order";

/** @deprecated Prefer leadSourceOptions(settings) — kept for fallbacks. */
export const LEAD_SOURCES: { value: LeadSource; label: string }[] = DEFAULT_LEAD_SOURCES.map(
  (source) => ({ value: source.id, label: source.label }),
);

/** Default stages — prefer resolveLeadStages(settings) in UI. */
export const LEAD_STATUSES: { value: LeadStatus; label: string }[] = DEFAULT_LEAD_STAGES.map(
  (stage) => ({ value: stage.id, label: stage.label }),
);

export const OPEN_LEAD_STATUSES: LeadStatus[] = DEFAULT_LEAD_STAGES.filter(
  (stage) => stage.kind === "open",
).map((stage) => stage.id);

const SOURCE_COLORS = [
  "#0284c7",
  "#059669",
  "#7c3aed",
  "#d97706",
  "#64748b",
  "#db2777",
  "#0d9488",
  "#4f46e5",
];

const KNOWN_SOURCE_COLORS: Record<string, string> = {
  architect: "#0284c7",
  past_client: "#059669",
  referral: "#7c3aed",
  web: "#d97706",
  other: "#64748b",
};

function sourceColor(source: string, index = 0): string {
  return KNOWN_SOURCE_COLORS[source] ?? SOURCE_COLORS[index % SOURCE_COLORS.length];
}

export function leadSourceLabel(
  source: LeadSource,
  settings?: CompanySettings,
): string {
  return leadSourceLabelFromSettings(settings, source);
}

export function leadStatusLabel(status: LeadStatus, settings?: CompanySettings): string {
  if (settings) return resolveLeadStageLabel(settings, status);
  return DEFAULT_LEAD_STAGES.find((stage) => stage.id === status)?.label ?? status;
}

export function leadDisplayName(lead: Lead): string {
  return lead.title?.trim() || lead.client_name;
}

export function isOpenLead(lead: Lead, settings?: CompanySettings): boolean {
  const openIds = settings ? openLeadStageIds(settings) : OPEN_LEAD_STATUSES;
  return openIds.includes(lead.status);
}

export function isWonLead(lead: Lead, settings?: CompanySettings): boolean {
  const kind = settings
    ? resolveLeadStageKind(settings, lead.status)
    : DEFAULT_LEAD_STAGES.find((stage) => stage.id === lead.status)?.kind ?? null;
  return kind === "won" || lead.status === "won";
}

export function isLostLead(lead: Lead, settings?: CompanySettings): boolean {
  const kind = settings
    ? resolveLeadStageKind(settings, lead.status)
    : DEFAULT_LEAD_STAGES.find((stage) => stage.id === lead.status)?.kind ?? null;
  return kind === "lost" || lead.status === "lost";
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

export function buildLeadKpis(
  leads: Lead[],
  now = new Date(),
  settings?: CompanySettings,
): LeadKpiSummary {
  const open = leads.filter((lead) => isOpenLead(lead, settings));
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

  const decided = leads.filter(
    (l) => isWonLead(l, settings) || isLostLead(l, settings),
  );
  const won = decided.filter((l) => isWonLead(l, settings)).length;

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
  settings?: CompanySettings,
): LeadOwnerWorkloadRow[] {
  const today = startOfDay(now);
  const byOwner = new Map<string | null, LeadOwnerWorkloadRow>();

  for (const lead of leads.filter((l) => isOpenLead(l, settings))) {
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

export function buildLeadSourceBuckets(
  leads: Lead[],
  settings?: CompanySettings,
): LeadSourceBucket[] {
  const open = leads.filter((l) => isOpenLead(l, settings));
  const configured = settings
    ? resolveLeadSources(settings).map((source) => ({
        value: source.id,
        label: source.label,
      }))
    : LEAD_SOURCES;
  const known = new Set(configured.map((s) => s.value));
  const orphans = [
    ...new Set(open.map((lead) => lead.source).filter((source) => !known.has(source))),
  ].map((value) => ({
    value,
    label: leadSourceLabel(value, settings),
  }));
  const sources = [...configured, ...orphans];

  return sources.map(({ value, label }, index) => {
    const matching = open.filter((lead) => lead.source === value);
    return {
      source: value,
      label,
      count: matching.length,
      expectedValue: matching.reduce((sum, lead) => sum + (lead.expected_value ?? 0), 0),
      color: sourceColor(value, index),
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
  settings?: CompanySettings,
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

  for (const lead of leads.filter((l) => isOpenLead(l, settings))) {
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

export function isLeadFollowUpDue(
  lead: Lead,
  now = new Date(),
  settings?: CompanySettings,
): boolean {
  if (!isOpenLead(lead, settings)) return false;
  const days = leadFollowUpDaysLeft(lead, now);
  return days != null && days <= 0;
}

export function leadRowAccentClass(
  lead: Lead,
  now = new Date(),
  settings?: CompanySettings,
): string {
  const days = leadFollowUpDaysLeft(lead, now);
  if (days != null && days < 0) return "bg-rose-500";
  if (days != null && days === 0) return "bg-rose-500";
  if (days != null && days <= 2) return "bg-amber-500";

  const kind = settings
    ? resolveLeadStageKind(settings, lead.status)
    : DEFAULT_LEAD_STAGES.find((stage) => stage.id === lead.status)?.kind ?? null;
  if (kind === "won" || lead.status === "won") return "bg-emerald-500";
  if (kind === "lost" || lead.status === "lost") return "bg-slate-400";

  switch (lead.status) {
    case "new":
      return "bg-sky-500";
    case "qualifying":
      return "bg-amber-400";
    case "proposal_sent":
      return "bg-violet-500";
    default:
      return kind === "open" ? "bg-sky-500" : "bg-slate-300";
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
    case "other":
      return "bg-slate-100 text-slate-700 ring-1 ring-inset ring-slate-200";
    default:
      return "bg-indigo-50 text-indigo-800 ring-1 ring-inset ring-indigo-200";
  }
}

export function leadStatusBadgeClass(
  status: LeadStatus,
  settings?: CompanySettings,
): string {
  const kind = settings
    ? resolveLeadStageKind(settings, status)
    : DEFAULT_LEAD_STAGES.find((stage) => stage.id === status)?.kind ?? null;

  if (kind === "won" || status === "won") return "bg-emerald-100 text-emerald-800";
  if (kind === "lost" || status === "lost") return "bg-slate-200 text-slate-700";

  switch (status) {
    case "new":
      return "bg-sky-100 text-sky-900";
    case "qualifying":
      return "bg-amber-100 text-amber-900";
    case "proposal_sent":
      return "bg-violet-100 text-violet-900";
    default:
      return kind === "open"
        ? "bg-sky-50 text-sky-900"
        : "bg-slate-100 text-slate-800";
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

/** Apply saved drag order for an owner's priority queue. */
export function sortLeadPriorityItems(leads: Lead[], ownerId: string): Lead[] {
  if (leads.length <= 1) return leads;

  const savedOrder = getLeadOwnerPriorityOrder(ownerId);
  if (!savedOrder?.length) {
    return [...leads].sort(compareLeadsForQueue);
  }

  const rank = new Map(savedOrder.map((id, index) => [id, index]));
  return [...leads].sort((a, b) => {
    const aRank = rank.get(a.id);
    const bRank = rank.get(b.id);
    if (aRank != null && bRank != null) return aRank - bRank;
    if (aRank != null) return -1;
    if (bRank != null) return 1;
    return compareLeadsForQueue(a, b);
  });
}

export interface LeadPriorityGroup {
  ownerId: string;
  ownerName: string;
  items: Lead[];
}

/** Sentinel owner id for leads with no `owner_employee_id`. */
export const UNASSIGNED_LEAD_OWNER_ID = "__unassigned__";

/**
 * Priority queue grouped by lead owner.
 * Leads without an owner appear under an Unassigned group (listed last).
 */
export function buildLeadPriorityGroups(
  leads: Lead[],
  ownerName: (ownerId: string) => string,
): LeadPriorityGroup[] {
  const byOwner = new Map<string, Lead[]>();
  const unassigned: Lead[] = [];

  for (const lead of leads) {
    if (!lead.owner_employee_id) {
      unassigned.push(lead);
      continue;
    }
    const list = byOwner.get(lead.owner_employee_id) ?? [];
    list.push(lead);
    byOwner.set(lead.owner_employee_id, list);
  }

  const groups = [...byOwner.entries()]
    .map(([ownerId, items]) => ({
      ownerId,
      ownerName: ownerName(ownerId)?.trim() || "Owner",
      items: sortLeadPriorityItems(items, ownerId),
    }))
    .sort((a, b) => a.ownerName.localeCompare(b.ownerName));

  if (unassigned.length > 0) {
    groups.push({
      ownerId: UNASSIGNED_LEAD_OWNER_ID,
      ownerName: "Unassigned",
      items: sortLeadPriorityItems(unassigned, UNASSIGNED_LEAD_OWNER_ID),
    });
  }

  return groups;
}

export function openLeadsExpectedValue(leads: Lead[], settings?: CompanySettings): number {
  return leads
    .filter((l) => isOpenLead(l, settings))
    .reduce((sum, l) => sum + (l.expected_value ?? 0), 0);
}

export function openLeadsCount(leads: Lead[], settings?: CompanySettings): number {
  return leads.filter((l) => isOpenLead(l, settings)).length;
}

export { daysLeftClass };
