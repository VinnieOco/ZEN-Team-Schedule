"use client";

import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { format, parseISO } from "date-fns";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useScheduling } from "@/context/scheduling-context";
import { formatProjectDepartment } from "@/lib/project-format";
import { cn } from "@/lib/utils";
import { getEmployeeFullName } from "@/lib/week";
import type { Project } from "@/types";

interface ClientProjectsTableProps {
  projects: Project[];
  showInactive?: boolean;
}

export function ClientProjectsTable({
  projects,
  showInactive = true,
}: ClientProjectsTableProps) {
  const { getEmployeeById } = useScheduling();

  const visible = showInactive ? projects : projects.filter((p) => p.active);

  if (visible.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No projects to display with current filters.</p>
    );
  }

  return (
    <div className="scroll-x-contained rounded-lg border bg-white shadow-sm">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Project</TableHead>
            <TableHead>Department</TableHead>
            <TableHead>Phase</TableHead>
            <TableHead>Lead</TableHead>
            <TableHead>Target</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {visible.map((project) => {
            const lead = project.lead_employee_id
              ? getEmployeeById(project.lead_employee_id)
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
                    {!project.active && (
                      <span className="rounded bg-slate-200 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-600">
                        Inactive
                      </span>
                    )}
                    <ExternalLink className="h-3 w-3 opacity-50" />
                  </Link>
                </TableCell>
                <TableCell>{formatProjectDepartment(project.department)}</TableCell>
                <TableCell>{project.phase}</TableCell>
                <TableCell>{lead ? getEmployeeFullName(lead) : "—"}</TableCell>
                <TableCell>
                  {project.target_completion_date
                    ? format(parseISO(project.target_completion_date), "MMM d, yyyy")
                    : "—"}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
