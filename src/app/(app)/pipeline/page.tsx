import { Suspense } from "react";

import { AppPage } from "@/components/layout/app-page";
import { PipelinePageClient } from "@/components/pipeline/pipeline-page-client";

export default function PipelinePage() {
  return (
    <AppPage>
      <div className="min-w-0">
        <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">Pipeline</h1>
        <p className="mt-1 hidden text-sm text-muted-foreground sm:block">
          Manage work from lead through estimating. See the full pipeline and workload at a glance.
        </p>
      </div>
      <Suspense fallback={<p className="text-sm text-muted-foreground">Loading pipeline…</p>}>
        <PipelinePageClient />
      </Suspense>
    </AppPage>
  );
}
