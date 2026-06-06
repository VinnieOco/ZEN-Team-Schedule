"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ExternalLink, Plus } from "lucide-react";

import { ProjectFormDialog } from "@/components/projects/project-form-dialog";
import { Button } from "@/components/ui/button";
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
  buildChangeOrderFormDefaults,
  formatChangeOrderRollup,
  getChangeOrdersForParent,
  summarizeChangeOrders,
} from "@/lib/change-orders";
import {
  formatProjectAmount,
  formatProjectHours,
  getProjectDesignAmount,
  getProjectEstimateValue,
} from "@/lib/project-format";
import { getProjectActualHours } from "@/lib/utilization";
import { cn } from "@/lib/utils";
import type { Project } from "@/types";

interface ChangeOrdersSectionProps {
  project: Project;
  canEdit: boolean;
}

export function ChangeOrdersSection({ project, canEdit }: ChangeOrdersSectionProps) {
  const { projects, timeEntries } = useScheduling();
  const [dialogOpen, setDialogOpen] = useState(false);

  const changeOrders = useMemo(
    () => getChangeOrdersForParent(projects, project.id),
    [projects, project.id],
  );

  const summary = useMemo(
    () => summarizeChangeOrders(projects, project.id),
    [projects, project.id],
  );

  const defaults = useMemo(
    () => buildChangeOrderFormDefaults(project, projects),
    [project, projects],
  );

  const rollupLabel = formatChangeOrderRollup(summary);

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3 space-y-0">
          <div>
            <CardTitle className="text-base">Change orders</CardTitle>
            <CardDescription>
              Track scope and budget changes as separate projects linked to this job.
              {rollupLabel ? ` Rollup: ${rollupLabel}.` : ""}
            </CardDescription>
          </div>
          {canEdit && (
            <Button type="button" size="sm" onClick={() => setDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add change order
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {changeOrders.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No change orders yet. Add one when scope or budget changes on this project.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Phase</TableHead>
                  <TableHead className="text-right">Budgeted Hrs</TableHead>
                  <TableHead className="text-right">Actual Hrs</TableHead>
                  <TableHead className="text-right">Design Amount</TableHead>
                  <TableHead className="text-right">Estimate Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {changeOrders.map((co) => {
                  const actual = getProjectActualHours(timeEntries, co.id);
                  return (
                    <TableRow
                      key={co.id}
                      className={cn(!co.active && "bg-slate-50/80 text-muted-foreground")}
                    >
                      <TableCell className="font-medium">
                        <Link
                          href={`/projects/${co.id}`}
                          className={cn(
                            "inline-flex items-center gap-1 hover:underline",
                            co.active
                              ? "text-emerald-700 hover:text-emerald-900"
                              : "text-slate-600 hover:text-slate-800",
                          )}
                        >
                          {co.project_name}
                          {!co.active && (
                            <span className="rounded bg-slate-200 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-600">
                              Inactive
                            </span>
                          )}
                          <ExternalLink className="h-3 w-3 opacity-50" />
                        </Link>
                      </TableCell>
                      <TableCell>{co.phase}</TableCell>
                      <TableCell className="text-right">
                        {formatProjectHours(co.budgeted_design_hours)}
                      </TableCell>
                      <TableCell className="text-right">{formatProjectHours(actual)}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatProjectAmount(getProjectDesignAmount(co))}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatProjectAmount(getProjectEstimateValue(co))}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {canEdit && (
        <ProjectFormDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          defaults={defaults}
        />
      )}
    </>
  );
}
