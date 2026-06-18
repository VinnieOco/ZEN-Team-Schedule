"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useScheduling } from "@/context/scheduling-context";

interface ClientRenameDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientKey: string;
  displayName: string;
  projectCount: number;
  noteCount: number;
  onRenamed: (routeKey: string) => void;
}

export function ClientRenameDialog({
  open,
  onOpenChange,
  clientKey,
  displayName,
  projectCount,
  noteCount,
  onRenamed,
}: ClientRenameDialogProps) {
  const { renameClient } = useScheduling();
  const [name, setName] = useState(displayName);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(displayName);
    setError(null);
  }, [open, displayName]);

  const handleSave = () => {
    setSaving(true);
    setError(null);
    try {
      const result = renameClient(clientKey, name);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      onOpenChange(false);
      onRenamed(result.routeKey);
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
          <DialogTitle>Rename client</DialogTitle>
          <DialogDescription>
            Updates the client name on linked projects and notes.
            {affectedParts.length > 0 && (
              <>
                {" "}
                This affects {affectedParts.join(" and ")}.
              </>
            )}
          </DialogDescription>
        </DialogHeader>
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto">
          <div className="space-y-2">
            <Label htmlFor="rename-client-name">Client name</Label>
            <Input
              id="rename-client-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Company or client name"
              autoFocus
            />
            {error && <p className="text-xs text-red-600">{error}</p>}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={handleSave} disabled={saving || !name.trim()}>
              {saving ? "Saving…" : "Rename client"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
