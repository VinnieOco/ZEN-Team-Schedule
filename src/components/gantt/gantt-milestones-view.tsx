"use client";

import Link from "next/link";
import { useMemo } from "react";
import { format, parseISO } from "date-fns";
import { Check } from "lucide-react";

import { EmptyState } from "@/components/ui/empty-state";
import { SearchableSelect } from "@/components/ui/searchable-select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  FIRM_MILESTONE_COMPLETED_VISIBLE,
  filterFirmMilestones,
  milestoneKindLabel,
  partitionFirmMilestones,
} from "@/lib/gantt/milestones";
import type { ProjectFilters } from "@/lib/filter-projects";
import type { Employee, Project, ProjectMilestone } from "@/types";
import { getEmployeeFullName } from "@/lib/week";
import { cn } from "@/lib/utils";
import type { SearchableSelectOption } from "@/components/ui/searchable-select";

interface GanttMilestonesViewProps {
  milestones: ProjectMilestone[];
  projects: Project[];
  employees: Employee[];
  filters: ProjectFilters;
  getEmployeeById: (id: string) => Employee | undefined;
  canEdit: boolean;
  hasActiveFilters: boolean;
  onClearFilters: () => void;
  onToggleCompleted: (milestoneId: string, completed: boolean) => void;
  onAssignedChange: (milestoneId: string, assignedEmployeeId: string | undefined) => void;
}

function formatMilestoneDate(value: string): string {
  try {
    return format(parseISO(value), "MMM d, yyyy");
  } catch {
    return value;
  }
}

function projectLabel(project: Project): string {
  return project.project_number
    ? `${project.project_number} ${project.project_name}`
    : project.project_name;
}

interface MilestoneRowProps {
  milestone: ProjectMilestone;
  project: Project | undefined;
  assignee: Employee | undefined;
  assigneeOptions: SearchableSelectOption[];
  canEdit: boolean;
  completed?: boolean;
  onToggleCompleted: (milestoneId: string, completed: boolean) => void;
  onAssignedChange: (milestoneId: string, assignedEmployeeId: string | undefined) => void;
}

function MilestoneRow({
  milestone,
  project,
  assignee,
  assigneeOptions,
  canEdit,
  completed = false,
  onToggleCompleted,
  onAssignedChange,
}: MilestoneRowProps) {
  return (
    <TableRow
      className={cn(
        completed && "bg-slate-50/80 text-muted-foreground",
      )}
    >
      <TableCell className="w-12 py-2">
        {canEdit ? (
          <button
            type="button"
            role="checkbox"
            aria-checked={completed}
            aria-label={completed ? "Mark milestone incomplete" : "Mark milestone complete"}
            className={cn(
              "flex h-5 w-5 items-center justify-center rounded border transition-colors",
              completed
                ? "border-slate-300 bg-slate-200 text-slate-500"
                : "border-slate-300 bg-white hover:border-emerald-500 hover:bg-emerald-50",
            )}
            onClick={() => onToggleCompleted(milestone.id, !completed)}
          >
            {completed && <Check className="h-3.5 w-3.5" />}
          </button>
        ) : (
          <span
            className={cn(
              "inline-flex h-5 w-5 items-center justify-center rounded border",
              completed ? "border-slate-300 bg-slate-200 text-slate-500" : "border-slate-200",
            )}
            aria-hidden
          >
            {completed && <Check className="h-3.5 w-3.5" />}
          </span>
        )}
      </TableCell>
      <TableCell className="whitespace-nowrap py-2 tabular-nums">
        {formatMilestoneDate(milestone.milestone_date)}
      </TableCell>
      <TableCell className={cn("py-2 font-medium", completed && "line-through")}>
        {milestone.title}
      </TableCell>
      <TableCell className="py-2">{milestoneKindLabel(milestone.kind)}</TableCell>
      <TableCell className="w-[8.5rem] max-w-[8.5rem] py-2 pr-2">
        {canEdit ? (
          <SearchableSelect
            size="sm"
            options={assigneeOptions}
            value={milestone.assigned_employee_id ?? ""}
            onValueChange={(value) =>
              onAssignedChange(milestone.id, value.trim() ? value : undefined)
            }
            placeholder="Unassigned"
            searchPlaceholder="Search team…"
            triggerClassName={cn("h-8 w-full max-w-[8.5rem]", completed && "opacity-70")}
          />
        ) : (
          <span className={cn("block truncate text-sm", completed && "text-muted-foreground")}>
            {assignee ? getEmployeeFullName(assignee) : "—"}
          </span>
        )}
      </TableCell>
      <TableCell className="max-w-[12rem] py-2">
        {project ? (
          <Link
            href={`/projects/${project.id}?tab=schedule`}
            className={cn(
              "block truncate hover:text-emerald-700 hover:underline",
              completed ? "text-slate-600" : "text-slate-900",
            )}
          >
            {projectLabel(project)}
          </Link>
        ) : (
          "—"
        )}
      </TableCell>
      <TableCell className="min-w-[12rem] py-2 text-muted-foreground">
        <span className="line-clamp-2 whitespace-normal break-words">
          {milestone.notes?.trim() || "—"}
        </span>
      </TableCell>
    </TableRow>
  );
}

function MilestonesTable({
  milestones,
  projectById,
  getEmployeeById,
  assigneeOptions,
  canEdit,
  completed,
  onToggleCompleted,
  onAssignedChange,
  emptyMessage,
}: {
  milestones: ProjectMilestone[];
  projectById: Map<string, Project>;
  getEmployeeById: (id: string) => Employee | undefined;
  assigneeOptions: SearchableSelectOption[];
  canEdit: boolean;
  completed?: boolean;
  onToggleCompleted: (milestoneId: string, completed: boolean) => void;
  onAssignedChange: (milestoneId: string, assignedEmployeeId: string | undefined) => void;
  emptyMessage: string;
}) {
  if (milestones.length === 0) {
    return <p className="px-1 py-4 text-sm text-muted-foreground">{emptyMessage}</p>;
  }

  return (
    <Table className="table-fixed">
      <TableHeader>
        <TableRow>
          <TableHead className="w-12" />
          <TableHead className="w-[6.5rem]">Date</TableHead>
          <TableHead className="w-[10rem]">Milestone</TableHead>
          <TableHead className="w-[7rem]">Type</TableHead>
          <TableHead className="w-[8.5rem]">Assigned</TableHead>
          <TableHead className="w-[12rem]">Project</TableHead>
          <TableHead>Notes</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {milestones.map((milestone) => {
          const project = projectById.get(milestone.project_id);
          const assignee = milestone.assigned_employee_id
            ? getEmployeeById(milestone.assigned_employee_id)
            : undefined;

          return (
            <MilestoneRow
              key={milestone.id}
              milestone={milestone}
              project={project}
              assignee={assignee}
              assigneeOptions={assigneeOptions}
              canEdit={canEdit}
              completed={completed}
              onToggleCompleted={onToggleCompleted}
              onAssignedChange={onAssignedChange}
            />
          );
        })}
      </TableBody>
    </Table>
  );
}

export function GanttMilestonesView({
  milestones,
  projects,
  employees,
  filters,
  getEmployeeById,
  canEdit,
  hasActiveFilters,
  onClearFilters,
  onToggleCompleted,
  onAssignedChange,
}: GanttMilestonesViewProps) {
  const projectById = useMemo(
    () => new Map(projects.map((project) => [project.id, project])),
    [projects],
  );

  const assigneeOptions = useMemo<SearchableSelectOption[]>(
    () => [
      { value: "", label: "Unassigned" },
      ...employees
        .filter((employee) => employee.active)
        .sort((a, b) => getEmployeeFullName(a).localeCompare(getEmployeeFullName(b)))
        .map((employee) => ({
          value: employee.id,
          label: getEmployeeFullName(employee),
          keywords: [employee.email, employee.department].filter(Boolean).join(" "),
        })),
    ],
    [employees],
  );

  const filtered = useMemo(
    () => filterFirmMilestones(milestones, projects, filters, getEmployeeById),
    [milestones, projects, filters, getEmployeeById],
  );

  const { open, completedRecent, completedHiddenCount } = useMemo(
    () => partitionFirmMilestones(filtered),
    [filtered],
  );

  if (filtered.length === 0) {
    return (
      <EmptyState
        title={hasActiveFilters ? "No milestones match your filters" : "No milestones yet"}
        description={
          hasActiveFilters
            ? "Try a different search term, department, lead, or clear filters to see more milestones."
            : "Add milestones on a project Schedule tab or right-click a timeline on the Gantt view."
        }
        actionLabel={hasActiveFilters ? "Clear filters" : undefined}
        onAction={hasActiveFilters ? onClearFilters : undefined}
      />
    );
  }

  return (
    <div className="space-y-8">
      <section className="overflow-x-auto rounded-lg border bg-white shadow-sm">
        <div className="border-b border-slate-200 px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-900">Upcoming</h2>
          <p className="text-xs text-muted-foreground">
            {open.length} open milestone{open.length === 1 ? "" : "s"}, oldest first.
          </p>
        </div>
        <div className="px-2 pb-2">
          <MilestonesTable
            milestones={open}
            projectById={projectById}
            getEmployeeById={getEmployeeById}
            assigneeOptions={assigneeOptions}
            canEdit={canEdit}
            onToggleCompleted={onToggleCompleted}
            onAssignedChange={onAssignedChange}
            emptyMessage="No open milestones. Completed items appear below."
          />
        </div>
      </section>

      {completedRecent.length > 0 && (
        <section className="overflow-x-auto rounded-lg border bg-white shadow-sm">
          <div className="border-b border-slate-200 px-4 py-3">
            <h2 className="text-sm font-semibold text-slate-900">Recently completed</h2>
            <p className="text-xs text-muted-foreground">
              Showing the {FIRM_MILESTONE_COMPLETED_VISIBLE} most recent completions.
              {completedHiddenCount > 0 &&
                ` ${completedHiddenCount} older completed milestone${
                  completedHiddenCount === 1 ? "" : "s"
                } hidden.`}
            </p>
          </div>
          <div className="px-2 pb-2">
            <MilestonesTable
              milestones={completedRecent}
              projectById={projectById}
              getEmployeeById={getEmployeeById}
              assigneeOptions={assigneeOptions}
              canEdit={canEdit}
              completed
              onToggleCompleted={onToggleCompleted}
              onAssignedChange={onAssignedChange}
              emptyMessage=""
            />
          </div>
        </section>
      )}
    </div>
  );
}
