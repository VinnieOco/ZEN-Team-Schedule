"use client";

import { useCallback, useEffect, useState } from "react";
import { Link2, Loader2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useScheduling } from "@/context/scheduling-context";
import { usePermissions } from "@/hooks/use-permissions";
import { emailsMatch } from "@/lib/auth/email-link";
import type { EmployeeLinkCandidate } from "@/lib/auth/employee-link";
import { getEmployeeFullName } from "@/lib/week";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export function AccountLinkCard() {
  const { refreshData, employees } = useScheduling();
  const { profile, linkedEmployeeId, permissions } = usePermissions();
  const [loading, setLoading] = useState(true);
  const [linking, setLinking] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<EmployeeLinkCandidate[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [profileEmail, setProfileEmail] = useState<string | null>(null);

  const linkedEmployee = linkedEmployeeId
    ? employees.find((e) => e.id === linkedEmployeeId)
    : null;

  const loadStatus = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch("/api/me/employee-link");
      const json = (await res.json()) as {
        linked?: boolean;
        profileEmail?: string;
        candidates?: EmployeeLinkCandidate[];
        error?: string;
        employee?: { id: string; first_name: string; last_name: string };
      };

      if (json.linked && json.employee) {
        setCandidates([]);
        setProfileEmail(null);
      } else if (json.candidates) {
        setCandidates(json.candidates);
        setProfileEmail(json.profileEmail ?? profile?.email ?? null);
        if (json.candidates.length === 1) {
          setSelectedId(json.candidates[0]!.id);
        }
        if (json.candidates.length === 0 && json.error) {
          setMessage(json.error);
        }
      } else if (json.error) {
        setMessage(json.error);
      }
    } catch {
      setMessage("Could not load link status.");
    } finally {
      setLoading(false);
    }
  }, [profile?.email]);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus, linkedEmployeeId]);

  if (!isSupabaseConfigured()) {
    return null;
  }

  const handleLink = async (employeeId?: string) => {
    setLinking(true);
    setMessage(null);

    try {
      const res = await fetch("/api/me/employee-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(employeeId ? { employeeId } : {}),
      });
      const json = (await res.json()) as {
        error?: string;
        needsSelection?: boolean;
        candidates?: EmployeeLinkCandidate[];
      };

      if (res.status === 409 && json.needsSelection && json.candidates) {
        setCandidates(json.candidates);
        setMessage("Choose your name from the schedule team below.");
        return;
      }

      if (!res.ok) {
        throw new Error(json.error ?? "Could not link account");
      }

      setMessage("Your login is now linked to your schedule profile.");
      await refreshData();
      await loadStatus();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Could not link account");
    } finally {
      setLinking(false);
    }
  };

  const emailMatchesOnTeam = profileEmail
    ? employees.some((e) => e.active && emailsMatch(e.email, profileEmail))
    : false;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Link2 className="h-5 w-5 text-emerald-600" />
          Schedule profile link
        </CardTitle>
        <CardDescription>
          Connects your login to a person on the weekly schedule so you can log time
          {permissions.logTimeForAnyone ? " (admins can log for anyone without a link)" : ""}.
          Matching emails link automatically when a team row is saved.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Checking link…
          </p>
        ) : linkedEmployee ? (
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="gap-1 text-emerald-700">
              <Link2 className="h-3 w-3" />
              Linked to {getEmployeeFullName(linkedEmployee)}
            </Badge>
            {linkedEmployee.email && (
              <span className="text-sm text-muted-foreground">{linkedEmployee.email}</span>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {profileEmail && (
              <p className="text-sm text-muted-foreground">
                Signed in as <span className="font-medium text-slate-800">{profileEmail}</span>
              </p>
            )}

            {candidates.length > 1 && (
              <div className="space-y-2">
                <p className="text-sm text-slate-700">Select your schedule team profile:</p>
                <Select value={selectedId} onValueChange={setSelectedId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose your name" />
                  </SelectTrigger>
                  <SelectContent>
                    {candidates.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.first_name} {c.last_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {candidates.length > 0 && (
              <Button
                disabled={linking || (candidates.length > 1 && !selectedId)}
                onClick={() =>
                  void handleLink(
                    candidates.length === 1 ? candidates[0]!.id : selectedId || undefined,
                  )
                }
              >
                {linking ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Linking…
                  </>
                ) : (
                  "Link my account"
                )}
              </Button>
            )}

            {candidates.length === 0 && !emailMatchesOnTeam && (
              <p className="text-sm text-amber-900">
                No schedule team row uses your email yet. An admin can add your email on the schedule
                team or link you manually under Team access.
              </p>
            )}

            {candidates.length === 0 && emailMatchesOnTeam && (
              <Button disabled={linking} onClick={() => void handleLink()}>
                {linking ? "Linking…" : "Try linking again"}
              </Button>
            )}
          </div>
        )}

        {message && (
          <p
            className={`rounded-md px-3 py-2 text-sm ${
              message.toLowerCase().includes("could not") ||
              message.toLowerCase().includes("no schedule")
                ? "bg-amber-50 text-amber-900"
                : "bg-emerald-50 text-emerald-900"
            }`}
          >
            {message}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
