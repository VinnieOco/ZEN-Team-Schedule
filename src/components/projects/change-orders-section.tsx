"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ExternalLink, Plus, Trash2 } from "lucide-react";

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
  const { projects, timeEntries, deleteChangeOrder } = useScheduling();
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

  const handleDelete = (co: Project) => {
    if (
      !window.confirm(
        `Delete change order “${co.project_name}”? This cannot be undone.`,
      )
    ) {
      return;
    }
    const result = deleteChangeOrder(co.id);
    if (!result.ok) {
      window.alert(result.message);
    }
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-col gap-3 space-y-0 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
          <div className="min-w-0">
            <CardTitle className="text-base">Change orders</CardTitle>
            <CardDescription className="mt-1">
              Track scope and budget changes as separate projects linked to this job.
              {rollupLabel ? ` Rollup: ${rollupLabel}.` : ""}
            </CardDescription>
          </div>
          {canEdit && (
            <Button
              type="button"
              size="sm"
              className="w-full shrink-0 sm:w-auto"
              onClick={() => setDialogOpen(true)}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add change order
            </Button>
          )}
        </CardHeader>
        <CardContent className="p-0 sm:p-6 sm:pt-0">
          {changeOrders.length === 0 ? (
            <p className="px-4 pb-4 text-sm text-muted-foreground sm:px-0 sm:pb-0">
              No change orders yet. Add one when scope or budget changes on this project.
            </p>
          ) : (
            <>
              <ul className="divide-y divide-slate-100 md:hidden">
                {changeOrders.map((co) => {
                  const actual = getProjectActualHours(timeEntries, co.id);
                  return (
                    <li
                      key={co.id}
                      className={cn(
                        "space-y-2 px-4 py-3",
                        !co.active && "bg-slate-50/80 text-muted-foreground",
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <Link
                          href={`/projects/${co.id}`}
                          className={cn(
                            "min-w-0 font-medium hover:underline",
                            co.active
                              ? "text-emerald-700 hover:text-emerald-900"
                              : "text-slate-600 hover:text-slate-800",
                          )}
                        >
                          <span className="inline-flex flex-wrap items-center gap-1.5">
                            <span className="break-words">{co.project_name}</span>
                            {!co.active && (
                              <span className="rounded bg-slate-200 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-600">
                                Inactive
                              </span>
                            )}
                            <ExternalLink className="h-3 w-3 shrink-0 opacity-50" />
                          </span>
                        </Link>
                        {canEdit ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 shrink-0 text-rose-700 hover:bg-rose-50 hover:text-rose-800"
                            onClick={() => handleDelete(co)}
                            aria-label={`Delete ${co.project_name}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        ) : null}
                      </div>
                      <p className="text-xs text-muted-foreground">{co.phase}</p>
                      <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs tabular-nums">
                        <span>
                          Budget {formatProjectHours(co.budgeted_design_hours)}h
                        </span>
                        <span className="text-right">Actual {formatProjectHours(actual)}h</span>
                        <span>Design {formatProjectAmount(getProjectDesignAmount(co))}</span>
                        <span className="text-right">
                          Est. {formatProjectAmount(getProjectEstimateValue(co))}
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ul>
              <div className="hidden overflow-x-auto md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Phase</TableHead>
                      <TableHead className="text-right">Budgeted Hrs</TableHead>
                      <TableHead className="text-right">Actual Hrs</TableHead>
                      <TableHead className="text-right">Design Amount</TableHead>
                      <TableHead className="text-right">Estimate Amount</TableHead>
                      {canEdit ? <TableHead className="w-[1%] text-right"> </TableHead> : null}
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
                          <TableCell className="text-right">
                            {formatProjectHours(actual)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {formatProjectAmount(getProjectDesignAmount(co))}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {formatProjectAmount(getProjectEstimateValue(co))}
                          </TableCell>
                          {canEdit ? (
                            <TableCell className="text-right">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="text-rose-700 hover:bg-rose-50 hover:text-rose-800"
                                onClick={() => handleDelete(co)}
                                aria-label={`Delete ${co.project_name}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          ) : null}
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
