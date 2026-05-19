"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";

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
import { Textarea } from "@/components/ui/textarea";
import { useScheduling } from "@/context/scheduling-context";
import type { ClientFormValues } from "@/types";

interface ClientFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ClientFormDialog({ open, onOpenChange }: ClientFormDialogProps) {
  const { addClient } = useScheduling();

  const form = useForm<ClientFormValues>({
    defaultValues: {
      name: "",
      address: "",
      phone: "",
      email: "",
    },
  });

  useEffect(() => {
    if (!open) return;
    form.reset({
      name: "",
      address: "",
      phone: "",
      email: "",
    });
  }, [open, form]);

  const onSubmit = form.handleSubmit((values) => {
    const result = addClient(values);
    if ("ok" in result && !result.ok) {
      form.setError("name", { message: result.message });
      return;
    }
    onOpenChange(false);
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] flex-col overflow-visible sm:max-w-md">
        <DialogHeader className="shrink-0">
          <DialogTitle>Add client</DialogTitle>
          <DialogDescription>
            Create a client in CRM. They will appear when adding projects and can receive contact
            info before any project exists.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="min-h-0 flex-1 space-y-4 overflow-y-auto">
          <div className="space-y-2">
            <Label htmlFor="client-name">Client name</Label>
            <Input
              id="client-name"
              {...form.register("name", { required: "Client name is required" })}
              placeholder="Company or client name"
            />
            {form.formState.errors.name && (
              <p className="text-xs text-red-600">{form.formState.errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="new-client-address">Address</Label>
            <Textarea
              id="new-client-address"
              {...form.register("address")}
              rows={2}
              placeholder="Street, city, state, ZIP"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="new-client-phone">Phone</Label>
            <Input
              id="new-client-phone"
              type="tel"
              {...form.register("phone")}
              placeholder="(555) 555-5555"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="new-client-email">Email</Label>
            <Input
              id="new-client-email"
              type="email"
              {...form.register("email")}
              placeholder="name@company.com"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">Add client</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
