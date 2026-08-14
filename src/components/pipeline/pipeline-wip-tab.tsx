"use client";

import { useMemo, useState } from "react";

import { ConstructionWipSchedule } from "@/components/pipeline/construction-wip-schedule";
import { useScheduling } from "@/context/scheduling-context";
import { usePermissions } from "@/hooks/use-permissions";
import { buildPipelineJobs } from "@/lib/pipeline/stages";
import { wipScheduleJobs } from "@/lib/pipeline/wip-schedule";

export function PipelineWipTab() {
  const { projects, timeEntries, getEmployeeById, isLoading } = useScheduling();
  const { permissions } = usePermissions();
  const canViewWip = permissions.viewWipSchedule;
  const [showInactive, setShowInactive] = useState(false);

  const jobs = useMemo(
    () =>
      buildPipelineJobs(projects, timeEntries, getEmployeeById, {
        includeInactive: true,
      }),
    [projects, timeEntries, getEmployeeById],
  );

  const wipJobs = useMemo(
    () => wipScheduleJobs(jobs, { includeInactive: showInactive }),
    [jobs, showInactive],
  );

  const inactiveAvailable = useMemo(
    () => wipScheduleJobs(jobs, { includeInactive: true }).some((job) => !job.active),
    [jobs],
  );

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading WIP schedule…</p>;
  }

  if (!canViewWip) {
    return (
      <p className="text-sm text-muted-foreground">
        You don’t have permission to view the Work in Progress schedule.
      </p>
    );
  }

  return (
    <div className="space-y-5">
      <ConstructionWipSchedule
        jobs={wipJobs}
        canEdit={canViewWip}
        showInactive={showInactive}
        onShowInactiveChange={setShowInactive}
        inactiveAvailable={inactiveAvailable}
      />
    </div>
  );
}
