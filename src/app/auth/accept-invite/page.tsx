import { redirect } from "next/navigation";

import { AcceptInviteForm } from "@/app/auth/accept-invite/accept-invite-form";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export default async function AcceptInvitePage() {
  if (!isSupabaseConfigured()) {
    redirect("/login");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?error=invite");
  }

  return <AcceptInviteForm email={user.email ?? ""} />;
}
