import { ProjectsTable } from "@/components/projects/projects-table";

export default function ProjectsPage() {
  return (
    <div className="space-y-5 p-4 md:space-y-6 md:p-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Projects</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage design projects and track budgeted vs scheduled hours.
        </p>
      </div>
      <ProjectsTable />
    </div>
  );
}
