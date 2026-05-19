"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ExternalLink, Search, Users, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useScheduling } from "@/context/scheduling-context";
import { clientRouteKey, groupProjectsByClient } from "@/lib/clients";
import {
  clientFiltersActive,
  defaultClientFilters,
  filterClients,
  type ClientFilters,
} from "@/lib/filter-clients";
import { formatProjectAmount, formatProjectHours } from "@/lib/project-format";
function ClientsTableSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-24 animate-pulse rounded-lg border bg-slate-100" />
      <div className="h-64 animate-pulse rounded-lg border bg-slate-100" />
    </div>
  );
}

export function ClientsTable() {
  const { projects, isLoading } = useScheduling();
  const [filters, setFilters] = useState<ClientFilters>(defaultClientFilters);

  const allClients = useMemo(
    () => groupProjectsByClient(projects, { showInactive: filters.showInactive }),
    [projects, filters.showInactive],
  );

  const visibleClients = useMemo(
    () => filterClients(allClients, filters),
    [allClients, filters],
  );

  const totalCount = allClients.length;
  const hasActiveFilters = clientFiltersActive(filters);

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
          title="No clients match your filters"
          description="Try a different search or clear filters. Clients are grouped from project client names."
          actionLabel="Clear filters"
          onAction={() => setFilters(defaultClientFilters())}
        />
      ) : (
        <div className="scroll-x-contained rounded-lg border bg-white shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead className="text-right">Projects</TableHead>
                <TableHead className="text-right">Budgeted Hrs</TableHead>
                <TableHead className="text-right">Total Value</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleClients.map((client) => {
                const contactParts = [client.phone, client.email].filter(Boolean);
                const href = `/crm/${clientRouteKey(client.displayName)}`;

                return (
                  <TableRow key={client.key}>
                    <TableCell className="font-medium">
                      <Link
                        href={href}
                        className="inline-flex items-center gap-1 text-emerald-700 hover:text-emerald-900 hover:underline"
                      >
                        {client.displayName}
                        <ExternalLink className="h-3 w-3 opacity-50" />
                      </Link>
                      {client.contactVaries && (
                        <p className="mt-0.5 text-xs text-amber-700">Contact varies by project</p>
                      )}
                    </TableCell>
                    <TableCell className="max-w-[220px] text-sm text-muted-foreground">
                      {client.address && (
                        <p className="truncate" title={client.address}>
                          {client.address}
                        </p>
                      )}
                      {contactParts.length > 0 ? (
                        <p className="truncate">{contactParts.join(" · ")}</p>
                      ) : (
                        !client.address && "—"
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {client.activeProjectCount}
                      {client.projects.length !== client.activeProjectCount && (
                        <span className="text-muted-foreground">
                          {" "}
                          / {client.projects.length}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatProjectHours(client.totalBudgetedHours)}
                    </TableCell>
                    <TableCell className="text-right">
                      {client.totalProjectAmount > 0
                        ? formatProjectAmount(client.totalProjectAmount)
                        : "—"}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Clients are grouped by name from your projects. Open a client to see all linked projects
        and contact details.
      </p>
    </div>
  );
}
