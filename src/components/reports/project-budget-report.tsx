"use client";

import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useScheduling } from "@/context/scheduling-context";
import {
  getProjectBudgetStats,
  projectBudgetStatusColor,
} from "@/lib/utilization";
import { cn } from "@/lib/utils";

export function ProjectBudgetReport() {
  const { projects, allocations, selectedWeekStart, settings } = useScheduling();

  const rows = projects
    .filter((p) => p.active)
    .map((project) => ({
      project,
      stats: getProjectBudgetStats(
        allocations,
        project.id,
        project.budgeted_design_hours,
        selectedWeekStart,
        settings,
      ),
    }))
    .sort((a, b) => {
      if (a.stats.remaining !== b.stats.remaining) return a.stats.remaining - b.stats.remaining;
      return b.stats.percentUsed - a.stats.percentUsed;
    });

  const overBudget = rows.filter((r) => r.stats.remaining < 0).length;
  const nearBudget = rows.filter((r) => r.stats.status === "near").length;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Project budget vs scheduled</CardTitle>
        <CardDescription>
          All-time scheduled hours compared to design budget. This week column shows hours scheduled
          in the selected week only.{" "}
          <Link href="/projects" className="text-emerald-700 hover:underline">
            Manage projects
          </Link>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {(overBudget > 0 || nearBudget > 0) && (
          <div className="flex flex-wrap gap-3 text-sm">
            {overBudget > 0 && (
              <span className="rounded-md bg-red-50 px-2.5 py-1 text-red-700">
                {overBudget} over budget
              </span>
            )}
            {nearBudget > 0 && (
              <span className="rounded-md bg-orange-50 px-2.5 py-1 text-orange-700">
                {nearBudget} at 90%+ of budget
              </span>
            )}
          </div>
        )}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Project</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Department</TableHead>
                <TableHead className="text-right">Budget</TableHead>
                <TableHead className="text-right">Scheduled (all)</TableHead>
                <TableHead className="text-right">This week</TableHead>
                <TableHead className="text-right">Remaining</TableHead>
                <TableHead className="text-right">% used</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map(({ project, stats }) => (
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
                  <TableCell className="text-sm">{project.department?.trim() || "—"}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {project.budgeted_design_hours > 0 ? `${project.budgeted_design_hours}h` : "—"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{stats.scheduledAllTime}h</TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    {stats.scheduledThisWeek > 0 ? `${stats.scheduledThisWeek}h` : "—"}
                  </TableCell>
                  <TableCell
                    className={cn(
                      "text-right tabular-nums font-medium",
                      stats.remaining < 0 && "text-red-600",
                    )}
                  >
                    {project.budgeted_design_hours > 0 ? `${stats.remaining}h` : "—"}
                  </TableCell>
                  <TableCell
                    className={cn(
                      "text-right tabular-nums",
                      projectBudgetStatusColor(stats.status),
                    )}
                  >
                    {project.budgeted_design_hours > 0 ? `${stats.percentUsed}%` : "—"}
                  </TableCell>
                </TableRow>
              ))}
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground">
                    No active projects.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        <p className="text-xs text-muted-foreground">
          Sorted by remaining budget (lowest first). Over-budget projects appear at the top.
        </p>
      </CardContent>
    </Card>
  );
}
