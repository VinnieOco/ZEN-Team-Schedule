"use client";

import { useMemo, type KeyboardEvent } from "react";

import type { ClientSummary } from "@/lib/clients";
import { cn } from "@/lib/utils";

interface ClientListPaneProps {
  clients: ClientSummary[];
  selectedKey: string | null;
  onSelect: (client: ClientSummary) => void;
}

export function ClientListPane({ clients, selectedKey, onSelect }: ClientListPaneProps) {
  const selectableKeys = useMemo(() => clients.map((c) => c.key), [clients]);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (selectableKeys.length === 0) return;
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    event.preventDefault();
    const currentIndex = selectedKey ? selectableKeys.indexOf(selectedKey) : -1;
    let nextIndex: number;
    if (event.key === "ArrowDown") {
      nextIndex = currentIndex < 0 ? 0 : Math.min(currentIndex + 1, selectableKeys.length - 1);
    } else {
      nextIndex = currentIndex < 0 ? selectableKeys.length - 1 : Math.max(currentIndex - 1, 0);
    }
    const nextClient = clients[nextIndex];
    if (nextClient) onSelect(nextClient);
  };

  return (
    <div
      className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm"
      onKeyDown={handleKeyDown}
      role="listbox"
      aria-label="Clients"
      tabIndex={0}
    >
      <div className="min-h-0 flex-1 overflow-y-auto divide-y divide-slate-50">
        {clients.map((client) => {
          const selected = selectedKey === client.key;
          return (
            <button
              key={client.key}
              type="button"
              onClick={() => onSelect(client)}
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
                {client.displayName}
              </span>
              <span className="shrink-0 rounded-full bg-slate-200/80 px-2 py-0.5 text-[11px] font-medium tabular-nums text-slate-600">
                {client.activeProjectCount || client.projects.length}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
