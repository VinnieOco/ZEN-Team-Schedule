import { NextResponse } from "next/server";

import { getPermissions } from "@/lib/auth/permissions";
import { parseAppRole } from "@/lib/auth/roles";
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

export async function requireManagerOrAdmin() {
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

  if (profile?.app_role !== "admin" && profile?.app_role !== "manager") {
    return {
      error: NextResponse.json({ error: "Manager or admin access required" }, { status: 403 }),
    };
  }

  return { supabase, user, profile };
}

/** Signed-in office user who can open Projects. Crew Team is refused. */
export async function requireProjectAccess() {
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

  const permissions = getPermissions(parseAppRole(profile?.app_role));
  if (!permissions.viewProjects) {
    return { error: NextResponse.json({ error: "Project access required" }, { status: 403 }) };
  }

  return { supabase, user, canEdit: permissions.editProjects };
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
