"use client";

import Link from "next/link";
import { ExternalLink, GitMerge, Pencil, Users } from "lucide-react";

import { ClientContactSection } from "@/components/crm/client-contact-section";
import { ClientLeadNotesSection } from "@/components/crm/client-lead-notes-section";
import { ClientMergeDialog } from "@/components/crm/client-merge-dialog";
import { ClientNotesSection } from "@/components/crm/client-notes-section";
import { ClientProjectsTable } from "@/components/crm/client-projects-table";
import { ClientRenameDialog } from "@/components/crm/client-rename-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useScheduling } from "@/context/scheduling-context";
import type { ClientSummary } from "@/lib/clients";
import { clientRouteKey } from "@/lib/clients";
import { formatProjectAmount } from "@/lib/project-format";

interface ClientDetailPaneProps {
  client: ClientSummary | null;
  canEdit: boolean;
  onRenamed?: (nextRouteKey: string) => void;
  onMerged?: (nextRouteKey: string) => void;
  renameOpen: boolean;
  onRenameOpenChange: (open: boolean) => void;
  mergeOpen: boolean;
  onMergeOpenChange: (open: boolean) => void;
  showInactive: boolean;
  onShowInactiveChange: (show: boolean) => void;
  showOpenFullPage?: boolean;
}

export function ClientDetailPane({
  client,
  canEdit,
  onRenamed,
  onMerged,
  renameOpen,
  onRenameOpenChange,
  mergeOpen,
  onMergeOpenChange,
  showInactive,
  onShowInactiveChange,
  showOpenFullPage = true,
}: ClientDetailPaneProps) {
  const { clientNotes } = useScheduling();

  if (!client) {
    return (
      <div className="flex h-full min-h-[280px] items-center justify-center rounded-xl border border-slate-200/80 bg-white px-4 shadow-sm">
        <EmptyState
          icon={Users}
          title="Select a client"
          description="Choose a client from the list to see contact info, notes, and projects."
          className="w-full border-0 bg-transparent py-10"
        />
      </div>
    );
  }

  const activeProjectCount = client.projects.filter((p) => p.active).length;
  const noteCount = clientNotes.filter((note) => note.client_key === client.key).length;
  const routeKey = clientRouteKey(client.displayName);
  const handleRenamed = onRenamed ?? (() => {});
  const handleMerged = onMerged ?? (() => {});

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm">
      <div className="shrink-0 space-y-3 border-b border-slate-100 px-4 py-3 sm:px-5 sm:py-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-bold break-words text-slate-900 sm:text-xl">
              {client.displayName}
            </h2>
            {client.contactVaries && (
              <p className="mt-1 text-xs text-amber-700">Contact varies by project</p>
            )}
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {canEdit && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onRenameOpenChange(true)}
                >
                  <Pencil className="mr-1.5 h-3.5 w-3.5" />
                  Rename
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onMergeOpenChange(true)}
                >
                  <GitMerge className="mr-1.5 h-3.5 w-3.5" />
                  Merge
                </Button>
              </>
            )}
            {showOpenFullPage && (
              <Button type="button" variant="outline" size="sm" asChild>
                <Link href={`/crm/${routeKey}`}>
                  <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                  Open full page
                </Link>
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4 sm:space-y-5 sm:p-5">
        <div className="grid min-w-0 grid-cols-2 gap-2 sm:gap-3">
          <Card>
            <CardHeader className="p-3 pb-1.5">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                Active projects
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0">
              <p className="text-xl font-bold">{activeProjectCount}</p>
              {client.projects.length > activeProjectCount && (
                <p className="text-[11px] text-muted-foreground">
                  {client.projects.length} total including inactive
                </p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="p-3 pb-1.5">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                Total project value
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0">
              <p className="text-xl font-bold">
                {client.totalProjectAmount > 0
                  ? formatProjectAmount(client.totalProjectAmount)
                  : "—"}
              </p>
            </CardContent>
          </Card>
        </div>

        <ClientContactSection
          clientKey={client.key}
          displayName={client.displayName}
          projectCount={client.projects.length}
          address={client.address}
          phone={client.phone}
          email={client.email}
          contactVaries={client.contactVaries}
          canEdit={canEdit}
        />

        <ClientNotesSection clientKey={client.key} />

        <ClientLeadNotesSection clientKey={client.key} />

        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-base font-semibold text-slate-900">Projects</h3>
            <div className="flex items-center gap-2">
              <Switch
                id="show-inactive-client-projects-pane"
                checked={showInactive}
                onCheckedChange={onShowInactiveChange}
              />
              <Label
                htmlFor="show-inactive-client-projects-pane"
                className="text-sm font-normal"
              >
                Show inactive projects
              </Label>
            </div>
          </div>
          <ClientProjectsTable projects={client.projects} showInactive={showInactive} />
        </div>
      </div>

      <ClientRenameDialog
        open={renameOpen}
        onOpenChange={onRenameOpenChange}
        clientKey={client.key}
        displayName={client.displayName}
        projectCount={client.projects.length}
        noteCount={noteCount}
        onRenamed={handleRenamed}
      />

      <ClientMergeDialog
        open={mergeOpen}
        onOpenChange={onMergeOpenChange}
        clientKey={client.key}
        displayName={client.displayName}
        projectCount={client.projects.length}
        noteCount={noteCount}
        onMerged={handleMerged}
      />
    </div>
  );
}
