"use client";

import { LeadContactDetailPane } from "@/components/crm/lead-contact-detail-pane";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import type { Lead } from "@/types";

interface LeadContactDialogProps {
  lead: Lead | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LeadContactDialog({
  lead,
  open,
  onOpenChange,
}: LeadContactDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-hidden p-0 sm:max-w-2xl">
        <LeadContactDetailPane lead={lead} showOpenFullPage={false} embedded />
      </DialogContent>
    </Dialog>
  );
}
