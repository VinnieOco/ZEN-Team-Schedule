"use client";

import { useEffect, useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { MapPin } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useScheduling } from "@/context/scheduling-context";
import { googleMapsUrl } from "@/lib/maps";
import { leadStageOptions, openLeadStageIds } from "@/lib/pipeline/lead-stages";
import { defaultLeadSourceId, leadSourceOptions } from "@/lib/pipeline/lead-sources";
import { getEmployeeFullName } from "@/lib/week";
import type { Lead, LeadFormValues, LeadSource, LeadStatus } from "@/types";

const UNASSIGNED = "__unassigned__";

interface LeadFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead?: Lead | null;
}

function todayDateInput(): string {
  return format(new Date(), "yyyy-MM-dd");
}

function dateInputFromIso(value?: string): string {
  if (!value?.trim()) return todayDateInput();
  try {
    return format(parseISO(value), "yyyy-MM-dd");
  } catch {
    return value.slice(0, 10) || todayDateInput();
  }
}

function emptyValues(
  defaultStatus: LeadStatus = "new",
  defaultSource: LeadSource = "other",
): LeadFormValues {
  return {
    title: "",
    client_name: "",
    contact_name: "",
    contact_phone: "",
    contact_email: "",
    address: "",
    source: defaultSource,
    status: defaultStatus,
    expected_value: undefined,
    probability: undefined,
    next_follow_up_date: "",
    created_date: todayDateInput(),
    owner_employee_id: "",
    notes: "",
  };
}

function fromLead(lead: Lead): LeadFormValues {
  return {
    title: lead.title ?? "",
    client_name: lead.client_name,
    contact_name: lead.contact_name ?? "",
    contact_phone: lead.contact_phone ?? "",
    contact_email: lead.contact_email ?? "",
    address: lead.address ?? "",
    source: lead.source,
    status: lead.status,
    expected_value: lead.expected_value,
    probability: lead.probability,
    next_follow_up_date: lead.next_follow_up_date ?? "",
    created_date: dateInputFromIso(lead.created_at),
    owner_employee_id: lead.owner_employee_id ?? "",
    notes: lead.notes ?? "",
  };
}

export function LeadFormDialog({ open, onOpenChange, lead }: LeadFormDialogProps) {
  const { employees, settings, addLead, updateLead } = useScheduling();
  const [values, setValues] = useState<LeadFormValues>(emptyValues);
  const [error, setError] = useState<string | null>(null);

  const isEdit = Boolean(lead);
  const stageOptions = useMemo(() => leadStageOptions(settings), [settings]);
  const sourceOptions = useMemo(() => leadSourceOptions(settings), [settings]);
  const defaultStatus = openLeadStageIds(settings)[0] ?? "new";
  const defaultSource = defaultLeadSourceId(settings);
  const mapsUrl = googleMapsUrl(values.address);

  useEffect(() => {
    if (!open) return;
    setValues(lead ? fromLead(lead) : emptyValues(defaultStatus, defaultSource));
    setError(null);
  }, [open, lead, defaultStatus, defaultSource]);

  const ownerOptions = useMemo(
    () =>
      employees
        .filter((e) => e.active)
        .sort((a, b) => getEmployeeFullName(a).localeCompare(getEmployeeFullName(b))),
    [employees],
  );

  const patch = <K extends keyof LeadFormValues>(key: K, value: LeadFormValues[K]) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!values.client_name.trim()) {
      setError("Client name is required.");
      return;
    }
    const payload: LeadFormValues = {
      ...values,
      title: values.title?.trim() || undefined,
      client_name: values.client_name.trim(),
      owner_employee_id: values.owner_employee_id || undefined,
      next_follow_up_date: values.next_follow_up_date || undefined,
      created_date: values.created_date || todayDateInput(),
    };
    if (lead) updateLead(lead.id, payload);
    else addLead(payload);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit lead" : "New lead"}</DialogTitle>
          <DialogDescription>
            Track an inquiry before it becomes a design project.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="lead-client">Client</Label>
            <Input
              id="lead-client"
              value={values.client_name}
              onChange={(e) => patch("client_name", e.target.value)}
              placeholder="Client name"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="lead-title">Opportunity / job name</Label>
            <Input
              id="lead-title"
              value={values.title ?? ""}
              onChange={(e) => patch("title", e.target.value)}
              placeholder="Optional — defaults to client name"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Source</Label>
              <Select
                value={values.source}
                onValueChange={(v) => patch("source", v as LeadSource)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {sourceOptions.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select
                value={values.status}
                onValueChange={(v) => patch("status", v as LeadStatus)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {stageOptions.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="lead-contact">Contact name</Label>
              <Input
                id="lead-contact"
                value={values.contact_name ?? ""}
                onChange={(e) => patch("contact_name", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Owner</Label>
              <Select
                value={values.owner_employee_id || UNASSIGNED}
                onValueChange={(v) =>
                  patch("owner_employee_id", v === UNASSIGNED ? "" : v)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Unassigned" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={UNASSIGNED}>Unassigned</SelectItem>
                  {ownerOptions.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {getEmployeeFullName(e)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="lead-phone">Phone</Label>
              <Input
                id="lead-phone"
                value={values.contact_phone ?? ""}
                onChange={(e) => patch("contact_phone", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lead-email">Email</Label>
              <Input
                id="lead-email"
                type="email"
                value={values.contact_email ?? ""}
                onChange={(e) => patch("contact_email", e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="lead-address">Address</Label>
              {mapsUrl ? (
                <a
                  href={mapsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 hover:underline"
                >
                  <MapPin className="h-3.5 w-3.5" />
                  Open in Google Maps
                </a>
              ) : null}
            </div>
            <Input
              id="lead-address"
              value={values.address ?? ""}
              onChange={(e) => patch("address", e.target.value)}
              placeholder="Street, city, state"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="lead-value">Expected value</Label>
              <Input
                id="lead-value"
                type="number"
                min={0}
                step={1000}
                value={values.expected_value ?? ""}
                onChange={(e) =>
                  patch(
                    "expected_value",
                    e.target.value === "" ? undefined : Number(e.target.value),
                  )
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lead-prob">Win %</Label>
              <Input
                id="lead-prob"
                type="number"
                min={0}
                max={100}
                value={values.probability ?? ""}
                onChange={(e) =>
                  patch(
                    "probability",
                    e.target.value === "" ? undefined : Number(e.target.value),
                  )
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lead-created">Created date</Label>
              <Input
                id="lead-created"
                type="date"
                value={values.created_date ?? ""}
                onChange={(e) => patch("created_date", e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lead-followup">Follow-up</Label>
              <Input
                id="lead-followup"
                type="date"
                value={values.next_follow_up_date ?? ""}
                onChange={(e) => patch("next_follow_up_date", e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="lead-notes">Notes</Label>
            <textarea
              id="lead-notes"
              className="flex min-h-[80px] w-full rounded-md border border-input bg-white px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={values.notes ?? ""}
              onChange={(e) => patch("notes", e.target.value)}
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">{isEdit ? "Save" : "Add lead"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
