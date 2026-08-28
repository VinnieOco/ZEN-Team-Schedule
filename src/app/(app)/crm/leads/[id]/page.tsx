"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { AppPage } from "@/components/layout/app-page";
import { LeadContactDetailPane } from "@/components/crm/lead-contact-detail-pane";
import { Button } from "@/components/ui/button";
import { useScheduling } from "@/context/scheduling-context";

function hasContactInfo(lead: {
  contact_name?: string | null;
  contact_phone?: string | null;
  contact_email?: string | null;
  address?: string | null;
}): boolean {
  return Boolean(
    lead.contact_name?.trim() ||
      lead.contact_phone?.trim() ||
      lead.contact_email?.trim() ||
      lead.address?.trim(),
  );
}

export default function LeadContactDetailPage() {
  const params = useParams();
  const leadId = params.id as string;
  const { leads, isLoading } = useScheduling();

  const lead = leads.find((item) => item.id === leadId);

  if (isLoading) {
    return (
      <AppPage>
        <p className="text-muted-foreground">Loading lead contact…</p>
      </AppPage>
    );
  }

  if (!lead || !hasContactInfo(lead)) {
    return (
      <AppPage>
        <p className="text-muted-foreground">Lead contact not found.</p>
        <Button variant="ghost" asChild className="mt-2 px-0">
          <Link href="/crm?tab=leads">Back to CRM</Link>
        </Button>
      </AppPage>
    );
  }

  return (
    <AppPage className="space-y-4">
      <Button variant="outline" size="sm" asChild>
        <Link href="/crm?tab=leads">
          <ArrowLeft className="mr-2 h-4 w-4" />
          CRM
        </Link>
      </Button>

      <div className="min-h-[min(70vh,720px)]">
        <LeadContactDetailPane lead={lead} showOpenFullPage={false} />
      </div>
    </AppPage>
  );
}
