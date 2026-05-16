"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";

interface AcceptInviteFormProps {
  email: string;
}

export function AcceptInviteForm({ email }: AcceptInviteFormProps) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (password.length < 6) {
      setMessage("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      setMessage("Passwords do not match.");
      return;
    }

    setLoading(true);
    const supabase = createClient();

    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      router.push("/scheduling");
      router.refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Could not set password");
    } finally {
      setLoading(false);
    }
  };

  const skipToApp = () => {
    router.push("/scheduling");
    router.refresh();
  };

  return (
    <div className="flex min-h-dvh items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-600 text-lg font-bold text-white">
            Z
          </div>
          <CardTitle>Welcome to ZEN Team Scheduling</CardTitle>
          <CardDescription>
            {email ? (
              <>
                Set a password for <span className="font-medium text-slate-700">{email}</span> to
                finish joining the team.
              </>
            ) : (
              "Set a password to finish joining the team."
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm">Confirm password</Label>
              <Input
                id="confirm"
                type="password"
                autoComplete="new-password"
                required
                minLength={6}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />
            </div>
            {message && (
              <p className="rounded-md bg-slate-100 px-3 py-2 text-sm text-slate-700">{message}</p>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Saving…" : "Set password & continue"}
            </Button>
          </form>
          <Button type="button" variant="ghost" className="w-full text-sm" onClick={skipToApp}>
            Continue without changing password
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
