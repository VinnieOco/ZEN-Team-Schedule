import { NextResponse } from "next/server";

import {
  findSelfLinkCandidates,
  linkSelfToEmployee,
  setEmployeeProfileLink,
} from "@/lib/auth/employee-link";
import { createClient } from "@/lib/supabase/server";

/** GET — list schedule rows the signed-in user can link to (matching email). */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const { data: existing } = await supabase
    .from("employees")
    .select("id, first_name, last_name, email")
    .eq("profile_id", user.id)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({
      linked: true,
      employee: existing,
      candidates: [],
    });
  }

  const result = await findSelfLinkCandidates(supabase, user.id);
  if (result.error && result.candidates.length === 0) {
    return NextResponse.json({ error: result.error, candidates: [] }, { status: 400 });
  }

  return NextResponse.json({
    linked: false,
    profileEmail: result.profileEmail,
    candidates: result.candidates,
    error: result.candidates.length === 0 ? result.error : undefined,
  });
}

/** POST — link signed-in user to a schedule team member (email must match). */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as { employeeId?: string };
  let employeeId = body.employeeId;

  const { data: alreadyLinked } = await supabase
    .from("employees")
    .select("id, first_name, last_name, email")
    .eq("profile_id", user.id)
    .maybeSingle();

  if (alreadyLinked) {
    return NextResponse.json({ ok: true, employee: alreadyLinked, alreadyLinked: true });
  }

  if (!employeeId) {
    const { candidates, error } = await findSelfLinkCandidates(supabase, user.id);

    if (candidates.length === 0) {
      return NextResponse.json(
        { error: error ?? "No schedule team member matches your email." },
        { status: 400 },
      );
    }

    if (candidates.length > 1) {
      return NextResponse.json(
        {
          error: "Multiple schedule team members match your email. Choose one.",
          needsSelection: true,
          candidates,
        },
        { status: 409 },
      );
    }

    employeeId = candidates[0]!.id;
  }

  const result = await linkSelfToEmployee(supabase, user.id, employeeId);
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  const { data: employee } = await supabase
    .from("employees")
    .select("id, first_name, last_name, email")
    .eq("id", result.employeeId!)
    .single();

  return NextResponse.json({ ok: true, employee });
}

/** DELETE — unlink signed-in user from their schedule row (admins can re-link). */
export async function DELETE() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const { data: employee } = await supabase
    .from("employees")
    .select("id")
    .eq("profile_id", user.id)
    .maybeSingle();

  if (!employee) {
    return NextResponse.json({ ok: true });
  }

  const result = await setEmployeeProfileLink(supabase, employee.id, null);
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
