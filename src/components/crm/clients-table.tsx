"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Plus, Search, Users, X } from "lucide-react";

import { ClientDetailPane } from "@/components/crm/client-detail-pane";
import { ClientFormDialog } from "@/components/crm/client-form-dialog";
import { ClientListPane } from "@/components/crm/client-list-pane";
import { ClientsTableSkeleton } from "@/components/crm/clients-table-skeleton";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useScheduling } from "@/context/scheduling-context";
import { usePermissions } from "@/hooks/use-permissions";
import {
  buildClientSummaries,
  clientRouteKey,
  findClientByRouteKey,
} from "@/lib/clients";
import {
  clientFiltersActive,
  defaultClientFilters,
  filterClients,
  type ClientFilters,
} from "@/lib/filter-clients";
import { cn } from "@/lib/utils";

export function ClientsTable() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { projects, clients, leads, estimates, isLoading } = useScheduling();
  const { permissions } = usePermissions();
  const [filters, setFilters] = useState<ClientFilters>(defaultClientFilters);
  const [addClientOpen, setAddClientOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [mergeOpen, setMergeOpen] = useState(false);
  const [showInactiveProjects, setShowInactiveProjects] = useState(true);

  const selectedRouteKey = searchParams.get("client");

  const setSelectedRouteKey = useCallback(
    (routeKey: string | null) => {
      const next = new URLSearchParams(searchParams.toString());
      if (routeKey) next.set("client", routeKey);
      else next.delete("client");
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const allClients = useMemo(
    () =>
      buildClientSummaries(projects, clients, {
        showInactive: filters.showInactive,
        estimates,
      }),
    [projects, clients, filters.showInactive, estimates],
  );

  const visibleClients = useMemo(
    () => filterClients(allClients, filters),
    [allClients, filters],
  );

  const visibleKeys = useMemo(() => visibleClients.map((c) => c.key), [visibleClients]);

  const selectedClient = useMemo(() => {
    if (!selectedRouteKey) return null;
    const client = findClientByRouteKey(
      projects,
      selectedRouteKey,
      clients,
      leads,
      estimates,
    );
    if (!client) return null;
    if (!visibleKeys.includes(client.key)) return null;
    return client;
  }, [selectedRouteKey, projects, clients, leads, estimates, visibleKeys]);

  useEffect(() => {
    if (!selectedRouteKey) return;
    if (selectedClient) return;
    setSelectedRouteKey(null);
  }, [selectedRouteKey, selectedClient, setSelectedRouteKey]);

  const totalCount = allClients.length;
  const hasActiveFilters = clientFiltersActive(filters);

  const isDesktopSplit = () =>
    typeof window !== "undefined" && window.matchMedia("(min-width: 1024px)").matches;

  const handleSelect = (client: { key: string; displayName: string }) => {
    const routeKey = clientRouteKey(client.displayName);
    if (!isDesktopSplit()) {
      router.push(`/crm/${routeKey}`);
      return;
    }
    setSelectedRouteKey(routeKey);
  };

  const handleClientNavigated = (nextRouteKey: string) => {
    setSelectedRouteKey(nextRouteKey);
  };

  if (isLoading) {
    return <ClientsTableSkeleton />;
  }

  return (
    <div className="space-y-4">
      <div className="min-w-0 space-y-3 rounded-lg border bg-white p-3 shadow-sm">
        <div className="flex min-w-0 flex-wrap items-center gap-3">
          <div className="relative min-w-[min(100%,240px)] flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search client name, contact, or project..."
              value={filters.search}
              onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
            />
          </div>
          {hasActiveFilters && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setFilters(defaultClientFilters())}
            >
              <X className="mr-1.5 h-3.5 w-3.5" />
              Clear
            </Button>
          )}
          {permissions.editProjects && (
            <Button type="button" size="sm" onClick={() => setAddClientOpen(true)}>
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Add client
            </Button>
          )}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-3">
          <div className="flex items-center gap-2">
            <Switch
              id="show-inactive-crm"
              checked={filters.showInactive}
              onCheckedChange={(showInactive) =>
                setFilters((prev) => ({ ...prev, showInactive }))
              }
            />
            <Label htmlFor="show-inactive-crm" className="text-sm font-normal">
              Include clients with only inactive projects
            </Label>
          </div>
          <p className="text-xs text-muted-foreground">
            Showing {visibleClients.length} of {totalCount} client
            {totalCount === 1 ? "" : "s"}
          </p>
        </div>
      </div>

      {visibleClients.length === 0 ? (
        <EmptyState
          icon={Users}
          title={totalCount === 0 ? "No clients yet" : "No clients match your filters"}
          description={
            totalCount === 0
              ? "Add a client here or when creating a project. Clients stay linked across CRM and Projects."
              : "Try a different search or clear filters."
          }
          actionLabel={
            totalCount === 0 && permissions.editProjects
              ? "Add client"
              : hasActiveFilters
                ? "Clear filters"
                : undefined
          }
          onAction={
            totalCount === 0 && permissions.editProjects
              ? () => setAddClientOpen(true)
              : hasActiveFilters
                ? () => setFilters(defaultClientFilters())
                : undefined
          }
        />
      ) : (
        <div
          className={cn(
            "grid h-[calc(100dvh-18rem)] min-h-[20rem] gap-4 overflow-hidden lg:h-[calc(100dvh-14rem)]",
            "lg:grid-cols-[minmax(0,38%)_minmax(0,62%)]",
          )}
        >
          <div className="h-full min-h-0 overflow-hidden">
            <ClientListPane
              clients={visibleClients}
              selectedKey={selectedClient?.key ?? null}
              onSelect={handleSelect}
            />
          </div>

          <div className="hidden h-full min-h-0 overflow-hidden lg:block">
            <ClientDetailPane
              client={selectedClient}
              canEdit={permissions.editProjects}
              onRenamed={handleClientNavigated}
              onMerged={handleClientNavigated}
              renameOpen={renameOpen}
              onRenameOpenChange={setRenameOpen}
              mergeOpen={mergeOpen}
              onMergeOpenChange={setMergeOpen}
              showInactive={showInactiveProjects}
              onShowInactiveChange={setShowInactiveProjects}
            />
          </div>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        On desktop, select a client to review details here. On mobile, tapping a client opens the
        full client page. Contact info and notes stay linked by name across CRM and Projects.
      </p>

      <ClientFormDialog open={addClientOpen} onOpenChange={setAddClientOpen} />
    </div>
  );
}
