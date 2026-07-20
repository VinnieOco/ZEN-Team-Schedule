"use client";

import { useState } from "react";

import { AppPage } from "@/components/layout/app-page";
import { ScrollableTabsList } from "@/components/layout/scrollable-tabs-list";
import { SchedulingGridSkeleton } from "@/components/scheduling/scheduling-grid-skeleton";
import { CrewMobileTimesheet } from "@/components/time-tracking/crew-mobile-timesheet";
import { TimeComparisonView } from "@/components/time-tracking/time-comparison-view";
import { WeeklyTimesheet } from "@/components/time-tracking/weekly-timesheet";
import { TimeEntriesList } from "@/components/time-tracking/time-entries-list";
import { TimesheetDialog } from "@/components/time-tracking/weekly-timesheet-dialog";
import { TimeTrackingHeader } from "@/components/time-tracking/time-tracking-header";
import { TimeTrackingSummary } from "@/components/time-tracking/time-tracking-summary";
import { useScheduling } from "@/context/scheduling-context";
import { useIsNarrowViewport } from "@/hooks/use-is-narrow-viewport";
import { usePermissions } from "@/hooks/use-permissions";
import { Tabs, TabsContent, TabsTrigger } from "@/components/ui/tabs";

export function TimeTrackingPageClient() {
  const { isLoading } = useScheduling();
  const { canLogTime, linkedEmployeeId, permissions } = usePermissions();
  const isNarrow = useIsNarrowViewport();
  const [dialogOpen, setDialogOpen] = useState(false);

  /** Day-first timesheet for everyone on mobile / small screens. */
  const useCrewMobile = isNarrow;
  const showLogTimeButton = canLogTime && !useCrewMobile;

  return (
    <AppPage>
      <TimeTrackingHeader canLogTime={showLogTimeButton} onLogTime={() => setDialogOpen(true)} />

      {useCrewMobile ? (
        <div className="mt-2 min-w-0">
          {isLoading ? <SchedulingGridSkeleton /> : <CrewMobileTimesheet />}
        </div>
      ) : (
        <>
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
        </>
      )}

      {showLogTimeButton && (
        <TimesheetDialog
          mode="log"
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          employeeId={permissions.logTimeForAnyone ? null : linkedEmployeeId}
        />
      )}
    </AppPage>
  );
}
