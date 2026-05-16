"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import type { AppRole } from "@/lib/auth/roles";

export interface UserProfile {
  id: string;
  email: string | null;
  app_role: AppRole;
}

interface AuthContextValue {
  isLoading: boolean;
  userEmail: string | null;
  profile: UserProfile | null;
  isAdmin: boolean;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(isSupabaseConfigured());
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  const refreshProfile = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setIsLoading(false);
      return;
    }

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setUserEmail(null);
      setProfile(null);
      setIsLoading(false);
      return;
    }

    setUserEmail(user.email ?? null);

    const { data, error } = await supabase
      .from("profiles")
      .select("id, email, app_role")
      .eq("id", user.id)
      .maybeSingle();

    if (error) {
      console.error("Failed to load profile", error);
      setProfile(null);
    } else if (data) {
      setProfile({
        id: data.id,
        email: data.email,
        app_role: data.app_role as AppRole,
      });
    } else {
      setProfile(null);
    }

    setIsLoading(false);
  }, []);

  useEffect(() => {
    void refreshProfile();

    if (!isSupabaseConfigured()) return;

    const supabase = createClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void refreshProfile();
    });

    return () => subscription.unsubscribe();
  }, [refreshProfile]);

  const value = useMemo(
    () => ({
      isLoading,
      userEmail,
      profile,
      isAdmin: profile?.app_role === "admin",
      refreshProfile,
    }),
    [isLoading, userEmail, profile, refreshProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
