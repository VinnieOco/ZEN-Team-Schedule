"use client";

import { useMemo, type KeyboardEvent } from "react";

import { useScheduling } from "@/context/scheduling-context";
import {
  leadStatusBadgeClass,
  leadStatusLabel,
} from "@/lib/pipeline/leads";
import { cn } from "@/lib/utils";
import type { Lead } from "@/types";

interface LeadContactListPaneProps {
  leads: Lead[];
  selectedId: string | null;
  onSelect: (lead: Lead) => void;
}

export function LeadContactListPane({
  leads,
  selectedId,
  onSelect,
}: LeadContactListPaneProps) {
  const { settings } = useScheduling();
  const selectableIds = useMemo(() => leads.map((lead) => lead.id), [leads]);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (selectableIds.length === 0) return;
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    event.preventDefault();
    const currentIndex = selectedId ? selectableIds.indexOf(selectedId) : -1;
    let nextIndex: number;
    if (event.key === "ArrowDown") {
      nextIndex = currentIndex < 0 ? 0 : Math.min(currentIndex + 1, selectableIds.length - 1);
    } else {
      nextIndex = currentIndex < 0 ? selectableIds.length - 1 : Math.max(currentIndex - 1, 0);
    }
    const nextLead = leads[nextIndex];
    if (nextLead) onSelect(nextLead);
  };

  return (
    <div
      className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm"
      onKeyDown={handleKeyDown}
      role="listbox"
      aria-label="Lead contacts"
      tabIndex={0}
    >
      <div className="min-h-0 flex-1 overflow-y-auto divide-y divide-slate-50">
        {leads.map((lead) => {
          const selected = selectedId === lead.id;
          const contactName = lead.contact_name?.trim() || "Unnamed contact";
          return (
            <button
              key={lead.id}
              type="button"
              onClick={() => onSelect(lead)}
              className={cn(
                "flex w-full items-center gap-2 px-3 py-2.5 text-left transition-colors",
                selected
                  ? "bg-emerald-50 text-emerald-950"
                  : "hover:bg-slate-50",
              )}
              aria-current={selected ? "true" : undefined}
            >
              <span
                className={cn(
                  "min-w-0 flex-1 truncate text-sm font-medium",
                  selected ? "text-emerald-900" : "text-slate-900",
                )}
              >
                {contactName}
              </span>
              <span
                className={cn(
                  "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium",
                  leadStatusBadgeClass(lead.status, settings),
                )}
              >
                {leadStatusLabel(lead.status, settings)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
