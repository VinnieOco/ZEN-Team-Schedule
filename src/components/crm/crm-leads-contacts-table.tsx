"use client";

import { useMemo, useState } from "react";
import { Mail, MapPin, Phone, Search, UserRound, X } from "lucide-react";

import { ClientCrmLink } from "@/components/crm/client-crm-link";
import { LeadContactDialog } from "@/components/pipeline/lead-contact-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useScheduling } from "@/context/scheduling-context";
import { googleMapsUrl } from "@/lib/maps";
import {
  leadDisplayName,
  leadSourceBadgeClass,
  leadSourceLabel,
  leadStatusBadgeClass,
  leadStatusLabel,
} from "@/lib/pipeline/leads";
import { cn } from "@/lib/utils";
import type { Lead } from "@/types";

function CrmLeadsContactsSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-16 animate-pulse rounded-lg border bg-slate-100" />
      <div className="h-64 animate-pulse rounded-lg border bg-slate-100" />
    </div>
  );
}

function hasContactInfo(lead: Lead): boolean {
  return Boolean(
    lead.contact_name?.trim() ||
      lead.contact_phone?.trim() ||
      lead.contact_email?.trim() ||
      lead.address?.trim(),
  );
}

export function CrmLeadsContactsTable() {
  const { leads, settings, isLoading } = useScheduling();
  const [search, setSearch] = useState("");
  const [detailLead, setDetailLead] = useState<Lead | null>(null);

  const contacts = useMemo(() => {
    return [...leads]
      .filter(hasContactInfo)
      .sort((a, b) => {
        const aName = (a.contact_name || a.client_name).toLowerCase();
        const bName = (b.contact_name || b.client_name).toLowerCase();
        return aName.localeCompare(bName);
      });
  }, [leads]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return contacts;
    return contacts.filter((lead) => {
      const haystack = [
        lead.contact_name,
        lead.client_name,
        lead.contact_phone,
        lead.contact_email,
        lead.address,
        leadDisplayName(lead),
        leadSourceLabel(lead.source, settings),
        leadStatusLabel(lead.status, settings),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [contacts, search, settings]);

  if (isLoading) {
    return <CrmLeadsContactsSkeleton />;
  }

  return (
    <div className="space-y-4">
      <div className="min-w-0 space-y-3 rounded-lg border bg-white p-3 shadow-sm">
        <div className="flex min-w-0 flex-wrap items-center gap-3">
          <div className="relative min-w-[min(100%,240px)] flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search contact, client, phone, email, or address…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          {search.trim() ? (
            <Button type="button" variant="outline" size="sm" onClick={() => setSearch("")}>
              <X className="mr-1.5 h-3.5 w-3.5" />
              Clear
            </Button>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-3">
          <p className="text-xs text-muted-foreground">
            Lead contacts saved from Pipeline. Click a row to view details and notes.
          </p>
          <p className="text-xs text-muted-foreground">
            Showing {visible.length} of {contacts.length} contact
            {contacts.length === 1 ? "" : "s"}
          </p>
        </div>
      </div>

      {visible.length === 0 ? (
        <EmptyState
          icon={UserRound}
          title={contacts.length === 0 ? "No lead contacts yet" : "No contacts match your search"}
          description={
            contacts.length === 0
              ? "Add contact name, phone, or email on a lead in Pipeline to see it here."
              : "Try a different search."
          }
        />
      ) : (
        <div className="scroll-x-contained overflow-hidden rounded-lg border bg-white shadow-sm">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Contact</TableHead>
                <TableHead>Client / Lead</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Address</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((lead) => {
                const phone = lead.contact_phone?.trim();
                const email = lead.contact_email?.trim();
                const mapsUrl = googleMapsUrl(lead.address);
                return (
                  <TableRow
                    key={lead.id}
                    className="cursor-pointer"
                    onClick={() => setDetailLead(lead)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                          <UserRound className="h-4 w-4" />
                        </span>
                        <span className="font-medium text-slate-900">
                          {lead.contact_name?.trim() || "—"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <ClientCrmLink clientName={lead.client_name} className="font-medium" />
                      {lead.title?.trim() && lead.title.trim() !== lead.client_name ? (
                        <p className="mt-0.5 text-xs text-muted-foreground">{lead.title}</p>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      {phone ? (
                        <a
                          href={`tel:${phone}`}
                          className="inline-flex items-center gap-1.5 text-sm text-slate-800 hover:text-emerald-700 hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                          {phone}
                        </a>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {email ? (
                        <a
                          href={`mailto:${email}`}
                          className="inline-flex max-w-[220px] items-center gap-1.5 truncate text-sm text-slate-800 hover:text-emerald-700 hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Mail className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                          <span className="truncate">{email}</span>
                        </a>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {mapsUrl ? (
                        <a
                          href={mapsUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex max-w-[240px] items-center gap-1.5 text-sm text-slate-800 hover:text-emerald-700 hover:underline"
                          onClick={(e) => e.stopPropagation()}
                          title={lead.address?.trim()}
                        >
                          <MapPin className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                          <span className="truncate">{lead.address?.trim()}</span>
                        </a>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          "inline-flex rounded-md px-2 py-0.5 text-xs font-medium",
                          leadSourceBadgeClass(lead.source),
                        )}
                      >
                        {leadSourceLabel(lead.source, settings)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={cn(
                          "font-medium",
                          leadStatusBadgeClass(lead.status, settings),
                        )}
                      >
                        {leadStatusLabel(lead.status, settings)}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <LeadContactDialog
        lead={detailLead}
        open={Boolean(detailLead)}
        onOpenChange={(open) => {
          if (!open) setDetailLead(null);
        }}
      />
    </div>
  );
}
