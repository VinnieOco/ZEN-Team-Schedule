import { AppPage } from "@/components/layout/app-page";
import { QueuePageClient } from "@/components/queue/queue-page-client";

export default function QueuePage() {
  return (
    <AppPage>
      <div className="min-w-0">
        <h1 className="text-2xl font-bold text-slate-900">Queue</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Design and estimating work queues — what to work on next, what is stuck, and what is at risk.
        </p>
      </div>
      <QueuePageClient />
    </AppPage>
  );
}
