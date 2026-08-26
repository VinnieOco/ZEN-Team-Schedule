import { Suspense } from "react";

import { AppPage } from "@/components/layout/app-page";
import { ProjectsTable } from "@/components/projects/projects-table";
import { ProjectsTableSkeleton } from "@/components/projects/projects-table-skeleton";

export default function ProjectsPage() {
  return (
    <AppPage>
      <div className="min-w-0">
        <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">Projects</h1>
        <p className="mt-1 hidden text-sm text-muted-foreground sm:block">
          Manage design projects and track budgeted vs scheduled hours.
        </p>
      </div>
      <Suspense fallback={<ProjectsTableSkeleton />}>
        <ProjectsTable />
      </Suspense>
    </AppPage>
  );
}
