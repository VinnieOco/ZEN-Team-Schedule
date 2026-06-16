"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { differenceInCalendarDays, parseISO, startOfWeek, subWeeks } from "date-fns";
import { Link2, Link2Off } from "lucide-react";

import {
  GanttSingleProjectChart,
  togglePhaseLinked,
  updatePhaseField,
} from "@/components/gantt/gantt-single-project-chart";
import { ProjectMilestonesCard } from "@/components/projects/project-milestones-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useScheduling } from "@/context/scheduling-context";
import { PhaseProgressBar } from "@/components/gantt/phase-progress-bar";
import {
  computePhaseProgress,
  hoursForPhase,
} from "@/lib/gantt/phase-progress";
import { phasesForProject, seedPhasesForProject } from "@/lib/gantt/seed-phases";
import { formatProjectAmount, formatProjectHours } from "@/lib/project-format";
import type { Project, TimeEntry } from "@/types";
import { cn } from "@/lib/utils";

interface ProjectScheduleSectionProps {
  project: Project;
  timeEntries: TimeEntry[];
  canEdit: boolean;
}

function phaseWeeks(start?: string, end?: string): string {
  if (!start || !end) return "—";
  try {
    const days = differenceInCalendarDays(parseISO(end), parseISO(start)) + 1;
    return `${Math.max(1, Math.round(days / 7))}w`;
  } catch {
    return "—";
  }
}

export function ProjectScheduleSection({
  project,
  timeEntries,
  canEdit,
}: ProjectScheduleSectionProps) {
  const { projectPhases, projectMilestones, replaceProjectPhases, replaceProjectMilestones, isLoading } =
    useScheduling();
  const seededRef = useRef(false);
  const [rangeStart, setRangeStart] = useState(() =>
    startOfWeek(subWeeks(new Date(), 2), { weekStartsOn: 1 }),
  );

  const phases = useMemo(
    () => phasesForProject(projectPhases, project.id),
    [projectPhases, project.id],
  );

  useEffect(() => {
    if (isLoading || seededRef.current) return;
    if (phases.length > 0) {
      seededRef.current = true;
      return;
    }
    seededRef.current = true;
    const seeded = seedPhasesForProject(project);
    replaceProjectPhases(project.id, seeded);
  }, [isLoading, phases.length, project, replaceProjectPhases]);

  const handleCommit = (next: typeof phases) => {
    replaceProjectPhases(project.id, next);
  };

  const handleFieldChange = (
    phaseId: string,
    field: "start_date" | "end_date" | "budget_hours",
    value: string,
  ) => {
    handleCommit(updatePhaseField(phases, phaseId, field, value));
  };

  const handleToggleLinked = (phaseId: string, linked: boolean) => {
    handleCommit(togglePhaseLinked(phases, phaseId, linked));
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Phase schedule</CardTitle>
          <p className="text-sm text-muted-foreground">
            Edit dates in the table or drag bars on the timeline. Linked phases shift when a
            predecessor changes.
          </p>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0 sm:p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Phase</TableHead>
                <TableHead>Start</TableHead>
                <TableHead>End</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead className="text-right">Budget hrs</TableHead>
                <TableHead className="text-right">Logged</TableHead>
                <TableHead className="min-w-[120px]">Progress</TableHead>
                <TableHead className="text-right">Fee budget</TableHead>
                <TableHead className="w-10 text-center">Link</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {phases.map((phase, index) => {
                const logged = hoursForPhase(timeEntries, project.id, phase.phase_key);
                const progress = computePhaseProgress(phase, logged);
                return (
                  <TableRow key={phase.id}>
                    <TableCell className="font-medium">{phase.phase_key}</TableCell>
                    <TableCell>
                      {canEdit ? (
                        <Input
                          type="date"
                          value={phase.start_date ?? ""}
                          className="h-8 w-[130px]"
                          onChange={(e) =>
                            handleFieldChange(phase.id, "start_date", e.target.value)
                          }
                        />
                      ) : (
                        (phase.start_date ?? "—")
                      )}
                    </TableCell>
                    <TableCell>
                      {canEdit ? (
                        <Input
                          type="date"
                          value={phase.end_date ?? ""}
                          className="h-8 w-[130px]"
                          onChange={(e) =>
                            handleFieldChange(phase.id, "end_date", e.target.value)
                          }
                        />
                      ) : (
                        (phase.end_date ?? "—")
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {phaseWeeks(phase.start_date, phase.end_date)}
                    </TableCell>
                    <TableCell className="text-right">
                      {canEdit ? (
                        <Input
                          type="number"
                          min={0}
                          step={0.5}
                          value={phase.budget_hours}
                          className="ml-auto h-8 w-20 text-right"
                          onChange={(e) =>
                            handleFieldChange(phase.id, "budget_hours", e.target.value)
                          }
                        />
                      ) : (
                        formatProjectHours(phase.budget_hours)
                      )}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {formatProjectHours(logged)}h
                    </TableCell>
                    <TableCell>
                      <PhaseProgressBar progress={progress} compact />
                      <p className="mt-1 text-[10px] tabular-nums text-muted-foreground">
                        {progress.hoursBudget > 0 ? `${progress.hoursPercent}%` : "—"}
                        {progress.feePercent != null ? ` · ${progress.feePercent}% fee` : ""}
                      </p>
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {formatProjectAmount(phase.budget_amount)}
                    </TableCell>
                    <TableCell className="text-center">
                      {index === 0 ? (
                        <span className="text-xs text-muted-foreground">—</span>
                      ) : (
                        <button
                          type="button"
                          disabled={!canEdit}
                          title={
                            phase.linked_to_previous
                              ? "Linked to previous phase"
                              : "Independent phase"
                          }
                          className={cn(
                            "inline-flex rounded p-1",
                            canEdit && "hover:bg-slate-100",
                            !canEdit && "opacity-50",
                          )}
                          onClick={() =>
                            handleToggleLinked(phase.id, !phase.linked_to_previous)
                          }
                        >
                          {phase.linked_to_previous ? (
                            <Link2 className="h-4 w-4 text-emerald-600" />
                          ) : (
                            <Link2Off className="h-4 w-4 text-muted-foreground" />
                          )}
                        </button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <ProjectMilestonesCard
        project={project}
        projectMilestones={projectMilestones}
        canEdit={canEdit}
        onCommit={(milestones) => replaceProjectMilestones(project.id, milestones)}
      />

      <GanttSingleProjectChart
        project={project}
        projectPhases={projectPhases}
        projectMilestones={projectMilestones}
        timeEntries={timeEntries}
        canEdit={canEdit}
        rangeStart={rangeStart}
        onRangeStartChange={setRangeStart}
        onCommitPhases={handleCommit}
      />
    </div>
  );
}
