"use client";

import { useState } from "react";

import { AppPage } from "@/components/layout/app-page";
import { ScrollableTabsList } from "@/components/layout/scrollable-tabs-list";
import { SchedulingGridSkeleton } from "@/components/scheduling/scheduling-grid-skeleton";
import { TimeComparisonView } from "@/components/time-tracking/time-comparison-view";
import { WeeklyTimesheet } from "@/components/time-tracking/weekly-timesheet";
import { TimeEntriesList } from "@/components/time-tracking/time-entries-list";
import { TimesheetDialog } from "@/components/time-tracking/weekly-timesheet-dialog";
import { TimeTrackingHeader } from "@/components/time-tracking/time-tracking-header";
import { TimeTrackingSummary } from "@/components/time-tracking/time-tracking-summary";
import { useScheduling } from "@/context/scheduling-context";
import { usePermissions } from "@/hooks/use-permissions";
import { Tabs, TabsContent, TabsTrigger } from "@/components/ui/tabs";

export function TimeTrackingPageClient() {
  const { isLoading } = useScheduling();
  const { canLogTime, linkedEmployeeId, permissions } = usePermissions();
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <AppPage>
      <TimeTrackingHeader canLogTime={canLogTime} onLogTime={() => setDialogOpen(true)} />
      <Tabs defaultValue="timesheet" className="min-w-0">
        <ScrollableTabsList>
          <TabsTrigger value="timesheet" className="shrink-0 px-3">
            Timesheets
          </TabsTrigger>
          <TabsTrigger value="entries" className="shrink-0 px-3">
            Entries
          </TabsTrigger>
          <TabsTrigger value="comparison" className="shrink-0 px-3">
            Comparison
          </TabsTrigger>
        </ScrollableTabsList>
        <TabsContent value="timesheet" className="mt-4 min-w-0">
          {isLoading ? <SchedulingGridSkeleton /> : <WeeklyTimesheet />}
        </TabsContent>
        <TabsContent value="entries" className="mt-4 min-w-0">
          {isLoading ? <SchedulingGridSkeleton /> : <TimeEntriesList />}
        </TabsContent>
        <TabsContent value="comparison" className="mt-4 min-w-0">
          {isLoading ? <SchedulingGridSkeleton /> : <TimeComparisonView />}
        </TabsContent>
      </Tabs>
      <TimeTrackingSummary />
      <TimesheetDialog
        mode="log"
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        employeeId={permissions.logTimeForAnyone ? null : linkedEmployeeId}
      />
    </AppPage>
  );
}
