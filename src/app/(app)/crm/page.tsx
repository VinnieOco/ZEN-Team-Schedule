import { Suspense } from "react";

import { CrmPageClient } from "@/components/crm/crm-page-client";
import { AppPage } from "@/components/layout/app-page";

export default function CrmPage() {
  return (
    <AppPage>
      <div className="min-w-0">
        <h1 className="text-2xl font-bold text-slate-900">CRM</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Clients and lead contact information linked to your pipeline.
        </p>
      </div>
      <Suspense fallback={<p className="text-sm text-muted-foreground">Loading CRM…</p>}>
        <CrmPageClient />
      </Suspense>
    </AppPage>
  );
}
