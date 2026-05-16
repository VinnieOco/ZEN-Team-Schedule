import { NextResponse } from "next/server";

import { requireAdmin, requireServiceRole } from "@/lib/auth/admin-api";
import { isUserAlreadyRegisteredError } from "@/lib/auth/invite";
import type { AppRole } from "@/lib/auth/roles";
import { inviteRedirectUrl } from "@/lib/auth/site-url";
import { createAdminClient } from "@/lib/supabase/admin";

async function syncProfileRole(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
  email: string,
  role: AppRole,
) {
  await admin.from("profiles").upsert({
    id: userId,
    email,
    app_role: role,
  });
  await admin.auth.admin.updateUserById(userId, {
    user_metadata: { app_role: role },
  });
}

async function sendPasswordEmail(
  admin: ReturnType<typeof createAdminClient>,
  email: string,
  redirectTo: string,
) {
  return admin.auth.resetPasswordForEmail(email, { redirectTo });
}

export async function POST(request: Request) {
  try {
    const serviceCheck = requireServiceRole();
    if (serviceCheck.error) return serviceCheck.error;

    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const body = (await request.json()) as {
      email?: string;
      role?: AppRole;
      resend?: boolean;
    };
    const email = body.email?.trim().toLowerCase();
    const role: AppRole = body.role === "admin" ? "admin" : "member";
    const resend = body.resend === true;

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Valid email is required" }, { status: 400 });
    }

    const redirectTo = inviteRedirectUrl(request);
    const admin = createAdminClient();

    if (resend) {
      const { data: profileRow } = await admin
        .from("profiles")
        .select("id")
        .eq("email", email)
        .maybeSingle();

      const { error: resetError } = await sendPasswordEmail(admin, email, redirectTo);

      if (resetError) {
        if (profileRow?.id) {
          return NextResponse.json({ error: resetError.message }, { status: 400 });
        }

        const { data, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
          redirectTo,
          data: { app_role: role },
        });

        if (inviteError) {
          return NextResponse.json({ error: inviteError.message }, { status: 400 });
        }

        if (data.user?.id) {
          await syncProfileRole(admin, data.user.id, email, role);
        }

        return NextResponse.json({ ok: true, email, resent: false });
      }

      if (profileRow?.id) {
        await admin.from("profiles").update({ app_role: role }).eq("id", profileRow.id);
        await admin.auth.admin.updateUserById(profileRow.id, {
          user_metadata: { app_role: role },
        });
      }

      return NextResponse.json({ ok: true, email, resent: true });
    }

    let resent = false;
    const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
      redirectTo,
      data: { app_role: role },
    });

    if (error) {
      if (!isUserAlreadyRegisteredError(error.message)) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }

      const { error: resetError } = await sendPasswordEmail(admin, email, redirectTo);

      if (resetError) {
        return NextResponse.json({ error: resetError.message }, { status: 400 });
      }

      resent = true;

      const { data: profileRow } = await admin
        .from("profiles")
        .select("id")
        .eq("email", email)
        .maybeSingle();

      if (profileRow?.id) {
        await syncProfileRole(admin, profileRow.id, email, role);
      }

      return NextResponse.json({ ok: true, email, resent: true });
    }

    if (data.user?.id) {
      await syncProfileRole(admin, data.user.id, email, role);
    }

    return NextResponse.json({ ok: true, email, resent });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invite failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
