import { Suspense } from "react";

import { AppPage } from "@/components/layout/app-page";
import { PipelinePageClient } from "@/components/pipeline/pipeline-page-client";

export default function PipelinePage() {
  return (
    <AppPage>
      <div className="min-w-0">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Pipeline</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage work from lead through estimating. See the full pipeline and workload at a glance.
        </p>
      </div>
      <Suspense fallback={<p className="text-sm text-muted-foreground">Loading pipeline…</p>}>
        <PipelinePageClient />
      </Suspense>
    </AppPage>
  );
}
