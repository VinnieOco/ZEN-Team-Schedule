"use client";

import { useState } from "react";
import Link from "next/link";
import { ExternalLink, Pencil, Plus } from "lucide-react";
import { format, parseISO } from "date-fns";

import { ProjectFormDialog } from "@/components/projects/project-form-dialog";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useScheduling } from "@/context/scheduling-context";
import { getProjectScheduledHours } from "@/lib/utilization";
import { getEmployeeFullName } from "@/lib/week";
import type { Project } from "@/types";

export function ProjectsTable() {
  const { projects, allocations, getEmployeeById } = useScheduling();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => { setEditingProject(null); setDialogOpen(true); }}>
          <Plus className="mr-2 h-4 w-4" />
          Add Project
        </Button>
      </div>
      <div className="overflow-x-auto rounded-lg border bg-white shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Project Name</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Phase</TableHead>
              <TableHead>Lead Designer</TableHead>
              <TableHead className="text-right">Budgeted Hrs</TableHead>
              <TableHead className="text-right">Scheduled Hrs</TableHead>
              <TableHead className="text-right">Remaining Hrs</TableHead>
              <TableHead>Target Date</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {projects.filter((p) => p.active).map((project) => {
              const scheduled = getProjectScheduledHours(allocations, project.id);
              const remaining = project.budgeted_design_hours - scheduled;
              const lead = project.lead_employee_id
                ? getEmployeeById(project.lead_employee_id)
                : null;

              return (
                <TableRow key={project.id}>
                  <TableCell className="font-medium">
                    <Link
                      href={`/projects/${project.id}`}
                      className="inline-flex items-center gap-1 text-emerald-700 hover:text-emerald-900 hover:underline"
                    >
                      {project.project_name}
                      <ExternalLink className="h-3 w-3 opacity-50" />
                    </Link>
                  </TableCell>
                  <TableCell>{project.client_name}</TableCell>
                  <TableCell>{project.status}</TableCell>
                  <TableCell>{project.phase}</TableCell>
                  <TableCell>{lead ? getEmployeeFullName(lead) : "—"}</TableCell>
                  <TableCell className="text-right">{project.budgeted_design_hours}</TableCell>
                  <TableCell className="text-right">{scheduled}</TableCell>
                  <TableCell className={`text-right ${remaining < 0 ? "text-red-600 font-medium" : ""}`}>
                    {remaining}
                  </TableCell>
                  <TableCell>
                    {project.target_completion_date
                      ? format(parseISO(project.target_completion_date), "MMM d, yyyy")
                      : "—"}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => { setEditingProject(project); setDialogOpen(true); }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      <p className="text-xs text-muted-foreground">
        Scheduled hours reflect all-time allocations across the team.
      </p>
      <ProjectFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        project={editingProject}
      />
    </div>
  );
}
