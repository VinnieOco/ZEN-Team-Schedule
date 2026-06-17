"use client";

import { useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { Check, Pencil, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DateInput } from "@/components/ui/date-input";
import { Input } from "@/components/ui/input";
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
import {
  MILESTONE_KIND_OPTIONS,
  milestoneKindLabel,
  milestonesForProject,
} from "@/lib/gantt/milestones";
import type { Project, ProjectMilestone, ProjectMilestoneKind } from "@/types";
import { cn } from "@/lib/utils";

interface ProjectMilestonesCardProps {
  project: Project;
  projectMilestones: ProjectMilestone[];
  canEdit: boolean;
  onCommit: (milestones: ProjectMilestone[]) => void;
}

function generateId(): string {
  return crypto.randomUUID();
}

function formatMilestoneDate(value: string): string {
  try {
    return format(parseISO(value), "MMM d, yyyy");
  } catch {
    return value;
  }
}

export function ProjectMilestonesCard({
  project,
  projectMilestones,
  canEdit,
  onCommit,
}: ProjectMilestonesCardProps) {
  const milestones = useMemo(
    () => milestonesForProject(projectMilestones, project.id),
    [projectMilestones, project.id],
  );
  const [editingIds, setEditingIds] = useState<Set<string>>(() => new Set());

  const isEditing = (id: string) => canEdit && editingIds.has(id);

  const startEditing = (id: string) => {
    setEditingIds((prev) => new Set(prev).add(id));
  };

  const finishEditing = (id: string) => {
    setEditingIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const updateMilestone = (
    id: string,
    field: keyof Pick<ProjectMilestone, "title" | "milestone_date" | "kind" | "notes">,
    value: string,
  ) => {
    onCommit(
      milestones.map((m) =>
        m.id === id
          ? {
              ...m,
              [field]: field === "kind" ? (value as ProjectMilestoneKind) : value,
            }
          : m,
      ),
    );
  };

  const addMilestone = () => {
    const id = generateId();
    const next: ProjectMilestone = {
      id,
      project_id: project.id,
      title: "New milestone",
      milestone_date: new Date().toISOString().slice(0, 10),
      kind: "other",
      sort_order: milestones.length,
    };
    onCommit([...milestones, next]);
    setEditingIds((prev) => new Set(prev).add(id));
  };

  const removeMilestone = (id: string) => {
    onCommit(milestones.filter((m) => m.id !== id));
    setEditingIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
        <div>
          <CardTitle className="text-base">Milestones</CardTitle>
          <p className="text-sm text-muted-foreground">
            Submittals, meetings, reviews, permits, and other key dates appear as diamonds on the
            timeline.
          </p>
        </div>
        {canEdit && (
          <Button type="button" variant="outline" size="sm" onClick={addMilestone}>
            <Plus className="mr-1 h-4 w-4" />
            Add
          </Button>
        )}
      </CardHeader>
      <CardContent className="overflow-x-auto p-0 sm:p-0">
        {milestones.length === 0 ? (
          <p className="px-6 pb-6 text-sm text-muted-foreground">
            No milestones yet.{canEdit ? " Add one to mark important dates on the Gantt." : ""}
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Notes</TableHead>
                {canEdit && <TableHead className="w-24 text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {milestones.map((milestone) => {
                const editing = isEditing(milestone.id);

                return (
                  <TableRow
                    key={milestone.id}
                    className={cn(
                      !editing && canEdit && "bg-slate-50/80 text-muted-foreground",
                    )}
                  >
                    <TableCell className={cn(!editing && "font-medium text-slate-700")}>
                      {editing ? (
                        <Input
                          value={milestone.title}
                          className="h-8 min-w-[140px] bg-white"
                          onChange={(e) => updateMilestone(milestone.id, "title", e.target.value)}
                        />
                      ) : (
                        milestone.title
                      )}
                    </TableCell>
                    <TableCell className="whitespace-nowrap py-2">
                      {editing ? (
                        <DateInput
                          value={milestone.milestone_date}
                          className="bg-white"
                          onChange={(e) =>
                            updateMilestone(milestone.id, "milestone_date", e.target.value)
                          }
                        />
                      ) : (
                        <span className="tabular-nums">
                          {formatMilestoneDate(milestone.milestone_date)}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {editing ? (
                        <Select
                          value={milestone.kind}
                          onValueChange={(value) => updateMilestone(milestone.id, "kind", value)}
                        >
                          <SelectTrigger className="h-8 w-[140px] bg-white">
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
                      ) : (
                        milestoneKindLabel(milestone.kind)
                      )}
                    </TableCell>
                    <TableCell>
                      {editing ? (
                        <Input
                          value={milestone.notes ?? ""}
                          placeholder="Optional"
                          className="h-8 min-w-[120px] bg-white"
                          onChange={(e) => updateMilestone(milestone.id, "notes", e.target.value)}
                        />
                      ) : (
                        (milestone.notes ?? "—")
                      )}
                    </TableCell>
                    {canEdit && (
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {editing ? (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-emerald-700 hover:text-emerald-800"
                              title="Done"
                              onClick={() => finishEditing(milestone.id)}
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                          ) : (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-slate-900"
                              title="Edit milestone"
                              onClick={() => startEditing(milestone.id)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            title="Remove milestone"
                            onClick={() => removeMilestone(milestone.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
