import { NextResponse } from "next/server";

import { setEmployeeProfileLink } from "@/lib/auth/employee-link";
import { requireAdmin } from "@/lib/auth/admin-api";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (admin.error) return admin.error;

  try {
    const body = (await request.json()) as {
      profileId?: string;
      employeeId?: string | null;
    };

    const profileId = body.profileId;
    const employeeId = body.employeeId;

    if (!profileId) {
      return NextResponse.json({ error: "profileId is required" }, { status: 400 });
    }

    const supabase = await createClient();

    if (employeeId == null || employeeId === "") {
      const { data: current } = await supabase
        .from("employees")
        .select("id")
        .eq("profile_id", profileId)
        .maybeSingle();

      if (!current) {
        return NextResponse.json({ ok: true, profileId, employeeId: null });
      }

      const result = await setEmployeeProfileLink(supabase, current.id, null);
      if (result.error) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }
      return NextResponse.json({ ok: true, profileId, employeeId: null });
    }

    const result = await setEmployeeProfileLink(supabase, employeeId, profileId);
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      ok: true,
      profileId: result.profileId,
      employeeId: result.employeeId,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Link failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
