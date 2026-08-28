"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { AppPage } from "@/components/layout/app-page";
import { ClientDetailPane } from "@/components/crm/client-detail-pane";
import { Button } from "@/components/ui/button";
import { useScheduling } from "@/context/scheduling-context";
import { usePermissions } from "@/hooks/use-permissions";
import { findClientByRouteKey } from "@/lib/clients";

export default function ClientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const routeKey = params.key as string;
  const { projects, clients, clientNotes, leads, estimates, isLoading } = useScheduling();
  const { permissions } = usePermissions();
  const [showInactive, setShowInactive] = useState(true);
  const [renameOpen, setRenameOpen] = useState(false);
  const [mergeOpen, setMergeOpen] = useState(false);

  const client = useMemo(
    () => findClientByRouteKey(projects, routeKey, clients, leads, estimates),
    [projects, routeKey, clients, leads, estimates],
  );

  if (isLoading) {
    return (
      <AppPage>
        <p className="text-muted-foreground">Loading client…</p>
      </AppPage>
    );
  }

  if (!client) {
    return (
      <AppPage>
        <p className="text-muted-foreground">Client not found.</p>
        <Button variant="ghost" asChild className="mt-2 px-0">
          <Link href="/crm">Back to CRM</Link>
        </Button>
      </AppPage>
    );
  }

  const navigateToClient = (nextRouteKey: string) => {
    router.replace(`/crm/${nextRouteKey}`);
  };

  return (
    <AppPage className="space-y-4">
      <Button variant="outline" size="sm" asChild>
        <Link href="/crm">
          <ArrowLeft className="mr-2 h-4 w-4" />
          CRM
        </Link>
      </Button>

      <div className="min-h-[min(70vh,720px)]">
        <ClientDetailPane
          client={client}
          canEdit={permissions.editProjects}
          onRenamed={navigateToClient}
          onMerged={navigateToClient}
          renameOpen={renameOpen}
          onRenameOpenChange={setRenameOpen}
          mergeOpen={mergeOpen}
          onMergeOpenChange={setMergeOpen}
          showInactive={showInactive}
          onShowInactiveChange={setShowInactive}
          showOpenFullPage={false}
        />
      </div>
    </AppPage>
  );
}
