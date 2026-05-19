"use client";

import { useEffect, useState, type ReactNode } from "react";
import { AlertCircle, Mail, MapPin, Pencil, Phone } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useScheduling } from "@/context/scheduling-context";
import type { ClientContactFields } from "@/lib/clients";

interface ClientContactSectionProps {
  clientKey: string;
  displayName: string;
  projectCount: number;
  address?: string;
  phone?: string;
  email?: string;
  contactVaries?: boolean;
  canEdit?: boolean;
}

function ContactRow({
  icon: Icon,
  children,
}: {
  icon: typeof MapPin;
  children: ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 text-sm">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
      <div className="min-w-0 font-medium leading-snug">{children}</div>
    </div>
  );
}

export function ClientContactSection({
  clientKey,
  displayName,
  projectCount,
  address,
  phone,
  email,
  contactVaries,
  canEdit = false,
}: ClientContactSectionProps) {
  const { updateClientContact } = useScheduling();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<ClientContactFields>({
    address: address ?? "",
    phone: phone ?? "",
    email: email ?? "",
  });

  useEffect(() => {
    if (!editing) {
      setForm({
        address: address ?? "",
        phone: phone ?? "",
        email: email ?? "",
      });
    }
  }, [address, phone, email, editing]);

  const handleSave = () => {
    setSaving(true);
    try {
      updateClientContact(clientKey, {
        address: form.address,
        phone: form.phone,
        email: form.email,
      });
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setForm({
      address: address ?? "",
      phone: phone ?? "",
      email: email ?? "",
    });
    setEditing(false);
  };

  return (
    <section className="space-y-4 rounded-lg border border-border/80 bg-slate-50/60 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Contact
        </h3>
        {canEdit && !editing && (
          <Button type="button" variant="outline" size="sm" onClick={() => setEditing(true)}>
            <Pencil />
            Edit
          </Button>
        )}
      </div>

      <p className="text-lg font-semibold text-slate-900">{displayName}</p>

      {contactVaries && !editing && (
        <div
          className="flex gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900"
          role="status"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" aria-hidden />
          <p>
            Contact details differ across projects. Edit here to apply the same address, phone,
            and email to all {projectCount} project{projectCount === 1 ? "" : "s"}.
          </p>
        </div>
      )}

      {editing ? (
        <div className="space-y-4 border-t border-border/60 pt-4">
          <div className="space-y-2">
            <Label htmlFor="client-address">Address</Label>
            <Textarea
              id="client-address"
              value={form.address ?? ""}
              onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))}
              rows={3}
              placeholder="Street, city, state, ZIP"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="client-phone">Phone</Label>
            <Input
              id="client-phone"
              type="tel"
              value={form.phone ?? ""}
              onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
              placeholder="(555) 555-5555"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="client-email">Email</Label>
            <Input
              id="client-email"
              type="email"
              value={form.email ?? ""}
              onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
              placeholder="name@company.com"
            />
          </div>
          {projectCount > 1 ? (
            <p className="text-xs text-muted-foreground">
              Saving updates contact info on all {projectCount} projects for this client.
            </p>
          ) : projectCount === 0 ? (
            <p className="text-xs text-muted-foreground">
              Saving stores contact info on this client for future projects.
            </p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : "Save contact"}
            </Button>
            <Button type="button" variant="outline" onClick={handleCancel} disabled={saving}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-3 border-t border-border/60 pt-4">
          <ContactRow icon={MapPin}>
            {address ? (
              <span className="whitespace-pre-wrap">{address}</span>
            ) : (
              <span className="text-muted-foreground">No address on file</span>
            )}
          </ContactRow>
          <ContactRow icon={Phone}>
            {phone ? (
              <a href={`tel:${phone}`} className="hover:underline">
                {phone}
              </a>
            ) : (
              <span className="text-muted-foreground">No phone on file</span>
            )}
          </ContactRow>
          <ContactRow icon={Mail}>
            {email ? (
              <a href={`mailto:${email}`} className="hover:underline">
                {email}
              </a>
            ) : (
              <span className="text-muted-foreground">No email on file</span>
            )}
          </ContactRow>
        </div>
      )}
    </section>
  );
}
