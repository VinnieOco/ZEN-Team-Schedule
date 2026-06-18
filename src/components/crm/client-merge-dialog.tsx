"use client";

import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { SearchableCombobox } from "@/components/ui/searchable-combobox";
import { useScheduling } from "@/context/scheduling-context";
import { buildClientSummaries, normalizeClientName } from "@/lib/clients";

interface ClientMergeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientKey: string;
  displayName: string;
  projectCount: number;
  noteCount: number;
  onMerged: (routeKey: string) => void;
}

export function ClientMergeDialog({
  open,
  onOpenChange,
  clientKey,
  displayName,
  projectCount,
  noteCount,
  onMerged,
}: ClientMergeDialogProps) {
  const { projects, clients, mergeClients } = useScheduling();
  const [targetName, setTargetName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const sourceKey = normalizeClientName(clientKey);

  const targetOptions = useMemo(() => {
    return buildClientSummaries(projects, clients, { showInactive: true })
      .filter((client) => client.key !== sourceKey)
      .map((client) => ({
        value: client.displayName,
        label: client.displayName,
        keywords: [
          client.projects.length > 0 ? `${client.projects.length} projects` : "registry only",
          client.address,
          client.phone,
          client.email,
        ]
          .filter(Boolean)
          .join(" "),
      }));
  }, [projects, clients, sourceKey]);

  useEffect(() => {
    if (!open) return;
    setTargetName("");
    setError(null);
  }, [open]);

  const handleMerge = () => {
    setSaving(true);
    setError(null);
    try {
      const result = mergeClients(clientKey, targetName);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      onOpenChange(false);
      onMerged(result.routeKey);
    } finally {
      setSaving(false);
    }
  };

  const affectedParts = [
    projectCount > 0 ? `${projectCount} project${projectCount === 1 ? "" : "s"}` : null,
    noteCount > 0 ? `${noteCount} note${noteCount === 1 ? "" : "s"}` : null,
  ].filter(Boolean);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] flex-col overflow-visible sm:max-w-md">
        <DialogHeader className="shrink-0">
          <DialogTitle>Merge client</DialogTitle>
          <DialogDescription>
            Move <span className="font-medium text-slate-900">{displayName}</span> into another
            client. Projects and notes will use the target client name.
            {affectedParts.length > 0 && (
              <>
                {" "}
                This will move {affectedParts.join(" and ")}.
              </>
            )}
          </DialogDescription>
        </DialogHeader>
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto">
          <div className="space-y-2">
            <Label htmlFor="merge-target-client">Merge into</Label>
            <SearchableCombobox
              id="merge-target-client"
              options={targetOptions}
              value={targetName}
              onValueChange={setTargetName}
              placeholder="Search clients…"
              searchPlaceholder="Search clients…"
              emptyMessage="No other clients found"
              allowCustom={false}
            />
            {error && <p className="text-xs text-red-600">{error}</p>}
          </div>
          <p className="text-xs text-muted-foreground">
            The source client will be removed after its projects and notes are moved. Registry
            contact info is kept on the target when possible.
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleMerge}
              disabled={saving || !targetName.trim()}
            >
              {saving ? "Merging…" : "Merge clients"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
