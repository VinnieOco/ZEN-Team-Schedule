"use client";

import Link from "next/link";
import { format, parseISO } from "date-fns";
import { ExternalLink, X } from "lucide-react";

import { HealthStatusBadge } from "@/components/queue/health-status-badge";
import { Button } from "@/components/ui/button";
import type { DesignQueueItem, EstimatingQueueItem } from "@/lib/queue/types";
import { formatProjectAmount, formatProjectHours } from "@/lib/project-format";
import { cn } from "@/lib/utils";

function formatDue(date?: string): string | null {
  if (!date?.trim()) return null;
  try {
    return format(parseISO(date), "MMM d, yyyy");
  } catch {
    return date;
  }
}

interface QueueCardContentProps {
  item: DesignQueueItem | EstimatingQueueItem;
  compact?: boolean;
  canRemove?: boolean;
  onRemove?: () => void;
}

export function QueueCardContent({ item, compact, canRemove, onRemove }: QueueCardContentProps) {
  const { project, metrics, health, leadName } = item;
  const dueLabel =
    item.kind === "design" ? formatDue(item.dueDate) : formatDue(item.bidDueDate);

  return (
    <article
      className={cn(
        "group/card relative rounded-md border border-slate-200/90 bg-white p-2 text-xs shadow-sm transition-all hover:shadow-md hover:ring-1 hover:ring-emerald-200/60",
        !project.active && "opacity-70",
        compact && "p-2",
      )}
    >
      {canRemove && onRemove && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute right-0.5 top-0.5 h-6 w-6 text-slate-400 opacity-60 hover:bg-red-50 hover:text-red-600 sm:opacity-0 sm:group-hover/card:opacity-100"
          aria-label="Remove from queue"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onRemove();
          }}
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      )}
      <div className="mb-1.5 min-w-0">
        <Link
          href={`/projects/${project.id}`}
          className="inline-flex items-center gap-1 font-semibold text-emerald-700 hover:text-emerald-900 hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          <span className="line-clamp-2">{project.project_name}</span>
          <ExternalLink className="h-3 w-3 shrink-0 opacity-50" />
        </Link>
        <p className="truncate text-[10px] text-muted-foreground">{project.client_name}</p>
      </div>

      <div className="mb-1.5 flex flex-wrap items-center gap-1">
        <HealthStatusBadge health={health} className="text-[10px]" />
        {!project.active && (
          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">
            Inactive
          </span>
        )}
      </div>

      <dl className="space-y-0.5 text-[10px] text-muted-foreground">
        {leadName && (
          <div className="flex justify-between gap-2">
            <dt>{item.kind === "estimating" ? "Lead estimator" : "Lead designer"}</dt>
            <dd className="font-medium text-slate-700">{leadName}</dd>
          </div>
        )}
        {dueLabel && (
          <div className="flex justify-between gap-2">
            <dt>{item.kind === "estimating" ? "Est. completion" : "Design completion"}</dt>
            <dd className="font-medium text-slate-700">{dueLabel}</dd>
          </div>
        )}
        <div className="flex justify-between gap-2">
          <dt>Hours</dt>
          <dd className="font-medium tabular-nums text-slate-700">
            {formatProjectHours(metrics.hoursUsed)} / {formatProjectHours(metrics.budgetHours)}h
          </dd>
        </div>
        {!compact && (
          <>
            <div className="flex justify-between gap-2">
              <dt>Remaining</dt>
              <dd className="font-medium tabular-nums text-slate-700">
                {formatProjectHours(metrics.remainingHours)}h
              </dd>
            </div>
            {item.estimatedValue != null && item.estimatedValue > 0 && (
              <div className="flex justify-between gap-2">
                <dt>Value</dt>
                <dd className="font-medium text-slate-700">{formatProjectAmount(item.estimatedValue)}</dd>
              </div>
            )}
            {item.kind === "estimating" && item.missingDocuments.length > 0 && (
              <div className="pt-0.5">
                <dt className="text-amber-800">Missing</dt>
                <dd className="mt-0.5 text-amber-900">{item.missingDocuments.join(", ")}</dd>
              </div>
            )}
          </>
        )}
      </dl>
    </article>
  );
}
