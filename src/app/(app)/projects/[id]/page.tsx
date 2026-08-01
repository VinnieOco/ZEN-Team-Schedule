"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { format, parseISO } from "date-fns";
import { ArrowLeft } from "lucide-react";

import { ClientCrmLink } from "@/components/crm/client-crm-link";
import { ChangeOrdersSection } from "@/components/projects/change-orders-section";
import { ProjectScheduleSection } from "@/components/projects/project-schedule-section";
import { AppPage } from "@/components/layout/app-page";
import { ScrollableTabsList } from "@/components/layout/scrollable-tabs-list";
import { ProjectDetailsCard } from "@/components/projects/project-details-card";
import { ProjectFormDialog } from "@/components/projects/project-form-dialog";
import { ProjectMergeDialog } from "@/components/projects/project-merge-dialog";
import { ProjectNotesSection } from "@/components/projects/project-notes-section";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsTrigger } from "@/components/ui/tabs";
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
  getParentProject,
  getProjectBudgetRollup,
  getProjectHoursRollup,
  hasChangeOrderRollup,
  isChangeOrder,
  isParentProject,
} from "@/lib/change-orders";
import { formatProjectDepartment, formatProjectHours } from "@/lib/project-format";
import { getProjectActualHours } from "@/lib/utilization";
import { getEmployeeFullName } from "@/lib/week";

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectId = params.id as string;
  const initialTab = searchParams.get("tab") === "schedule" ? "schedule" : "overview";
  const {
    projects,
    allocations,
    timeEntries,
    employees,
    getEmployeeById,
    getCategoryById,
    deleteChangeOrder,
  } = useScheduling();
  const { permissions } = usePermissions();
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [mergeDialogOpen, setMergeDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(initialTab);

  const project = projects.find((p) => p.id === projectId);

  if (!project) {
    return (
      <AppPage>
        <p className="text-muted-foreground">Project not found.</p>
        <Button variant="ghost" asChild className="mt-2 px-0">
          <Link href="/projects">Back to projects</Link>
        </Button>
    </AppPage>
    );
  }

  const actual = getProjectActualHours(timeEntries, project.id);
  const budgetRollup = getProjectBudgetRollup(projects, project);
  const hoursRollup = getProjectHoursRollup(projects, project, timeEntries);
  const showRollup = isParentProject(project) && hasChangeOrderRollup(budgetRollup);
  const budgetedHours = showRollup ? budgetRollup.totalBudgetHours : project.budgeted_design_hours;
  const actualHours = showRollup ? hoursRollup.totalActualHours : actual;
  const remaining = budgetedHours - actualHours;
  const percentUsed =
    budgetedHours > 0 ? Math.round((actualHours / budgetedHours) * 100) : 0;
  const lead = project.lead_employee_id ? getEmployeeById(project.lead_employee_id) : null;
  const leadEstimator = project.lead_estimator_id
    ? getEmployeeById(project.lead_estimator_id)
    : null;
  const parentProject = isChangeOrder(project) ? getParentProject(projects, project) : undefined;

  const projectAllocations = allocations
    .filter((a) => a.project_id === project.id)
    .sort((a, b) => b.allocation_date.localeCompare(a.allocation_date));

  const handleDeleteChangeOrder = () => {
    if (
      !window.confirm(
        `Delete change order “${project.project_name}”? This cannot be undone.`,
      )
    ) {
      return;
    }
    const result = deleteChangeOrder(project.id);
    if (!result.ok) {
      window.alert(result.message);
      return;
    }
    router.push(parentProject ? `/projects/${parentProject.id}` : "/projects");
  };

  return (
    <AppPage className="space-y-4 md:space-y-6">
      <div className="flex flex-wrap items-center gap-3 print:hidden">
        <Button variant="outline" size="sm" asChild>
          <Link href="/projects">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Projects
          </Link>
        </Button>
      </div>

      <div className="min-w-0 print:hidden">
        <h1 className="text-xl font-bold break-words text-slate-900 sm:text-2xl">
          {project.project_name}
        </h1>
        <ClientCrmLink
          clientName={project.client_name}
          className="mt-1 text-sm text-muted-foreground hover:text-emerald-900 sm:text-base"
        />
        {parentProject && (
          <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
            <span className="rounded-md bg-amber-100 px-2 py-0.5 font-medium text-amber-900">
              Change order
            </span>
            <span className="text-muted-foreground">
              for{" "}
              <Link
                href={`/projects/${parentProject.id}`}
                className="font-medium text-emerald-700 hover:underline"
              >
                {parentProject.project_name}
              </Link>
            </span>
          </p>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="min-w-0">
        <ScrollableTabsList className="print:hidden">
          <TabsTrigger value="overview" className="shrink-0 px-3">
            Overview
          </TabsTrigger>
          <TabsTrigger value="schedule" className="shrink-0 px-3">
            Schedule
          </TabsTrigger>
        </ScrollableTabsList>

        <TabsContent value="overview" className="mt-4 space-y-4 sm:mt-6 sm:space-y-6 print:hidden">
      <div className="grid min-w-0 grid-cols-2 gap-2 sm:gap-4 lg:grid-cols-4">
        <Card>
          <CardHeader className="p-3 pb-1.5 sm:p-6 sm:pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground sm:text-sm">
              Department
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
            <p className="text-sm font-semibold sm:text-base">
              {formatProjectDepartment(project.department)}
            </p>
            <p className="text-xs text-muted-foreground sm:text-sm">{project.phase}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="p-3 pb-1.5 sm:p-6 sm:pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground sm:text-sm">
              Budgeted hours
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
            <p className="text-xl font-bold sm:text-2xl">
              {formatProjectHours(budgetedHours)}h
            </p>
            {showRollup && (
              <p className="text-[11px] text-muted-foreground sm:text-sm">
                {formatProjectHours(budgetRollup.baseBudgetHours)}h base +{" "}
                {formatProjectHours(budgetRollup.changeOrderBudgetHours)}h COs
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="p-3 pb-1.5 sm:p-6 sm:pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground sm:text-sm">
              Actual
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
            <p className="text-xl font-bold sm:text-2xl">
              {formatProjectHours(actualHours)}h
            </p>
            <p className="text-[11px] text-muted-foreground sm:text-sm">
              {percentUsed}% of budget
            </p>
            {showRollup && hoursRollup.changeOrderActualHours > 0 && (
              <p className="text-[11px] text-muted-foreground sm:text-sm">
                {formatProjectHours(hoursRollup.baseActualHours)}h base +{" "}
                {formatProjectHours(hoursRollup.changeOrderActualHours)}h COs
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="p-3 pb-1.5 sm:p-6 sm:pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground sm:text-sm">
              Remaining
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
            <p
              className={`text-xl font-bold sm:text-2xl ${remaining < 0 ? "text-red-600" : ""}`}
            >
              {formatProjectHours(remaining)}h
            </p>
          </CardContent>
        </Card>
      </div>

      <ProjectDetailsCard
        project={project}
        lead={lead}
        leadEstimator={leadEstimator}
        budgetRollup={showRollup ? budgetRollup : undefined}
        canEdit={permissions.editProjects}
        onEdit={() => setEditDialogOpen(true)}
        onMerge={
          permissions.editProjects ? () => setMergeDialogOpen(true) : undefined
        }
        onDelete={
          permissions.editProjects && isChangeOrder(project)
            ? handleDeleteChangeOrder
            : undefined
        }
      />

      {isParentProject(project) && (
        <ChangeOrdersSection project={project} canEdit={permissions.editProjects} />
      )}

      <ProjectNotesSection project={project} />

      <Card>
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-base">
            Scheduled work ({projectAllocations.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 sm:p-6 sm:pt-0">
          {projectAllocations.length === 0 ? (
            <p className="px-4 pb-4 text-sm text-muted-foreground sm:px-0 sm:pb-0">
              No hours scheduled for this project yet.
            </p>
          ) : (
            <>
              <ul className="divide-y divide-slate-100 md:hidden">
                {projectAllocations.map((alloc) => {
                  const emp = employees.find((e) => e.id === alloc.employee_id);
                  const cat = getCategoryById(alloc.allocation_category_id);
                  return (
                    <li key={alloc.id} className="flex items-start justify-between gap-3 px-4 py-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-900">
                          {emp ? getEmployeeFullName(emp) : "—"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(parseISO(alloc.allocation_date), "EEE, MMM d")}
                          {cat?.name ? ` · ${cat.name}` : ""}
                        </p>
                      </div>
                      <span className="shrink-0 text-sm font-semibold tabular-nums">
                        {alloc.hours}h
                      </span>
                    </li>
                  );
                })}
              </ul>
              <div className="hidden overflow-x-auto md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Team member</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead className="text-right">Hours</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {projectAllocations.map((alloc) => {
                      const emp = employees.find((e) => e.id === alloc.employee_id);
                      const cat = getCategoryById(alloc.allocation_category_id);
                      return (
                        <TableRow key={alloc.id}>
                          <TableCell>
                            {format(parseISO(alloc.allocation_date), "EEE, MMM d, yyyy")}
                          </TableCell>
                          <TableCell>{emp ? getEmployeeFullName(emp) : "—"}</TableCell>
                          <TableCell>{cat?.name ?? "—"}</TableCell>
                          <TableCell className="text-right font-medium">{alloc.hours}h</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>
        </TabsContent>

        <TabsContent value="schedule" className="mt-4 sm:mt-6">
          <ProjectScheduleSection
            project={project}
            timeEntries={timeEntries}
            canEdit={permissions.editProjects}
          />
        </TabsContent>
      </Tabs>

      {permissions.editProjects && (
        <ProjectFormDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          project={project}
        />
      )}

      {permissions.editProjects && (
        <ProjectMergeDialog
          open={mergeDialogOpen}
          onOpenChange={setMergeDialogOpen}
          source={project}
          onMerged={(targetId) => router.replace(`/projects/${targetId}`)}
        />
      )}
    </AppPage>
  );
}
