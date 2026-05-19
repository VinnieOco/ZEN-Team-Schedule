"use client";

import type { ReactNode } from "react";
import { AlertCircle, Mail, MapPin, Phone } from "lucide-react";

interface ClientContactSectionProps {
  displayName: string;
  address?: string;
  phone?: string;
  email?: string;
  contactVaries?: boolean;
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
  displayName,
  address,
  phone,
  email,
  contactVaries,
}: ClientContactSectionProps) {
  return (
    <section className="space-y-4 rounded-lg border border-border/80 bg-slate-50/60 p-4">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Client
      </h3>
      <p className="text-lg font-semibold text-slate-900">{displayName}</p>
      {contactVaries && (
        <div
          className="flex gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900"
          role="status"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" aria-hidden />
          <p>
            Contact details differ across projects. Edit individual projects to update, or align
            them to keep one record.
          </p>
        </div>
      )}
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
    </section>
  );
}
