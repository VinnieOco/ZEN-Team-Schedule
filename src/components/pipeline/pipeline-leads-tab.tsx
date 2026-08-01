"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  DndContext,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { format, parseISO } from "date-fns";
import {
  BarChart3,
  Bell,
  CalendarPlus,
  Clock3,
  DollarSign,
  FolderInput,
  GripVertical,
  MoreHorizontal,
  Plus,
  Upload,
  Users,
} from "lucide-react";

import { ScrollableTabsList } from "@/components/layout/scrollable-tabs-list";
import { LeadContactDialog } from "@/components/pipeline/lead-contact-dialog";
import { LeadFormDialog } from "@/components/pipeline/lead-form-dialog";
import { LeadImportDialog } from "@/components/pipeline/lead-import-dialog";
import { LeadKanban } from "@/components/pipeline/lead-kanban";
import { PipelineMetricCards } from "@/components/pipeline/pipeline-metric-cards";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsTrigger } from "@/components/ui/tabs";
import { useScheduling } from "@/context/scheduling-context";
import { useIsNarrowViewport } from "@/hooks/use-is-narrow-viewport";
import { useOptimisticUrlView } from "@/hooks/use-optimistic-url-tab";
import { useLeadOwnerPriorityOrder } from "@/hooks/use-lead-owner-priority-order";
import { usePermissions } from "@/hooks/use-permissions";
import {
  buildLeadFollowUpBuckets,
  buildLeadKpis,
  buildLeadOwnerWorkload,
  buildLeadPriorityGroups,
  buildLeadSourceBuckets,
  compareLeadsForQueue,
  daysLeftClass,
  isLeadFollowUpDue,
  isOpenLead,
  leadDisplayName,
  leadFollowUpDaysLeft,
  leadRowAccentClass,
  leadSourceBadgeClass,
  leadSourceLabel,
  leadStatusBadgeClass,
  leadStatusLabel,
  newLeadsThisWeek,
  sortLeadPriorityItems,
  UNASSIGNED_LEAD_OWNER_ID,
} from "@/lib/pipeline/leads";
import {
  formatLeadFollowUpSchedule,
  latestOpenLeadFollowUp,
  leadFollowUpTypeLabel,
} from "@/lib/pipeline/lead-follow-up-types";
import { leadSourceOptions } from "@/lib/pipeline/lead-sources";
import { leadStageOptions } from "@/lib/pipeline/lead-stages";
import { formatPipelineValue } from "@/lib/pipeline/stages";
import { formatProjectAmount } from "@/lib/project-format";
import { arrayMoveIds } from "@/lib/queue/column-order";
import { cn } from "@/lib/utils";
import { getEmployeeFullName } from "@/lib/week";
import type { Lead, LeadFollowUp, LeadFormValues, LeadStatus, CompanySettings } from "@/types";

const ALL = "__all__";
const OPEN_ONLY = "__open__";

type LeadsView = "table" | "kanban";

function parseView(value: string | null): LeadsView {
  return value === "kanban" ? "kanban" : "table";
}

function formatShortDate(value?: string): string {
  if (!value?.trim()) return "—";
  try {
    return format(parseISO(value), "MMM d");
  } catch {
    return value;
  }
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function LeadActionsMenu({
  lead,
  onEdit,
  onConvert,
  onDelete,
}: {
  lead: Lead;
  onEdit: () => void;
  onConvert: () => void;
  onDelete: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          aria-label="Lead actions"
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={onEdit}>Edit</DropdownMenuItem>
        {!lead.converted_project_id && lead.status !== "lost" ? (
          <DropdownMenuItem onClick={onConvert}>
            <FolderInput className="mr-2 h-4 w-4" />
            Convert to project
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuItem className="text-rose-700" onClick={onDelete}>
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function SortableLeadPriorityRow({
  lead,
  index,
  canEdit,
  settings,
  leadFollowUps,
  layout = "table",
  onOpen,
  onEdit,
  onConvert,
  onDelete,
}: {
  lead: Lead;
  index: number;
  canEdit: boolean;
  settings: CompanySettings;
  leadFollowUps: LeadFollowUp[];
  layout?: "table" | "card";
  onOpen: () => void;
  onEdit: () => void;
  onConvert: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: lead.id,
    disabled: !canEdit,
  });
  const days = leadFollowUpDaysLeft(lead);
  const nextFollowUp = latestOpenLeadFollowUp(leadFollowUps, lead.id);
  const followUpLabel = nextFollowUp
    ? formatLeadFollowUpSchedule(nextFollowUp.due_date, nextFollowUp.due_time, {
        includeWeekday: false,
      })
    : formatShortDate(lead.next_follow_up_date);
  const followUpDue = isLeadFollowUpDue(lead, new Date(), settings);
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 20 : undefined,
    position: isDragging ? ("relative" as const) : undefined,
  };

  const dragHandle = canEdit ? (
    <button
      type="button"
      className="flex h-8 w-7 cursor-grab touch-none items-center justify-center rounded text-slate-400 hover:bg-slate-100 hover:text-slate-700 active:cursor-grabbing"
      aria-label={`Drag ${leadDisplayName(lead)} to change priority`}
      onClick={(e) => e.stopPropagation()}
      {...attributes}
      {...listeners}
    >
      <GripVertical className="h-4 w-4" />
    </button>
  ) : null;

  if (layout === "card") {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className={cn(
          "relative cursor-pointer px-3 py-3 active:bg-slate-50",
          isDragging && "z-20 bg-white opacity-90 shadow-lg",
        )}
        onClick={onOpen}
      >
        <span
          className={cn(
            "absolute inset-y-2 left-0 w-1 rounded-r-full",
            leadRowAccentClass(lead, new Date(), settings),
          )}
        />
        <div className="flex items-start gap-1.5">
          <div className="flex shrink-0 flex-col items-center gap-0.5 pt-0.5">
            {dragHandle}
            <span className="text-[10px] tabular-nums text-muted-foreground">{index + 1}</span>
          </div>
          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate font-medium text-emerald-700">{leadDisplayName(lead)}</p>
                <p className="truncate text-xs text-muted-foreground">{lead.client_name}</p>
              </div>
              <div className="flex shrink-0 items-center gap-1" onClick={(e) => e.stopPropagation()}>
                <span className="text-sm font-semibold tabular-nums text-slate-900">
                  {formatProjectAmount(lead.expected_value)}
                </span>
                {canEdit ? (
                  <LeadActionsMenu
                    lead={lead}
                    onEdit={onEdit}
                    onConvert={onConvert}
                    onDelete={onDelete}
                  />
                ) : null}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge
                variant="secondary"
                className={cn("font-semibold", leadStatusBadgeClass(lead.status, settings))}
              >
                {leadStatusLabel(lead.status, settings)}
              </Badge>
              <span
                className={cn(
                  "inline-flex rounded-md px-2 py-0.5 text-[11px] font-medium",
                  leadSourceBadgeClass(lead.source),
                )}
              >
                {leadSourceLabel(lead.source, settings)}
              </span>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground">
              <span className={cn("tabular-nums", followUpDue && "font-semibold text-rose-600")}>
                Follow-up {followUpLabel}
                {nextFollowUp?.follow_up_type_id
                  ? ` · ${leadFollowUpTypeLabel(settings, nextFollowUp.follow_up_type_id)}`
                  : ""}
              </span>
              <span className={cn("tabular-nums", daysLeftClass(days))}>
                {days == null ? "—" : `${days}d left`}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <TableRow
      ref={setNodeRef}
      style={style}
      className={cn("group cursor-pointer", isDragging && "bg-white opacity-80 shadow-lg")}
      onClick={onOpen}
    >
      <TableCell className="relative py-3 pl-2">
        <span
          className={cn(
            "absolute inset-y-2 left-0 w-1 rounded-r-full",
            leadRowAccentClass(lead, new Date(), settings),
          )}
        />
        <div className="flex items-center gap-1">
          {dragHandle}
          <span className="text-xs tabular-nums text-muted-foreground">{index + 1}</span>
        </div>
      </TableCell>
      <TableCell>
        <button
          type="button"
          className="text-left font-medium text-emerald-700 group-hover:underline"
          onClick={(event) => {
            event.stopPropagation();
            onOpen();
          }}
        >
          {leadDisplayName(lead)}
        </button>
        {lead.contact_name ? (
          <p className="text-xs text-muted-foreground">{lead.contact_name}</p>
        ) : null}
      </TableCell>
      <TableCell>{lead.client_name}</TableCell>
      <TableCell>
        <span
          className={cn(
            "inline-flex rounded-md px-2 py-0.5 text-xs font-medium",
            leadSourceBadgeClass(lead.source),
          )}
        >
          {leadSourceLabel(lead.source, settings)}
        </span>
      </TableCell>
      <TableCell className="tabular-nums text-slate-600">
        {formatShortDate(lead.created_at)}
      </TableCell>
      <TableCell className={cn("tabular-nums", followUpDue && "font-semibold text-rose-600")}>
        {followUpLabel}
        {nextFollowUp?.follow_up_type_id ? (
          <p className="text-[11px] font-normal text-muted-foreground">
            {leadFollowUpTypeLabel(settings, nextFollowUp.follow_up_type_id)}
          </p>
        ) : null}
      </TableCell>
      <TableCell className={cn("text-right tabular-nums", daysLeftClass(days))}>
        {days == null ? "—" : days}
      </TableCell>
      <TableCell>
        <div className="flex flex-col gap-1">
          <Badge
            variant="secondary"
            className={cn("w-fit font-semibold", leadStatusBadgeClass(lead.status, settings))}
          >
            {leadStatusLabel(lead.status, settings)}
          </Badge>
          {lead.converted_project_id ? (
            <Link
              href={`/projects/${lead.converted_project_id}`}
              className="text-xs text-emerald-700 hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              View project
            </Link>
          ) : null}
        </div>
      </TableCell>
      <TableCell className="text-right font-semibold tabular-nums text-slate-900">
        {formatProjectAmount(lead.expected_value)}
      </TableCell>
      {canEdit ? (
        <TableCell onClick={(e) => e.stopPropagation()} className="text-right">
          <LeadActionsMenu
            lead={lead}
            onEdit={onEdit}
            onConvert={onConvert}
            onDelete={onDelete}
          />
        </TableCell>
      ) : null}
    </TableRow>
  );
}

function leadToFormValues(lead: Lead, status?: LeadStatus): LeadFormValues {
  let createdDate: string | undefined;
  if (lead.created_at?.trim()) {
    try {
      createdDate = format(parseISO(lead.created_at), "yyyy-MM-dd");
    } catch {
      createdDate = lead.created_at.slice(0, 10);
    }
  }
  return {
    title: lead.title,
    client_name: lead.client_name,
    contact_name: lead.contact_name,
    contact_phone: lead.contact_phone,
    contact_email: lead.contact_email,
    address: lead.address,
    source: lead.source,
    status: status ?? lead.status,
    expected_value: lead.expected_value,
    probability: lead.probability,
    next_follow_up_date: lead.next_follow_up_date,
    created_date: createdDate,
    owner_employee_id: lead.owner_employee_id,
    notes: lead.notes,
  };
}

function SourceDonut({
  buckets,
}: {
  buckets: { source: string; label: string; count: number; color: string }[];
}) {
  const total = buckets.reduce((sum, b) => sum + b.count, 0);
  if (total === 0) {
    return (
      <div className="flex h-[120px] items-center justify-center text-sm text-muted-foreground">
        No open leads
      </div>
    );
  }

  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;
  const slices = buckets
    .filter((b) => b.count > 0)
    .map((b) => {
      const length = (b.count / total) * circumference;
      const slice = { ...b, dash: length, offset };
      offset += length;
      return slice;
    });

  return (
    <div className="flex items-center gap-4">
      <div className="relative h-[120px] w-[120px] shrink-0">
        <svg viewBox="0 0 100 100" className="-rotate-90 h-full w-full">
          <circle cx="50" cy="50" r={radius} fill="none" stroke="#f1f5f9" strokeWidth="12" />
          {slices.map((slice) => (
            <circle
              key={slice.source}
              cx="50"
              cy="50"
              r={radius}
              fill="none"
              stroke={slice.color}
              strokeWidth="12"
              strokeDasharray={`${slice.dash} ${circumference - slice.dash}`}
              strokeDashoffset={-slice.offset}
            />
          ))}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            Total
          </p>
          <p className="text-xl font-bold tabular-nums text-slate-900">{total}</p>
        </div>
      </div>
      <ul className="min-w-0 flex-1 space-y-2">
        {buckets.map((b) => (
          <li key={b.source} className="flex items-center justify-between gap-2 text-sm">
            <span className="flex min-w-0 items-center gap-2 truncate">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: b.color }}
              />
              <span className="truncate text-slate-700">{b.label}</span>
            </span>
            <span className="shrink-0 tabular-nums text-muted-foreground">{b.count}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function PipelineLeadsTab() {
  const router = useRouter();

  const applyLeadsView = useCallback((next: LeadsView, params: URLSearchParams) => {
    params.set("tab", "leads");
    if (next === "table") params.delete("view");
    else params.set("view", next);
  }, []);

  const [view, setView] = useOptimisticUrlView(parseView, applyLeadsView);

  const {
    leads,
    leadFollowUps,
    settings,
    getEmployeeById,
    deleteLead,
    convertLeadToProject,
    updateLead,
    isLoading,
  } = useScheduling();
  const { permissions } = usePermissions();
  const canEdit = permissions.editQueue || permissions.editProjects;
  const isNarrow = useIsNarrowViewport();
  const { revision: orderRevision, updateLeadPriorityOrder } = useLeadOwnerPriorityOrder();
  const priorityLayout = isNarrow ? "card" : "table";

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState(OPEN_ONLY);
  const [sourceFilter, setSourceFilter] = useState(ALL);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [editing, setEditing] = useState<Lead | null>(null);
  const [detailLead, setDetailLead] = useState<Lead | null>(null);

  const prioritySensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
  );

  const stageOptions = useMemo(() => leadStageOptions(settings), [settings]);
  const sourceOptions = useMemo(() => leadSourceOptions(settings), [settings]);
  const kpis = useMemo(() => buildLeadKpis(leads, new Date(), settings), [leads, settings]);
  const workload = useMemo(
    () => buildLeadOwnerWorkload(leads, new Date(), settings),
    [leads, settings],
  );
  const sourceBuckets = useMemo(
    () => buildLeadSourceBuckets(leads, settings),
    [leads, settings],
  );
  const followUpBuckets = useMemo(
    () => buildLeadFollowUpBuckets(leads, new Date(), settings),
    [leads, settings],
  );
  const newThisWeek = useMemo(() => newLeadsThisWeek(leads), [leads]);
  const workloadMax = Math.max(1, ...workload.map((w) => w.openCount));

  const ownerName = useCallback(
    (lead: Lead) => {
      if (!lead.owner_employee_id) return undefined;
      const employee = getEmployeeById(lead.owner_employee_id);
      return employee ? getEmployeeFullName(employee) : undefined;
    },
    [getEmployeeById],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return leads
      .filter((lead) => {
        if (statusFilter === OPEN_ONLY && !isOpenLead(lead, settings)) return false;
        if (statusFilter !== OPEN_ONLY && statusFilter !== ALL && lead.status !== statusFilter) {
          return false;
        }
        if (sourceFilter !== ALL && lead.source !== sourceFilter) return false;
        if (!q) return true;
        const haystack = [
          leadDisplayName(lead),
          lead.client_name,
          lead.contact_name,
          lead.notes,
          ownerName(lead),
          leadSourceLabel(lead.source, settings),
          leadStatusLabel(lead.status, settings),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return haystack.includes(q);
      })
      .sort(compareLeadsForQueue);
  }, [leads, search, statusFilter, sourceFilter, ownerName, settings]);

  const resolveOwnerName = useCallback(
    (ownerId: string) => {
      const employee = getEmployeeById(ownerId);
      return employee ? getEmployeeFullName(employee) : "";
    },
    [getEmployeeById],
  );

  const priorityGroups = useMemo(() => {
    const groups = buildLeadPriorityGroups(filtered, resolveOwnerName);
    return groups.map((group) => ({
      ...group,
      items: sortLeadPriorityItems(group.items, group.ownerId),
    }));
  }, [filtered, resolveOwnerName, orderRevision]);

  const groupedCount = useMemo(
    () => priorityGroups.reduce((sum, group) => sum + group.items.length, 0),
    [priorityGroups],
  );

  const assignedOwnerCount = useMemo(
    () => priorityGroups.filter((group) => group.ownerId !== UNASSIGNED_LEAD_OWNER_ID).length,
    [priorityGroups],
  );

  const handlePriorityDragEnd = (event: DragEndEvent, ownerId: string) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const base = leads.filter((lead) => {
      if (ownerId === UNASSIGNED_LEAD_OWNER_ID) {
        if (lead.owner_employee_id) return false;
      } else if (!lead.owner_employee_id || lead.owner_employee_id !== ownerId) {
        return false;
      }
      if (statusFilter === OPEN_ONLY && !isOpenLead(lead, settings)) return false;
      if (statusFilter !== OPEN_ONLY && statusFilter !== ALL && lead.status !== statusFilter) {
        return false;
      }
      if (sourceFilter !== ALL && lead.source !== sourceFilter) return false;
      return true;
    });
    const ordered = sortLeadPriorityItems(base, ownerId);
    const ids = ordered.map((lead) => lead.id);
    const oldIndex = ids.indexOf(String(active.id));
    const newIndex = ids.indexOf(String(over.id));
    if (oldIndex === -1 || newIndex === -1) return;
    updateLeadPriorityOrder(ownerId, arrayMoveIds(ids, oldIndex, newIndex));
  };

  const openEdit = (lead: Lead) => {
    setEditing(lead);
    setDialogOpen(true);
  };

  const openContact = (lead: Lead) => {
    setDetailLead(lead);
  };

  const openNew = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  const handleConvert = (lead: Lead) => {
    if (
      !window.confirm(
        `Convert “${leadDisplayName(lead)}” to a Design project? This marks the lead as won.`,
      )
    ) {
      return;
    }
    const project = convertLeadToProject(lead.id);
    if (project) router.push(`/projects/${project.id}`);
  };

  const handleDelete = (lead: Lead) => {
    if (!window.confirm(`Delete lead “${leadDisplayName(lead)}”?`)) return;
    deleteLead(lead.id);
  };

  const handleStatusChange = (id: string, status: LeadStatus) => {
    const lead = leads.find((l) => l.id === id);
    if (!lead) return;
    updateLead(id, leadToFormValues(lead, status));
  };

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading leads…</p>;
  }

  return (
    <div className="space-y-5">
      <PipelineMetricCards
        items={[
          {
            label: "Open Leads",
            value: String(kpis.openCount),
            sub: "Active inquiries",
            icon: Users,
            accent: "sky",
            onClick: () => {
              setStatusFilter(OPEN_ONLY);
              setView("table");
            },
          },
          {
            label: "New This Week",
            value: String(kpis.newThisWeek),
            sub: "Created",
            icon: CalendarPlus,
            accent: "emerald",
          },
          {
            label: "Follow-ups Due",
            value: String(kpis.followUpsDue),
            sub: "Today or overdue",
            icon: Bell,
            accent: "amber",
          },
          {
            label: "Expected Value",
            value: formatPipelineValue(kpis.expectedValue),
            sub: "Open pipeline $",
            icon: DollarSign,
            accent: "emerald",
          },
          {
            label: "Win Rate",
            value: kpis.winRatePercent == null ? "—" : `${kpis.winRatePercent}%`,
            sub: "Won ÷ decided",
            icon: BarChart3,
            accent: "violet",
          },
          {
            label: "Avg Age",
            value: kpis.avgAgeDays == null ? "—" : `${kpis.avgAgeDays}d`,
            sub: "Open leads",
            icon: Clock3,
            accent: "slate",
          },
        ]}
      />

      <Tabs value={view} onValueChange={setView} className="min-w-0">
        <div className="flex flex-col gap-3 border-b border-slate-200 pb-0 sm:flex-row sm:items-center sm:justify-between">
          <ScrollableTabsList className="h-auto rounded-none border-0 bg-transparent p-0 shadow-none">
            <TabsTrigger
              value="table"
              className="rounded-none border-b-2 border-transparent px-3 pb-2.5 pt-1 data-[state=active]:border-emerald-600 data-[state=active]:bg-transparent data-[state=active]:text-emerald-800 data-[state=active]:shadow-none"
            >
              Main Table
            </TabsTrigger>
            <TabsTrigger
              value="kanban"
              className="rounded-none border-b-2 border-transparent px-3 pb-2.5 pt-1 data-[state=active]:border-emerald-600 data-[state=active]:bg-transparent data-[state=active]:text-emerald-800 data-[state=active]:shadow-none"
            >
              Kanban
            </TabsTrigger>
          </ScrollableTabsList>
          {canEdit && (
            <div className="mb-2 flex shrink-0 gap-2 sm:mb-1.5">
              <Button
                type="button"
                variant="outline"
                className="flex-1 sm:flex-none"
                onClick={() => setImportOpen(true)}
              >
                <Upload className="mr-1.5 h-4 w-4" />
                Import
              </Button>
              <Button type="button" className="flex-1 sm:flex-none" onClick={openNew}>
                <Plus className="mr-1.5 h-4 w-4" />
                New Lead
              </Button>
            </div>
          )}
        </div>

        <TabsContent value="table" className="mt-4 min-w-0 space-y-4">
          <div className="grid grid-cols-1 gap-3 rounded-xl border border-slate-200/80 bg-white p-3 shadow-sm sm:flex sm:flex-row sm:flex-wrap sm:items-end">
            <div className="min-w-0 flex-1 space-y-1.5 sm:min-w-[180px]">
              <Label htmlFor="leads-search" className="text-xs">
                Search
              </Label>
              <Input
                id="leads-search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Client, contact, owner…"
              />
            </div>
            <div className="grid grid-cols-2 gap-3 sm:contents">
              <div className="min-w-0 space-y-1.5 sm:w-[160px]">
                <Label className="text-xs">Status</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={OPEN_ONLY}>Open only</SelectItem>
                    <SelectItem value={ALL}>All statuses</SelectItem>
                    {stageOptions.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="min-w-0 space-y-1.5 sm:w-[160px]">
                <Label className="text-xs">Source</Label>
                <Select value={sourceFilter} onValueChange={setSourceFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL}>All sources</SelectItem>
                    {sourceOptions.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <p className="px-1 text-xs text-muted-foreground">
            {groupedCount} lead{groupedCount === 1 ? "" : "s"}
            {assignedOwnerCount > 0
              ? ` · ${assignedOwnerCount} owner${assignedOwnerCount === 1 ? "" : "s"}`
              : ""}
          </p>

          {priorityGroups.length === 0 ? (
            <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b bg-slate-50/80 px-4 py-2.5">
                <h3 className="text-sm font-semibold text-slate-900">Priority by Owner</h3>
              </div>
              <p className="px-4 py-12 text-center text-sm text-muted-foreground">
                {leads.length === 0
                  ? "No leads yet. Add an inquiry to start the pipeline."
                  : "No leads match these filters."}
              </p>
              {canEdit && (
                <div className="border-t px-3 py-2">
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-9 w-full justify-start text-muted-foreground hover:text-emerald-800"
                    onClick={openNew}
                  >
                    <Plus className="mr-1.5 h-4 w-4" />
                    Add Lead
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {priorityGroups.map((group) => (
                <div
                  key={group.ownerId}
                  className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm"
                >
                  <div className="flex items-center justify-between gap-3 border-b bg-slate-50/80 px-4 py-2.5">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback
                          className={cn(
                            "text-[11px] font-semibold",
                            group.ownerId === UNASSIGNED_LEAD_OWNER_ID
                              ? "bg-amber-50 text-amber-800"
                              : "bg-emerald-50 text-emerald-800",
                          )}
                        >
                          {initials(group.ownerName)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <h3 className="truncate text-sm font-semibold text-slate-900">
                          {group.ownerName}
                        </h3>
                        <p className="text-xs text-muted-foreground">
                          {group.ownerId === UNASSIGNED_LEAD_OWNER_ID
                            ? "No owner yet · drag to prioritize"
                            : "Priority queue · highest first"}
                        </p>
                      </div>
                    </div>
                    <span className="shrink-0 rounded-full bg-slate-200/80 px-2 py-0.5 text-[11px] font-medium tabular-nums text-slate-600">
                      {group.items.length}
                    </span>
                  </div>

                  <DndContext
                    sensors={prioritySensors}
                    collisionDetection={closestCenter}
                    onDragEnd={(event) => handlePriorityDragEnd(event, group.ownerId)}
                  >
                    {isNarrow ? (
                      <div className="divide-y divide-slate-100">
                        <SortableContext
                          items={group.items.map((lead) => lead.id)}
                          strategy={verticalListSortingStrategy}
                        >
                          {group.items.map((lead, index) => (
                            <SortableLeadPriorityRow
                              key={lead.id}
                              lead={lead}
                              index={index}
                              canEdit={canEdit}
                              settings={settings}
                              leadFollowUps={leadFollowUps}
                              layout={priorityLayout}
                              onOpen={() => openContact(lead)}
                              onEdit={() => openEdit(lead)}
                              onConvert={() => handleConvert(lead)}
                              onDelete={() => handleDelete(lead)}
                            />
                          ))}
                        </SortableContext>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow className="hover:bg-transparent">
                              <TableHead className="w-14">Priority</TableHead>
                              <TableHead>Lead</TableHead>
                              <TableHead>Client</TableHead>
                              <TableHead>Source</TableHead>
                              <TableHead>Created</TableHead>
                              <TableHead>Follow-up</TableHead>
                              <TableHead className="text-right">Days Left</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead className="text-right">Value</TableHead>
                              {canEdit && <TableHead className="w-10" />}
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            <SortableContext
                              items={group.items.map((lead) => lead.id)}
                              strategy={verticalListSortingStrategy}
                            >
                              {group.items.map((lead, index) => (
                                <SortableLeadPriorityRow
                                  key={lead.id}
                                  lead={lead}
                                  index={index}
                                  canEdit={canEdit}
                                  settings={settings}
                                  leadFollowUps={leadFollowUps}
                                  layout={priorityLayout}
                                  onOpen={() => openContact(lead)}
                                  onEdit={() => openEdit(lead)}
                                  onConvert={() => handleConvert(lead)}
                                  onDelete={() => handleDelete(lead)}
                                />
                              ))}
                            </SortableContext>
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </DndContext>
                </div>
              ))}
              {canEdit && (
                <div className="overflow-hidden rounded-xl border border-dashed border-slate-200 bg-white px-3 py-2 shadow-sm">
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-9 w-full justify-start text-muted-foreground hover:text-emerald-800"
                    onClick={openNew}
                  >
                    <Plus className="mr-1.5 h-4 w-4" />
                    Add Lead
                  </Button>
                </div>
              )}
            </div>
          )}

          <div className="grid min-w-0 gap-3 lg:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-900">Workload by Owner</h3>
              <div className="mt-4 space-y-3">
                {workload.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No open leads.</p>
                ) : (
                  workload.map((row) => {
                    const employee = row.ownerId ? getEmployeeById(row.ownerId) : undefined;
                    const label = employee ? getEmployeeFullName(employee) : "Unassigned";
                    return (
                      <div key={row.ownerId ?? "unassigned"} className="space-y-1.5">
                        <div className="flex items-center justify-between gap-2 text-sm">
                          <span className="flex min-w-0 items-center gap-2 truncate font-medium text-slate-900">
                            <Avatar className="h-6 w-6">
                              <AvatarFallback className="bg-slate-100 text-[10px] font-semibold text-slate-600">
                                {initials(label)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="truncate">{label}</span>
                          </span>
                          <span className="shrink-0 tabular-nums text-muted-foreground">
                            {row.openCount}
                          </span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full bg-emerald-500"
                            style={{
                              width: `${Math.round((row.openCount / workloadMax) * 100)}%`,
                            }}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {row.followUpsDue > 0 ? `${row.followUpsDue} follow-up · ` : ""}
                          {formatPipelineValue(row.expectedValue)}
                        </p>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-900">New This Week</h3>
              <div className="mt-3 space-y-0">
                {newThisWeek.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No new leads this week.</p>
                ) : (
                  <>
                    <div className="mb-1 grid grid-cols-[52px_1fr_auto] gap-2 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                      <span>Date</span>
                      <span>Lead</span>
                      <span className="text-right">Value</span>
                    </div>
                    {newThisWeek.slice(0, 5).map((lead) => (
                      <button
                        key={lead.id}
                        type="button"
                        onClick={() => openContact(lead)}
                        className="grid w-full grid-cols-[52px_1fr_auto] items-center gap-2 border-t border-slate-100 py-2 text-left text-sm first:border-t-0"
                      >
                        <span className="tabular-nums text-muted-foreground">
                          {formatShortDate(lead.created_at)}
                        </span>
                        <span className="min-w-0 truncate font-medium text-emerald-700">
                          {leadDisplayName(lead)}
                        </span>
                        <span className="tabular-nums text-slate-800">
                          {formatProjectAmount(lead.expected_value)}
                        </span>
                      </button>
                    ))}
                    <div className="mt-2 flex items-center justify-between border-t pt-2 text-sm font-semibold">
                      <span className="text-slate-700">Weekly Expected</span>
                      <span className="tabular-nums text-emerald-700">
                        {formatPipelineValue(
                          newThisWeek.reduce((sum, lead) => sum + (lead.expected_value ?? 0), 0),
                        )}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-900">By Source</h3>
              <div className="mt-3">
                <SourceDonut buckets={sourceBuckets} />
              </div>
            </div>

            <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-900">Upcoming Follow-ups</h3>
              <ul className="mt-4 space-y-2.5">
                {[
                  {
                    label: "Overdue",
                    count: followUpBuckets.overdue,
                    className: "bg-rose-50 text-rose-700",
                    dot: "bg-rose-500",
                  },
                  {
                    label: "Today",
                    count: followUpBuckets.today,
                    className: "bg-rose-50 text-rose-700",
                    dot: "bg-rose-500",
                  },
                  {
                    label: "Tomorrow",
                    count: followUpBuckets.tomorrow,
                    className: "bg-amber-50 text-amber-800",
                    dot: "bg-amber-500",
                  },
                  {
                    label: "This Week",
                    count: followUpBuckets.thisWeek,
                    className: "bg-amber-50/70 text-amber-900",
                    dot: "bg-amber-400",
                  },
                  {
                    label: "Next Week",
                    count: followUpBuckets.nextWeek,
                    className: "bg-emerald-50 text-emerald-800",
                    dot: "bg-emerald-500",
                  },
                ].map((row) => (
                  <li
                    key={row.label}
                    className={cn(
                      "flex items-center justify-between rounded-lg px-3 py-2 text-sm",
                      row.className,
                    )}
                  >
                    <span className="flex items-center gap-2 font-medium">
                      <span className={cn("h-2 w-2 rounded-full", row.dot)} />
                      {row.label}
                    </span>
                    <span className="tabular-nums font-semibold">{row.count}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="kanban" className="mt-4 min-w-0 space-y-4">
          <div className="flex flex-col gap-3 rounded-xl border border-slate-200/80 bg-white p-3 shadow-sm sm:flex-row sm:items-end">
            <div className="min-w-[180px] flex-1 space-y-1.5">
              <Label htmlFor="leads-kanban-search" className="text-xs">
                Search
              </Label>
              <Input
                id="leads-kanban-search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Client, contact, owner…"
              />
            </div>
            <div className="w-full space-y-1.5 sm:w-[160px]">
              <Label className="text-xs">Source</Label>
              <Select value={sourceFilter} onValueChange={setSourceFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>All sources</SelectItem>
                  {sourceOptions.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {leads.length === 0 ? (
            <p className="rounded-xl border border-dashed bg-slate-50 px-4 py-10 text-center text-sm text-muted-foreground">
              No leads yet. Add an inquiry to start the pipeline.
            </p>
          ) : (
            <LeadKanban
              leads={filtered}
              leadFollowUps={leadFollowUps}
              settings={settings}
              canEditStatus={canEdit}
              ownerName={ownerName}
              onSelect={openContact}
              onStatusChange={handleStatusChange}
            />
          )}
        </TabsContent>
      </Tabs>

      <LeadFormDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditing(null);
        }}
        lead={editing}
      />

      <LeadImportDialog open={importOpen} onOpenChange={setImportOpen} />

      <LeadContactDialog
        lead={detailLead}
        open={Boolean(detailLead)}
        onOpenChange={(open) => {
          if (!open) setDetailLead(null);
        }}
      />
    </div>
  );
}
