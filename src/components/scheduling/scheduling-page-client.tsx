"use client";

import { useState } from "react";

import { AllocationFormDialog } from "@/components/scheduling/allocation-form-dialog";
import { SchedulingFilters } from "@/components/scheduling/scheduling-filters";
import { SchedulingGrid } from "@/components/scheduling/scheduling-grid";
import { SchedulingGridSkeleton } from "@/components/scheduling/scheduling-grid-skeleton";
import { useScheduling } from "@/context/scheduling-context";
import { SchedulingHeader } from "@/components/scheduling/scheduling-header";
import { TeamSummaryBar } from "@/components/scheduling/team-summary-bar";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function SchedulingPageClient() {
  const { isLoading } = useScheduling();
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(true);

  return (
    <div className="space-y-5 p-4 md:space-y-6 md:p-6">
      <SchedulingHeader
        onAddAllocation={() => setAddDialogOpen(true)}
        onToggleFilters={() => setShowFilters((v) => !v)}
        filtersVisible={showFilters}
      />
      <TeamSummaryBar />
      <Tabs defaultValue="schedule">
        <TabsList className="w-full justify-start sm:w-auto">
          <TabsTrigger value="schedule">Schedule</TabsTrigger>
          <TabsTrigger value="workload" disabled title="Coming soon">
            Workload
          </TabsTrigger>
          <TabsTrigger value="availability" disabled title="Coming soon">
            Availability
          </TabsTrigger>
        </TabsList>
        <TabsContent value="schedule" className="mt-4 space-y-4">
          {showFilters && <SchedulingFilters />}
          {isLoading ? <SchedulingGridSkeleton /> : <SchedulingGrid />}
        </TabsContent>
        <TabsContent value="workload">
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">
              Workload view coming soon.
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="availability">
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">
              Availability view coming soon.
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      <AllocationFormDialog open={addDialogOpen} onOpenChange={setAddDialogOpen} />
    </div>
  );
}
