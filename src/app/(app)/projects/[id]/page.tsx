"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { format, parseISO } from "date-fns";
import { ArrowLeft } from "lucide-react";

import { AppPage } from "@/components/layout/app-page";
import { ProjectDetailsCard } from "@/components/projects/project-details-card";
import { ProjectFormDialog } from "@/components/projects/project-form-dialog";
import { ProjectNotesSection } from "@/components/projects/project-notes-section";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { formatProjectDepartment, formatProjectHours } from "@/lib/project-format";
import { getProjectActualHours } from "@/lib/utilization";
import { getEmployeeFullName } from "@/lib/week";

export default function ProjectDetailPage() {
  const params = useParams();
  const projectId = params.id as string;
  const { projects, allocations, timeEntries, employees, getEmployeeById, getCategoryById } =
    useScheduling();
  const { permissions } = usePermissions();
  const [editDialogOpen, setEditDialogOpen] = useState(false);

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
  const remaining = project.budgeted_design_hours - actual;
  const percentUsed =
    project.budgeted_design_hours > 0
      ? Math.round((actual / project.budgeted_design_hours) * 100)
      : 0;
  const lead = project.lead_employee_id ? getEmployeeById(project.lead_employee_id) : null;

  const projectAllocations = allocations
    .filter((a) => a.project_id === project.id)
    .sort((a, b) => b.allocation_date.localeCompare(a.allocation_date));

  return (
    <AppPage className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="outline" size="sm" asChild>
          <Link href="/projects">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Projects
          </Link>
        </Button>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-slate-900">{project.project_name}</h1>
        <p className="mt-1 text-muted-foreground">{project.client_name}</p>
      </div>

      <div className="grid min-w-0 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Department</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-semibold">{formatProjectDepartment(project.department)}</p>
            <p className="text-sm text-muted-foreground">{project.phase}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Budgeted hours</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatProjectHours(project.budgeted_design_hours)}h</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Actual</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatProjectHours(actual)}h</p>
            <p className="text-sm text-muted-foreground">{percentUsed}% of budget</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Remaining</CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${remaining < 0 ? "text-red-600" : ""}`}>
              {formatProjectHours(remaining)}h
            </p>
          </CardContent>
        </Card>
      </div>

      <ProjectDetailsCard
        project={project}
        lead={lead}
        canEdit={permissions.editProjects}
        onEdit={() => setEditDialogOpen(true)}
      />

      <ProjectNotesSection project={project} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Scheduled work ({projectAllocations.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {projectAllocations.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hours scheduled for this project yet.</p>
          ) : (
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
          )}
        </CardContent>
      </Card>

      {permissions.editProjects && (
        <ProjectFormDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          project={project}
        />
      )}
    </AppPage>
  );
}
