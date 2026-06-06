"use client";

import { useMemo, useState } from "react";
import { ListOrdered, Plus } from "lucide-react";

import { AddToQueueDialog } from "@/components/queue/add-to-queue-dialog";
import { QueueBoard } from "@/components/queue/queue-board";
import { QueueFiltersBar } from "@/components/queue/queue-filters";
import { QueueKpiCards } from "@/components/queue/queue-kpi-cards";
import { ScrollableTabsList } from "@/components/layout/scrollable-tabs-list";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Tabs, TabsContent, TabsTrigger } from "@/components/ui/tabs";
import { useScheduling } from "@/context/scheduling-context";
import { usePermissions } from "@/hooks/use-permissions";
import { useQueueColumnOrder } from "@/hooks/use-queue-column-order";
import { useQueueMembership } from "@/hooks/use-queue-membership";
import { useQueueStageOverrides } from "@/hooks/use-queue-stage-overrides";
import {
  buildDesignQueueItems,
  buildEstimatingQueueItems,
  buildQueueKpis,
} from "@/lib/queue/build-queue-items";
import type { DesignQueueStage, EstimatingQueueStage, QueueKind } from "@/lib/queue/types";
import {
  defaultQueueFilters,
  filterDesignQueueItems,
  filterEstimatingQueueItems,
  queueFiltersActive,
} from "@/lib/filter-queue";

export function QueuePageClient() {
  const { projects, allocations, timeEntries, getEmployeeById, isLoading } = useScheduling();
  const { permissions } = usePermissions();
  const { revision, updateStage } = useQueueStageOverrides();
  const { revision: membershipRevision, addToQueue, removeFromQueue } = useQueueMembership();
  const { revision: orderRevision, updateColumnOrder } = useQueueColumnOrder();
  const [filters, setFilters] = useState(defaultQueueFilters);
  const [addDialogKind, setAddDialogKind] = useState<QueueKind | null>(null);

  const designItems = useMemo(
    () => buildDesignQueueItems(projects, allocations, timeEntries, getEmployeeById),
    [projects, allocations, timeEntries, getEmployeeById, revision, membershipRevision],
  );

  const estimatingItems = useMemo(
    () => buildEstimatingQueueItems(projects, allocations, timeEntries, getEmployeeById),
    [projects, allocations, timeEntries, getEmployeeById, revision, membershipRevision],
  );

  const filteredDesign = useMemo(
    () => filterDesignQueueItems(designItems, filters),
    [designItems, filters],
  );

  const filteredEstimating = useMemo(
    () => filterEstimatingQueueItems(estimatingItems, filters),
    [estimatingItems, filters],
  );

  const designKpis = useMemo(() => buildQueueKpis(designItems), [designItems]);
  const estimatingKpis = useMemo(() => buildQueueKpis(estimatingItems), [estimatingItems]);

  const handleDesignStageChange = (projectId: string, stage: string) => {
    updateStage(projectId, { kind: "design", stage: stage as DesignQueueStage });
  };

  const handleEstimatingStageChange = (projectId: string, stage: string) => {
    updateStage(projectId, { kind: "estimating", stage: stage as EstimatingQueueStage });
  };

  const handleAddToQueue = (kind: QueueKind, projectId: string) => {
    addToQueue(kind, projectId);
    if (kind === "design") {
      updateStage(projectId, { kind: "design", stage: "backlog" });
    } else {
      updateStage(projectId, { kind: "estimating", stage: "lead" });
    }
  };

  const canEditStage = permissions.editQueue;
  const canManageQueue = permissions.editQueue;
  const filtersActive = queueFiltersActive(filters);

  const queueToolbar = (kind: QueueKind, resultCount: number, totalCount: number) => (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0 flex-1">
        <QueueFiltersBar
          kind={kind}
          filters={filters}
          onChange={(partial) => setFilters((prev) => ({ ...prev, ...partial }))}
          resultCount={resultCount}
          totalCount={totalCount}
        />
      </div>
      {canManageQueue && (
        <Button type="button" className="shrink-0" onClick={() => setAddDialogKind(kind)}>
          <Plus className="mr-2 h-4 w-4" />
          Add existing project
        </Button>
      )}
    </div>
  );

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading queue…</p>;
  }

  return (
    <>
      <Tabs defaultValue="design" className="min-w-0">
        <ScrollableTabsList>
          <TabsTrigger value="design" className="shrink-0 px-3">
            Design Queue
          </TabsTrigger>
          <TabsTrigger value="estimating" className="shrink-0 px-3">
            Estimating Queue
          </TabsTrigger>
        </ScrollableTabsList>

        <TabsContent value="design" className="mt-4 min-w-0 space-y-4">
          <QueueKpiCards summary={designKpis} />
          {queueToolbar("design", filteredDesign.length, designItems.length)}
          {filteredDesign.length === 0 && filtersActive ? (
            <EmptyState
              icon={ListOrdered}
              title="No design projects match your filters"
              description="Try a different search term or clear filters, or add a project back to the queue."
              actionLabel="Clear filters"
              onAction={() => setFilters(defaultQueueFilters())}
            />
          ) : (
            <QueueBoard
              kind="design"
              designItems={filteredDesign}
              orderRevision={orderRevision}
              sortBy={filters.sortBy}
              canEditStage={canEditStage}
              canManageQueue={canManageQueue}
              onStageChange={handleDesignStageChange}
              onColumnOrderChange={updateColumnOrder}
              onRemoveFromQueue={(projectId) => removeFromQueue("design", projectId)}
            />
          )}
          {filteredDesign.length === 0 && !filtersActive && canManageQueue && (
            <p className="text-center text-sm text-muted-foreground">
              No projects in the design queue. Use Add existing project to show projects here again.
            </p>
          )}
        </TabsContent>

        <TabsContent value="estimating" className="mt-4 min-w-0 space-y-4">
          <QueueKpiCards summary={estimatingKpis} />
          {queueToolbar("estimating", filteredEstimating.length, estimatingItems.length)}
          {filteredEstimating.length === 0 && filtersActive ? (
            <EmptyState
              icon={ListOrdered}
              title="No estimating projects match your filters"
              description="Try a different search term or clear filters, or add a project to the queue."
              actionLabel="Clear filters"
              onAction={() => setFilters(defaultQueueFilters())}
            />
          ) : (
            <QueueBoard
              kind="estimating"
              estimatingItems={filteredEstimating}
              orderRevision={orderRevision}
              sortBy={filters.sortBy}
              canEditStage={canEditStage}
              canManageQueue={canManageQueue}
              onStageChange={handleEstimatingStageChange}
              onColumnOrderChange={updateColumnOrder}
              onRemoveFromQueue={(projectId) => removeFromQueue("estimating", projectId)}
            />
          )}
          {filteredEstimating.length === 0 && !filtersActive && canManageQueue && (
            <p className="text-center text-sm text-muted-foreground">
              No projects in the estimating queue. Use Add existing project to pull one from your
              portfolio.
            </p>
          )}
        </TabsContent>
      </Tabs>

      {addDialogKind && (
        <AddToQueueDialog
          kind={addDialogKind}
          open={Boolean(addDialogKind)}
          onOpenChange={(open) => {
            if (!open) setAddDialogKind(null);
          }}
          projects={projects}
          onAdd={(projectId) => handleAddToQueue(addDialogKind, projectId)}
        />
      )}
    </>
  );
}
