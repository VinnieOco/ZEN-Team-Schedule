"use client";

import { useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { Check, Mail, Phone, UserRound } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useScheduling } from "@/context/scheduling-context";
import {
  leadDisplayName,
  leadSourceBadgeClass,
  leadSourceLabel,
  leadStatusBadgeClass,
  leadStatusLabel,
} from "@/lib/pipeline/leads";
import { cn } from "@/lib/utils";
import type { Lead } from "@/types";

interface LeadContactDialogProps {
  lead: Lead | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function formatNoteDate(value: string): string {
  try {
    return format(parseISO(value), "MMM d, yyyy 'at' h:mm a");
  } catch {
    return value;
  }
}

export function LeadContactDialog({
  lead,
  open,
  onOpenChange,
}: LeadContactDialogProps) {
  const { leadNotes, settings, addLeadNote } = useScheduling();
  const [draft, setDraft] = useState("");
  const [saved, setSaved] = useState(false);

  const notes = useMemo(() => {
    if (!lead) return [];
    return leadNotes
      .filter((note) => note.lead_id === lead.id)
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
  }, [lead, leadNotes]);

  if (!lead) return null;

  const handleSave = () => {
    const body = draft.trim();
    if (!body) return;
    addLeadNote(lead.id, body);
    setDraft("");
    setSaved(true);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) {
          setDraft("");
          setSaved(false);
        }
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{leadDisplayName(lead)}</DialogTitle>
          <DialogDescription>
            Contact information and dated lead notes. Lead details are read-only here.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <section className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-slate-500 shadow-sm">
                  <UserRound className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <p className="font-semibold text-slate-900">
                    {lead.contact_name?.trim() || "No contact name"}
                  </p>
                  <p className="text-sm text-muted-foreground">{lead.client_name}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge
                  variant="secondary"
                  className={cn("font-medium", leadStatusBadgeClass(lead.status, settings))}
                >
                  {leadStatusLabel(lead.status, settings)}
                </Badge>
                <span
                  className={cn(
                    "inline-flex rounded-md px-2 py-0.5 text-xs font-medium",
                    leadSourceBadgeClass(lead.source),
                  )}
                >
                  {leadSourceLabel(lead.source)}
                </span>
              </div>
            </div>

            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {lead.contact_phone ? (
                <Button asChild variant="outline" className="justify-start bg-white">
                  <a href={`tel:${lead.contact_phone}`}>
                    <Phone className="mr-2 h-4 w-4" />
                    {lead.contact_phone}
                  </a>
                </Button>
              ) : (
                <div className="flex h-10 items-center rounded-md border bg-white px-3 text-sm text-muted-foreground">
                  <Phone className="mr-2 h-4 w-4" />
                  No phone number
                </div>
              )}
              {lead.contact_email ? (
                <Button asChild variant="outline" className="justify-start bg-white">
                  <a href={`mailto:${lead.contact_email}`}>
                    <Mail className="mr-2 h-4 w-4" />
                    <span className="truncate">{lead.contact_email}</span>
                  </a>
                </Button>
              ) : (
                <div className="flex h-10 items-center rounded-md border bg-white px-3 text-sm text-muted-foreground">
                  <Mail className="mr-2 h-4 w-4" />
                  No email address
                </div>
              )}
            </div>
          </section>

          <section className="space-y-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Lead notes</h3>
              <p className="text-xs text-muted-foreground">
                Save dated call notes, client preferences, and follow-up details.
              </p>
            </div>

            {notes.length > 0 ? (
              <div className="max-h-64 divide-y overflow-y-auto rounded-lg border bg-white px-3">
                {notes.map((note) => (
                  <article key={note.id} className="py-3">
                    <p className="text-xs text-muted-foreground">
                      {formatNoteDate(note.created_at)}
                    </p>
                    <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-slate-800">
                      {note.body}
                    </p>
                  </article>
                ))}
              </div>
            ) : (
              <p className="rounded-lg border border-dashed bg-slate-50 px-3 py-6 text-center text-sm text-muted-foreground">
                No notes saved for this lead yet.
              </p>
            )}

            <Textarea
              value={draft}
              onChange={(event) => {
                setDraft(event.target.value);
                setSaved(false);
              }}
              placeholder="Add a call note, client preference, or follow-up detail…"
              rows={4}
              className="min-h-24 resize-y"
            />
            <div className="flex items-center gap-3">
              <Button type="button" onClick={handleSave} disabled={!draft.trim()}>
                Save note
              </Button>
              {saved && !draft.trim() ? (
                <span className="flex items-center gap-1.5 text-sm text-emerald-700">
                  <Check className="h-4 w-4" />
                  Note saved
                </span>
              ) : null}
            </div>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
