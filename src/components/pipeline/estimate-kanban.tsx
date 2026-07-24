"use client";

import { useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { format, parseISO } from "date-fns";
import { GripVertical } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  ESTIMATE_STAGES,
  compareEstimatesForQueue,
  estimateDisplayName,
  estimateRevisionLabel,
  isEstimateDueOverdue,
} from "@/lib/estimating/metrics";
import { formatProjectAmount } from "@/lib/project-format";
import { cn } from "@/lib/utils";
import type { Estimate, EstimateStage } from "@/types";

const DROP_PREFIX = "estimate-stage:";

interface EstimateKanbanProps {
  estimates: Estimate[];
  canEditStage: boolean;
  estimatorName: (estimate: Estimate) => string | undefined;
  onSelect: (estimate: Estimate) => void;
  onStageChange: (id: string, stage: EstimateStage) => void;
}

function formatDue(value?: string): string | null {
  if (!value?.trim()) return null;
  try {
    return format(parseISO(value), "MMM d");
  } catch {
    return value;
  }
}

function EstimateCardBody({
  estimate,
  estimatorName,
}: {
  estimate: Estimate;
  estimatorName?: string;
}) {
  const due = formatDue(estimate.due_date);
  const revision = estimateRevisionLabel(estimate);
  return (
    <div className="rounded-md border bg-white p-2 shadow-sm">
      <div className="flex items-start justify-between gap-1.5">
        <p className="min-w-0 flex-1 truncate text-xs font-medium text-slate-900">
          {estimateDisplayName(estimate)}
        </p>
        {revision ? (
          <Badge variant="secondary" className="shrink-0 px-1 py-0 text-[10px] font-normal">
            {revision}
          </Badge>
        ) : null}
      </div>
      <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
        {estimate.client_name}
      </p>
      <div className="mt-1.5 flex items-baseline justify-between gap-1.5">
        <span className="text-xs font-semibold tabular-nums text-slate-900">
          {formatProjectAmount(estimate.amount)}
        </span>
        {due ? (
          <span
            className={cn(
              "text-[11px] tabular-nums text-muted-foreground",
              isEstimateDueOverdue(estimate) && "font-semibold text-red-700",
            )}
          >
            {due}
          </span>
        ) : null}
      </div>
      {estimatorName ? (
        <p className="mt-1 truncate text-[11px] text-muted-foreground">{estimatorName}</p>
      ) : null}
    </div>
  );
}

function DraggableEstimateCard({
  estimate,
  estimatorName,
  canDrag,
  onSelect,
}: {
  estimate: Estimate;
  estimatorName?: string;
  canDrag: boolean;
  onSelect: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: estimate.id,
    disabled: !canDrag,
  });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform) }}
      className={cn("relative flex gap-0.5", isDragging && "opacity-60")}
    >
      {canDrag && (
        <button
          type="button"
          className="mt-1 flex h-6 w-4 shrink-0 cursor-grab touch-none items-center justify-center rounded text-slate-400 hover:text-slate-600 active:cursor-grabbing"
          aria-label="Drag to change stage"
          {...listeners}
          {...attributes}
        >
          <GripVertical className="h-3.5 w-3.5" />
        </button>
      )}
      <button
        type="button"
        className="min-w-0 flex-1 text-left"
        onClick={onSelect}
        aria-label={`Open ${estimateDisplayName(estimate)}`}
      >
        <EstimateCardBody estimate={estimate} estimatorName={estimatorName} />
      </button>
    </div>
  );
}

function StageColumn({
  stage,
  label,
  estimates,
  canEditStage,
  estimatorName,
  onSelect,
}: {
  stage: EstimateStage;
  label: string;
  estimates: Estimate[];
  canEditStage: boolean;
  estimatorName: (estimate: Estimate) => string | undefined;
  onSelect: (estimate: Estimate) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `${DROP_PREFIX}${stage}`,
    disabled: !canEditStage,
  });

  const total = estimates.reduce((sum, estimate) => sum + (estimate.amount ?? 0), 0);

  return (
    <div className="flex min-w-[220px] max-w-[220px] shrink-0 flex-col border-r border-slate-200 last:border-r-0 sm:min-w-[248px] sm:max-w-[248px]">
      <div className="flex items-center justify-between border-b bg-slate-50 px-2.5 py-2.5 sm:px-3">
        <h3 className="truncate text-xs font-semibold text-slate-900 sm:text-sm">{label}</h3>
        <span className="ml-1 shrink-0 rounded-full bg-slate-200/80 px-2 py-0.5 text-[10px] font-medium tabular-nums text-muted-foreground">
          {estimates.length}
        </span>
      </div>
      <div
        ref={setNodeRef}
        className={cn(
          "flex min-h-[120px] flex-1 flex-col gap-1.5 p-1.5 transition-colors sm:gap-2 sm:p-2",
          isOver && canEditStage && "bg-emerald-50 ring-2 ring-inset ring-emerald-400",
        )}
      >
        {estimates.length === 0 ? (
          <div
            className={cn(
              "flex min-h-[80px] flex-1 items-center justify-center rounded-md border border-dashed border-slate-200 px-2 text-center text-[10px] text-slate-400",
              isOver && canEditStage && "border-emerald-300 bg-emerald-50/50 text-emerald-600",
            )}
          >
            Drop here
          </div>
        ) : (
          estimates.map((estimate) => (
            <DraggableEstimateCard
              key={estimate.id}
              estimate={estimate}
              estimatorName={estimatorName(estimate)}
              canDrag={canEditStage}
              onSelect={() => onSelect(estimate)}
            />
          ))
        )}
      </div>
      <div className="border-t bg-slate-100/80 px-2.5 py-2 sm:px-3">
        <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          Total amount
        </p>
        <p className="mt-0.5 text-sm font-semibold tabular-nums text-slate-900">
          {formatProjectAmount(total)}
        </p>
      </div>
    </div>
  );
}

export function EstimateKanban({
  estimates,
  canEditStage,
  estimatorName,
  onSelect,
  onStageChange,
}: EstimateKanbanProps) {
  const [activeEstimate, setActiveEstimate] = useState<Estimate | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
  );

  const byStage = useMemo(() => {
    const map = new Map<EstimateStage, Estimate[]>(
      ESTIMATE_STAGES.map((stage) => [stage.value, [] as Estimate[]]),
    );
    for (const estimate of estimates) {
      map.get(estimate.stage)?.push(estimate);
    }
    for (const list of map.values()) list.sort(compareEstimatesForQueue);
    return map;
  }, [estimates]);

  const handleDragStart = (event: DragStartEvent) => {
    const found = estimates.find((e) => e.id === event.active.id);
    if (found) setActiveEstimate(found);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveEstimate(null);
    const { active, over } = event;
    if (!over || !canEditStage) return;

    const overId = String(over.id);
    if (!overId.startsWith(DROP_PREFIX)) return;
    const targetStage = overId.slice(DROP_PREFIX.length) as EstimateStage;

    const dragged = estimates.find((e) => e.id === String(active.id));
    if (!dragged || dragged.stage === targetStage) return;
    onStageChange(dragged.id, targetStage);
  };

  return (
    <>
      <p className="mb-2 text-xs text-muted-foreground">
        {canEditStage && (
          <span className="hidden sm:inline">
            Drag a card by the grip to change its stage. Click a card to open the package.{" "}
          </span>
        )}
        <span className="lg:hidden">Swipe horizontally to view all stages →</span>
      </p>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="schedule-scroll schedule-scroll-fade relative max-w-full overflow-x-auto rounded-lg border bg-white shadow-sm">
          <div className="flex min-w-max">
            {ESTIMATE_STAGES.map((stage) => (
              <StageColumn
                key={stage.value}
                stage={stage.value}
                label={stage.label}
                estimates={byStage.get(stage.value) ?? []}
                canEditStage={canEditStage}
                estimatorName={estimatorName}
                onSelect={onSelect}
              />
            ))}
          </div>
        </div>

        <DragOverlay dropAnimation={null}>
          {activeEstimate ? (
            <div className="w-[200px] rotate-1 shadow-lg sm:w-[220px]">
              <EstimateCardBody
                estimate={activeEstimate}
                estimatorName={estimatorName(activeEstimate)}
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </>
  );
}
