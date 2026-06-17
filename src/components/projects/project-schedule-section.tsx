"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { differenceInCalendarDays, format, parseISO, startOfWeek, subWeeks } from "date-fns";
import { Link2, Link2Off, Plus, Trash2 } from "lucide-react";

import {
  GanttSingleProjectChart,
  togglePhaseLinked,
  updatePhaseField,
} from "@/components/gantt/gantt-single-project-chart";
import { ProjectMilestonesCard } from "@/components/projects/project-milestones-card";
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
import { useScheduling } from "@/context/scheduling-context";
import { PhaseProgressBar } from "@/components/gantt/phase-progress-bar";
import {
  getProjectBudgetRollup,
  hasChangeOrderRollup,
  isParentProject,
} from "@/lib/change-orders";
import {
  buildPhaseHoursAllocation,
  computePhaseFeeBudget,
  computePhaseProgress,
  type PhaseProgress,
} from "@/lib/gantt/phase-progress";
import {
  addPhaseToSchedule,
  availablePhaseKeysToAdd,
  removePhaseFromSchedule,
} from "@/lib/gantt/phase-schedule";
import { phasesForProject, seedPhasesForProject } from "@/lib/gantt/seed-phases";
import { formatProjectAmount, formatProjectHours, getProjectDesignAmount } from "@/lib/project-format";
import type { Project, ProjectPhase, TimeEntry } from "@/types";
import { cn } from "@/lib/utils";

interface ProjectScheduleSectionProps {
  project: Project;
  timeEntries: TimeEntry[];
  canEdit: boolean;
}

function formatPhaseDate(value?: string): string {
  if (!value) return "—";
  try {
    return format(parseISO(value), "MMM d, yyyy");
  } catch {
    return value;
  }
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
  const { projects, projectPhases, projectMilestones, allocations, employees, replaceProjectPhases, replaceProjectMilestones, isLoading } =
    useScheduling();
  const seededRef = useRef(false);
  const [rangeStart, setRangeStart] = useState(() =>
    startOfWeek(subWeeks(new Date(), 2), { weekStartsOn: 1 }),
  );

  const phases = useMemo(
    () => phasesForProject(projectPhases, project.id),
    [projectPhases, project.id],
  );
  const availablePhases = useMemo(
    () => availablePhaseKeysToAdd(project, phases),
    [project, phases],
  );
  const phaseHoursByKey = useMemo(
    () => buildPhaseHoursAllocation(phases, timeEntries, project.id),
    [phases, timeEntries, project.id],
  );
  const totalPhaseBudgetHours = useMemo(
    () => phases.reduce((sum, phase) => sum + phase.budget_hours, 0),
    [phases],
  );
  const totalLoggedHours = useMemo(
    () =>
      phases.reduce(
        (sum, phase) => sum + (phaseHoursByKey.get(phase.phase_key) ?? 0),
        0,
      ),
    [phases, phaseHoursByKey],
  );
  const projectBudgetedHours = useMemo(() => {
    const budgetRollup = getProjectBudgetRollup(projects, project);
    const showRollup = isParentProject(project) && hasChangeOrderRollup(budgetRollup);
    return showRollup ? budgetRollup.totalBudgetHours : project.budgeted_design_hours;
  }, [projects, project]);
  const scheduleTotals = useMemo(() => {
    let totalContract = 0;
    let totalContractUsed = 0;
    let hasContract = false;

    for (const phase of phases) {
      const logged = phaseHoursByKey.get(phase.phase_key) ?? 0;
      const progress = computePhaseProgress(phase, logged, project);
      const contract = computePhaseFeeBudget(phase, project);
      if (contract != null && contract > 0) {
        hasContract = true;
        totalContract += contract;
        totalContractUsed += progress.feeUsed ?? 0;
      }
    }

    const budgetRollup = getProjectBudgetRollup(projects, project);
    const showRollup = isParentProject(project) && hasChangeOrderRollup(budgetRollup);
    const projectContractAmount = showRollup
      ? budgetRollup.totalDesignAmount
      : getProjectDesignAmount(project);

    const hoursPercent =
      totalPhaseBudgetHours > 0
        ? Math.round((totalLoggedHours / totalPhaseBudgetHours) * 100)
        : 0;
    const contractPercent =
      totalContract > 0 ? Math.round((totalContractUsed / totalContract) * 100) : undefined;

    const totalProgress: PhaseProgress = {
      hoursUsed: totalLoggedHours,
      hoursBudget: totalPhaseBudgetHours,
      hoursPercent,
      feeBudget: hasContract ? Math.round(totalContract * 100) / 100 : undefined,
      feeUsed: hasContract ? Math.round(totalContractUsed * 100) / 100 : undefined,
      feePercent: contractPercent,
    };

    return { totalContract, projectContractAmount, totalProgress };
  }, [phases, phaseHoursByKey, project, projects, totalLoggedHours, totalPhaseBudgetHours]);
  const [phaseToAdd, setPhaseToAdd] = useState<string>("");

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

  const handleAddPhase = () => {
    if (!phaseToAdd) return;
    handleCommit(addPhaseToSchedule(project, phases, phaseToAdd as ProjectPhase));
    setPhaseToAdd("");
  };

  const handleRemovePhase = (phaseId: string) => {
    handleCommit(removePhaseFromSchedule(phases, phaseId));
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Schedule timeline</CardTitle>
          <p className="text-sm text-muted-foreground">
            Drag empty timeline space to move through earlier or later dates. Drag phase bars to
            adjust dates. Staffing lanes under each phase show who is scheduled from Team
            Scheduling. Milestone markers appear when milestones are set below.
          </p>
        </CardHeader>
        <CardContent>
          <GanttSingleProjectChart
            project={project}
            projectPhases={projectPhases}
            projectMilestones={projectMilestones}
            timeEntries={timeEntries}
            allocations={allocations}
            employees={employees}
            canEdit={canEdit}
            rangeStart={rangeStart}
            onRangeStartChange={setRangeStart}
            onCommitPhases={handleCommit}
          />
        </CardContent>
      </Card>

      <ProjectMilestonesCard
        project={project}
        projectMilestones={projectMilestones}
        canEdit={canEdit}
        onCommit={(milestones) => replaceProjectMilestones(project.id, milestones)}
      />

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
          <div>
            <CardTitle className="text-base">Phase schedule</CardTitle>
            <p className="text-sm text-muted-foreground">
              Add or remove phases and edit dates, budgets, and links in the table. Linked phases
              shift when a predecessor changes.
            </p>
          </div>
          {canEdit && availablePhases.length > 0 && (
            <div className="flex shrink-0 items-center gap-2">
              <Select value={phaseToAdd} onValueChange={setPhaseToAdd}>
                <SelectTrigger className="h-8 w-[180px]">
                  <SelectValue placeholder="Choose phase…" />
                </SelectTrigger>
                <SelectContent>
                  {availablePhases.map((phaseKey) => (
                    <SelectItem key={phaseKey} value={phaseKey}>
                      {phaseKey}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!phaseToAdd}
                onClick={handleAddPhase}
              >
                <Plus className="mr-1 h-4 w-4" />
                Add
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent className="overflow-x-auto p-0 sm:p-0">
          {phases.length === 0 ? (
            <p className="px-6 pb-6 text-sm text-muted-foreground">
              No phases on this schedule yet.
              {canEdit && availablePhases.length > 0
                ? " Choose a phase above and click Add."
                : ""}
            </p>
          ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Phase</TableHead>
                <TableHead className="min-w-[11rem]">Start</TableHead>
                <TableHead className="min-w-[11rem]">End</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead className="text-right">Budget hrs</TableHead>
                <TableHead className="text-right">Logged</TableHead>
                <TableHead className="min-w-[120px]">Progress</TableHead>
                <TableHead className="text-right">Contract</TableHead>
                <TableHead className="w-10 text-center">Link</TableHead>
                {canEdit && <TableHead className="w-10" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {phases.map((phase, index) => {
                const logged = phaseHoursByKey.get(phase.phase_key) ?? 0;
                const progress = computePhaseProgress(phase, logged, project);
                return (
                  <TableRow key={phase.id}>
                    <TableCell className="font-medium">{phase.phase_key}</TableCell>
                    <TableCell className="whitespace-nowrap py-2">
                      {canEdit ? (
                        <DateInput
                          value={phase.start_date ?? ""}
                          onChange={(e) =>
                            handleFieldChange(phase.id, "start_date", e.target.value)
                          }
                        />
                      ) : (
                        <span className="text-sm tabular-nums">{formatPhaseDate(phase.start_date)}</span>
                      )}
                    </TableCell>
                    <TableCell className="whitespace-nowrap py-2">
                      {canEdit ? (
                        <DateInput
                          value={phase.end_date ?? ""}
                          onChange={(e) =>
                            handleFieldChange(phase.id, "end_date", e.target.value)
                          }
                        />
                      ) : (
                        <span className="text-sm tabular-nums">{formatPhaseDate(phase.end_date)}</span>
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
                          step={0.25}
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
                        {progress.feePercent != null ? ` · ${progress.feePercent}% contract` : ""}
                      </p>
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {formatProjectAmount(computePhaseFeeBudget(phase, project))}
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
                    {canEdit && (
                      <TableCell>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => handleRemovePhase(phase.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
              <TableRow className="bg-slate-50/80 font-semibold hover:bg-slate-50/80">
                <TableCell>Total</TableCell>
                <TableCell colSpan={3} />
                <TableCell className="text-right">
                  <span className="tabular-nums">{formatProjectHours(totalPhaseBudgetHours)}</span>
                  <span className="font-normal text-muted-foreground">
                    {" "}
                    / {formatProjectHours(projectBudgetedHours)}h project
                  </span>
                  {Math.abs(totalPhaseBudgetHours - projectBudgetedHours) > 0.01 && (
                    <p className="mt-0.5 text-[10px] font-normal text-amber-700">
                      Phase total differs from project budget
                    </p>
                  )}
                </TableCell>
                <TableCell className="text-right font-normal text-muted-foreground">
                  {formatProjectHours(totalLoggedHours)}h
                </TableCell>
                <TableCell>
                  <PhaseProgressBar progress={scheduleTotals.totalProgress} compact />
                  <p className="mt-1 text-[10px] tabular-nums text-muted-foreground">
                    {scheduleTotals.totalProgress.hoursBudget > 0
                      ? `${scheduleTotals.totalProgress.hoursPercent}%`
                      : "—"}
                    {scheduleTotals.totalProgress.feePercent != null
                      ? ` · ${scheduleTotals.totalProgress.feePercent}% contract`
                      : ""}
                  </p>
                </TableCell>
                <TableCell className="text-right">
                  <span className="tabular-nums">
                    {formatProjectAmount(scheduleTotals.totalContract)}
                  </span>
                  {scheduleTotals.projectContractAmount != null &&
                    scheduleTotals.projectContractAmount > 0 && (
                      <span className="font-normal text-muted-foreground">
                        {" "}
                        / {formatProjectAmount(scheduleTotals.projectContractAmount)} project
                      </span>
                    )}
                  {scheduleTotals.projectContractAmount != null &&
                    scheduleTotals.projectContractAmount > 0 &&
                    Math.abs(scheduleTotals.totalContract - scheduleTotals.projectContractAmount) >
                      0.01 && (
                      <p className="mt-0.5 text-[10px] font-normal text-amber-700">
                        Phase total differs from project contract
                      </p>
                    )}
                </TableCell>
                <TableCell colSpan={canEdit ? 2 : 1} />
              </TableRow>
            </TableBody>
          </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
