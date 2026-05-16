import { NextResponse } from "next/server";

import { requireAdmin, requireServiceRole } from "@/lib/auth/admin-api";
import { createAdminClient } from "@/lib/supabase/admin";

const MIN_PASSWORD_LENGTH = 6;

export async function POST(request: Request) {
  try {
    const serviceCheck = requireServiceRole();
    if (serviceCheck.error) return serviceCheck.error;

    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const body = (await request.json()) as { userId?: string; password?: string };
    const userId = body.userId?.trim();
    const password = body.password ?? "";

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    if (password.length < MIN_PASSWORD_LENGTH) {
      return NextResponse.json(
        { error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters` },
        { status: 400 },
      );
    }

    const admin = createAdminClient();
    const { data: targetProfile, error: profileError } = await admin
      .from("profiles")
      .select("id, email, app_role")
      .eq("id", userId)
      .maybeSingle();

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 400 });
    }

    if (!targetProfile) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { error: updateError } = await admin.auth.admin.updateUserById(userId, {
      password,
    });

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not update password";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
