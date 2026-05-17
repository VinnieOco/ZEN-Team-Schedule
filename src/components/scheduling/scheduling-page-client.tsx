"use client";

import { useState } from "react";

import { AllocationFormDialog } from "@/components/scheduling/allocation-form-dialog";
import { CapacityAlerts } from "@/components/scheduling/capacity-alerts";
import { SchedulingFilters } from "@/components/scheduling/scheduling-filters";
import { SchedulingGrid } from "@/components/scheduling/scheduling-grid";
import { SchedulingGridSkeleton } from "@/components/scheduling/scheduling-grid-skeleton";
import { AvailabilityView } from "@/components/scheduling/availability-view";
import { ByProjectView } from "@/components/scheduling/by-project-view";
import { WorkloadView } from "@/components/scheduling/workload-view";
import { SchedulingMemberBanner } from "@/components/scheduling/scheduling-member-banner";
import { useScheduling } from "@/context/scheduling-context";
import { usePermissions } from "@/hooks/use-permissions";
import {
  SchedulingHeader,
  type ScheduleCalendarView,
} from "@/components/scheduling/scheduling-header";
import { SchedulingMonthGrid } from "@/components/scheduling/scheduling-month-grid";
import { TeamSummaryBar } from "@/components/scheduling/team-summary-bar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function SchedulingPageClient() {
  const { isLoading } = useScheduling();
  const { canEditSchedule, linkedEmployeeId, permissions } = usePermissions();
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [defaultEmployeeId, setDefaultEmployeeId] = useState<string>();
  const [showFilters, setShowFilters] = useState(true);
  const [calendarView, setCalendarView] = useState<ScheduleCalendarView>("week");

  return (
    <div className="schedule-print-root space-y-5 p-4 md:space-y-6 md:p-6 print:space-y-3 print:p-0">
      <div className="sticky top-0 z-20 -mx-4 space-y-4 border-b border-slate-200/80 bg-white/95 px-4 pb-4 backdrop-blur-md md:-mx-6 md:space-y-5 md:px-6 md:pb-5 print:static print:border-0 print:bg-white print:backdrop-blur-none">
        <SchedulingHeader
          calendarView={calendarView}
          onCalendarViewChange={setCalendarView}
          canEditSchedule={canEditSchedule}
          onAddAllocation={() => {
            setDefaultEmployeeId(
              !permissions.editSchedulingForAnyone && linkedEmployeeId
                ? linkedEmployeeId
                : undefined,
            );
            setAddDialogOpen(true);
          }}
          onToggleFilters={() => setShowFilters((v) => !v)}
          filtersVisible={showFilters}
        />
        <SchedulingMemberBanner />
        <div className="print:hidden">
          <TeamSummaryBar calendarView={calendarView} />
        </div>
      </div>
      <Tabs defaultValue="schedule" className="print:block">
        <TabsList className="w-full justify-start sm:w-auto print:hidden">
          <TabsTrigger value="schedule">Schedule</TabsTrigger>
          <TabsTrigger value="workload">Workload</TabsTrigger>
          <TabsTrigger value="availability">Availability</TabsTrigger>
          <TabsTrigger value="by-project">By Project</TabsTrigger>
        </TabsList>
        <TabsContent value="schedule" className="mt-4 space-y-4 print:mt-0 print:block">
          {showFilters && (
            <div className="print:hidden">
              <SchedulingFilters />
            </div>
          )}
          {isLoading ? (
            <SchedulingGridSkeleton />
          ) : calendarView === "month" ? (
            <SchedulingMonthGrid />
          ) : (
            <SchedulingGrid onAddAllocation={() => setAddDialogOpen(true)} />
          )}
        </TabsContent>
        <TabsContent value="workload" className="mt-4 space-y-4 print:hidden">
          {showFilters && (
            <div className="print:hidden">
              <SchedulingFilters />
            </div>
          )}
          {isLoading ? <SchedulingGridSkeleton /> : <WorkloadView />}
        </TabsContent>
        <TabsContent value="availability" className="mt-4 space-y-4 print:hidden">
          {showFilters && (
            <div className="print:hidden">
              <SchedulingFilters />
            </div>
          )}
          {isLoading ? <SchedulingGridSkeleton /> : <AvailabilityView />}
        </TabsContent>
        <TabsContent value="by-project" className="mt-4 space-y-4 print:hidden">
          {showFilters && (
            <div className="print:hidden">
              <SchedulingFilters />
            </div>
          )}
          {isLoading ? (
            <SchedulingGridSkeleton />
          ) : (
            <ByProjectView calendarView={calendarView} />
          )}
        </TabsContent>
      </Tabs>
      <CapacityAlerts calendarView={calendarView} />
      <AllocationFormDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        defaultEmployeeId={defaultEmployeeId}
      />
    </div>
  );
}
