import { AppPage } from "@/components/layout/app-page";
import { ProjectsTable } from "@/components/projects/projects-table";

export default function ProjectsPage() {
  return (
    <AppPage>
      <div className="min-w-0">
        <h1 className="text-2xl font-bold text-slate-900">Projects</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage design projects and track budgeted vs scheduled hours.
        </p>
      </div>
      <ProjectsTable />
    </AppPage>
  );
}
