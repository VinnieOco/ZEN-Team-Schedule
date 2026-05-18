"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { format, parseISO } from "date-fns";
import { ArrowLeft, Calendar, Mail, MapPin, Pencil, Phone } from "lucide-react";

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
import { getProjectScheduledHours } from "@/lib/utilization";
import { getEmployeeFullName } from "@/lib/week";

export default function ProjectDetailPage() {
  const params = useParams();
  const projectId = params.id as string;
  const { projects, allocations, employees, getEmployeeById, getCategoryById } = useScheduling();
  const { permissions } = usePermissions();
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  const project = projects.find((p) => p.id === projectId);

  if (!project) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Project not found.</p>
        <Button variant="ghost" asChild className="mt-2 px-0">
          <Link href="/projects">Back to projects</Link>
        </Button>
      </div>
    );
  }

  const scheduled = getProjectScheduledHours(allocations, project.id);
  const remaining = project.budgeted_design_hours - scheduled;
  const percentUsed =
    project.budgeted_design_hours > 0
      ? Math.round((scheduled / project.budgeted_design_hours) * 100)
      : 0;
  const lead = project.lead_employee_id ? getEmployeeById(project.lead_employee_id) : null;

  const projectAllocations = allocations
    .filter((a) => a.project_id === project.id)
    .sort((a, b) => b.allocation_date.localeCompare(a.allocation_date));

  return (
    <div className="space-y-6 p-4 md:p-6">
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

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Status</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-semibold">{project.status}</p>
            <p className="text-sm text-muted-foreground">{project.phase}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Budgeted hours</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{project.budgeted_design_hours}h</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Scheduled</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{scheduled}h</p>
            <p className="text-sm text-muted-foreground">{percentUsed}% of budget</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Remaining</CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${remaining < 0 ? "text-red-600" : ""}`}>
              {remaining}h
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
          <CardTitle className="text-base">Project details</CardTitle>
          {permissions.editProjects && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setEditDialogOpen(true)}
            >
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </Button>
          )}
        </CardHeader>
        <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <p className="text-muted-foreground">Lead designer</p>
            <p className="font-medium">{lead ? getEmployeeFullName(lead) : "—"}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Contract date</p>
            <p className="font-medium flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              {project.contract_date
                ? format(parseISO(project.contract_date), "MMMM d, yyyy")
                : "—"}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Target completion</p>
            <p className="font-medium flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              {project.target_completion_date
                ? format(parseISO(project.target_completion_date), "MMMM d, yyyy")
                : "—"}
            </p>
          </div>
          {project.project_number && (
            <div>
              <p className="text-muted-foreground">Project number</p>
              <p className="font-medium">{project.project_number}</p>
            </div>
          )}
          <div className="sm:col-span-2">
            <p className="text-muted-foreground">Address</p>
            <p className="font-medium flex items-start gap-1.5 whitespace-pre-wrap">
              <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              {project.address?.trim() || "—"}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Phone</p>
            <p className="font-medium flex items-center gap-1.5">
              <Phone className="h-3.5 w-3.5 shrink-0" />
              {project.phone?.trim() ? (
                <a href={`tel:${project.phone.trim()}`} className="hover:underline">
                  {project.phone.trim()}
                </a>
              ) : (
                "—"
              )}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Email</p>
            <p className="font-medium flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5 shrink-0" />
              {project.email?.trim() ? (
                <a href={`mailto:${project.email.trim()}`} className="hover:underline">
                  {project.email.trim()}
                </a>
              ) : (
                "—"
              )}
            </p>
          </div>
          <div className="sm:col-span-2">
            <p className="text-muted-foreground">Scope of work</p>
            <p className="font-medium whitespace-pre-wrap leading-relaxed">
              {project.scope_of_work?.trim() || "—"}
            </p>
          </div>
        </CardContent>
      </Card>

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
    </div>
  );
}
