"use client";

import { useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";

import { QueueCardContent } from "@/components/queue/queue-card-content";
import { QueueDropColumn } from "@/components/queue/queue-drop-column";
import { parseQueueDropId } from "@/components/queue/queue-drop-utils";
import { arrayMoveIds, sortQueueColumnItems } from "@/lib/queue/column-order";
import type { QueueDragCommit } from "@/lib/queue/queue-state";
import { DESIGN_STAGES, ESTIMATING_STAGES } from "@/lib/queue/stages";
import type { DesignQueueItem, EstimatingQueueItem, QueueKind, QueueSortBy } from "@/lib/queue/types";

interface QueueBoardProps {
  kind: QueueKind;
  designItems?: DesignQueueItem[];
  estimatingItems?: EstimatingQueueItem[];
  orderRevision?: number;
  sortBy?: QueueSortBy;
  canEditStage?: boolean;
  canManageQueue?: boolean;
  onDragCommit?: (commit: QueueDragCommit) => void;
  onRemoveFromQueue?: (projectId: string) => void;
}

export function QueueBoard({
  kind,
  designItems = [],
  estimatingItems = [],
  orderRevision = 0,
  sortBy = "priority",
  canEditStage,
  canManageQueue,
  onDragCommit,
  onRemoveFromQueue,
}: QueueBoardProps) {
  const [activeItem, setActiveItem] = useState<DesignQueueItem | EstimatingQueueItem | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
  );

  const stages = kind === "design" ? DESIGN_STAGES : ESTIMATING_STAGES;
  const items = kind === "design" ? designItems : estimatingItems;

  const byStage = useMemo(() => {
    const map: Record<string, (DesignQueueItem | EstimatingQueueItem)[]> = Object.fromEntries(
      stages.map((s) => [s.id, [] as (DesignQueueItem | EstimatingQueueItem)[]]),
    );
    for (const item of items) {
      const bucket = map[item.stage];
      if (bucket) bucket.push(item);
    }
    for (const stage of stages) {
      map[stage.id] = sortQueueColumnItems(kind, stage.id, map[stage.id] ?? [], sortBy);
    }
    return map;
  }, [items, stages, kind, orderRevision, sortBy]);

  const handleDragStart = (event: DragStartEvent) => {
    const found = items.find((i) => i.project.id === event.active.id);
    if (found) setActiveItem(found);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveItem(null);
    const { active, over } = event;
    if (!over || !canEditStage || !onDragCommit) return;

    const activeId = String(active.id);
    const activeItem = items.find((i) => i.project.id === activeId);
    if (!activeItem) return;

    const overId = String(over.id);
    const columnTarget = parseQueueDropId(overId);

    if (columnTarget && columnTarget.kind === kind) {
      const targetStage = columnTarget.stage;
      if (activeItem.stage === targetStage) return;

      const sourceIds = (byStage[activeItem.stage] ?? [])
        .map((i) => i.project.id)
        .filter((id) => id !== activeId);
      const targetIds = (byStage[targetStage] ?? [])
        .map((i) => i.project.id)
        .filter((id) => id !== activeId);
      targetIds.push(activeId);

      onDragCommit({
        stageChange: {
          projectId: activeId,
          override:
            kind === "design"
              ? { kind: "design", stage: targetStage as DesignQueueItem["stage"] }
              : { kind: "estimating", stage: targetStage as EstimatingQueueItem["stage"] },
        },
        columnOrders: [
          { kind, stage: activeItem.stage, projectIds: sourceIds },
          { kind, stage: targetStage, projectIds: targetIds },
        ],
      });
      return;
    }

    const overItem = items.find((i) => i.project.id === overId);
    if (!overItem) return;

    if (activeItem.stage === overItem.stage) {
      const columnItems = byStage[activeItem.stage] ?? [];
      const ids = columnItems.map((i) => i.project.id);
      const oldIndex = ids.indexOf(activeId);
      const newIndex = ids.indexOf(overId);
      if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return;
      onDragCommit({
        columnOrders: [{ kind, stage: activeItem.stage, projectIds: arrayMoveIds(ids, oldIndex, newIndex) }],
      });
      return;
    }

    const sourceIds = (byStage[activeItem.stage] ?? [])
      .map((i) => i.project.id)
      .filter((id) => id !== activeId);
    const targetIds = (byStage[overItem.stage] ?? [])
      .map((i) => i.project.id)
      .filter((id) => id !== activeId);
    const overIndex = targetIds.indexOf(overId);
    targetIds.splice(overIndex >= 0 ? overIndex : targetIds.length, 0, activeId);

    onDragCommit({
      stageChange: {
        projectId: activeId,
        override:
          kind === "design"
            ? { kind: "design", stage: overItem.stage as DesignQueueItem["stage"] }
            : { kind: "estimating", stage: overItem.stage as EstimatingQueueItem["stage"] },
      },
      columnOrders: [
        { kind, stage: activeItem.stage, projectIds: sourceIds },
        { kind, stage: overItem.stage, projectIds: targetIds },
      ],
    });
  };

  return (
    <>
      <p className="mb-2 text-xs text-muted-foreground">
        {canEditStage && (
          <span className="hidden sm:inline">
            Drag cards by the grip to reorder priority within a column or move between stages. Top =
            highest priority.{" "}
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
            {stages.map((stage) => (
              <QueueDropColumn
                key={stage.id}
                kind={kind}
                stageId={stage.id}
                title={stage.label}
                items={byStage[stage.id] ?? []}
                canDrag={canEditStage}
                canRemove={canManageQueue}
                onRemoveProject={onRemoveFromQueue}
              />
            ))}
          </div>
        </div>

        <DragOverlay dropAnimation={null}>
          {activeItem ? (
            <div className="w-[200px] rotate-1 shadow-lg sm:w-[220px]">
              <QueueCardContent item={activeItem} compact />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </>
  );
}
