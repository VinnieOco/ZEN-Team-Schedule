"use client";

import { useCallback, useEffect, useState } from "react";
import { Link2, Mail, Shield } from "lucide-react";

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
import { useAuth } from "@/context/auth-context";
import { useScheduling } from "@/context/scheduling-context";
import { getEmployeeFullName } from "@/lib/week";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import type { AppRole } from "@/lib/auth/roles";

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
      const res = await fetch("/api/admin/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      });
      const json = (await res.json()) as { error?: string };

      if (!res.ok) {
        throw new Error(json.error ?? "Invite failed");
      }

      setMessage(`Invite sent to ${inviteEmail}. They can set a password from the email link.`);
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
          App logins and permissions. Matching emails link to a schedule team row automatically.
          Signed in as {userEmail}.
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
          <p className="rounded-md bg-slate-100 px-3 py-2 text-sm text-slate-700">{message}</p>
        )}

        <div>
          <h3 className="mb-2 text-sm font-medium text-slate-900">App users</h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>App role</TableHead>
                <TableHead>Schedule team</TableHead>
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
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    {linkedEmployee ? (
                      <Badge variant="outline" className="gap-1 text-emerald-700">
                        <Link2 className="h-3 w-3" />
                        {getEmployeeFullName(linkedEmployee)}
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">No match</span>
                    )}
                  </TableCell>
                </TableRow>
              );
              })}
              {profiles.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="text-muted-foreground">
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
