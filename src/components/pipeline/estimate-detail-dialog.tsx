"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import { CopyPlus, Pencil, Plus, Send, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useScheduling } from "@/context/scheduling-context";
import {
  ESTIMATE_STAGES,
  estimateDisplayName,
  estimateResultLabel,
  estimateRevisionLabel,
  estimateStageBadgeClass,
  estimateStageLabel,
  estimateTypeLabel,
} from "@/lib/estimating/metrics";
import { formatProjectAmount } from "@/lib/project-format";
import { cn } from "@/lib/utils";
import { getEmployeeFullName } from "@/lib/week";
import type { Estimate, EstimateStage } from "@/types";

interface EstimateDetailDialogProps {
  estimate: Estimate | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canEdit: boolean;
  onEdit: (estimate: Estimate) => void;
  onRevised?: (revision: Estimate) => void;
}

function formatDate(value?: string): string {
  if (!value?.trim()) return "—";
  try {
    return format(parseISO(value), "MMM d, yyyy");
  } catch {
    return value;
  }
}

export function EstimateDetailDialog({
  estimate,
  open,
  onOpenChange,
  canEdit,
  onEdit,
  onRevised,
}: EstimateDetailDialogProps) {
  const {
    estimates,
    projects,
    getEmployeeById,
    setEstimateStage,
    markEstimateSubmitted,
    setEstimateResult,
    reviseEstimate,
    setEstimateChecklistItem,
    addEstimateChecklistItem,
    removeEstimateChecklistItem,
  } = useScheduling();
  const [checklistDraft, setChecklistDraft] = useState("");

  useEffect(() => {
    if (!open) setChecklistDraft("");
  }, [open]);

  // Read the live row so checklist toggles and stage changes render immediately.
  const current = estimate ? (estimates.find((e) => e.id === estimate.id) ?? estimate) : null;
  if (!current) return null;

  const estimator = current.estimator_id ? getEmployeeById(current.estimator_id) : undefined;
  const project = current.project_id
    ? projects.find((p) => p.id === current.project_id)
    : undefined;
  const revisionLabel = estimateRevisionLabel(current);
  const revisionChain = estimates
    .filter((e) => e.revises_estimate_id === current.id)
    .sort((a, b) => a.revision_number - b.revision_number);
  const previous = current.revises_estimate_id
    ? estimates.find((e) => e.id === current.revises_estimate_id)
    : undefined;

  const handleRevise = () => {
    if (
      !window.confirm(
        `Create revision ${current.revision_number + 1} of “${estimateDisplayName(current)}”? The new package starts in Pricing.`,
      )
    ) {
      return;
    }
    const revision = reviseEstimate(current.id);
    if (revision) onRevised?.(revision);
  };

  const facts: { label: string; value: React.ReactNode }[] = [
    { label: "Client", value: current.client_name },
    { label: "Type", value: estimateTypeLabel(current.estimate_type) },
    { label: "Estimator", value: estimator ? getEmployeeFullName(estimator) : "Unassigned" },
    { label: "Amount", value: formatProjectAmount(current.amount) },
    { label: "Received", value: formatDate(current.received_date) },
    { label: "Due", value: formatDate(current.due_date) },
    { label: "Submitted", value: formatDate(current.submitted_date) },
    { label: "Result", value: estimateResultLabel(current.result) },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2">
            {estimateDisplayName(current)}
            {revisionLabel ? (
              <Badge variant="secondary" className="font-normal">
                {revisionLabel}
              </Badge>
            ) : null}
            <Badge
              variant="secondary"
              className={cn("font-normal", estimateStageBadgeClass(current.stage))}
            >
              {estimateStageLabel(current.stage)}
            </Badge>
          </DialogTitle>
          <DialogDescription>
            {project ? (
              <>
                Linked to{" "}
                <Link
                  href={`/projects/${project.id}`}
                  className="text-emerald-700 hover:underline"
                >
                  {project.project_name}
                </Link>
              </>
            ) : (
              "No linked project."
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <dl className="grid gap-3 sm:grid-cols-4">
            {facts.map((fact) => (
              <div key={fact.label}>
                <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {fact.label}
                </dt>
                <dd className="mt-0.5 text-sm text-slate-900">{fact.value}</dd>
              </div>
            ))}
          </dl>

          {current.notes ? (
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Notes
              </p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-slate-800">
                {current.notes}
              </p>
            </div>
          ) : null}

          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Checklist
            </p>
            {current.checklist.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No checklist items yet — add takeoff, scope, or vendor steps below.
              </p>
            ) : (
              <ul className="space-y-1.5">
                {current.checklist.map((item) => (
                  <li key={item.id} className="flex items-center gap-2">
                    <input
                      id={`checklist-${item.id}`}
                      type="checkbox"
                      className="h-4 w-4 rounded border-input accent-emerald-600"
                      checked={item.done}
                      disabled={!canEdit}
                      onChange={(e) =>
                        setEstimateChecklistItem(current.id, item.id, e.target.checked)
                      }
                    />
                    <label
                      htmlFor={`checklist-${item.id}`}
                      className={cn(
                        "flex-1 text-sm text-slate-800",
                        item.done && "text-muted-foreground line-through",
                      )}
                    >
                      {item.label}
                    </label>
                    {canEdit && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground"
                        onClick={() => removeEstimateChecklistItem(current.id, item.id)}
                        aria-label={`Remove ${item.label}`}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            )}
            {canEdit && (
              <form
                className="flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  addEstimateChecklistItem(current.id, checklistDraft);
                  setChecklistDraft("");
                }}
              >
                <Input
                  value={checklistDraft}
                  onChange={(e) => setChecklistDraft(e.target.value)}
                  placeholder="Add checklist item…"
                />
                <Button type="submit" variant="outline" disabled={!checklistDraft.trim()}>
                  <Plus className="mr-1.5 h-4 w-4" />
                  Add
                </Button>
              </form>
            )}
          </div>

          {(previous || revisionChain.length > 0) && (
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Revisions
              </p>
              <ul className="mt-1 space-y-1 text-sm text-slate-800">
                {previous ? (
                  <li>
                    Revises {estimateRevisionLabel(previous) ?? "original"} ·{" "}
                    {formatProjectAmount(previous.amount)} ·{" "}
                    {estimateStageLabel(previous.stage)}
                  </li>
                ) : null}
                {revisionChain.map((revision) => (
                  <li key={revision.id}>
                    {estimateRevisionLabel(revision)} ·{" "}
                    {formatProjectAmount(revision.amount)} ·{" "}
                    {estimateStageLabel(revision.stage)}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {canEdit && (
            <div className="space-y-3 border-t pt-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Stage</Label>
                  <Select
                    value={current.stage}
                    onValueChange={(v) => setEstimateStage(current.id, v as EstimateStage)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ESTIMATE_STAGES.map((s) => (
                        <SelectItem key={s.value} value={s.value}>
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Result</Label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant={current.result === "won" ? "default" : "outline"}
                      className="flex-1"
                      onClick={() =>
                        setEstimateResult(current.id, current.result === "won" ? "pending" : "won")
                      }
                    >
                      Won
                    </Button>
                    <Button
                      type="button"
                      variant={current.result === "lost" ? "default" : "outline"}
                      className="flex-1"
                      onClick={() =>
                        setEstimateResult(
                          current.id,
                          current.result === "lost" ? "pending" : "lost",
                        )
                      }
                    >
                      Lost
                    </Button>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => markEstimateSubmitted(current.id)}
                >
                  <Send className="mr-1.5 h-4 w-4" />
                  Mark submitted
                </Button>
                <Button type="button" variant="outline" onClick={handleRevise}>
                  <CopyPlus className="mr-1.5 h-4 w-4" />
                  Revise
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="sm:ms-auto"
                  onClick={() => onEdit(current)}
                >
                  <Pencil className="mr-1.5 h-4 w-4" />
                  Edit
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
