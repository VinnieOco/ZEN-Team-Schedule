"use client";

import { useEffect, useState } from "react";
import { format, parseISO } from "date-fns";

import { Button } from "@/components/ui/button";
import { DateInput } from "@/components/ui/date-input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { MILESTONE_KIND_OPTIONS, MILESTONE_PIPELINE_TAG_OPTIONS } from "@/lib/gantt/milestones";
import type {
  ProjectMilestone,
  ProjectMilestoneKind,
  ProjectMilestonePipelineTag,
} from "@/types";

const NO_TAG = "__none__";

export interface GanttMilestoneFormValues {
  title: string;
  milestone_date: string;
  kind: ProjectMilestoneKind;
  pipeline_tag?: ProjectMilestonePipelineTag;
  notes: string;
}

interface GanttMilestoneFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectLabel: string;
  initialDate: string;
  onSave: (values: GanttMilestoneFormValues) => void;
}

function formatMilestoneDate(value: string): string {
  try {
    return format(parseISO(value), "MMM d, yyyy");
  } catch {
    return value;
  }
}

export function GanttMilestoneFormDialog({
  open,
  onOpenChange,
  projectLabel,
  initialDate,
  onSave,
}: GanttMilestoneFormDialogProps) {
  const [title, setTitle] = useState("New milestone");
  const [milestoneDate, setMilestoneDate] = useState(initialDate);
  const [kind, setKind] = useState<ProjectMilestoneKind>("other");
  const [pipelineTag, setPipelineTag] = useState<ProjectMilestonePipelineTag | undefined>();
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!open) return;
    setTitle("New milestone");
    setMilestoneDate(initialDate);
    setKind("other");
    setPipelineTag(undefined);
    setNotes("");
  }, [open, initialDate]);

  const handleSave = () => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle || !milestoneDate) return;
    onSave({
      title: trimmedTitle,
      milestone_date: milestoneDate,
      kind,
      pipeline_tag: pipelineTag,
      notes: notes.trim(),
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add milestone</DialogTitle>
          <DialogDescription>
            {projectLabel} · {formatMilestoneDate(milestoneDate)}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="gantt-milestone-title">Title</Label>
            <Input
              id="gantt-milestone-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="gantt-milestone-date">Date</Label>
            <DateInput
              id="gantt-milestone-date"
              value={milestoneDate}
              onChange={(e) => setMilestoneDate(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Type</Label>
            <Select value={kind} onValueChange={(value) => setKind(value as ProjectMilestoneKind)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MILESTONE_KIND_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Pipeline tag</Label>
            <Select
              value={pipelineTag ?? NO_TAG}
              onValueChange={(value) =>
                setPipelineTag(
                  value === NO_TAG ? undefined : (value as ProjectMilestonePipelineTag),
                )
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="None" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_TAG}>None</SelectItem>
                {MILESTONE_PIPELINE_TAG_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Design and Estimating tags surface the latest date on those Pipeline tables.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="gantt-milestone-notes">Notes</Label>
            <Textarea
              id="gantt-milestone-notes"
              value={notes}
              placeholder="Optional"
              rows={2}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSave} disabled={!title.trim() || !milestoneDate}>
            Add milestone
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function buildProjectMilestone(
  projectId: string,
  values: GanttMilestoneFormValues,
  sortOrder: number,
): ProjectMilestone {
  return {
    id: crypto.randomUUID(),
    project_id: projectId,
    title: values.title,
    milestone_date: values.milestone_date,
    kind: values.kind,
    sort_order: sortOrder,
    pipeline_tag: values.pipeline_tag,
    notes: values.notes || undefined,
  };
}
