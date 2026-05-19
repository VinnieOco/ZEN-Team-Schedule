"use client";

import { useState } from "react";

import { SchedulingGridSkeleton } from "@/components/scheduling/scheduling-grid-skeleton";
import { TimeComparisonView } from "@/components/time-tracking/time-comparison-view";
import { WeeklyTimesheet } from "@/components/time-tracking/weekly-timesheet";
import { TimeEntriesList } from "@/components/time-tracking/time-entries-list";
import { TimesheetDialog } from "@/components/time-tracking/weekly-timesheet-dialog";
import { TimeTrackingHeader } from "@/components/time-tracking/time-tracking-header";
import { TimeTrackingSummary } from "@/components/time-tracking/time-tracking-summary";
import { useScheduling } from "@/context/scheduling-context";
import { usePermissions } from "@/hooks/use-permissions";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function TimeTrackingPageClient() {
  const { isLoading } = useScheduling();
  const { canLogTime, linkedEmployeeId, permissions } = usePermissions();
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <div className="space-y-5 p-4 md:space-y-6 md:p-6">
      <TimeTrackingHeader canLogTime={canLogTime} onLogTime={() => setDialogOpen(true)} />
      <TimeTrackingSummary />
      <Tabs defaultValue="timesheet">
        <TabsList className="w-full justify-start sm:w-auto">
          <TabsTrigger value="timesheet">Timesheets</TabsTrigger>
          <TabsTrigger value="entries">Entries</TabsTrigger>
          <TabsTrigger value="comparison">Comparison</TabsTrigger>
        </TabsList>
        <TabsContent value="timesheet" className="mt-4">
          {isLoading ? <SchedulingGridSkeleton /> : <WeeklyTimesheet />}
        </TabsContent>
        <TabsContent value="entries" className="mt-4">
          {isLoading ? <SchedulingGridSkeleton /> : <TimeEntriesList />}
        </TabsContent>
        <TabsContent value="comparison" className="mt-4">
          {isLoading ? <SchedulingGridSkeleton /> : <TimeComparisonView />}
        </TabsContent>
      </Tabs>
      <TimesheetDialog
        mode="log"
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        employeeId={permissions.logTimeForAnyone ? null : linkedEmployeeId}
      />
    </div>
  );
}
