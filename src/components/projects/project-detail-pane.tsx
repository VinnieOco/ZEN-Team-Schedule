"use client";

import Link from "next/link";
import { ArrowLeft, ExternalLink, FolderOpen, Pencil } from "lucide-react";

import { ClientCrmLink } from "@/components/crm/client-crm-link";
import { ChangeOrdersSection } from "@/components/projects/change-orders-section";
import { ContractsSection } from "@/components/projects/contracts-section";
import { ProjectActualWorkSection } from "@/components/projects/project-actual-work-section";
import { ProjectDetailsCard } from "@/components/projects/project-details-card";
import { ProjectNotesSection } from "@/components/projects/project-notes-section";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import {
  getParentProject,
  getProjectBudgetRollup,
  getProjectHoursRollup,
  hasChangeOrderRollup,
  hasEstimateRollup,
  isChangeOrder,
  isParentProject,
} from "@/lib/change-orders";
import { formatProjectDepartment, formatProjectHours } from "@/lib/project-format";
import { getProjectActualHours } from "@/lib/utilization";
import type { Employee, Estimate, Project, TimeEntry } from "@/types";

interface ProjectDetailPaneProps {
  project: Project | null;
  projects: Project[];
  estimates: Estimate[];
  timeEntries: TimeEntry[];
  employees: Employee[];
  getEmployeeById: (id: string) => Employee | undefined;
  canEdit: boolean;
  onEdit: () => void;
  onDeleteChangeOrder?: () => void;
  onMerge?: () => void;
  onSelectProject?: (projectId: string) => void;
  /** Mobile back-to-list control. */
  onBack?: () => void;
  showBack?: boolean;
}

export function ProjectDetailPane({
  project,
  projects,
  estimates,
  timeEntries,
  employees,
  getEmployeeById,
  canEdit,
  onEdit,
  onDeleteChangeOrder,
  onMerge,
  onSelectProject,
  onBack,
  showBack = false,
}: ProjectDetailPaneProps) {
  if (!project) {
    return (
      <div className="flex h-full min-h-[280px] items-center justify-center rounded-xl border border-slate-200/80 bg-white px-4 shadow-sm">
        <EmptyState
          icon={FolderOpen}
          title="Select a project"
          description="Choose a job from the list to see overview details here."
          className="w-full border-0 bg-transparent py-10"
        />
      </div>
    );
  }

  const actual = getProjectActualHours(timeEntries, project.id);
  const budgetRollup = getProjectBudgetRollup(projects, project, estimates);
  const hoursRollup = getProjectHoursRollup(projects, project, timeEntries);
  const showHoursRollup = isParentProject(project) && hasChangeOrderRollup(budgetRollup);
  const showEstimateRollup = isParentProject(project) && hasEstimateRollup(budgetRollup);
  const budgetedHours = showHoursRollup
    ? budgetRollup.totalBudgetHours
    : project.budgeted_design_hours;
  const actualHours = showHoursRollup ? hoursRollup.totalActualHours : actual;
  const remaining = budgetedHours - actualHours;
  const percentUsed =
    budgetedHours > 0 ? Math.round((actualHours / budgetedHours) * 100) : 0;
  const lead = project.lead_employee_id ? getEmployeeById(project.lead_employee_id) : null;
  const leadEstimator = project.lead_estimator_id
    ? getEmployeeById(project.lead_estimator_id)
    : null;
  const parentProject = isChangeOrder(project) ? getParentProject(projects, project) : undefined;

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm">
      <div className="shrink-0 space-y-3 border-b border-slate-100 px-4 py-3 sm:px-5 sm:py-4">
        {showBack && onBack && (
          <Button type="button" variant="ghost" size="sm" className="-ml-2 h-8 px-2" onClick={onBack}>
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            Back to list
          </Button>
        )}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-bold break-words text-slate-900 sm:text-xl">
              {project.project_name}
            </h2>
            <ClientCrmLink
              clientName={project.client_name}
              className="mt-0.5 text-sm text-muted-foreground hover:text-emerald-900"
            />
            {parentProject && (
              <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                <span className="rounded-md bg-amber-100 px-2 py-0.5 font-medium text-amber-900">
                  Change order
                </span>
                <span className="text-muted-foreground">
                  for{" "}
                  {onSelectProject ? (
                    <button
                      type="button"
                      className="font-medium text-emerald-700 hover:underline"
                      onClick={() => onSelectProject(parentProject.id)}
                    >
                      {parentProject.project_name}
                    </button>
                  ) : (
                    <Link
                      href={`/projects/${parentProject.id}`}
                      className="font-medium text-emerald-700 hover:underline"
                    >
                      {parentProject.project_name}
                    </Link>
                  )}
                </span>
              </p>
            )}
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {canEdit && (
              <Button type="button" variant="outline" size="sm" onClick={onEdit}>
                <Pencil className="mr-1.5 h-3.5 w-3.5" />
                Edit
              </Button>
            )}
            <Button type="button" variant="outline" size="sm" asChild>
              <Link href={`/projects/${project.id}`}>
                <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                Open full page
              </Link>
            </Button>
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4 sm:space-y-5 sm:p-5">
        <div className="grid min-w-0 grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
          <Card>
            <CardHeader className="p-3 pb-1.5">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                Department
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0">
              <p className="text-sm font-semibold">
                {formatProjectDepartment(project.department)}
              </p>
              <p className="text-xs text-muted-foreground">{project.phase}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="p-3 pb-1.5">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                Budgeted hours
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0">
              <p className="text-xl font-bold">{formatProjectHours(budgetedHours)}h</p>
              {showHoursRollup && (
                <p className="text-[11px] text-muted-foreground">
                  {formatProjectHours(budgetRollup.baseBudgetHours)}h base +{" "}
                  {formatProjectHours(budgetRollup.changeOrderBudgetHours)}h COs
                </p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="p-3 pb-1.5">
              <CardTitle className="text-xs font-medium text-muted-foreground">Actual</CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0">
              <p className="text-xl font-bold">{formatProjectHours(actualHours)}h</p>
              <p className="text-[11px] text-muted-foreground">{percentUsed}% of budget</p>
              {showHoursRollup && hoursRollup.changeOrderActualHours > 0 && (
                <p className="text-[11px] text-muted-foreground">
                  {formatProjectHours(hoursRollup.baseActualHours)}h base +{" "}
                  {formatProjectHours(hoursRollup.changeOrderActualHours)}h COs
                </p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="p-3 pb-1.5">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                Remaining
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0">
              <p className={`text-xl font-bold ${remaining < 0 ? "text-red-600" : ""}`}>
                {formatProjectHours(remaining)}h
              </p>
            </CardContent>
          </Card>
        </div>

        <ProjectDetailsCard
          project={project}
          lead={lead}
          leadEstimator={leadEstimator}
          budgetRollup={showEstimateRollup || showHoursRollup ? budgetRollup : undefined}
          canEdit={canEdit}
          onEdit={onEdit}
          onMerge={onMerge}
          onDelete={canEdit && isChangeOrder(project) ? onDeleteChangeOrder : undefined}
        />

        {isParentProject(project) && (
          <>
            <ContractsSection project={project} canEdit={canEdit} />
            <ChangeOrdersSection project={project} canEdit={canEdit} />
          </>
        )}

        <ProjectNotesSection project={project} />

        <ProjectActualWorkSection
          projectId={project.id}
          timeEntries={timeEntries}
          employees={employees}
        />
      </div>
    </div>
  );
}
