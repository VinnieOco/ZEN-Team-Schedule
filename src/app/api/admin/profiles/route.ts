import { NextResponse } from "next/server";

import { isAdminRole, parseAppRole, type AppRole } from "@/lib/auth/roles";
import { createAdminClient, isServiceRoleConfigured } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    }

    const { data: callerProfile } = await supabase
      .from("profiles")
      .select("app_role")
      .eq("id", user.id)
      .maybeSingle();

    if (callerProfile?.app_role !== "admin") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const body = (await request.json()) as { userId?: string; app_role?: AppRole };
    const userId = body.userId;
    const app_role: AppRole = parseAppRole(body.app_role);

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    const { data: targetProfile } = await supabase
      .from("profiles")
      .select("app_role")
      .eq("id", userId)
      .maybeSingle();

    if (!targetProfile) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (targetProfile.app_role === app_role) {
      return NextResponse.json({ ok: true, app_role });
    }

    if (isAdminRole(targetProfile.app_role) && !isAdminRole(app_role)) {
      const { count, error: countError } = await supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("app_role", "admin");

      if (countError) {
        return NextResponse.json({ error: countError.message }, { status: 400 });
      }
      if ((count ?? 0) <= 1) {
        return NextResponse.json(
          { error: "Cannot remove the last admin. Promote another user first." },
          { status: 400 },
        );
      }
    }

    const { error } = await supabase
      .from("profiles")
      .update({ app_role })
      .eq("id", userId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (isServiceRoleConfigured()) {
      const admin = createAdminClient();
      await admin.auth.admin.updateUserById(userId, {
        user_metadata: { app_role },
      });
    }

    return NextResponse.json({ ok: true, app_role });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Update failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
