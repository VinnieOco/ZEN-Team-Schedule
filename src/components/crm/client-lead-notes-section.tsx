"use client";

import { useMemo, useState } from "react";
import { format, parseISO } from "date-fns";

import { LeadContactDialog } from "@/components/pipeline/lead-contact-dialog";
import { MentionText } from "@/components/todos/mention-text";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useScheduling } from "@/context/scheduling-context";
import { normalizeClientName } from "@/lib/clients";
import {
  leadDisplayName,
  leadStatusBadgeClass,
  leadStatusLabel,
} from "@/lib/pipeline/leads";
import { cn } from "@/lib/utils";
import type { Lead } from "@/types";

interface ClientLeadNotesSectionProps {
  clientKey: string;
}

function formatNoteDate(iso: string) {
  try {
    return format(parseISO(iso), "MMM d, yyyy");
  } catch {
    return iso;
  }
}

export function ClientLeadNotesSection({ clientKey }: ClientLeadNotesSectionProps) {
  const { leads, leadNotes, settings } = useScheduling();
  const [detailLead, setDetailLead] = useState<Lead | null>(null);

  const matchingLeads = useMemo(
    () =>
      leads.filter(
        (lead) => normalizeClientName(lead.client_name) === normalizeClientName(clientKey),
      ),
    [leads, clientKey],
  );

  const notesByLead = useMemo(() => {
    const leadIds = new Set(matchingLeads.map((lead) => lead.id));
    return leadNotes
      .filter((note) => leadIds.has(note.lead_id))
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
  }, [leadNotes, matchingLeads]);

  if (matchingLeads.length === 0 || notesByLead.length === 0) {
    return null;
  }

  const leadById = new Map(matchingLeads.map((lead) => [lead.id, lead]));

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Lead notes</CardTitle>
          <CardDescription>
            Notes saved on Pipeline leads for this client. Click a note to open the lead contact
            view.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-1">
          <div className="divide-y divide-border/60">
            {notesByLead.map((note) => {
              const lead = leadById.get(note.lead_id);
              if (!lead) return null;
              return (
                <button
                  key={note.id}
                  type="button"
                  className="flex w-full flex-col gap-1 py-3 text-left first:pt-0 last:pb-0 hover:bg-slate-50/80"
                  onClick={() => setDetailLead(lead)}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium text-emerald-700">
                      {leadDisplayName(lead)}
                    </span>
                    <Badge
                      variant="secondary"
                      className={cn(
                        "font-normal",
                        leadStatusBadgeClass(lead.status, settings),
                      )}
                    >
                      {leadStatusLabel(lead.status, settings)}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {formatNoteDate(note.created_at)}
                    </span>
                  </div>
                  <MentionText
                    text={note.body}
                    className="text-sm whitespace-pre-wrap text-slate-800"
                  />
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <LeadContactDialog
        lead={detailLead}
        open={Boolean(detailLead)}
        onOpenChange={(open) => {
          if (!open) setDetailLead(null);
        }}
      />
    </>
  );
}
