"use client";

import { useState } from "react";
import { Mail } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  inviteSuccessMessage,
  resendInviteSuccessMessage,
  resendTeamInvite,
  sendTeamInvite,
} from "@/lib/auth/invite";
import type { AppRole } from "@/lib/auth/roles";
import { cn } from "@/lib/utils";

interface InviteEmailButtonProps {
  email: string;
  role?: AppRole;
  size?: "sm" | "default" | "icon";
  variant?: "outline" | "ghost" | "default";
  className?: string;
  label?: string;
  /** When true, always sends a fresh invite / password link email. */
  resend?: boolean;
  onMessage?: (message: string) => void;
}

export function InviteEmailButton({
  email,
  role = "member",
  size = "sm",
  variant = "outline",
  className,
  label = "Send invite",
  resend = false,
  onMessage,
}: InviteEmailButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    onMessage?.("");

    try {
      const json = resend
        ? await resendTeamInvite(email, role)
        : await sendTeamInvite(email, role);
      if (json.error) {
        throw new Error(json.error);
      }
      onMessage?.(
        resend ? resendInviteSuccessMessage(email) : inviteSuccessMessage(email, json.resent),
      );
    } catch (err) {
      onMessage?.(err instanceof Error ? err.message : "Invite failed");
    } finally {
      setLoading(false);
    }
  };

  if (size === "icon") {
    return (
      <Button
        type="button"
        variant={variant}
        size="icon"
        className={cn("h-8 w-8", className)}
        disabled={loading}
        onClick={() => void handleClick()}
        aria-label={`Send app invite to ${email}`}
        title={label}
      >
        <Mail className="h-4 w-4" />
      </Button>
    );
  }

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      className={className}
      disabled={loading}
      onClick={() => void handleClick()}
    >
      <Mail className="mr-2 h-4 w-4" />
      {loading ? "Sending…" : label}
    </Button>
  );
}
