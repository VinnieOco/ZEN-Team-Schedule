"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, UserRound, X } from "lucide-react";

import { CrmLeadsContactsSkeleton } from "@/components/crm/crm-leads-contacts-skeleton";
import { LeadContactDetailPane } from "@/components/crm/lead-contact-detail-pane";
import { LeadContactListPane } from "@/components/crm/lead-contact-list-pane";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { useScheduling } from "@/context/scheduling-context";
import {
  leadDisplayName,
  leadSourceLabel,
  leadStatusLabel,
} from "@/lib/pipeline/leads";
import { cn } from "@/lib/utils";
import type { Lead } from "@/types";

function hasContactInfo(lead: Lead): boolean {
  return Boolean(
    lead.contact_name?.trim() ||
      lead.contact_phone?.trim() ||
      lead.contact_email?.trim() ||
      lead.address?.trim(),
  );
}

export function CrmLeadsContactsTable() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { leads, settings, isLoading } = useScheduling();
  const [search, setSearch] = useState("");

  const selectedId = searchParams.get("lead");

  const setSelectedId = useCallback(
    (leadId: string | null) => {
      const next = new URLSearchParams(searchParams.toString());
      if (leadId) {
        next.set("tab", "leads");
        next.set("lead", leadId);
      } else {
        next.delete("lead");
      }
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

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

  const visibleIds = useMemo(() => visible.map((lead) => lead.id), [visible]);

  const selectedLead = useMemo(() => {
    if (!selectedId) return null;
    const lead = leads.find((item) => item.id === selectedId);
    if (!lead || !hasContactInfo(lead)) return null;
    if (!visibleIds.includes(lead.id)) return null;
    return lead;
  }, [selectedId, leads, visibleIds]);

  useEffect(() => {
    if (!selectedId) return;
    if (selectedLead) return;
    setSelectedId(null);
  }, [selectedId, selectedLead, setSelectedId]);

  const isDesktopSplit = () =>
    typeof window !== "undefined" && window.matchMedia("(min-width: 1024px)").matches;

  const handleSelect = (lead: Lead) => {
    if (!isDesktopSplit()) {
      router.push(`/crm/leads/${lead.id}`);
      return;
    }
    setSelectedId(lead.id);
  };

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
            Lead contacts saved from Pipeline.
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
          actionLabel={search.trim() ? "Clear search" : undefined}
          onAction={search.trim() ? () => setSearch("") : undefined}
        />
      ) : (
        <div
          className={cn(
            "grid h-[calc(100dvh-18rem)] min-h-[20rem] gap-4 overflow-hidden lg:h-[calc(100dvh-14rem)]",
            "lg:grid-cols-[minmax(0,38%)_minmax(0,62%)]",
          )}
        >
          <div className="h-full min-h-0 overflow-hidden">
            <LeadContactListPane
              leads={visible}
              selectedId={selectedLead?.id ?? null}
              onSelect={handleSelect}
            />
          </div>

          <div className="hidden h-full min-h-0 overflow-hidden lg:block">
            <LeadContactDetailPane lead={selectedLead} />
          </div>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        On desktop, select a contact to review details here. On mobile, tapping a contact opens the
        full lead page.
      </p>
    </div>
  );
}
