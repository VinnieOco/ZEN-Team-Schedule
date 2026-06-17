import { AppPage } from "@/components/layout/app-page";
import { GanttPageClient } from "@/components/gantt/gantt-page-client";

export default function GanttPage() {
  return (
    <AppPage>
      <div className="min-w-0">
        <h1 className="text-2xl font-bold text-slate-900">Project schedules</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Firm-wide phase timelines and milestone tracking across all active projects.
        </p>
      </div>
      <GanttPageClient />
    </AppPage>
  );
}
