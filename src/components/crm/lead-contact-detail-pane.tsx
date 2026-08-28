"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { CalendarPlus, Check, Mail, MapPin, Phone, Trash2, UserRound } from "lucide-react";

import { ClientCrmLink } from "@/components/crm/client-crm-link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DateInput } from "@/components/ui/date-input";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useScheduling } from "@/context/scheduling-context";
import { googleMapsUrl } from "@/lib/maps";
import {
  compareLeadFollowUpsByDue,
  defaultLeadFollowUpTypeId,
  formatLeadFollowUpSchedule,
  isLeadFollowUpScheduleOverdue,
  leadFollowUpTypeLabel,
  leadFollowUpTypeOptions,
} from "@/lib/pipeline/lead-follow-up-types";
import {
  leadDisplayName,
  leadSourceBadgeClass,
  leadSourceLabel,
  leadStatusBadgeClass,
  leadStatusLabel,
} from "@/lib/pipeline/leads";
import { cn } from "@/lib/utils";
import type { Lead } from "@/types";

function formatNoteDate(value: string): string {
  try {
    return format(parseISO(value), "MMM d, yyyy 'at' h:mm a");
  } catch {
    return value;
  }
}

interface LeadContactDetailPaneProps {
  lead: Lead | null;
  showOpenFullPage?: boolean;
  /** Strip outer card chrome when nested in a dialog. */
  embedded?: boolean;
}

export function LeadContactDetailPane({
  lead,
  showOpenFullPage = true,
  embedded = false,
}: LeadContactDetailPaneProps) {
  const {
    leadNotes,
    leadFollowUps,
    settings,
    addLeadNote,
    addLeadFollowUp,
    setLeadFollowUpCompleted,
    deleteLeadFollowUp,
  } = useScheduling();
  const [draft, setDraft] = useState("");
  const [saved, setSaved] = useState(false);
  const [followUpDraft, setFollowUpDraft] = useState("");
  const [followUpTimeDraft, setFollowUpTimeDraft] = useState("");
  const [followUpTypeDraft, setFollowUpTypeDraft] = useState("");

  const typeOptions = useMemo(() => leadFollowUpTypeOptions(settings), [settings]);
  const defaultTypeId = useMemo(
    () => defaultLeadFollowUpTypeId(settings) ?? "",
    [settings],
  );

  const notes = useMemo(() => {
    if (!lead) return [];
    return leadNotes
      .filter((note) => note.lead_id === lead.id)
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
  }, [lead, leadNotes]);

  const followUps = useMemo(() => {
    if (!lead) return [];
    return leadFollowUps
      .filter((followUp) => followUp.lead_id === lead.id)
      .sort((a, b) => {
        if (a.completed !== b.completed) return a.completed ? 1 : -1;
        return compareLeadFollowUpsByDue(b, a);
      });
  }, [lead, leadFollowUps]);

  useEffect(() => {
    if (!lead) {
      setDraft("");
      setSaved(false);
      setFollowUpDraft("");
      setFollowUpTimeDraft("");
      setFollowUpTypeDraft("");
      return;
    }
    setDraft("");
    setSaved(false);
    setFollowUpDraft("");
    setFollowUpTimeDraft("");
    setFollowUpTypeDraft(defaultTypeId);
  }, [lead, defaultTypeId]);

  useEffect(() => {
    if (!followUpTypeDraft && defaultTypeId) {
      setFollowUpTypeDraft(defaultTypeId);
      return;
    }
    if (
      followUpTypeDraft &&
      typeOptions.length > 0 &&
      !typeOptions.some((option) => option.value === followUpTypeDraft)
    ) {
      setFollowUpTypeDraft(defaultTypeId);
    }
  }, [defaultTypeId, followUpTypeDraft, typeOptions]);

  const activeFollowUpId = useMemo(() => {
    let active = followUps.find((followUp) => !followUp.completed);
    for (const followUp of followUps) {
      if (followUp.completed) continue;
      if (!active || compareLeadFollowUpsByDue(followUp, active) > 0) active = followUp;
    }
    return active?.id;
  }, [followUps]);

  if (!lead) {
    if (embedded) {
      return (
        <div className="px-6 py-10">
          <EmptyState
            icon={UserRound}
            title="Select a lead contact"
            description="Choose a contact from the list to see details, follow-ups, and notes."
            className="border-0 bg-transparent"
          />
        </div>
      );
    }
    return (
      <div className="flex h-full min-h-[280px] items-center justify-center rounded-xl border border-slate-200/80 bg-white px-4 shadow-sm">
        <EmptyState
          icon={UserRound}
          title="Select a lead contact"
          description="Choose a contact from the list to see details, follow-ups, and notes."
          className="w-full border-0 bg-transparent py-10"
        />
      </div>
    );
  }

  const mapsUrl = googleMapsUrl(lead.address);

  const handleSave = () => {
    const body = draft.trim();
    if (!body) return;
    addLeadNote(lead.id, body);
    setDraft("");
    setSaved(true);
  };

  const handleAddFollowUp = () => {
    if (!followUpDraft) return;
    addLeadFollowUp(
      lead.id,
      followUpDraft,
      followUpTypeDraft || defaultTypeId,
      followUpTimeDraft || undefined,
    );
    setFollowUpDraft("");
    setFollowUpTimeDraft("");
    setFollowUpTypeDraft(defaultTypeId);
  };

  return (
    <div
      className={cn(
        "flex h-full min-h-0 flex-col overflow-hidden",
        !embedded && "rounded-xl border border-slate-200/80 bg-white shadow-sm",
      )}
    >
      <div className="shrink-0 space-y-2 border-b border-slate-100 px-4 py-3 sm:px-5 sm:py-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-bold break-words text-slate-900 sm:text-xl">
              {leadDisplayName(lead)}
            </h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              <ClientCrmLink clientName={lead.client_name} showIcon={false} />
            </p>
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
              {leadSourceLabel(lead.source, settings)}
            </span>
            {showOpenFullPage && (
              <Button type="button" variant="outline" size="sm" asChild>
                <Link href={`/crm/leads/${lead.id}`}>Open full page</Link>
              </Button>
            )}
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Contact information, follow-ups, and dated lead notes. Lead details are read-only here.
        </p>
      </div>

      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-4 sm:p-5">
        <section className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-slate-500 shadow-sm">
              <UserRound className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="font-semibold text-slate-900">
                {lead.contact_name?.trim() || "No contact name"}
              </p>
              {lead.title?.trim() && lead.title.trim() !== lead.client_name ? (
                <p className="text-sm text-muted-foreground">{lead.title}</p>
              ) : null}
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
            {mapsUrl ? (
              <Button
                asChild
                variant="outline"
                className="h-auto justify-start bg-white py-2 text-left sm:col-span-2"
              >
                <a href={mapsUrl} target="_blank" rel="noreferrer">
                  <MapPin className="mr-2 h-4 w-4 shrink-0" />
                  <span className="whitespace-pre-wrap">{lead.address?.trim()}</span>
                </a>
              </Button>
            ) : (
              <div className="flex h-10 items-center rounded-md border bg-white px-3 text-sm text-muted-foreground sm:col-span-2">
                <MapPin className="mr-2 h-4 w-4" />
                No address on file
              </div>
            )}
          </div>
        </section>

        <section className="space-y-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Follow-ups</h3>
            <p className="text-xs text-muted-foreground">
              Check off a follow-up when it&apos;s done. The latest open date shows in the
              pipeline queue.
            </p>
          </div>

          {followUps.length > 0 ? (
            <div className="divide-y rounded-lg border bg-white px-3">
              {followUps.map((followUp) => {
                const overdue =
                  !followUp.completed &&
                  isLeadFollowUpScheduleOverdue(followUp.due_date, followUp.due_time);
                return (
                  <div key={followUp.id} className="flex items-center gap-3 py-2.5">
                    <input
                      type="checkbox"
                      checked={followUp.completed}
                      onChange={(event) =>
                        setLeadFollowUpCompleted(followUp.id, event.target.checked)
                      }
                      className="h-4 w-4 shrink-0 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                      aria-label={
                        followUp.completed
                          ? "Mark follow-up open"
                          : "Mark follow-up complete"
                      }
                    />
                    <div className="min-w-0 flex-1">
                      <p
                        className={cn(
                          "text-sm font-medium",
                          followUp.completed
                            ? "text-muted-foreground line-through"
                            : overdue
                              ? "text-red-600"
                              : "text-slate-900",
                        )}
                      >
                        {formatLeadFollowUpSchedule(
                          followUp.due_date,
                          followUp.due_time,
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {leadFollowUpTypeLabel(settings, followUp.follow_up_type_id)}
                        {followUp.completed && followUp.completed_at
                          ? ` · Completed ${formatNoteDate(followUp.completed_at)}`
                          : overdue
                            ? " · Overdue"
                            : null}
                      </p>
                    </div>
                    {followUp.id === activeFollowUpId ? (
                      <Badge
                        variant="secondary"
                        className="shrink-0 bg-emerald-50 font-medium text-emerald-700"
                      >
                        Next up
                      </Badge>
                    ) : null}
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0 text-muted-foreground hover:text-red-600"
                      onClick={() => deleteLeadFollowUp(followUp.id)}
                      aria-label="Delete follow-up"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="rounded-lg border border-dashed bg-slate-50 px-3 py-4 text-center text-sm text-muted-foreground">
              No follow-ups scheduled for this lead yet.
            </p>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={followUpTypeDraft || defaultTypeId}
              onValueChange={setFollowUpTypeDraft}
            >
              <SelectTrigger className="w-[10.5rem]" aria-label="Follow-up type">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                {typeOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <DateInput
              value={followUpDraft}
              onChange={(event) => setFollowUpDraft(event.target.value)}
              aria-label="New follow-up date"
            />
            <Input
              type="time"
              value={followUpTimeDraft}
              onChange={(event) => setFollowUpTimeDraft(event.target.value)}
              aria-label="New follow-up time"
              className="w-[8.5rem]"
            />
            <Button type="button" onClick={handleAddFollowUp} disabled={!followUpDraft}>
              <CalendarPlus className="mr-1.5 h-4 w-4" />
              Add follow-up
            </Button>
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
    </div>
  );
}
