"use client";

import { useState } from "react";
import { KeyRound, MoreHorizontal, RefreshCw } from "lucide-react";

import { SetPasswordDialog } from "@/components/settings/set-password-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  resendInviteSuccessMessage,
  resendTeamInvite,
} from "@/lib/auth/invite";
import type { AppRole } from "@/lib/auth/roles";

interface UserAccessActionsProps {
  userId: string;
  email: string;
  role: AppRole;
  onMessage?: (message: string) => void;
  disabled?: boolean;
}

export function UserAccessActions({
  userId,
  email,
  role,
  onMessage,
  disabled,
}: UserAccessActionsProps) {
  const [resending, setResending] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);

  const handleResend = async () => {
    setResending(true);
    onMessage?.("");

    try {
      const json = await resendTeamInvite(email, role);
      if (json.error) {
        throw new Error(json.error);
      }
      onMessage?.(resendInviteSuccessMessage(email));
    } catch (err) {
      onMessage?.(err instanceof Error ? err.message : "Could not resend invite");
    } finally {
      setResending(false);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            disabled={disabled || resending}
            aria-label={`Actions for ${email}`}
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            disabled={resending}
            onClick={() => void handleResend()}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Resend invite email
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setPasswordOpen(true)}>
            <KeyRound className="mr-2 h-4 w-4" />
            Set password
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <SetPasswordDialog
        open={passwordOpen}
        onOpenChange={setPasswordOpen}
        userId={userId}
        email={email}
        onSuccess={onMessage}
      />
    </>
  );
}

/** Compact resend button for pending schedule team rows. */
export function ResendInviteButton({
  email,
  role = "member",
  onMessage,
}: {
  email: string;
  role?: AppRole;
  onMessage?: (message: string) => void;
}) {
  const [loading, setLoading] = useState(false);

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={loading}
      onClick={async () => {
        setLoading(true);
        onMessage?.("");
        try {
          const json = await resendTeamInvite(email, role);
          if (json.error) throw new Error(json.error);
          onMessage?.(resendInviteSuccessMessage(email));
        } catch (err) {
          onMessage?.(err instanceof Error ? err.message : "Could not resend invite");
        } finally {
          setLoading(false);
        }
      }}
    >
      <RefreshCw className="mr-2 h-4 w-4" />
      {loading ? "Sending…" : "Resend invite"}
    </Button>
  );
}
