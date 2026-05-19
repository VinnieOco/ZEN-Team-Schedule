"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { AppPage } from "@/components/layout/app-page";
import { ClientContactSection } from "@/components/crm/client-contact-section";
import { ClientNotesSection } from "@/components/crm/client-notes-section";
import { ClientProjectsTable } from "@/components/crm/client-projects-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useScheduling } from "@/context/scheduling-context";
import { usePermissions } from "@/hooks/use-permissions";
import { findClientByRouteKey } from "@/lib/clients";
import { formatProjectAmount } from "@/lib/project-format";

export default function ClientDetailPage() {
  const params = useParams();
  const routeKey = params.key as string;
  const { projects, clients, isLoading } = useScheduling();
  const { permissions } = usePermissions();
  const [showInactive, setShowInactive] = useState(true);

  const client = useMemo(
    () => findClientByRouteKey(projects, routeKey, clients),
    [projects, routeKey, clients],
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

  const activeProjectCount = client.projects.filter((p) => p.active).length;

  return (
    <AppPage className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="outline" size="sm" asChild>
          <Link href="/crm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            CRM
          </Link>
        </Button>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-slate-900">{client.displayName}</h1>
      </div>

      <ClientContactSection
        clientKey={client.key}
        displayName={client.displayName}
        projectCount={client.projects.length}
        address={client.address}
        phone={client.phone}
        email={client.email}
        contactVaries={client.contactVaries}
        canEdit={permissions.editProjects}
      />

      <ClientNotesSection clientKey={client.key} />

      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-slate-900">Projects</h2>
          <div className="flex items-center gap-2">
            <Switch
              id="show-inactive-client-projects"
              checked={showInactive}
              onCheckedChange={setShowInactive}
            />
            <Label htmlFor="show-inactive-client-projects" className="text-sm font-normal">
              Show inactive projects
            </Label>
          </div>
        </div>
        <ClientProjectsTable projects={client.projects} showInactive={showInactive} />
      </div>

      <div className="grid min-w-0 gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active projects
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{activeProjectCount}</p>
            {client.projects.length > activeProjectCount && (
              <p className="mt-1 text-sm text-muted-foreground">
                {client.projects.length} total including inactive
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total project value
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {client.totalProjectAmount > 0
                ? formatProjectAmount(client.totalProjectAmount)
                : "—"}
            </p>
          </CardContent>
        </Card>
      </div>
    </AppPage>
  );
}
