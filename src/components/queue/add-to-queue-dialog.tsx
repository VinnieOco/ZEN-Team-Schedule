"use client";

import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { isInQueue } from "@/lib/queue/queue-membership";
import type { QueueKind } from "@/lib/queue/types";
import type { Project } from "@/types";

const COPY: Record<
  QueueKind,
  { title: string; description: string; empty: string }
> = {
  design: {
    title: "Add project to design queue",
    description:
      "Choose an existing project from your portfolio. Removed projects can be added back here without changing project records.",
    empty: "All active projects are already in the design queue.",
  },
  estimating: {
    title: "Add project to estimating queue",
    description:
      "Choose an existing project from your portfolio. It can appear in both queues unless its department is Estimating.",
    empty: "All active projects are already in the estimating queue.",
  },
};

interface AddToQueueDialogProps {
  kind: QueueKind;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projects: Project[];
  onAdd: (projectId: string) => void;
}

export function AddToQueueDialog({
  kind,
  open,
  onOpenChange,
  projects,
  onAdd,
}: AddToQueueDialogProps) {
  const [selectedId, setSelectedId] = useState("");
  const copy = COPY[kind];

  const availableProjects = useMemo(
    () =>
      projects
        .filter((p) => p.active && !isInQueue(kind, p))
        .sort((a, b) => a.project_name.localeCompare(b.project_name)),
    [projects, kind],
  );

  const options = useMemo(
    () =>
      availableProjects.map((p) => ({
        value: p.id,
        label: p.project_name,
        keywords: [p.client_name, p.department, p.phase].filter(Boolean).join(" "),
      })),
    [availableProjects],
  );

  const handleOpenChange = (next: boolean) => {
    if (!next) setSelectedId("");
    onOpenChange(next);
  };

  const handleAdd = () => {
    if (!selectedId) return;
    onAdd(selectedId);
    setSelectedId("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="flex max-h-[90vh] flex-col overflow-visible sm:max-w-md">
        <DialogHeader className="shrink-0">
          <DialogTitle>{copy.title}</DialogTitle>
        </DialogHeader>
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto">
          <p className="text-sm text-muted-foreground">{copy.description}</p>
          {availableProjects.length === 0 ? (
            <p className="rounded-md border border-dashed border-slate-200 bg-slate-50 px-3 py-4 text-sm text-muted-foreground">
              {copy.empty}
            </p>
          ) : (
            <SearchableSelect
              options={options}
              value={selectedId}
              onValueChange={setSelectedId}
              placeholder="Search projects…"
              searchPlaceholder="Search by name or client…"
            />
          )}
        </div>
        <div className="flex shrink-0 justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" disabled={!selectedId} onClick={handleAdd}>
            Add to queue
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
