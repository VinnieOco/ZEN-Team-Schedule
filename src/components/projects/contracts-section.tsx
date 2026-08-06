"use client";

import { useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";

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
  estimateDisplayName,
  estimateStageBadgeClass,
  estimateStageLabel,
  estimateTypeLabel,
} from "@/lib/estimating/metrics";
import {
  buildContractEstimateDefaults,
  formatContractRollup,
  getContractsForProject,
  summarizeContracts,
} from "@/lib/project-contracts";
import { formatProjectAmount } from "@/lib/project-format";
import { cn } from "@/lib/utils";
import { getEmployeeFullName } from "@/lib/week";
import type { Estimate, Project } from "@/types";

interface ContractsSectionProps {
  project: Project;
  canEdit: boolean;
}

export function ContractsSection({ project, canEdit }: ContractsSectionProps) {
  const { estimates, getEmployeeById, deleteEstimate } = useScheduling();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Estimate | null>(null);
  const [detail, setDetail] = useState<Estimate | null>(null);
  const [wonEstimateId, setWonEstimateId] = useState<string | null>(null);

  const contracts = useMemo(
    () => getContractsForProject(estimates, project.id),
    [estimates, project.id],
  );

  const summary = useMemo(
    () => summarizeContracts(estimates, project.id),
    [estimates, project.id],
  );

  const defaults = useMemo(() => buildContractEstimateDefaults(project), [project]);

  const rollupLabel = formatContractRollup(summary);

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

  const handleDelete = (estimate: Estimate) => {
    if (
      !window.confirm(
        `Delete contract “${estimateDisplayName(estimate)}”? This cannot be undone.`,
      )
    ) {
      return;
    }
    deleteEstimate(estimate.id);
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-col gap-3 space-y-0 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
          <div className="min-w-0">
            <CardTitle className="text-base">Contracts</CardTitle>
            <CardDescription className="mt-1">
              Contract packages from Estimating linked to this job. Amounts roll into Estimate
              amount (lost packages excluded).
              {rollupLabel ? ` ${rollupLabel}.` : ""}
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
              Add contract
            </Button>
          )}
        </CardHeader>
        <CardContent className="p-0 sm:p-6 sm:pt-0">
          {contracts.length === 0 ? (
            <p className="px-4 pb-4 text-sm text-muted-foreground sm:px-0 sm:pb-0">
              No contracts yet. Add one here or mark a Contract estimate as won and link it to this
              project.
            </p>
          ) : (
            <>
              <ul className="divide-y divide-slate-100 md:hidden">
                {contracts.map((estimate) => (
                  <li key={estimate.id} className="space-y-2 px-4 py-3">
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
                          onClick={() => handleDelete(estimate)}
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
                    {contracts.map((estimate) => (
                      <TableRow
                        key={estimate.id}
                        className="cursor-pointer"
                        onClick={() => setDetail(estimate)}
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
                          <TableCell
                            className="text-right"
                            onClick={(event) => event.stopPropagation()}
                          >
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="text-rose-700 hover:bg-rose-50 hover:text-rose-800"
                              onClick={() => handleDelete(estimate)}
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
