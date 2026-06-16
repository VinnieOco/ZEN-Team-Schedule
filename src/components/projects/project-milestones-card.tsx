"use client";

import { useMemo } from "react";
import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

interface ProjectMilestonesCardProps {
  project: Project;
  projectMilestones: ProjectMilestone[];
  canEdit: boolean;
  onCommit: (milestones: ProjectMilestone[]) => void;
}

function generateId(): string {
  return crypto.randomUUID();
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
    const next: ProjectMilestone = {
      id: generateId(),
      project_id: project.id,
      title: "New milestone",
      milestone_date: new Date().toISOString().slice(0, 10),
      kind: "other",
      sort_order: milestones.length,
    };
    onCommit([...milestones, next]);
  };

  const removeMilestone = (id: string) => {
    onCommit(milestones.filter((m) => m.id !== id));
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
        <div>
          <CardTitle className="text-base">Milestones</CardTitle>
          <p className="text-sm text-muted-foreground">
            Submittals, client reviews, permits, and other key dates appear as diamonds on the
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
                {canEdit && <TableHead className="w-10" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {milestones.map((milestone) => (
                <TableRow key={milestone.id}>
                  <TableCell>
                    {canEdit ? (
                      <Input
                        value={milestone.title}
                        className="h-8 min-w-[140px]"
                        onChange={(e) => updateMilestone(milestone.id, "title", e.target.value)}
                      />
                    ) : (
                      milestone.title
                    )}
                  </TableCell>
                  <TableCell>
                    {canEdit ? (
                      <Input
                        type="date"
                        value={milestone.milestone_date}
                        className="h-8 w-[130px]"
                        onChange={(e) =>
                          updateMilestone(milestone.id, "milestone_date", e.target.value)
                        }
                      />
                    ) : (
                      milestone.milestone_date
                    )}
                  </TableCell>
                  <TableCell>
                    {canEdit ? (
                      <Select
                        value={milestone.kind}
                        onValueChange={(value) => updateMilestone(milestone.id, "kind", value)}
                      >
                        <SelectTrigger className="h-8 w-[140px]">
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
                    {canEdit ? (
                      <Input
                        value={milestone.notes ?? ""}
                        placeholder="Optional"
                        className="h-8 min-w-[120px]"
                        onChange={(e) => updateMilestone(milestone.id, "notes", e.target.value)}
                      />
                    ) : (
                      (milestone.notes ?? "—")
                    )}
                  </TableCell>
                  {canEdit && (
                    <TableCell>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => removeMilestone(milestone.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
