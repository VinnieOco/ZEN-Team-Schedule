"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Building2, ExternalLink, FolderOpen, Pencil, Plus } from "lucide-react";
import { format, parseISO } from "date-fns";

import { ClientCrmLink } from "@/components/crm/client-crm-link";
import { ProjectFormDialog } from "@/components/projects/project-form-dialog";
import { ProjectsFilters } from "@/components/projects/projects-filters";
import { ProjectsTableSkeleton } from "@/components/projects/projects-table-skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useScheduling } from "@/context/scheduling-context";
import { usePermissions } from "@/hooks/use-permissions";
import {
  buildProjectDepartmentGroups,
  defaultProjectFilters,
  filterProjects,
  type ProjectFilters,
} from "@/lib/filter-projects";
import {
  getChangeOrdersForParent,
  getProjectBudgetRollup,
  getProjectHoursRollup,
  hasChangeOrderRollup,
  hasEstimateRollup,
  isChangeOrder,
  isParentProject,
} from "@/lib/change-orders";
import {
  formatProjectAmount,
  formatProjectHours,
  getProjectDesignAmount,
  getProjectEstimateValue,
} from "@/lib/project-format";
import { getProjectActualHours } from "@/lib/utilization";
import { cn } from "@/lib/utils";
import { getEmployeeFullName } from "@/lib/week";
import type { Employee, Estimate, Project, TimeEntry } from "@/types";

interface ProjectListRow {
  project: Project;
  budgetedHours: number;
  actual: number;
  remaining: number;
  designAmount: number | undefined;
  estimateAmount: number | undefined;
  leadName: string | null;
  leadEstimatorName: string | null;
  changeOrderCount: number | null;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function buildProjectListRow(
  project: Project,
  allProjects: Project[],
  timeEntries: TimeEntry[],
  getEmployeeById: (id: string) => Employee | undefined,
  estimates: Estimate[] = [],
): ProjectListRow {
  const budgetRollup = getProjectBudgetRollup(allProjects, project, estimates);
  const hoursRollup = getProjectHoursRollup(allProjects, project, timeEntries);
  const showHoursRollup = isParentProject(project) && hasChangeOrderRollup(budgetRollup);
  const showEstimateRollup = isParentProject(project) && hasEstimateRollup(budgetRollup);
  const actual = showHoursRollup
    ? hoursRollup.totalActualHours
    : getProjectActualHours(timeEntries, project.id);
  const budgetedHours = showHoursRollup
    ? budgetRollup.totalBudgetHours
    : project.budgeted_design_hours;
  const lead = project.lead_employee_id ? getEmployeeById(project.lead_employee_id) : null;
  const leadEstimator = project.lead_estimator_id
    ? getEmployeeById(project.lead_estimator_id)
    : null;

  return {
    project,
    budgetedHours,
    actual,
    remaining: budgetedHours - actual,
    designAmount: showHoursRollup
      ? budgetRollup.totalDesignAmount
      : getProjectDesignAmount(project),
    estimateAmount: showEstimateRollup
      ? budgetRollup.totalEstimateAmount
      : getProjectEstimateValue(project),
    leadName: lead ? getEmployeeFullName(lead) : null,
    leadEstimatorName: leadEstimator ? getEmployeeFullName(leadEstimator) : null,
    changeOrderCount: isParentProject(project)
      ? getChangeOrdersForParent(allProjects, project.id).length
      : null,
  };
}

function ProjectMobileCard({
  row,
  canEdit,
  onEdit,
}: {
  row: ProjectListRow;
  canEdit: boolean;
  onEdit: () => void;
}) {
  const {
    project,
    budgetedHours,
    actual,
    remaining,
    designAmount,
    estimateAmount,
    leadName,
    changeOrderCount,
  } = row;

  return (
    <li
      className={cn(
        "space-y-2 px-3 py-3",
        !project.active && "bg-slate-50/80 text-muted-foreground",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <Link
            href={`/projects/${project.id}`}
            className={cn(
              "inline-flex max-w-full flex-wrap items-center gap-1.5 font-medium hover:underline",
              project.active
                ? "text-emerald-700 hover:text-emerald-900"
                : "text-slate-600 hover:text-slate-800",
            )}
          >
            <span className="break-words">{project.project_name}</span>
            {isChangeOrder(project) && (
              <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-amber-900">
                CO
              </span>
            )}
            {!project.active && (
              <span className="rounded bg-slate-200 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-600">
                Inactive
              </span>
            )}
            <ExternalLink className="h-3 w-3 shrink-0 opacity-50" />
          </Link>
          <div className="mt-0.5 text-xs text-muted-foreground">
            <ClientCrmLink clientName={project.client_name} />
          </div>
        </div>
        {canEdit && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            aria-label={`Edit ${project.project_name}`}
            onClick={onEdit}
          >
            <Pencil className="h-4 w-4" />
          </Button>
        )}
      </div>

      <div className="flex flex-wrap gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
        <span>{project.phase}</span>
        {leadName ? (
          <>
            <span aria-hidden>·</span>
            <span className="truncate">{leadName}</span>
          </>
        ) : null}
        {changeOrderCount != null && changeOrderCount > 0 ? (
          <>
            <span aria-hidden>·</span>
            <span>
              {changeOrderCount} CO{changeOrderCount === 1 ? "" : "s"}
            </span>
          </>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs tabular-nums">
        <span>Budget {formatProjectHours(budgetedHours)}h</span>
        <span className="text-right">Actual {formatProjectHours(actual)}h</span>
        <span className={cn(remaining < 0 && "font-medium text-red-600")}>
          Left {formatProjectHours(remaining)}h
        </span>
        <span className="text-right">{formatProjectAmount(designAmount)}</span>
        {estimateAmount != null && estimateAmount > 0 ? (
          <span className="col-span-2 text-muted-foreground">
            Est. {formatProjectAmount(estimateAmount)}
          </span>
        ) : null}
      </div>

      {(project.target_completion_date || project.estimating_completion_date) && (
        <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
          {project.target_completion_date ? (
            <span>
              Design {format(parseISO(project.target_completion_date), "MMM d, yyyy")}
            </span>
          ) : null}
          {project.estimating_completion_date ? (
            <span>
              Est. {format(parseISO(project.estimating_completion_date), "MMM d, yyyy")}
            </span>
          ) : null}
        </div>
      )}
    </li>
  );
}

function ProjectDesktopRow({
  row,
  canEdit,
  onEdit,
}: {
  row: ProjectListRow;
  canEdit: boolean;
  onEdit: () => void;
}) {
  const {
    project,
    budgetedHours,
    actual,
    remaining,
    designAmount,
    estimateAmount,
    leadName,
    leadEstimatorName,
    changeOrderCount,
  } = row;

  return (
    <TableRow className={cn(!project.active && "bg-slate-50/80 text-muted-foreground")}>
      <TableCell className="font-medium">
        <Link
          href={`/projects/${project.id}`}
          className={cn(
            "inline-flex items-center gap-1 hover:underline",
            project.active
              ? "text-emerald-700 hover:text-emerald-900"
              : "text-slate-600 hover:text-slate-800",
          )}
        >
          {project.project_name}
          {isChangeOrder(project) && (
            <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-amber-900">
              CO
            </span>
          )}
          {!project.active && (
            <span className="rounded bg-slate-200 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-600">
              Inactive
            </span>
          )}
          <ExternalLink className="h-3 w-3 opacity-50" />
        </Link>
      </TableCell>
      <TableCell>
        <ClientCrmLink clientName={project.client_name} />
      </TableCell>
      <TableCell>{project.phase}</TableCell>
      <TableCell>{leadName ?? "—"}</TableCell>
      <TableCell>{leadEstimatorName ?? "—"}</TableCell>
      <TableCell className="text-right">{formatProjectHours(budgetedHours)}</TableCell>
      <TableCell className="text-right">{formatProjectHours(actual)}</TableCell>
      <TableCell className={cn("text-right", remaining < 0 && "font-medium text-red-600")}>
        {formatProjectHours(remaining)}
      </TableCell>
      <TableCell className="text-right tabular-nums">
        {formatProjectAmount(designAmount)}
      </TableCell>
      <TableCell className="text-right tabular-nums">
        {formatProjectAmount(estimateAmount)}
      </TableCell>
      <TableCell className="text-right tabular-nums text-muted-foreground">
        {changeOrderCount != null && changeOrderCount > 0 ? changeOrderCount : "—"}
      </TableCell>
      <TableCell>
        {project.target_completion_date
          ? format(parseISO(project.target_completion_date), "MMM d, yyyy")
          : "—"}
      </TableCell>
      <TableCell>
        {project.estimating_completion_date
          ? format(parseISO(project.estimating_completion_date), "MMM d, yyyy")
          : "—"}
      </TableCell>
      {canEdit && (
        <TableCell>
          <Button variant="ghost" size="icon" onClick={onEdit}>
            <Pencil className="h-4 w-4" />
          </Button>
        </TableCell>
      )}
    </TableRow>
  );
}

export function ProjectsTable() {
  const { projects, estimates, timeEntries, getEmployeeById, isLoading } = useScheduling();
  const { permissions } = usePermissions();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [filters, setFilters] = useState<ProjectFilters>(defaultProjectFilters);

  const visibleProjects = useMemo(
    () => filterProjects(projects, filters, getEmployeeById),
    [projects, filters, getEmployeeById],
  );

  const departmentGroups = useMemo(
    () => buildProjectDepartmentGroups(visibleProjects),
    [visibleProjects],
  );

  const rowsByProjectId = useMemo(() => {
    const map = new Map<string, ProjectListRow>();
    for (const project of visibleProjects) {
      map.set(
        project.id,
        buildProjectListRow(project, projects, timeEntries, getEmployeeById, estimates),
      );
    }
    return map;
  }, [visibleProjects, projects, timeEntries, getEmployeeById, estimates]);

  const totalCount = useMemo(
    () =>
      projects.filter((p) => {
        if (!filters.showInactive && !p.active) return false;
        if (!filters.showChangeOrders && isChangeOrder(p)) return false;
        return true;
      }).length,
    [projects, filters.showInactive, filters.showChangeOrders],
  );

  const updateFilters = (partial: Partial<ProjectFilters>) => {
    setFilters((prev) => ({ ...prev, ...partial }));
  };

  const openCreate = () => {
    setEditingProject(null);
    setDialogOpen(true);
  };

  const openEdit = (project: Project) => {
    setEditingProject(project);
    setDialogOpen(true);
  };

  if (isLoading) {
    return <ProjectsTableSkeleton />;
  }

  return (
    <div className="space-y-4">
      {permissions.editProjects && (
        <div className="flex justify-stretch sm:justify-end">
          <Button type="button" className="w-full sm:w-auto" onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Add Project
          </Button>
        </div>
      )}

      <ProjectsFilters
        filters={filters}
        onChange={updateFilters}
        onClear={() => setFilters(defaultProjectFilters())}
        resultCount={visibleProjects.length}
        totalCount={totalCount}
      />

      {visibleProjects.length === 0 ? (
        <EmptyState
          icon={FolderOpen}
          title="No projects match your filters"
          description="Try a different search term or clear filters to see more projects."
          actionLabel="Clear filters"
          onAction={() => setFilters(defaultProjectFilters())}
        />
      ) : (
        <div className="space-y-4">
          {departmentGroups.map((group) => (
            <div
              key={group.departmentKey}
              className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm"
            >
              <div className="flex items-center justify-between gap-3 border-b bg-slate-50/80 px-4 py-2.5">
                <div className="flex min-w-0 items-center gap-2.5">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-emerald-50 text-[11px] font-semibold text-emerald-800">
                      {initials(group.departmentLabel)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <h3 className="flex items-center gap-1.5 truncate text-sm font-semibold text-slate-900">
                      <Building2 className="hidden h-3.5 w-3.5 shrink-0 text-muted-foreground sm:inline" />
                      {group.departmentLabel}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {group.projects.length} project
                      {group.projects.length === 1 ? "" : "s"}
                    </p>
                  </div>
                </div>
                <span className="shrink-0 rounded-full bg-slate-200/80 px-2 py-0.5 text-[11px] font-medium tabular-nums text-slate-600">
                  {group.projects.length}
                </span>
              </div>

              <ul className="divide-y divide-slate-100 md:hidden">
                {group.projects.map((project) => {
                  const row = rowsByProjectId.get(project.id);
                  if (!row) return null;
                  return (
                    <ProjectMobileCard
                      key={project.id}
                      row={row}
                      canEdit={permissions.editProjects}
                      onEdit={() => openEdit(project)}
                    />
                  );
                })}
              </ul>

              <div className="scroll-x-contained hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead>Project Name</TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead>Phase</TableHead>
                      <TableHead>Lead Designer</TableHead>
                      <TableHead>Lead Estimator</TableHead>
                      <TableHead className="text-right">Budgeted Hrs</TableHead>
                      <TableHead className="text-right">Actual Hrs</TableHead>
                      <TableHead className="text-right">Remaining Hrs</TableHead>
                      <TableHead className="text-right">Design Amount</TableHead>
                      <TableHead className="text-right">Estimate Amount</TableHead>
                      <TableHead className="text-right">COs</TableHead>
                      <TableHead>Design Completion</TableHead>
                      <TableHead>Est. Completion</TableHead>
                      {permissions.editProjects && <TableHead />}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {group.projects.map((project) => {
                      const row = rowsByProjectId.get(project.id);
                      if (!row) return null;
                      return (
                        <ProjectDesktopRow
                          key={project.id}
                          row={row}
                          canEdit={permissions.editProjects}
                          onEdit={() => openEdit(project)}
                        />
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Actual hours reflect all time logged on this project. Remaining is budgeted minus actual.
        Parent project rows include change order totals when COs exist.
      </p>
      {permissions.editProjects && (
        <ProjectFormDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          project={editingProject}
        />
      )}
    </div>
  );
}
