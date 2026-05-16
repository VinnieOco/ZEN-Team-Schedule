"use client";

import { useState } from "react";

import { SchedulingFilters } from "@/components/scheduling/scheduling-filters";
import { SchedulingGridSkeleton } from "@/components/scheduling/scheduling-grid-skeleton";
import { TimeComparisonView } from "@/components/time-tracking/time-comparison-view";
import { TimeEntriesList } from "@/components/time-tracking/time-entries-list";
import { TimeEntryFormDialog } from "@/components/time-tracking/time-entry-form-dialog";
import { TimeTrackingHeader } from "@/components/time-tracking/time-tracking-header";
import { TimeTrackingSummary } from "@/components/time-tracking/time-tracking-summary";
import { useScheduling } from "@/context/scheduling-context";
import { usePermissions } from "@/hooks/use-permissions";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function TimeTrackingPageClient() {
  const { isLoading } = useScheduling();
  const { canLogTime } = usePermissions();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(true);

  return (
    <div className="space-y-5 p-4 md:space-y-6 md:p-6">
      <TimeTrackingHeader
        canLogTime={canLogTime}
        onLogTime={() => setDialogOpen(true)}
        onToggleFilters={() => setShowFilters((v) => !v)}
        filtersVisible={showFilters}
      />
      <TimeTrackingSummary />
      {showFilters && <SchedulingFilters />}
      <Tabs defaultValue="comparison">
        <TabsList className="w-full justify-start sm:w-auto">
          <TabsTrigger value="comparison">Comparison</TabsTrigger>
          <TabsTrigger value="entries">Entries</TabsTrigger>
        </TabsList>
        <TabsContent value="comparison" className="mt-4">
          {isLoading ? <SchedulingGridSkeleton /> : <TimeComparisonView />}
        </TabsContent>
        <TabsContent value="entries" className="mt-4">
          {isLoading ? <SchedulingGridSkeleton /> : <TimeEntriesList />}
        </TabsContent>
      </Tabs>
      <TimeEntryFormDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}
