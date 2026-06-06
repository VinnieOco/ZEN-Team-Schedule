"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ExternalLink, FolderOpen, Pencil, Plus } from "lucide-react";
import { format, parseISO } from "date-fns";

import { ProjectFormDialog } from "@/components/projects/project-form-dialog";
import { ProjectsFilters } from "@/components/projects/projects-filters";
import { ProjectsTableSkeleton } from "@/components/projects/projects-table-skeleton";
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
  defaultProjectFilters,
  filterProjects,
  type ProjectFilters,
} from "@/lib/filter-projects";
import { getChangeOrdersForParent, getProjectBudgetRollup, getProjectHoursRollup, hasChangeOrderRollup, isChangeOrder, isParentProject } from "@/lib/change-orders";
import { formatProjectAmount, formatProjectDepartment, formatProjectHours, getProjectDesignAmount, getProjectEstimateValue } from "@/lib/project-format";
import { getProjectActualHours } from "@/lib/utilization";
import { cn } from "@/lib/utils";
import { getEmployeeFullName } from "@/lib/week";
import type { Project } from "@/types";

export function ProjectsTable() {
  const { projects, timeEntries, getEmployeeById, isLoading } = useScheduling();
  const { permissions } = usePermissions();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [filters, setFilters] = useState<ProjectFilters>(defaultProjectFilters);

  const visibleProjects = useMemo(
    () => filterProjects(projects, filters, getEmployeeById),
    [projects, filters, getEmployeeById],
  );

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

  if (isLoading) {
    return <ProjectsTableSkeleton />;
  }

  return (
    <div className="space-y-4">
      <ProjectsFilters
        filters={filters}
        onChange={updateFilters}
        onClear={() => setFilters(defaultProjectFilters())}
        resultCount={visibleProjects.length}
        totalCount={totalCount}
      />

      {permissions.editProjects && (
        <div className="flex justify-end">
          <Button
            onClick={() => {
              setEditingProject(null);
              setDialogOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Project
          </Button>
        </div>
      )}

      {visibleProjects.length === 0 ? (
        <EmptyState
          icon={FolderOpen}
          title="No projects match your filters"
          description="Try a different search term or clear filters to see more projects."
          actionLabel="Clear filters"
          onAction={() => setFilters(defaultProjectFilters())}
        />
      ) : (
        <div className="scroll-x-contained rounded-lg border bg-white shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Project Name</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Phase</TableHead>
                <TableHead>Lead Designer</TableHead>
                <TableHead className="text-right">Budgeted Hrs</TableHead>
                <TableHead className="text-right">Actual Hrs</TableHead>
                <TableHead className="text-right">Remaining Hrs</TableHead>
                <TableHead className="text-right">Design Amount</TableHead>
                <TableHead className="text-right">Estimate Amount</TableHead>
                <TableHead className="text-right">COs</TableHead>
                <TableHead>Target Date</TableHead>
                {permissions.editProjects && <TableHead />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleProjects.map((project) => {
                const budgetRollup = getProjectBudgetRollup(projects, project);
                const hoursRollup = getProjectHoursRollup(projects, project, timeEntries);
                const showRollup = isParentProject(project) && hasChangeOrderRollup(budgetRollup);
                const actual = showRollup
                  ? hoursRollup.totalActualHours
                  : getProjectActualHours(timeEntries, project.id);
                const budgetedHours = showRollup
                  ? budgetRollup.totalBudgetHours
                  : project.budgeted_design_hours;
                const remaining = budgetedHours - actual;
                const designAmount = showRollup
                  ? budgetRollup.totalDesignAmount
                  : getProjectDesignAmount(project);
                const estimateAmount = showRollup
                  ? budgetRollup.totalEstimateAmount
                  : getProjectEstimateValue(project);
                const lead = project.lead_employee_id
                  ? getEmployeeById(project.lead_employee_id)
                  : null;
                const changeOrderCount = isParentProject(project)
                  ? getChangeOrdersForParent(projects, project.id).length
                  : null;

                return (
                  <TableRow
                    key={project.id}
                    className={cn(!project.active && "bg-slate-50/80 text-muted-foreground")}
                  >
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
                    <TableCell>{project.client_name}</TableCell>
                    <TableCell>{formatProjectDepartment(project.department)}</TableCell>
                    <TableCell>{project.phase}</TableCell>
                    <TableCell>{lead ? getEmployeeFullName(lead) : "—"}</TableCell>
                    <TableCell className="text-right">
                      {formatProjectHours(budgetedHours)}
                    </TableCell>
                    <TableCell className="text-right">{formatProjectHours(actual)}</TableCell>
                    <TableCell
                      className={cn(
                        "text-right",
                        remaining < 0 && "font-medium text-red-600",
                      )}
                    >
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
                    {permissions.editProjects && (
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setEditingProject(project);
                            setDialogOpen(true);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
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
