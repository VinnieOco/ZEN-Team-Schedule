"use client";

import { useCallback, useEffect, useState } from "react";
import { Mail, Shield } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmployeeLinkSelect } from "@/components/settings/employee-link-select";
import { InviteEmailButton } from "@/components/settings/invite-email-button";
import { UserAccessActions } from "@/components/settings/user-access-actions";
import { useAuth } from "@/context/auth-context";
import { useScheduling } from "@/context/scheduling-context";
import { inviteSuccessMessage, sendTeamInvite } from "@/lib/auth/invite";
import type { AppRole } from "@/lib/auth/roles";
import { emailsMatch } from "@/lib/auth/email-link";
import { getEmployeeFullName } from "@/lib/week";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";

interface ProfileRow {
  id: string;
  email: string | null;
  app_role: AppRole;
}

export function TeamAccessCard() {
  const { isAdmin, userEmail, profile: currentProfile, refreshProfile } = useAuth();
  const { employees, refreshData } = useScheduling();
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<AppRole>("member");
  const [loading, setLoading] = useState(false);
  const [roleSavingId, setRoleSavingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const loadProfiles = useCallback(async () => {
    if (!isSupabaseConfigured() || !isAdmin) return;
    const supabase = createClient();
    const { data, error } = await supabase
      .from("profiles")
      .select("id, email, app_role")
      .order("created_at", { ascending: true });

    if (!error && data) {
      setProfiles(data as ProfileRow[]);
    }
  }, [isAdmin]);

  useEffect(() => {
    void loadProfiles();
  }, [loadProfiles]);

  if (!isSupabaseConfigured() || !isAdmin) {
    return null;
  }

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const json = await sendTeamInvite(inviteEmail, inviteRole);
      if (json.error) {
        throw new Error(json.error);
      }

      setMessage(inviteSuccessMessage(inviteEmail, json.resent));
      setInviteEmail("");
      void loadProfiles();
      void refreshData();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Invite failed");
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId: string, app_role: AppRole) => {
    setRoleSavingId(userId);
    setMessage(null);

    try {
      const res = await fetch("/api/admin/profiles", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, app_role }),
      });
      const json = (await res.json()) as { error?: string };

      if (!res.ok) {
        throw new Error(json.error ?? "Could not update role");
      }

      setProfiles((prev) => prev.map((p) => (p.id === userId ? { ...p, app_role } : p)));
      if (userId === currentProfile?.id) {
        await refreshProfile();
      }
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Could not update role");
      void loadProfiles();
    } finally {
      setRoleSavingId(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-emerald-600" />
          Team access
        </CardTitle>
        <CardDescription>
          Send email invites for app access. Link each login to a schedule team member so they can log
          time. Use the actions menu to resend invites or set passwords. Signed in as {userEmail}.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <form onSubmit={handleInvite} className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1 space-y-2">
            <Label htmlFor="invite-email">Email</Label>
            <Input
              id="invite-email"
              type="email"
              required
              placeholder="designer@company.com"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
            />
          </div>
          <div className="space-y-2 sm:w-40">
            <Label>App role</Label>
            <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as AppRole)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="member">Member</SelectItem>
                <SelectItem value="manager">Manager</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" disabled={loading} className="sm:mb-0.5">
            <Mail className="mr-2 h-4 w-4" />
            {loading ? "Sending…" : "Send invite"}
          </Button>
        </form>

        {message && (
          <p
            className={`rounded-md px-3 py-2 text-sm ${
              message.toLowerCase().includes("fail") || message.toLowerCase().includes("error")
                ? "bg-red-50 text-red-800"
                : "bg-emerald-50 text-emerald-900"
            }`}
          >
            {message}
          </p>
        )}

        {(() => {
          const pendingInvites = employees.filter(
            (e) =>
              e.email &&
              e.active &&
              !e.profile_id &&
              !profiles.some((p) => emailsMatch(p.email, e.email)),
          );
          if (pendingInvites.length === 0) return null;
          return (
            <div className="rounded-lg border border-amber-200 bg-amber-50/80 p-4">
              <h3 className="text-sm font-medium text-amber-950">Schedule team without app access</h3>
              <p className="mt-1 text-xs text-amber-900/80">
                These people are on the schedule but have not accepted an invite yet.
              </p>
              <ul className="mt-3 space-y-2">
                {pendingInvites.map((e) => (
                  <li
                    key={e.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-white/80 px-3 py-2 text-sm"
                  >
                    <span>
                      <span className="font-medium text-slate-900">
                        {getEmployeeFullName(e)}
                      </span>
                      <span className="text-muted-foreground"> · {e.email}</span>
                    </span>
                    <InviteEmailButton
                      email={e.email!}
                      label="Send invite"
                      onMessage={setMessage}
                    />
                  </li>
                ))}
              </ul>
            </div>
          );
        })()}

        <div>
          <h3 className="mb-2 text-sm font-medium text-slate-900">App users</h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>App role</TableHead>
                <TableHead>Schedule team</TableHead>
                <TableHead className="w-[56px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {profiles.map((p) => {
                const linkedEmployee = employees.find((e) => e.profile_id === p.id);
                return (
                <TableRow key={p.id}>
                  <TableCell>
                    <span className="flex items-center gap-2">
                      {p.email ?? "—"}
                      {p.id === currentProfile?.id && (
                        <Badge variant="outline" className="text-[10px]">
                          you
                        </Badge>
                      )}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Select
                      value={p.app_role}
                      disabled={roleSavingId === p.id}
                      onValueChange={(v) => void handleRoleChange(p.id, v as AppRole)}
                    >
                      <SelectTrigger className="h-8 w-[120px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="member">Member</SelectItem>
                        <SelectItem value="manager">Manager</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <EmployeeLinkSelect
                      profileId={p.id}
                      employees={employees}
                      linkedEmployeeId={linkedEmployee?.id ?? null}
                      disabled={roleSavingId === p.id}
                      onLinked={() => {
                        void loadProfiles();
                        void refreshData();
                      }}
                      onError={setMessage}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    {p.email ? (
                      <UserAccessActions
                        userId={p.id}
                        email={p.email}
                        role={p.app_role}
                        onMessage={setMessage}
                        disabled={roleSavingId === p.id}
                      />
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                </TableRow>
              );
              })}
              {profiles.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-muted-foreground">
                    No app users yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
