import type { AppRole } from "@/lib/auth/roles";

export interface InviteRequestBody {
  email: string;
  role?: AppRole;
  resend?: boolean;
}

export interface InviteResponseBody {
  ok?: boolean;
  email?: string;
  resent?: boolean;
  error?: string;
}

export function isUserAlreadyRegisteredError(message: string): boolean {
  return /already|registered|exists/i.test(message);
}

async function postInvite(
  email: string,
  role: AppRole,
  resend?: boolean,
): Promise<InviteResponseBody> {
  const res = await fetch("/api/admin/invite", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, role, resend }),
  });
  const json = (await res.json()) as InviteResponseBody;
  if (!res.ok) {
    return { error: json.error ?? "Invite failed" };
  }
  return json;
}

export async function sendTeamInvite(
  email: string,
  role: AppRole = "member",
): Promise<InviteResponseBody> {
  return postInvite(email, role);
}

export async function resendTeamInvite(
  email: string,
  role: AppRole = "member",
): Promise<InviteResponseBody> {
  return postInvite(email, role, true);
}

export function inviteSuccessMessage(email: string, resent?: boolean): string {
  if (resent) {
    return `A sign-in link was sent to ${email}. They can use it to set or reset their password.`;
  }
  return `Invite sent to ${email}. They should open the email and set a password to join.`;
}

export function resendInviteSuccessMessage(email: string): string {
  return `A new invite link was sent to ${email}. They can use it to set or reset their password.`;
}
