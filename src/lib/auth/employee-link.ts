import type { SupabaseClient } from "@supabase/supabase-js";

import { emailsMatch, normalizeEmail } from "@/lib/auth/email-link";

export interface EmployeeLinkCandidate {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
}

/** Clear profile from other employees, then attach to the target row. */
export async function setEmployeeProfileLink(
  supabase: SupabaseClient,
  employeeId: string,
  profileId: string | null,
): Promise<{ error?: string; employeeId?: string; profileId?: string | null }> {
  if (profileId === null) {
    const { error } = await supabase
      .from("employees")
      .update({ profile_id: null })
      .eq("id", employeeId);

    if (error) return { error: error.message };
    return { employeeId, profileId: null };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, email")
    .eq("id", profileId)
    .maybeSingle();

  if (profileError) return { error: profileError.message };
  if (!profile) return { error: "App user not found" };

  const { data: employee, error: employeeError } = await supabase
    .from("employees")
    .select("id, email, profile_id")
    .eq("id", employeeId)
    .maybeSingle();

  if (employeeError) return { error: employeeError.message };
  if (!employee) return { error: "Schedule team member not found" };

  if (employee.profile_id && employee.profile_id !== profileId) {
    return { error: "That schedule row is already linked to another login" };
  }

  const { error: clearError } = await supabase
    .from("employees")
    .update({ profile_id: null })
    .eq("profile_id", profileId);

  if (clearError) return { error: clearError.message };

  const updates: { profile_id: string; email?: string } = { profile_id: profileId };
  const profileEmail = profile.email?.trim();
  if (profileEmail && !employee.email?.trim()) {
    updates.email = profileEmail;
  }

  const { error: linkError } = await supabase.from("employees").update(updates).eq("id", employeeId);

  if (linkError) return { error: linkError.message };
  return { employeeId, profileId };
}

export async function findSelfLinkCandidates(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ error?: string; profileEmail?: string | null; candidates: EmployeeLinkCandidate[] }> {
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("email")
    .eq("id", userId)
    .maybeSingle();

  if (profileError) return { error: profileError.message, candidates: [] };
  if (!profile?.email) {
    return {
      error: "Your account has no email. Ask an admin to link you from Team access.",
      candidates: [],
      profileEmail: null,
    };
  }

  const normalized = normalizeEmail(profile.email);
  if (!normalized) {
    return { error: "Your account has no email.", candidates: [], profileEmail: profile.email };
  }

  const { data: employees, error: employeesError } = await supabase
    .from("employees")
    .select("id, first_name, last_name, email, profile_id")
    .eq("active", true);

  if (employeesError) return { error: employeesError.message, candidates: [] };

  const candidates = (employees ?? []).filter(
    (e) =>
      emailsMatch(e.email, profile.email) &&
      (e.profile_id == null || e.profile_id === userId),
  ) as EmployeeLinkCandidate[];

  return { profileEmail: profile.email, candidates };
}

export async function linkSelfToEmployee(
  supabase: SupabaseClient,
  userId: string,
  employeeId: string,
): Promise<{ error?: string; employeeId?: string }> {
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("email")
    .eq("id", userId)
    .maybeSingle();

  if (profileError) return { error: profileError.message };
  if (!profile?.email) {
    return { error: "Your account has no email on file." };
  }

  const { data: employee, error: employeeError } = await supabase
    .from("employees")
    .select("id, email, profile_id, active")
    .eq("id", employeeId)
    .maybeSingle();

  if (employeeError) return { error: employeeError.message };
  if (!employee) return { error: "Schedule team member not found" };
  if (!employee.active) return { error: "That schedule team member is inactive" };

  if (employee.profile_id && employee.profile_id !== userId) {
    return { error: "That schedule row is already linked to someone else" };
  }

  if (employee.profile_id === userId) {
    return { employeeId };
  }

  const employeeEmail = employee.email?.trim();
  if (employeeEmail && !emailsMatch(employeeEmail, profile.email)) {
    return {
      error:
        "Your login email does not match this schedule team member. Ask an admin to link you manually.",
    };
  }

  return setEmployeeProfileLink(supabase, employeeId, userId);
}
