"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { isPublicSignupAllowed } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") ?? "/scheduling";
  const authError = searchParams.get("error");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const allowSignup = isPublicSignupAllowed();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  if (!isSupabaseConfigured()) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-slate-50 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>ZEN Team Scheduling</CardTitle>
            <CardDescription>
              Supabase is not configured. The app runs in local demo mode without login.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" onClick={() => router.push("/scheduling")}>
              Continue to app
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    const supabase = createClient();

    try {
      if (mode === "signup") {
        if (!allowSignup) {
          throw new Error("Sign-up is invite-only. Ask an admin for an invite email.");
        }
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setMessage("Check your email to confirm your account, then sign in.");
        setMode("signin");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push(redirect);
        router.refresh();
      }
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-dvh items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-600 text-lg font-bold text-white">
            Z
          </div>
          <CardTitle>ZEN Team Scheduling</CardTitle>
          <CardDescription>
            {mode === "signin"
              ? "Sign in to your design team workspace"
              : "Create an account"}
          </CardDescription>
          {!allowSignup && mode === "signin" && (
            <p className="text-center text-xs text-muted-foreground">
              Access is invite-only. Use the link from your invite email, or ask an admin.
            </p>
          )}
          {authError === "invite" && (
            <p className="rounded-md bg-amber-50 px-3 py-2 text-center text-xs text-amber-900">
              Open the invite link from your email first, then set your password.
            </p>
          )}
          {authError === "auth" && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-center text-xs text-red-800">
              Sign-in link expired or invalid. Ask an admin to send a new invite.
            </p>
          )}
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            {message && (
              <p className="rounded-md bg-slate-100 px-3 py-2 text-sm text-slate-700">{message}</p>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Please wait…" : mode === "signin" ? "Sign in" : "Sign up"}
            </Button>
          </form>
          {allowSignup && (
            <Button
              variant="ghost"
              className="mt-3 w-full text-sm"
              type="button"
              onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
            >
              {mode === "signin"
                ? "Need an account? Sign up"
                : "Already have an account? Sign in"}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
