import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { isServiceRoleConfigured } from "@/lib/supabase/admin";

export async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: NextResponse.json({ error: "Not signed in" }, { status: 401 }) };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("app_role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.app_role !== "admin") {
    return { error: NextResponse.json({ error: "Admin access required" }, { status: 403 }) };
  }

  return { supabase, user, profile };
}

export function requireServiceRole() {
  if (!isServiceRoleConfigured()) {
    return {
      error: NextResponse.json(
        {
          error:
            "This action requires SUPABASE_SERVICE_ROLE_KEY on the server (Vercel env or .env.local).",
        },
        { status: 503 },
      ),
    };
  }
  return {};
}
