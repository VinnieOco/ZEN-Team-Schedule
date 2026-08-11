"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronDown, ExternalLink, Plus, Trash2 } from "lucide-react";

import { EstimateDetailDialog } from "@/components/pipeline/estimate-detail-dialog";
import { EstimateFormDialog } from "@/components/pipeline/estimate-form-dialog";
import { EstimateWonDialog } from "@/components/pipeline/estimate-won-dialog";
import { Badge } from "@/components/ui/badge";
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
  buildChangeOrderEstimateDefaults,
  formatChangeOrderPackageRollup,
  formatChangeOrderRollup,
  getChangeOrderEstimatesForProject,
  getChangeOrdersForParent,
  getPendingChangeOrderEstimatesForProject,
  summarizeChangeOrderEstimates,
  summarizeChangeOrders,
} from "@/lib/change-orders";
import {
  estimateDisplayName,
  estimateStageBadgeClass,
  estimateStageLabel,
  estimateTypeLabel,
} from "@/lib/estimating/metrics";
import {
  formatProjectAmount,
  formatProjectHours,
  getProjectDesignAmount,
  getProjectEstimateValue,
} from "@/lib/project-format";
import { getProjectActualHours } from "@/lib/utilization";
import { cn } from "@/lib/utils";
import { getEmployeeFullName } from "@/lib/week";
import type { Estimate, Project } from "@/types";

interface ChangeOrdersSectionProps {
  project: Project;
  canEdit: boolean;
}

const WON_PREVIEW_COUNT = 3;

type WonRow =
  | { kind: "package"; id: string; sortKey: string; estimate: Estimate }
  | { kind: "project"; id: string; sortKey: string; project: Project };

function wonSortKeyForPackage(estimate: Estimate): string {
  return estimate.won_date ?? estimate.submitted_date ?? estimate.updated_at;
}

function wonSortKeyForProject(project: Project): string {
  return project.contract_date ?? project.start_date ?? project.project_name;
}

function PackageRows({
  packages,
  canEdit,
  estimatorName,
  onOpen,
  onDelete,
}: {
  packages: Estimate[];
  canEdit: boolean;
  estimatorName: (estimate: Estimate) => string | undefined;
  onOpen: (estimate: Estimate) => void;
  onDelete: (estimate: Estimate) => void;
}) {
  return (
    <>
      <ul className="divide-y divide-slate-100 md:hidden">
        {packages.map((estimate) => (
          <li key={estimate.id} className="space-y-2 px-4 py-3">
            <div className="flex items-start justify-between gap-2">
              <button
                type="button"
                onClick={() => onOpen(estimate)}
                className="min-w-0 text-left font-medium text-emerald-700 hover:underline"
              >
                {estimateDisplayName(estimate)}
              </button>
              {canEdit ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0 text-rose-700 hover:bg-rose-50 hover:text-rose-800"
                  onClick={() => onDelete(estimate)}
                  aria-label={`Delete ${estimateDisplayName(estimate)}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              ) : null}
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge
                variant="secondary"
                className={cn("font-semibold", estimateStageBadgeClass(estimate.stage))}
              >
                {estimateStageLabel(estimate.stage)}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {estimateTypeLabel(estimate.estimate_type)}
              </span>
            </div>
            <div className="flex justify-between gap-2 text-xs tabular-nums">
              <span className="text-muted-foreground">
                {estimatorName(estimate) ?? "Unassigned"}
              </span>
              <span className="font-medium">{formatProjectAmount(estimate.amount)}</span>
            </div>
          </li>
        ))}
      </ul>
      <div className="hidden overflow-x-auto md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Package</TableHead>
              <TableHead>Stage</TableHead>
              <TableHead>Estimator</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              {canEdit ? <TableHead className="w-[1%] text-right"> </TableHead> : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {packages.map((estimate) => (
              <TableRow
                key={estimate.id}
                className="cursor-pointer"
                onClick={() => onOpen(estimate)}
              >
                <TableCell className="font-medium text-emerald-700">
                  {estimateDisplayName(estimate)}
                </TableCell>
                <TableCell>
                  <Badge
                    variant="secondary"
                    className={cn("font-semibold", estimateStageBadgeClass(estimate.stage))}
                  >
                    {estimateStageLabel(estimate.stage)}
                  </Badge>
                </TableCell>
                <TableCell>{estimatorName(estimate) ?? "—"}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatProjectAmount(estimate.amount)}
                </TableCell>
                {canEdit ? (
                  <TableCell className="text-right" onClick={(event) => event.stopPropagation()}>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-rose-700 hover:bg-rose-50 hover:text-rose-800"
                      onClick={() => onDelete(estimate)}
                      aria-label={`Delete ${estimateDisplayName(estimate)}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                ) : null}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}

export function ChangeOrdersSection({ project, canEdit }: ChangeOrdersSectionProps) {
  const {
    projects,
    estimates,
    timeEntries,
    getEmployeeById,
    deleteEstimate,
    deleteChangeOrder,
  } = useScheduling();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Estimate | null>(null);
  const [detail, setDetail] = useState<Estimate | null>(null);
  const [wonEstimateId, setWonEstimateId] = useState<string | null>(null);
  const [showAllWon, setShowAllWon] = useState(false);

  const pendingPackages = useMemo(
    () => getPendingChangeOrderEstimatesForProject(estimates, project.id),
    [estimates, project.id],
  );

  const wonPackages = useMemo(
    () => getChangeOrderEstimatesForProject(estimates, project.id, { wonOnly: true }),
    [estimates, project.id],
  );

  const packageSummary = useMemo(
    () => summarizeChangeOrderEstimates(estimates, project.id),
    [estimates, project.id],
  );

  const legacyProjects = useMemo(
    () => getChangeOrdersForParent(projects, project.id),
    [projects, project.id],
  );

  const legacySummary = useMemo(
    () => summarizeChangeOrders(projects, project.id),
    [projects, project.id],
  );

  const defaults = useMemo(
    () => buildChangeOrderEstimateDefaults(project, estimates),
    [project, estimates],
  );

  const wonRows = useMemo((): WonRow[] => {
    const rows: WonRow[] = [
      ...wonPackages.map((estimate) => ({
        kind: "package" as const,
        id: estimate.id,
        sortKey: wonSortKeyForPackage(estimate),
        estimate,
      })),
      ...legacyProjects.map((co) => ({
        kind: "project" as const,
        id: co.id,
        sortKey: wonSortKeyForProject(co),
        project: co,
      })),
    ];
    return rows.sort((a, b) => b.sortKey.localeCompare(a.sortKey));
  }, [wonPackages, legacyProjects]);

  const visibleWonRows = showAllWon ? wonRows : wonRows.slice(0, WON_PREVIEW_COUNT);
  const hiddenWonCount = Math.max(0, wonRows.length - WON_PREVIEW_COUNT);
  const packageRollup = formatChangeOrderPackageRollup(packageSummary);
  const legacyRollup = formatChangeOrderRollup(legacySummary);
  const hasWonContent = wonRows.length > 0;
  const wonDescriptionParts = [
    "Change orders that count toward this job's Estimate amount.",
  ];
  if (packageRollup) wonDescriptionParts.push(packageRollup);
  if (legacyRollup) {
    wonDescriptionParts.push(
      wonPackages.length > 0
        ? `Also includes ${legacyRollup} from earlier CO project records.`
        : legacyRollup,
    );
  }
  const wonDescription = wonDescriptionParts.join(" ");

  const wonEstimate = useMemo(
    () => (wonEstimateId ? estimates.find((e) => e.id === wonEstimateId) ?? null : null),
    [estimates, wonEstimateId],
  );

  const estimatorName = (estimate: Estimate) => {
    if (!estimate.estimator_id) return undefined;
    const employee = getEmployeeById(estimate.estimator_id);
    return employee ? getEmployeeFullName(employee) : undefined;
  };

  const openNew = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (estimate: Estimate) => {
    setDetail(null);
    setEditing(estimate);
    setFormOpen(true);
  };

  const handleDeletePackage = (estimate: Estimate) => {
    if (
      !window.confirm(
        `Delete change order “${estimateDisplayName(estimate)}”? This cannot be undone.`,
      )
    ) {
      return;
    }
    deleteEstimate(estimate.id);
  };

  const handleDeleteLegacy = (co: Project) => {
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
            <CardTitle className="text-base">Pending change orders</CardTitle>
            <CardDescription className="mt-1">
              Open change-order packages for this job — the same records as Pipeline → Estimating.
              Lost packages are hidden. Amounts do not roll into Estimate amount until won.
            </CardDescription>
          </div>
          {canEdit && (
            <Button
              type="button"
              size="sm"
              className="w-full shrink-0 sm:w-auto"
              onClick={openNew}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add change order
            </Button>
          )}
        </CardHeader>
        <CardContent className="p-0 sm:p-6 sm:pt-0">
          {pendingPackages.length === 0 ? (
            <p className="px-4 pb-4 text-sm text-muted-foreground sm:px-0 sm:pb-0">
              No open change orders. Add one here or in Estimating — both places stay in sync.
            </p>
          ) : (
            <PackageRows
              packages={pendingPackages}
              canEdit={canEdit}
              estimatorName={estimatorName}
              onOpen={setDetail}
              onDelete={handleDeletePackage}
            />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="space-y-0">
          <CardTitle className="text-base">Won change orders</CardTitle>
          <CardDescription className="mt-1">{wonDescription}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 p-0 sm:p-6 sm:pt-0">
          {!hasWonContent ? (
            <p className="px-4 text-sm text-muted-foreground sm:px-0">
              No won change orders yet. Mark a pending package as won to move it here.
            </p>
          ) : (
            <>
              <ul className="divide-y divide-slate-100 md:hidden">
                {visibleWonRows.map((row) => {
                  if (row.kind === "package") {
                    const estimate = row.estimate;
                    return (
                      <li key={row.id} className="space-y-2 px-4 py-3">
                        <div className="flex items-start justify-between gap-2">
                          <button
                            type="button"
                            onClick={() => setDetail(estimate)}
                            className="min-w-0 text-left font-medium text-emerald-700 hover:underline"
                          >
                            {estimateDisplayName(estimate)}
                          </button>
                          {canEdit ? (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 shrink-0 text-rose-700 hover:bg-rose-50 hover:text-rose-800"
                              onClick={() => handleDeletePackage(estimate)}
                              aria-label={`Delete ${estimateDisplayName(estimate)}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          ) : null}
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Badge
                            variant="secondary"
                            className={cn("font-semibold", estimateStageBadgeClass(estimate.stage))}
                          >
                            {estimateStageLabel(estimate.stage)}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {estimateTypeLabel(estimate.estimate_type)}
                          </span>
                        </div>
                        <div className="flex justify-between gap-2 text-xs tabular-nums">
                          <span className="text-muted-foreground">
                            {estimatorName(estimate) ?? "Unassigned"}
                          </span>
                          <span className="font-medium">
                            {formatProjectAmount(estimate.amount)}
                          </span>
                        </div>
                      </li>
                    );
                  }

                  const co = row.project;
                  const actual = getProjectActualHours(timeEntries, co.id);
                  return (
                    <li
                      key={row.id}
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
                            <ExternalLink className="h-3 w-3 shrink-0 opacity-50" />
                          </span>
                        </Link>
                        {canEdit ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 shrink-0 text-rose-700 hover:bg-rose-50 hover:text-rose-800"
                            onClick={() => handleDeleteLegacy(co)}
                            aria-label={`Delete ${co.project_name}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        ) : null}
                      </div>
                      <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs tabular-nums">
                        <span>Budget {formatProjectHours(co.budgeted_design_hours)}h</span>
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
                      <TableHead>Details</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      {canEdit ? <TableHead className="w-[1%] text-right"> </TableHead> : null}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {visibleWonRows.map((row) => {
                      if (row.kind === "package") {
                        const estimate = row.estimate;
                        return (
                          <TableRow
                            key={row.id}
                            className="cursor-pointer"
                            onClick={() => setDetail(estimate)}
                          >
                            <TableCell className="font-medium text-emerald-700">
                              {estimateDisplayName(estimate)}
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-wrap items-center gap-1.5">
                                <Badge
                                  variant="secondary"
                                  className={cn(
                                    "font-semibold",
                                    estimateStageBadgeClass(estimate.stage),
                                  )}
                                >
                                  {estimateStageLabel(estimate.stage)}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  {estimatorName(estimate) ?? "Unassigned"}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                              {formatProjectAmount(estimate.amount)}
                            </TableCell>
                            {canEdit ? (
                              <TableCell
                                className="text-right"
                                onClick={(event) => event.stopPropagation()}
                              >
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="text-rose-700 hover:bg-rose-50 hover:text-rose-800"
                                  onClick={() => handleDeletePackage(estimate)}
                                  aria-label={`Delete ${estimateDisplayName(estimate)}`}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            ) : null}
                          </TableRow>
                        );
                      }

                      const co = row.project;
                      return (
                        <TableRow key={row.id}>
                          <TableCell className="font-medium">
                            <Link
                              href={`/projects/${co.id}`}
                              className="inline-flex items-center gap-1 text-emerald-700 hover:underline"
                            >
                              {co.project_name}
                              <ExternalLink className="h-3 w-3 opacity-50" />
                            </Link>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            Budget {formatProjectHours(co.budgeted_design_hours)}h
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
                                onClick={() => handleDeleteLegacy(co)}
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

              {hiddenWonCount > 0 ? (
                <div className="px-4 sm:px-0">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 w-full justify-center gap-1.5 text-muted-foreground hover:text-slate-900"
                    onClick={() => setShowAllWon((open) => !open)}
                    aria-expanded={showAllWon}
                  >
                    {showAllWon ? "Show fewer" : `Show ${hiddenWonCount} more`}
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 transition-transform",
                        showAllWon && "rotate-180",
                      )}
                    />
                  </Button>
                </div>
              ) : null}
            </>
          )}
        </CardContent>
      </Card>

      <EstimateFormDialog
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setEditing(null);
        }}
        estimate={editing}
        defaults={editing ? undefined : defaults}
        onRequestWon={(id) => setWonEstimateId(id)}
      />

      <EstimateDetailDialog
        estimate={detail}
        open={detail != null}
        onOpenChange={(open) => {
          if (!open) setDetail(null);
        }}
        canEdit={canEdit}
        onEdit={openEdit}
        onRequestWon={(estimate) => setWonEstimateId(estimate.id)}
      />

      <EstimateWonDialog
        estimate={wonEstimate}
        open={wonEstimateId != null}
        onOpenChange={(open) => {
          if (!open) setWonEstimateId(null);
        }}
      />
    </>
  );
}
