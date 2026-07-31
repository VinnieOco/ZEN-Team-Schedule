"use client";

import { useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { format, parseISO } from "date-fns";
import { GripVertical } from "lucide-react";

import {
  formatLeadFollowUpSchedule,
  latestOpenLeadFollowUp,
  leadFollowUpTypeLabel,
} from "@/lib/pipeline/lead-follow-up-types";
import {
  compareLeadsForQueue,
  isLeadFollowUpDue,
  leadDisplayName,
  leadSourceBadgeClass,
  leadSourceLabel,
} from "@/lib/pipeline/leads";
import { leadStageOptions } from "@/lib/pipeline/lead-stages";
import { formatProjectAmount } from "@/lib/project-format";
import { cn } from "@/lib/utils";
import type { CompanySettings, Lead, LeadFollowUp, LeadStatus } from "@/types";

const DROP_PREFIX = "lead-status:";

interface LeadKanbanProps {
  leads: Lead[];
  leadFollowUps: LeadFollowUp[];
  settings: CompanySettings;
  canEditStatus: boolean;
  ownerName: (lead: Lead) => string | undefined;
  onSelect: (lead: Lead) => void;
  onStatusChange: (id: string, status: LeadStatus) => void;
}

function formatDue(value?: string): string | null {
  if (!value?.trim()) return null;
  try {
    return format(parseISO(value), "MMM d");
  } catch {
    return value;
  }
}

function LeadCardBody({
  lead,
  ownerName,
  settings,
  followUpSchedule,
  followUpType,
}: {
  lead: Lead;
  ownerName?: string;
  settings: CompanySettings;
  followUpSchedule?: string;
  followUpType?: string;
}) {
  const followUp = followUpSchedule ?? formatDue(lead.next_follow_up_date);
  return (
    <div className="rounded-md border bg-white p-2 shadow-sm">
      <p className="truncate text-xs font-medium text-slate-900">{leadDisplayName(lead)}</p>
      <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{lead.client_name}</p>
      <div className="mt-1.5 flex items-center justify-between gap-1.5">
        <span
          className={cn(
            "inline-flex rounded px-1.5 py-0.5 text-[10px] font-medium",
            leadSourceBadgeClass(lead.source),
          )}
        >
          {leadSourceLabel(lead.source, settings)}
        </span>
        <span className="text-xs font-semibold tabular-nums text-slate-900">
          {formatProjectAmount(lead.expected_value)}
        </span>
      </div>
      <div className="mt-1.5 flex items-center justify-between gap-1.5 text-[11px] text-muted-foreground">
        <span className="truncate">{ownerName ?? "Unassigned"}</span>
        {followUp ? (
          <span
            className={cn(
              "text-right tabular-nums",
              isLeadFollowUpDue(lead, new Date(), settings) && "font-semibold text-rose-700",
            )}
          >
            {followUp}
            {followUpType ? (
              <span className="mt-0.5 block text-[10px] font-normal text-muted-foreground">
                {followUpType}
              </span>
            ) : null}
          </span>
        ) : null}
      </div>
    </div>
  );
}

function DraggableLeadCard({
  lead,
  ownerName,
  settings,
  followUpSchedule,
  followUpType,
  canDrag,
  onSelect,
}: {
  lead: Lead;
  ownerName?: string;
  settings: CompanySettings;
  followUpSchedule?: string;
  followUpType?: string;
  canDrag: boolean;
  onSelect: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: lead.id,
    disabled: !canDrag,
  });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform) }}
      className={cn("relative flex gap-0.5", isDragging && "opacity-60")}
    >
      {canDrag && (
        <button
          type="button"
          className="mt-1 flex h-6 w-4 shrink-0 cursor-grab touch-none items-center justify-center rounded text-slate-400 hover:text-slate-600 active:cursor-grabbing"
          aria-label="Drag to change status"
          {...listeners}
          {...attributes}
        >
          <GripVertical className="h-3.5 w-3.5" />
        </button>
      )}
      <button
        type="button"
        className="min-w-0 flex-1 text-left"
        onClick={onSelect}
        aria-label={`Open ${leadDisplayName(lead)}`}
      >
        <LeadCardBody
          lead={lead}
          ownerName={ownerName}
          settings={settings}
          followUpSchedule={followUpSchedule}
          followUpType={followUpType}
        />
      </button>
    </div>
  );
}

function StatusColumn({
  status,
  label,
  leads,
  leadFollowUps,
  settings,
  canEditStatus,
  ownerName,
  onSelect,
}: {
  status: LeadStatus;
  label: string;
  leads: Lead[];
  leadFollowUps: LeadFollowUp[];
  settings: CompanySettings;
  canEditStatus: boolean;
  ownerName: (lead: Lead) => string | undefined;
  onSelect: (lead: Lead) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `${DROP_PREFIX}${status}`,
    disabled: !canEditStatus,
  });

  const total = leads.reduce((sum, lead) => sum + (lead.expected_value ?? 0), 0);

  return (
    <div className="flex min-w-[220px] max-w-[220px] shrink-0 flex-col border-r border-slate-200 last:border-r-0 sm:min-w-[248px] sm:max-w-[248px]">
      <div className="flex items-center justify-between border-b bg-slate-50 px-2.5 py-2.5 sm:px-3">
        <h3 className="truncate text-xs font-semibold text-slate-900 sm:text-sm">{label}</h3>
        <span className="ml-1 shrink-0 rounded-full bg-slate-200/80 px-2 py-0.5 text-[10px] font-medium tabular-nums text-muted-foreground">
          {leads.length}
        </span>
      </div>
      <div
        ref={setNodeRef}
        className={cn(
          "flex min-h-[120px] flex-1 flex-col gap-1.5 p-1.5 transition-colors sm:gap-2 sm:p-2",
          isOver && canEditStatus && "bg-emerald-50 ring-2 ring-inset ring-emerald-400",
        )}
      >
        {leads.length === 0 ? (
          <div
            className={cn(
              "flex min-h-[80px] flex-1 items-center justify-center rounded-md border border-dashed border-slate-200 px-2 text-center text-[10px] text-slate-400",
              isOver && canEditStatus && "border-emerald-300 bg-emerald-50/50 text-emerald-600",
            )}
          >
            Drop here
          </div>
        ) : (
          leads.map((lead) => {
            const nextFollowUp = latestOpenLeadFollowUp(leadFollowUps, lead.id);
            const followUpSchedule = nextFollowUp
              ? formatLeadFollowUpSchedule(nextFollowUp.due_date, nextFollowUp.due_time, {
                  includeWeekday: false,
                })
              : undefined;
            const followUpType = nextFollowUp?.follow_up_type_id
              ? leadFollowUpTypeLabel(settings, nextFollowUp.follow_up_type_id)
              : undefined;
            return (
              <DraggableLeadCard
                key={lead.id}
                lead={lead}
                ownerName={ownerName(lead)}
                settings={settings}
                followUpSchedule={followUpSchedule}
                followUpType={followUpType}
                canDrag={canEditStatus}
                onSelect={() => onSelect(lead)}
              />
            );
          })
        )}
      </div>
      <div className="border-t bg-slate-100/80 px-2.5 py-2 sm:px-3">
        <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          Expected value
        </p>
        <p className="mt-0.5 text-sm font-semibold tabular-nums text-slate-900">
          {formatProjectAmount(total)}
        </p>
      </div>
    </div>
  );
}

export function LeadKanban({
  leads,
  leadFollowUps,
  settings,
  canEditStatus,
  ownerName,
  onSelect,
  onStatusChange,
}: LeadKanbanProps) {
  const [activeLead, setActiveLead] = useState<Lead | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
  );

  const stageOptions = useMemo(() => {
    const configured = leadStageOptions(settings);
    const known = new Set(configured.map((s) => s.value));
    const orphans = [...new Set(leads.map((l) => l.status).filter((s) => !known.has(s)))].map(
      (value) => ({ value, label: value, kind: "open" as const }),
    );
    return [...configured, ...orphans];
  }, [settings, leads]);

  const byStatus = useMemo(() => {
    const map = new Map<LeadStatus, Lead[]>(
      stageOptions.map((status) => [status.value, [] as Lead[]]),
    );
    for (const lead of leads) {
      map.get(lead.status)?.push(lead);
    }
    for (const list of map.values()) list.sort(compareLeadsForQueue);
    return map;
  }, [leads, stageOptions]);

  const handleDragStart = (event: DragStartEvent) => {
    const found = leads.find((l) => l.id === event.active.id);
    if (found) setActiveLead(found);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveLead(null);
    const { active, over } = event;
    if (!over || !canEditStatus) return;

    const overId = String(over.id);
    if (!overId.startsWith(DROP_PREFIX)) return;
    const targetStatus = overId.slice(DROP_PREFIX.length) as LeadStatus;

    const dragged = leads.find((l) => l.id === String(active.id));
    if (!dragged || dragged.status === targetStatus) return;
    onStatusChange(dragged.id, targetStatus);
  };

  return (
    <>
      <p className="mb-2 text-xs text-muted-foreground">
        {canEditStatus && (
          <span className="hidden sm:inline">
            Drag a card by the grip to change its status. Click a card to edit.{" "}
          </span>
        )}
        <span className="lg:hidden">Swipe horizontally to view all statuses →</span>
      </p>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="schedule-scroll schedule-scroll-fade relative max-w-full overflow-x-auto rounded-lg border bg-white shadow-sm">
          <div className="flex min-w-max">
            {stageOptions.map((status) => (
              <StatusColumn
                key={status.value}
                status={status.value}
                label={status.label}
                leads={byStatus.get(status.value) ?? []}
                leadFollowUps={leadFollowUps}
                settings={settings}
                canEditStatus={canEditStatus}
                ownerName={ownerName}
                onSelect={onSelect}
              />
            ))}
          </div>
        </div>

        <DragOverlay dropAnimation={null}>
          {activeLead ? (
            <div className="w-[200px] rotate-1 shadow-lg sm:w-[220px]">
              <LeadCardBody
                lead={activeLead}
                ownerName={ownerName(activeLead)}
                settings={settings}
                followUpSchedule={(() => {
                  const nextFollowUp = latestOpenLeadFollowUp(leadFollowUps, activeLead.id);
                  return nextFollowUp
                    ? formatLeadFollowUpSchedule(
                        nextFollowUp.due_date,
                        nextFollowUp.due_time,
                        { includeWeekday: false },
                      )
                    : undefined;
                })()}
                followUpType={(() => {
                  const nextFollowUp = latestOpenLeadFollowUp(leadFollowUps, activeLead.id);
                  return nextFollowUp?.follow_up_type_id
                    ? leadFollowUpTypeLabel(settings, nextFollowUp.follow_up_type_id)
                    : undefined;
                })()}
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </>
  );
}
